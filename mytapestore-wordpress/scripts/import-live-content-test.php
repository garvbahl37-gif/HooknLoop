<?php
/**
 * Load the live site's raw pages into THIS draft, as a rendering test.
 *
 * WHAT THIS IS FOR
 *
 * The cutover plan is theme-only: my theme goes onto the live install and the
 * live database stays. That means the theme meets content it has never been
 * shown — 1,414 WPBakery shortcodes, 500 Shortcodes Ultimate ones, 83 Kapee
 * theme-extension calls. Nobody knows what that looks like, because every test
 * so far has run against the draft's own content.
 *
 * This imports the live raw content into the draft so the answer can be
 * measured locally instead of discovered on the storefront.
 *
 * NOTHING HERE TOUCHES THE LIVE SITE. It reads JSON that
 * scripts/pull-live-content.py already fetched read-only, and writes only into
 * this draft database.
 *
 * Every page is created with a `livetest-` slug prefix and _mts_livetest meta so
 * the whole set can be found and deleted again in one query. Run with --purge to
 * remove them.
 *
 *   ./node_modules/.bin/wp-playground-cli php \
 *     --site-url=http://127.0.0.1:9400 \
 *     --mount-before-install=./local/wordpress:/wordpress \
 *     --mount=./theme:/wordpress/wp-content/themes/mytapestore \
 *     --mount=./scripts:/wordpress/mts-scripts \
 *     --mount=./build:/wordpress/mts-build \
 *     --wordpress-install-mode=install-from-existing-files \
 *     -- /wordpress/mts-scripts/import-live-content-test.php
 *
 * @package mytapestore
 */

if ( ! defined( 'ABSPATH' ) ) {
	require_once '/wordpress/wp-load.php';
}

$mts_purge = in_array( '--purge', (array) ( $argv ?? array() ), true );

if ( $mts_purge ) {
	$mts_ids = get_posts( array(
		'post_type'   => 'page',
		'post_status' => 'any',
		'numberposts' => -1,
		'fields'      => 'ids',
		'meta_key'    => '_mts_livetest', // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
	) );
	foreach ( $mts_ids as $mts_id ) {
		wp_delete_post( $mts_id, true );
	}
	echo 'purged ' . count( $mts_ids ) . " live-test pages\n";
	return;
}

$mts_dir = '/wordpress/mts-build/live-content/pages';
if ( ! is_dir( $mts_dir ) ) {
	echo "missing {$mts_dir} — run scripts/pull-live-content.py first\n";
	return;
}

$mts_made = 0;
$mts_skip = 0;

foreach ( glob( $mts_dir . '/*.json' ) as $mts_file ) {
	$mts_row = json_decode( (string) file_get_contents( $mts_file ), true );
	if ( ! is_array( $mts_row ) || empty( $mts_row['slug'] ) ) {
		continue;
	}

	$mts_slug = 'livetest-' . $mts_row['slug'];

	// Idempotent: re-running must not pile up duplicates.
	$mts_existing = get_page_by_path( $mts_slug, OBJECT, 'page' );
	if ( $mts_existing ) {
		wp_delete_post( $mts_existing->ID, true );
	}

	$mts_id = wp_insert_post( array(
		'post_type'    => 'page',
		'post_status'  => 'publish',
		'post_name'    => $mts_slug,
		'post_title'   => (string) ( $mts_row['title']['raw'] ?? $mts_row['slug'] ),
		/*
		 * RAW content, unfiltered on the way in. wp_insert_post() would
		 * otherwise run it through kses and strip attributes the builders
		 * depend on — which would make the test render something the live site
		 * never had.
		 */
		'post_content' => (string) ( $mts_row['content']['raw'] ?? '' ),
		'meta_input'   => array(
			'_mts_livetest' => (string) ( $mts_row['id'] ?? '' ),
			'_mts_live_url' => (string) ( $mts_row['link'] ?? '' ),
		),
	), true );

	if ( is_wp_error( $mts_id ) ) {
		echo "  FAILED {$mts_slug}: " . $mts_id->get_error_message() . "\n";
		++$mts_skip;
		continue;
	}
	++$mts_made;
}

echo "imported {$mts_made} live pages as /livetest-*/ ({$mts_skip} failed)\n";
echo "purge with:  -- /wordpress/mts-scripts/import-live-content-test.php --purge\n";
