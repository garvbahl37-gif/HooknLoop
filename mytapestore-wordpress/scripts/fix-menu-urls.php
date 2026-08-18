<?php
/**
 * Repair menu links that point at a dead loopback port.
 *
 * WHAT HAPPENED
 *
 * `wp-playground-cli php` boots a throwaway server on a RANDOM port and writes
 * that port into the `siteurl`/`home` options. Any script run through it that
 * calls get_permalink() or get_term_link() therefore builds absolute URLs on a
 * port that stops existing the moment the script exits — and sync-menus.php
 * STORES those URLs in the menu items.
 *
 * The visible symptom was the footer "Blog" link resolving to
 * http://127.0.0.1:62019/blog/ : a link that simply does not open.
 *
 * This rewrites any menu URL whose host is a loopback name (localhost or
 * 127.0.0.1, any port) onto the site's current home URL, keeping the path. It is
 * safe to run at any time and does nothing on a site whose links are already
 * correct. Real external links are untouched.
 *
 * Run (and note --site-url, which is what stops this happening again):
 *   ./node_modules/.bin/wp-playground-cli php \
 *     --site-url=http://localhost:9400 \
 *     --mount-before-install=./local/wordpress:/wordpress \
 *     --mount=./scripts:/wordpress/mts-scripts \
 *     --wordpress-install-mode=install-from-existing-files \
 *     -- /wordpress/mts-scripts/fix-menu-urls.php
 *
 * @package mytapestore
 */

if ( ! defined( 'ABSPATH' ) ) {
	require_once '/wordpress/wp-load.php';
}

$mts_home = untrailingslashit( (string) get_option( 'home' ) );
echo "site home: {$mts_home}\n\n";

$mts_fixed   = 0;
$mts_checked = 0;

foreach ( wp_get_nav_menus() as $mts_menu ) {
	foreach ( (array) wp_get_nav_menu_items( $mts_menu->term_id ) as $mts_item ) {
		++$mts_checked;

		$mts_url = (string) $mts_item->url;
		if ( '' === $mts_url ) {
			continue;
		}

		$mts_host = (string) wp_parse_url( $mts_url, PHP_URL_HOST );
		if ( ! in_array( $mts_host, array( 'localhost', '127.0.0.1', '0.0.0.0', '::1' ), true ) ) {
			continue;
		}

		$mts_path = (string) wp_parse_url( $mts_url, PHP_URL_PATH );
		$mts_qs   = (string) wp_parse_url( $mts_url, PHP_URL_QUERY );
		$mts_new  = $mts_home . ( $mts_path ?: '/' ) . ( $mts_qs ? '?' . $mts_qs : '' );

		if ( $mts_new === $mts_url ) {
			continue;
		}

		update_post_meta( (int) $mts_item->ID, '_menu_item_url', $mts_new );
		echo "  [{$mts_menu->name}] {$mts_item->title}\n      {$mts_url}\n   -> {$mts_new}\n";
		++$mts_fixed;
	}
}

echo "\nchecked {$mts_checked} menu items, repaired {$mts_fixed}\n";
