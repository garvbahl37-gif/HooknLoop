<?php
/**
 * Make every URL identical to mytapestore.com.au.
 *
 * WHY THIS IS THE MOST IMPORTANT SCRIPT IN THE CUTOVER
 *
 * The draft served categories at /product-category/<slug>/. The live site serves
 * them at /<slug>/ — no base at all — and 301s /product-category/masking-tape/
 * back to /masking-tape/, so the bare form is deliberate and canonical.
 *
 * That is 65 of 66 category URLs. Replacing the live site without fixing it
 * would 404 every category landing page: organic rankings on the pages that earn
 * the most traffic, and every Google Ads final URL pointing at a category, which
 * gets disapproved on landing-page policy within days.
 *
 * WHAT MAKES THE TWO SHAPES WORK
 *
 * The live site has ONE base setting and a term hierarchy that produces both
 * shapes for free:
 *
 *     product_cat base = ''      (empty)
 *     'industry' is a top-level term with 26 children
 *
 *     acribond-accessories   top level          →  /acribond-accessories/
 *     aerospace-defense      child of industry  →  /industry/aerospace-defense/
 *
 * WooCommerce registers product_cat with `rewrite['hierarchical'] => true`, so
 * with an empty base a child term's URL already includes its parent's slug.
 * Verified: the draft has the identical hierarchy — the same 26 children under
 * the same 'industry' parent — so emptying the base is the whole change. No
 * per-term rules, no redirect table.
 *
 * WHY AN EMPTY BASE IS SAFE HERE
 *
 * A bare category base can shadow pages, because /masking-tape/ and a page
 * called "masking-tape" want the same URL. Two things make it safe:
 *
 *   · checked, and there are ZERO collisions — 65 categories against 35 pages,
 *     54 posts and WordPress's own reserved paths. The check runs again below
 *     and REFUSES to write if that ever stops being true.
 *   · the permalink structure is /blog/%postname%/, which sets
 *     use_verbose_page_rules — WordPress then emits an explicit rule per page
 *     rather than a catch-all, so pages win their own URLs and everything else
 *     falls through to the category rules.
 *
 * Run (note --site-url; see fix-site-url.php for why):
 *   ./node_modules/.bin/wp-playground-cli php \
 *     --site-url=http://localhost:9400 \
 *     --mount-before-install=./local/wordpress:/wordpress \
 *     --mount=./theme:/wordpress/wp-content/themes/mytapestore \
 *     --mount=./scripts:/wordpress/mts-scripts \
 *     --wordpress-install-mode=install-from-existing-files \
 *     -- /wordpress/mts-scripts/match-live-urls.php
 *
 * Idempotent. Read-only until it has proved there are no collisions.
 *
 * @package mytapestore
 */

if ( ! defined( 'ABSPATH' ) ) {
	require_once '/wordpress/wp-load.php';
}

echo "=== URL parity with mytapestore.com.au ===\n\n";

/* ---------------------------------------------------------------- 1. safety */

$mts_cat_slugs = get_terms( array(
	'taxonomy'   => 'product_cat',
	'hide_empty' => false,
	'fields'     => 'slugs',
) );

if ( is_wp_error( $mts_cat_slugs ) ) {
	fwrite( STDERR, "could not read product categories\n" );
	exit( 1 );
}

$mts_page_slugs = array();
foreach ( get_posts( array( 'post_type' => array( 'page', 'post' ), 'post_status' => 'any', 'numberposts' => -1 ) ) as $mts_p ) {
	$mts_page_slugs[] = $mts_p->post_name;
}

// Paths WordPress and WooCommerce own. A category with one of these slugs would
// take the cart, the checkout or the account area down.
$mts_reserved = array(
	'shop', 'cart', 'checkout', 'my-account', 'blog', 'wishlist',
	'wp-admin', 'wp-content', 'wp-includes', 'wp-json', 'feed', 'page',
	'product', 'author', 'comments', 'search', 'embed',
);

$mts_clashes = array_values( array_intersect(
	$mts_cat_slugs,
	array_merge( $mts_page_slugs, $mts_reserved )
) );

printf( "categories: %d   pages+posts: %d\n", count( $mts_cat_slugs ), count( $mts_page_slugs ) );

if ( $mts_clashes ) {
	fwrite( STDERR, "\nREFUSING TO WRITE — these category slugs collide with a page, post or reserved path:\n" );
	foreach ( $mts_clashes as $mts_clash ) {
		fwrite( STDERR, "  - {$mts_clash}\n" );
	}
	fwrite( STDERR, "\nWith an empty category base each of these would fight for the same URL.\nRename one side, then re-run.\n" );
	exit( 1 );
}

echo "collision check: clean\n\n";

/* ------------------------------------------------------------ 2. the change */

$mts_perm = (array) get_option( 'woocommerce_permalinks', array() );

echo "before:\n";
printf( "  category_base : %s\n", var_export( $mts_perm['category_base'] ?? null, true ) );
printf( "  tag_base      : %s\n", var_export( $mts_perm['tag_base'] ?? null, true ) );
printf( "  product_base  : %s\n", var_export( $mts_perm['product_base'] ?? null, true ) );

/*
 * Only the CATEGORY base changes. product_base stays 'product' — the live site
 * serves /product/<slug>/ and so does this one, so products already match and
 * touching them would break the one thing that was right.
 */
$mts_perm['category_base'] = '';
$mts_perm['attribute_base'] = $mts_perm['attribute_base'] ?? '';

update_option( 'woocommerce_permalinks', $mts_perm );

echo "\nafter:\n";
$mts_now = (array) get_option( 'woocommerce_permalinks', array() );
printf( "  category_base : %s  (empty = /<slug>/ like the live site)\n", var_export( $mts_now['category_base'], true ) );
printf( "  product_base  : %s  (unchanged — already matches)\n", var_export( $mts_now['product_base'] ?? 'product', true ) );

/*
 * The rules have to be rebuilt for the new base, and on wp_loaded rather than
 * here: at this point in a CLI run WooCommerce has registered product_cat with
 * the OLD base still in memory. Re-registering first is what makes the flush
 * write the rules we just asked for.
 */
if ( function_exists( 'WC' ) ) {
	WC_Post_Types::register_taxonomies();
}
flush_rewrite_rules( true );

echo "\nrewrite rules flushed\n";

/* --------------------------------------------------------------- 3. proof */

echo "\nsample URLs now:\n";
foreach ( array( 'acribond-accessories', 'masking-tape', 'aerospace-defense', 'building-construction' ) as $mts_slug ) {
	$mts_term = get_term_by( 'slug', $mts_slug, 'product_cat' );
	if ( ! $mts_term ) {
		continue;
	}
	$mts_link = get_term_link( $mts_term );
	printf( "  %-24s %s\n", $mts_slug, is_wp_error( $mts_link ) ? 'ERROR' : $mts_link );
}

$mts_product = get_posts( array( 'post_type' => 'product', 'numberposts' => 1 ) );
if ( $mts_product ) {
	printf( "  %-24s %s\n", '(a product)', get_permalink( $mts_product[0] ) );
}
