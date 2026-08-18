<?php
/**
 * Point WordPress at the store's own Privacy Policy page.
 *
 * `wp_page_for_privacy_policy` was never set on this install, so
 * get_privacy_policy_url() returned '' and every place that links the policy
 * quietly dropped the link: WooCommerce's checkout privacy notice, and the SMS
 * marketing-consent disclosure, which is required to name it.
 *
 * The page exists — it came across in the content sync as `privacy-policy-2`,
 * WordPress having already taken `privacy-policy` for its own draft sample page.
 *
 * Run (note --site-url; see fix-site-url.php for why):
 *   ./node_modules/.bin/wp-playground-cli php \
 *     --site-url=http://localhost:9400 \
 *     --mount-before-install=./local/wordpress:/wordpress \
 *     --mount=./scripts:/wordpress/mts-scripts \
 *     --wordpress-install-mode=install-from-existing-files \
 *     -- /wordpress/mts-scripts/set-privacy-page.php
 *
 * Idempotent.
 *
 * @package mytapestore
 */

if ( ! defined( 'ABSPATH' ) ) {
	require_once '/wordpress/wp-load.php';
}

// The real, populated page first; WordPress's own empty draft is the fallback.
$mts_page = get_page_by_path( 'privacy-policy-2' ) ?: get_page_by_path( 'privacy-policy' );

if ( ! $mts_page ) {
	fwrite( STDERR, "no privacy policy page found\n" );
	exit( 1 );
}

// A page WordPress left as a draft cannot be linked to from a public checkout.
if ( 'publish' !== $mts_page->post_status ) {
	wp_update_post( array( 'ID' => $mts_page->ID, 'post_status' => 'publish' ) );
	echo "published: {$mts_page->post_title}\n";
}

update_option( 'wp_page_for_privacy_policy', (int) $mts_page->ID );

echo "privacy policy page: #{$mts_page->ID} {$mts_page->post_title}\n";
echo "url: " . get_privacy_policy_url() . "\n";
