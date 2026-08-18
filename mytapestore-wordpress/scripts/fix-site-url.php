<?php
/**
 * Pin siteurl/home to the dev server's address.
 *
 * WHY THIS IS NEEDED
 *
 * `wp-playground-cli php` boots its own throwaway server on a RANDOM port and,
 * in doing so, writes that port into the `siteurl` and `home` options. So every
 * maintenance script run through it leaves the site believing it lives at, say,
 * http://127.0.0.1:62159 — a port nothing is listening on once the script exits.
 * The next page load then canonical-redirects visitors to a dead address.
 *
 * Every script invocation in this repo must pass --site-url to prevent that.
 * This repairs a site that has already been clobbered.
 *
 * Run (note the --site-url):
 *   ./node_modules/.bin/wp-playground-cli php \
 *     --site-url=http://localhost:9400 \
 *     --mount-before-install=./local/wordpress:/wordpress \
 *     --wordpress-install-mode=install-from-existing-files \
 *     -- /wordpress/mts-scripts/fix-site-url.php
 *
 * @package mytapestore
 */

if ( ! defined( 'ABSPATH' ) ) {
	require_once '/wordpress/wp-load.php';
}

$mts_url = getenv( 'MTS_SITE_URL' ) ?: 'http://localhost:9400';

foreach ( array( 'siteurl', 'home' ) as $mts_option ) {
	$mts_was = get_option( $mts_option );
	if ( $mts_was !== $mts_url ) {
		update_option( $mts_option, $mts_url );
		echo "{$mts_option}: {$mts_was} -> {$mts_url}\n";
	} else {
		echo "{$mts_option}: already {$mts_url}\n";
	}
}
