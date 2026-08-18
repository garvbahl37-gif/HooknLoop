<?php
/**
 * Repair the Privacy Policy page and the link that points at it.
 *
 * THREE FAULTS, STACKED. Reported as "privacy policy page not there":
 *
 *   1. The site carries TWO privacy pages. WordPress's own boilerplate (#3,
 *      DRAFT, full of "Suggested text: …") sits on the slug `privacy-policy`,
 *      while the real imported policy (#1281, published) was pushed to
 *      `privacy-policy-2` because the good slug was already taken.
 *
 *   2. THE LIVE SITE SERVES /privacy-policy/ AND 404s ON /privacy-policy-2/.
 *      Checked, not assumed. So the draft has the two URLs the wrong way round,
 *      and shipping it would move a policy page to a new address at cutover —
 *      an SEO regression on a page search engines already index, plus every
 *      existing inbound link breaking.
 *
 *   3. The menu item is a CUSTOM link to `http://localhost:9400/?page_id=3` —
 *      a host this site never runs on (the site URL is 127.0.0.1:9400), and a
 *      page id belonging to the unpublished boilerplate. It 404s for everyone.
 *
 * THE FIX
 *
 *   - Trash the boilerplate. WordPress appends `__trashed` to a trashed post's
 *     slug, which frees `privacy-policy` cleanly. Trashed rather than deleted
 *     so it is recoverable.
 *   - Move the real policy onto `privacy-policy`, matching live exactly.
 *   - Rewrite the menu item as a proper post_type link to #1281. That is the
 *     part that stops this recurring: an object link resolves through
 *     get_permalink() at render time, so it follows the page across domains and
 *     across any future slug change, where a stored string cannot.
 *   - Point wp_page_for_privacy_policy at the real page.
 *
 * IDEMPOTENT: re-running reports "already correct" and changes nothing.
 *
 * @package mytapestore
 */

if ( ! defined( 'ABSPATH' ) ) {
	require_once '/wordpress/wp-load.php';
}

const MTS_GOOD_SLUG = 'privacy-policy';

/* ------------------------------------------------- 1. identify the two pages */

$mts_real = get_page_by_path( 'privacy-policy-2' );
$mts_stub = get_page_by_path( MTS_GOOD_SLUG );

if ( ! $mts_real && $mts_stub && strlen( $mts_stub->post_content ) > 6000 ) {
	echo "already correct: the real policy holds /" . MTS_GOOD_SLUG . "/\n";
	$mts_real = $mts_stub;
	$mts_stub = null;
}

if ( ! $mts_real ) {
	exit( "could not find the real privacy policy — aborting without changes\n" );
}

printf( "real policy : #%d  %s  (%d bytes, %s)\n",
	$mts_real->ID, $mts_real->post_name, strlen( $mts_real->post_content ), $mts_real->post_status );

/* ------------------------------------------------------ 2. clear the slug */

if ( $mts_stub && $mts_stub->ID !== $mts_real->ID ) {
	printf( "boilerplate : #%d  %s  (%d bytes, %s)\n",
		$mts_stub->ID, $mts_stub->post_name, strlen( $mts_stub->post_content ), $mts_stub->post_status );

	// Only ever trash WordPress's own unused default. If something with real
	// content is sitting on that slug, stop and say so rather than bulldoze it.
	if ( false === strpos( $mts_stub->post_content, 'Suggested text' ) ) {
		exit( "  the page on /" . MTS_GOOD_SLUG . "/ is NOT the WordPress boilerplate — stopping, nothing changed\n" );
	}

	wp_trash_post( $mts_stub->ID );
	echo "  trashed the boilerplate (recoverable from Pages -> Trash)\n";
}

/* -------------------------------------------------- 3. move the real policy */

if ( MTS_GOOD_SLUG !== $mts_real->post_name ) {
	$mts_res = wp_update_post( array(
		'ID'        => $mts_real->ID,
		'post_name' => MTS_GOOD_SLUG,
	), true );

	if ( is_wp_error( $mts_res ) ) {
		exit( '  ERROR moving slug: ' . $mts_res->get_error_message() . "\n" );
	}

	$mts_now = get_post_field( 'post_name', $mts_real->ID );
	echo "  slug: privacy-policy-2 -> {$mts_now}\n";

	if ( MTS_GOOD_SLUG !== $mts_now ) {
		echo "  WARNING: WordPress kept a different slug ({$mts_now}) — something still holds it\n";
	}
}

/* ------------------------------------------------------- 4. the menu items */

echo "\nmenu items:\n";
$mts_fixed = 0;

foreach ( (array) wp_get_nav_menus() as $mts_menu ) {
	foreach ( (array) wp_get_nav_menu_items( $mts_menu->term_id ) as $mts_item ) {
		$mts_is_privacy = false !== stripos( $mts_item->title, 'privacy' )
			|| false !== stripos( (string) $mts_item->url, 'privacy' )
			|| (bool) preg_match( '#[?&]page_id=' . ( $mts_stub->ID ?? 0 ) . '\b#', (string) $mts_item->url );

		if ( ! $mts_is_privacy ) {
			continue;
		}

		if ( 'post_type' === $mts_item->type && (int) $mts_item->object_id === $mts_real->ID ) {
			echo "  [{$mts_menu->name}] \"{$mts_item->title}\" already points at the page object\n";
			continue;
		}

		// A proper object link, so it resolves through get_permalink() at render
		// time rather than carrying a frozen URL.
		update_post_meta( $mts_item->ID, '_menu_item_type', 'post_type' );
		update_post_meta( $mts_item->ID, '_menu_item_object', 'page' );
		update_post_meta( $mts_item->ID, '_menu_item_object_id', (string) $mts_real->ID );
		update_post_meta( $mts_item->ID, '_menu_item_url', '' );

		printf( "  [%s] \"%s\"  custom -> page #%d\n", $mts_menu->name, $mts_item->title, $mts_real->ID );
		++$mts_fixed;
	}
}

echo 0 === $mts_fixed ? "  (nothing to change)\n" : "  {$mts_fixed} item(s) repointed\n";

/* --------------------------------------------- 5. WordPress's own setting */

if ( (int) get_option( 'wp_page_for_privacy_policy' ) !== $mts_real->ID ) {
	update_option( 'wp_page_for_privacy_policy', $mts_real->ID );
	echo "\nwp_page_for_privacy_policy -> #{$mts_real->ID}\n";
}

/* ------------------------------------------------------------- 6. verify */

wp_cache_flush();

echo "\n=== verification ===\n";

$mts_check = get_page_by_path( MTS_GOOD_SLUG );
printf( "  /%s/          -> %s\n", MTS_GOOD_SLUG,
	$mts_check ? '#' . $mts_check->ID . ' ' . $mts_check->post_status . ' (' . strlen( $mts_check->post_content ) . ' bytes)' : 'NOTHING (404)' );

$mts_old = get_page_by_path( 'privacy-policy-2' );
printf( "  /privacy-policy-2/    -> %s\n", $mts_old ? '#' . $mts_old->ID : 'gone (matches live, which also 404s here)' );

printf( "  permalink             -> %s\n", get_permalink( $mts_real->ID ) );

foreach ( (array) wp_get_nav_menus() as $mts_menu ) {
	foreach ( (array) wp_get_nav_menu_items( $mts_menu->term_id ) as $mts_item ) {
		if ( false !== stripos( $mts_item->title, 'privacy' ) ) {
			printf( "  menu \"%s\" (%s) -> %s\n", $mts_item->title, $mts_menu->name, $mts_item->url );
		}
	}
}
