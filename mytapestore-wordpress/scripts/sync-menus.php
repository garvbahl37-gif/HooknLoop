<?php
/**
 * Rebuild the footer menus to match the Shopify store, item for item.
 *
 * WHAT WAS WRONG
 *
 * The three footer columns are driven by WordPress menus, and the menus assigned
 * to them were the wrong ones — imported wholesale from the old site rather than
 * built for these columns. So the footer read:
 *
 *   Shop tapes        Home, Double Sided Tape, Single Sided Tapes, Automotive
 *                     Masking Tape, …, Return & Exchange Policy, "3 more →"
 *   Industries        the industry list, "7 more →"
 *   Customer service  Home, About Us, Shop, Tape Dispensers, Contact Us
 *
 * against Shopify's:
 *
 *   Shop tapes        seven tape categories, then "All products →"
 *   Information       About us, Shop, Tape dispensers, Industries, Bulk & trade,
 *                     Contact us, Blog
 *   Customer care     Shipping & delivery, Return policy, Privacy policy,
 *                     Terms & conditions, Customer service
 *
 * Three columns, one of them a policy list filed under "Shop tapes", another
 * duplicating the first column's links. This replaces all three with the
 * Shopify set.
 *
 * Category links resolve through the product_cat taxonomy and page links through
 * the page slug, so every entry points at something that exists on THIS site —
 * a menu item whose target is missing is skipped and reported rather than
 * written as a dead link.
 *
 * Run:
 *   ./node_modules/.bin/wp-playground-cli php \
 *     --site-url=http://localhost:9400 \
 *     --mount-before-install=./local/wordpress:/wordpress \
 *     --mount=./theme:/wordpress/wp-content/themes/mytapestore \
 *     --mount=./scripts:/wordpress/mts-scripts \
 *     --wordpress-install-mode=install-from-existing-files \
 *     -- /wordpress/mts-scripts/sync-menus.php
 *
 * ALWAYS pass --site-url. Without it the CLI boots on a random port and writes
 * that port into the siteurl/home options, so the live dev server then
 * canonical-redirects every visitor to a dead address.
 *
 * Idempotent: it empties and refills the three menus each run.
 *
 * @package mytapestore
 */

if ( ! defined( 'ABSPATH' ) ) {
	require_once '/wordpress/wp-load.php';
}

/**
 * The three footer columns, exactly as Shopify renders them.
 *
 * Each entry is [label, kind, target]:
 *   cat  → a product_cat slug
 *   page → a page slug
 *   url  → a literal path
 */
$mts_columns = array(
	'footer-1' => array(
		'name'  => 'Footer — Shop tapes',
		'items' => array(
			array( 'Aluminium Foil Tape', 'cat', 'aluminium-foil-tapes' ),
			array( 'Barricade Hazard Tapes', 'cat', 'barricade-hazard-tapes' ),
			array( 'Bumpers Tapes', 'cat', 'bumpers-tapes' ),
			array( 'Duct Tape', 'cat', 'duct-tape' ),
			array( 'Eco Friendly Tapes', 'cat', 'eco-friendly-tapes' ),
			array( 'Fabric Tape', 'cat', 'fabric-tape' ),
			array( 'Felt Tape & Dots', 'cat', 'felt-tapes-dots' ),
		),
	),
	'footer-2' => array(
		'name'  => 'Footer — Information',
		'items' => array(
			array( 'About us', 'page', 'about-us' ),
			array( 'Shop', 'shop', '' ),
			array( 'Tape dispensers', 'cat', 'tapes-dispensers' ),
			array( 'Industries', 'page', 'industries' ),
			array( 'Bulk & trade', 'page', 'bulk-trade' ),
			array( 'Contact us', 'page', 'contact-us' ),
			array( 'Blog', 'blog', '' ),
		),
	),
	'footer-3' => array(
		'name'  => 'Footer — Customer care',
		'items' => array(
			array( 'Shipping & delivery', 'page', 'shipping-delivery' ),
			array( 'Return policy', 'page', 'return-exchange-policy' ),
			array( 'Privacy policy', 'page', 'privacy-policy' ),
			array( 'Terms & conditions', 'page', 'terms-and-conditions' ),
			array( 'Customer service', 'page', 'customer-service' ),
		),
	),
);

/** Resolve one item to a URL, or '' when its target does not exist here. */
function mts_menu_target( string $kind, string $slug ): string {
	switch ( $kind ) {
		case 'cat':
			$term = get_term_by( 'slug', $slug, 'product_cat' );
			if ( ! $term instanceof WP_Term ) {
				return '';
			}
			$link = get_term_link( $term );
			return is_wp_error( $link ) ? '' : (string) $link;

		case 'page':
			$page = get_page_by_path( $slug );
			return $page ? (string) get_permalink( $page ) : '';

		case 'shop':
			return function_exists( 'wc_get_page_permalink' ) ? (string) wc_get_page_permalink( 'shop' ) : '';

		case 'blog':
			$posts_page = (int) get_option( 'page_for_posts' );
			return $posts_page ? (string) get_permalink( $posts_page ) : home_url( '/blog/' );
	}
	return '';
}

$mts_locations = get_nav_menu_locations();
$mts_missing   = array();

foreach ( $mts_columns as $mts_location => $mts_column ) {
	// Reuse the menu already assigned to the location where there is one, so an
	// admin who renamed it keeps their name and the assignment is not churned.
	$mts_menu_id = (int) ( $mts_locations[ $mts_location ] ?? 0 );
	$mts_menu    = $mts_menu_id ? wp_get_nav_menu_object( $mts_menu_id ) : false;

	if ( ! $mts_menu ) {
		$mts_menu = wp_get_nav_menu_object( $mts_column['name'] );
	}
	if ( ! $mts_menu ) {
		$mts_menu_id = wp_create_nav_menu( $mts_column['name'] );
		if ( is_wp_error( $mts_menu_id ) ) {
			echo "could not create menu {$mts_column['name']}\n";
			continue;
		}
		$mts_menu = wp_get_nav_menu_object( (int) $mts_menu_id );
	}

	$mts_menu_id = (int) $mts_menu->term_id;

	// Empty it, then refill — the column IS this list, not this list merged with
	// whatever was there before.
	foreach ( (array) wp_get_nav_menu_items( $mts_menu_id ) as $mts_existing ) {
		wp_delete_post( (int) $mts_existing->ID, true );
	}

	$mts_written = 0;
	foreach ( $mts_column['items'] as $mts_position => $mts_item ) {
		list( $mts_label, $mts_kind, $mts_slug ) = $mts_item;

		$mts_url = mts_menu_target( $mts_kind, $mts_slug );
		if ( '' === $mts_url ) {
			$mts_missing[] = "{$mts_location}: {$mts_label} ({$mts_kind} {$mts_slug})";
			continue;
		}

		wp_update_nav_menu_item( $mts_menu_id, 0, array(
			'menu-item-title'     => $mts_label,
			'menu-item-url'       => $mts_url,
			'menu-item-status'    => 'publish',
			'menu-item-type'      => 'custom',
			'menu-item-position'  => $mts_position + 1,
		) );
		++$mts_written;
	}

	$mts_locations[ $mts_location ] = $mts_menu_id;
	echo "{$mts_location}: {$mts_written} items → {$mts_menu->name}\n";
}

set_theme_mod( 'nav_menu_locations', $mts_locations );

echo "\ndone\n";

if ( $mts_missing ) {
	echo "\nskipped (no such page/category on this site):\n";
	foreach ( $mts_missing as $mts_line ) {
		echo "  - {$mts_line}\n";
	}
}
