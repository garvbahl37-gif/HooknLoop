<?php
/**
 * Give every product in a set the same application image.
 *
 * WHAT AN "APPLICATION IMAGE" IS ON THIS STORE
 *
 * A three-panel triptych, 3:2 landscape, each panel a real-world use of the
 * product with a bold white uppercase caption on a black bar beneath it. The
 * live site's Hang-Tab-Applications.png is the reference: electronic
 * accessories / cosmetic & personal care / stationery, hanging on pegboard.
 *
 * WHY THIS SCRIPT EXISTS
 *
 * The hang tab products were imported with the image mismatched — a hook-and-loop
 * roll on one, green electrical tape on another, and only some carrying the
 * applications panel at all. The live site shows the SAME applications image on
 * every product in the category, which is the correct behaviour: the tabs differ
 * in shape, not in what they are for.
 *
 * IT IS APPENDED, NOT SUBSTITUTED. The featured image and the existing gallery
 * are left alone — those are the product and its dimension diagram, and both
 * belong. The applications panel goes on the END of the gallery, which is where
 * it sits on live.
 *
 * Idempotent: an attachment already in the gallery is not added twice.
 *
 *   ./node_modules/.bin/wp-playground-cli php \
 *     --site-url=http://127.0.0.1:9400 \
 *     --mount-before-install=./local/wordpress:/wordpress \
 *     --mount=./theme:/wordpress/wp-content/themes/mytapestore \
 *     --mount=./scripts:/wordpress/mts-scripts \
 *     --mount=./build/deploy/uploads:/wordpress/wp-content/uploads \
 *     --wordpress-install-mode=install-from-existing-files \
 *     -- /wordpress/mts-scripts/attach-application-images.php
 *
 * @package mytapestore
 */

if ( ! defined( 'ABSPATH' ) ) {
	require_once '/wordpress/wp-load.php';
}

/**
 * category slug => the uploads-relative path of its applications image.
 *
 * Add a row here as each category's image is produced.
 */
$mts_map = array(
	'hang-tab' => '2025/06/Hang-Tab-Applications.png',
);

/**
 * Find or create the attachment for an uploads-relative path.
 */
function mts_attachment_for( string $relative ): int {
	global $wpdb;

	$existing = $wpdb->get_var( $wpdb->prepare(
		"SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key='_wp_attached_file' AND meta_value=%s LIMIT 1",
		$relative
	) );
	if ( $existing ) {
		return (int) $existing;
	}

	$uploads = wp_get_upload_dir();
	$file    = trailingslashit( $uploads['basedir'] ) . $relative;

	if ( ! file_exists( $file ) ) {
		echo "    file not present: {$relative}\n";
		return 0;
	}

	$type = wp_check_filetype( basename( $file ), null );
	$id   = wp_insert_attachment( array(
		'guid'           => trailingslashit( $uploads['baseurl'] ) . $relative,
		'post_mime_type' => (string) $type['type'],
		'post_title'     => preg_replace( '/\.[^.]+$/', '', basename( $file ) ),
		'post_content'   => '',
		'post_status'    => 'inherit',
	), $file );

	if ( is_wp_error( $id ) || ! $id ) {
		echo "    could not create attachment for {$relative}\n";
		return 0;
	}

	require_once ABSPATH . 'wp-admin/includes/image.php';
	wp_update_attachment_metadata( $id, wp_generate_attachment_metadata( $id, $file ) );

	return (int) $id;
}

echo "=== application images ===\n\n";

foreach ( $mts_map as $mts_slug => $mts_path ) {
	$mts_term = get_term_by( 'slug', $mts_slug, 'product_cat' );
	if ( ! $mts_term ) {
		echo "{$mts_slug}: category not found\n";
		continue;
	}

	$mts_att = mts_attachment_for( $mts_path );
	if ( ! $mts_att ) {
		echo "{$mts_slug}: no attachment, skipping\n";
		continue;
	}

	echo "{$mts_slug}  (attachment {$mts_att})\n";

	$mts_products = get_posts( array(
		'post_type'      => 'product',
		'post_status'    => 'publish',
		'numberposts'    => -1,
		'fields'         => 'ids',
		'tax_query'      => array( array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query
			'taxonomy' => 'product_cat',
			'field'    => 'term_id',
			'terms'    => $mts_term->term_id,
		) ),
	) );

	foreach ( $mts_products as $mts_id ) {
		$mts_gallery = array_filter( explode( ',', (string) get_post_meta( $mts_id, '_product_image_gallery', true ) ) );

		if ( in_array( (string) $mts_att, $mts_gallery, true ) ) {
			echo '  = ' . get_post_field( 'post_name', $mts_id ) . " (already had it)\n";
			continue;
		}

		$mts_gallery[] = (string) $mts_att;
		update_post_meta( $mts_id, '_product_image_gallery', implode( ',', $mts_gallery ) );
		echo '  + ' . get_post_field( 'post_name', $mts_id ) . "\n";
	}
}

echo "\ndone.\n";
