<?php
/**
 * Match the live site's blog URL structure.
 *
 * mytapestore.com.au serves articles at /blog/<slug>/ — checked against its own
 * REST API, which reports links like
 * https://mytapestore.com.au/blog/hardwood-floor-protection-hacks-australia/.
 *
 * This install was on WordPress's dated default, /%year%/%monthnum%/%day%/%postname%/,
 * so the same article lived at /2025/11/05/hardwood-floor-protection-hacks-australia/.
 * Every inbound link, every share and every search result that points at the live
 * URL would 404 after a cutover, and the two sites could not be compared page for
 * page.
 *
 * /blog/ is also the posts page, and that is fine: WordPress resolves the page at
 * the bare path and articles beneath it. It is the same arrangement the live site
 * runs.
 *
 * Run (note --site-url; see fix-site-url.php for why):
 *   ./node_modules/.bin/wp-playground-cli php \
 *     --site-url=http://localhost:9400 \
 *     --mount-before-install=./local/wordpress:/wordpress \
 *     --mount=./theme:/wordpress/wp-content/themes/mytapestore \
 *     --mount=./scripts:/wordpress/mts-scripts \
 *     --wordpress-install-mode=install-from-existing-files \
 *     -- /wordpress/mts-scripts/fix-post-permalinks.php
 *
 * Idempotent.
 *
 * @package mytapestore
 */

if ( ! defined( 'ABSPATH' ) ) {
	require_once '/wordpress/wp-load.php';
}

$mts_want = '/blog/%postname%/';
$mts_now  = get_option( 'permalink_structure' );

echo "permalink structure: " . var_export( $mts_now, true ) . "\n";

if ( $mts_now !== $mts_want ) {
	update_option( 'permalink_structure', $mts_want );
	echo "  -> {$mts_want}\n";
}

/*
 * Products keep their own base (/product/<slug>/), which WooCommerce owns
 * separately — changing the post structure must not disturb it.
 */
$mts_perm = (array) get_option( 'woocommerce_permalinks', array() );
echo "product base: " . ( $mts_perm['product_base'] ?? '(default)' ) . "\n";

flush_rewrite_rules( true );
echo "\nrewrite rules flushed\n";

$mts_sample = get_posts( array( 'post_type' => 'post', 'numberposts' => 3 ) );
foreach ( $mts_sample as $mts_post ) {
	echo "  " . get_permalink( $mts_post->ID ) . "\n";
}
