<?php
/**
 * Bring the primary menu's LABELS into line with the Shopify store.
 *
 * The two stores navigate to the same categories under different names, because
 * the WordPress menu carries the old site's abbreviations and Shopify's was
 * rewritten:
 *
 *   WordPress                     Shopify
 *   Airconditioning               Airconditioning Refrigeration Tapes
 *   Sheathing & Moisture          Sheathing & Moisture Management
 *   Visual, Arts & Entertainment  Tapes for Visual, Arts & Entertainment
 *   Warehouse & Packaging         Warehouse Packaging Logistics
 *   PVC Electrical Tape           PVC Electrical Insulation Tape
 *   Double Sided Tape             Double-Sided Tape
 *
 * Every mega-menu panel, the footer, the category rail and the breadcrumb read
 * from this menu, so the difference showed up on every page of the site.
 *
 * Matching is by CATEGORY, not by label: each menu item is resolved to its
 * product_cat term and the Shopify label for that same term is written over it.
 * A menu item pointing at something Shopify does not have is left alone.
 *
 * Run (note --site-url; see fix-site-url.php for why):
 *   ./node_modules/.bin/wp-playground-cli php \
 *     --site-url=http://localhost:9400 \
 *     --mount-before-install=./local/wordpress:/wordpress \
 *     --mount=./theme:/wordpress/wp-content/themes/mytapestore \
 *     --mount=./scripts:/wordpress/mts-scripts \
 *     --mount=./content:/wordpress/mts-content \
 *     --wordpress-install-mode=install-from-existing-files \
 *     -- /wordpress/mts-scripts/sync-nav-labels.php
 *
 * Idempotent.
 *
 * @package mytapestore
 */

if ( ! defined( 'ABSPATH' ) ) {
	require_once '/wordpress/wp-load.php';
}

$mts_source = '/wordpress/mts-content/shopify-nav.json';

if ( ! file_exists( $mts_source ) ) {
	fwrite( STDERR, "missing {$mts_source}\n" );
	exit( 1 );
}

$mts_entries = json_decode( (string) file_get_contents( $mts_source ), true );
if ( ! is_array( $mts_entries ) ) {
	fwrite( STDERR, "{$mts_source} is not valid JSON\n" );
	exit( 1 );
}

/*
 * handle => label. The first label wins: Shopify lists a category once as the
 * panel's own heading link and again inside the panel, and the heading is the
 * canonical name.
 */
$mts_labels = array();
foreach ( $mts_entries as $mts_entry ) {
	$mts_handle = (string) ( $mts_entry['handle'] ?? '' );
	$mts_label  = trim( (string) ( $mts_entry['label'] ?? '' ) );
	if ( '' === $mts_handle || '' === $mts_label ) {
		continue;
	}
	// "View all …" entries point at /collections/all and are not a category name.
	if ( 'all' === $mts_handle ) {
		continue;
	}
	if ( ! isset( $mts_labels[ $mts_handle ] ) ) {
		$mts_labels[ $mts_handle ] = $mts_label;
	}
}

echo count( $mts_labels ) . " Shopify category labels\n\n";

$mts_locations = get_nav_menu_locations();
$mts_renamed   = 0;
$mts_checked   = 0;

foreach ( array( 'primary', 'utility' ) as $mts_location ) {
	$mts_menu_id = (int) ( $mts_locations[ $mts_location ] ?? 0 );
	if ( ! $mts_menu_id ) {
		continue;
	}

	foreach ( (array) wp_get_nav_menu_items( $mts_menu_id ) as $mts_item ) {
		++$mts_checked;

		// Resolve the item to a category slug, however it was stored.
		$mts_slug = '';
		if ( 'taxonomy' === $mts_item->type && 'product_cat' === $mts_item->object ) {
			$mts_term = get_term( (int) $mts_item->object_id, 'product_cat' );
			$mts_slug = $mts_term instanceof WP_Term ? $mts_term->slug : '';
		} elseif ( preg_match( '~/product-category/(?:.*/)?([^/?\#]+)~', (string) $mts_item->url, $mts_match ) ) {
			$mts_slug = $mts_match[1];
		}

		if ( '' === $mts_slug || ! isset( $mts_labels[ $mts_slug ] ) ) {
			continue;
		}

		$mts_want = $mts_labels[ $mts_slug ];
		if ( $mts_item->title === $mts_want ) {
			continue;
		}

		wp_update_post( array(
			'ID'         => (int) $mts_item->ID,
			'post_title' => $mts_want,
		) );

		echo "  {$mts_item->title}  ->  {$mts_want}\n";
		++$mts_renamed;
	}
}

/*
 * OFF-SITE MENU LINKS.
 *
 * Some imported menu items still carry absolute URLs into mytapestore.com.au —
 * the "View all single-sided tapes" link in the header mega-menu was one, so
 * every page on this site had a nav link that walked the visitor off it and onto
 * the old store. Rewrite them to the equivalent local URL.
 *
 * Only the legacy host is rewritten, and only where the path resolves to
 * something here. Anything else (a supplier's site, a PDF) is left alone.
 */
$mts_legacy = 'mytapestore.com.au';
$mts_fixed  = 0;

foreach ( array( 'primary', 'utility', 'footer-1', 'footer-2', 'footer-3' ) as $mts_location ) {
	$mts_menu_id = (int) ( $mts_locations[ $mts_location ] ?? 0 );
	if ( ! $mts_menu_id ) {
		continue;
	}

	foreach ( (array) wp_get_nav_menu_items( $mts_menu_id ) as $mts_item ) {
		$mts_url = (string) $mts_item->url;
		if ( false === strpos( $mts_url, $mts_legacy ) ) {
			continue;
		}

		$mts_path = trim( (string) wp_parse_url( $mts_url, PHP_URL_PATH ), '/' );
		$mts_new  = '';

		// The legacy site serves categories off the bare slug, and pages too, so
		// try both before giving up.
		$mts_last = $mts_path ? basename( $mts_path ) : '';
		if ( $mts_last ) {
			$mts_term = get_term_by( 'slug', $mts_last, 'product_cat' );
			if ( $mts_term instanceof WP_Term ) {
				$mts_link = get_term_link( $mts_term );
				$mts_new  = is_wp_error( $mts_link ) ? '' : (string) $mts_link;
			}
			if ( '' === $mts_new ) {
				$mts_page = get_page_by_path( $mts_last );
				$mts_new  = $mts_page ? (string) get_permalink( $mts_page ) : '';
			}
		}

		if ( '' === $mts_new ) {
			echo "  !! off-site link with no local match: {$mts_item->title} -> {$mts_url}\n";
			continue;
		}

		update_post_meta( (int) $mts_item->ID, '_menu_item_url', $mts_new );
		echo "  off-site: {$mts_item->title}  ->  {$mts_new}\n";
		++$mts_fixed;
	}
}

echo "\nchecked {$mts_checked} menu items, renamed {$mts_renamed}, relinked {$mts_fixed}\n";
