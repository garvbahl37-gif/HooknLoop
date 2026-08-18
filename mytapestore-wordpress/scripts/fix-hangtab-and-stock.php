<?php
/**
 * Two corrections.
 *
 * 1. THE HANG TAB APPLICATIONS IMAGE GOES IN THE DESCRIPTION, NOT THE GALLERY.
 *
 *    A previous pass appended it to _product_image_gallery, which put it in the
 *    thumbnail rail beside the product shots. That is not where the live site
 *    shows it: on mytapestore.com.au it sits inside the description, in a
 *    two-column Shortcodes Ultimate block next to the Key Features list —
 *
 *      <div class="su-column su-column-size-1-2">
 *        <img src=".../Hang-Tab-Applications.png" width="500" height="500">
 *
 *    The draft carries no Shortcodes Ultimate, so the block itself cannot be
 *    reproduced; what matters is that the image renders with the description,
 *    which appending it to post_content achieves. It is removed from the gallery
 *    in the same pass so it does not appear twice.
 *
 * 2. DESK TAPES DISPENSER IS BACK IN STOCK.
 *
 *    Reported as wrongly out of stock. WooCommerce keeps stock state in two
 *    places — the _stock_status meta and the product lookup table the shop and
 *    filters actually query — so setting the meta alone leaves the archive still
 *    showing it as unavailable. $product->set_stock_status() writes both.
 *
 * Idempotent: re-running neither duplicates the image nor changes stock twice.
 *
 *   ./node_modules/.bin/wp-playground-cli php \
 *     --site-url=http://127.0.0.1:9400 \
 *     --mount-before-install=./local/wordpress:/wordpress \
 *     --mount=./theme:/wordpress/wp-content/themes/mytapestore \
 *     --mount=./scripts:/wordpress/mts-scripts \
 *     --mount=./build/deploy/uploads:/wordpress/wp-content/uploads \
 *     --wordpress-install-mode=install-from-existing-files \
 *     -- /wordpress/mts-scripts/fix-hangtab-and-stock.php
 *
 * @package mytapestore
 */

if ( ! defined( 'ABSPATH' ) ) {
	require_once '/wordpress/wp-load.php';
}

/* ------------------------------------------------ 1. hang tab applications */

echo "=== hang tab applications image ===\n";

$mts_rel = '2025/06/Hang-Tab-Applications.png';

global $wpdb;
$mts_att = (int) $wpdb->get_var( $wpdb->prepare(
	"SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key='_wp_attached_file' AND meta_value=%s LIMIT 1",
	$mts_rel
) );

if ( ! $mts_att ) {
	echo "  attachment not found for {$mts_rel} — run attach-application-images.php first\n";
} else {
	$mts_url  = wp_get_attachment_url( $mts_att );
	$mts_term = get_term_by( 'slug', 'hang-tab', 'product_cat' );

	$mts_products = $mts_term ? get_posts( array(
		'post_type'   => 'product',
		'post_status' => 'publish',
		'numberposts' => -1,
		'fields'      => 'ids',
		'tax_query'   => array( array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query
			'taxonomy' => 'product_cat',
			'field'    => 'term_id',
			'terms'    => $mts_term->term_id,
		) ),
	) ) : array();

	foreach ( $mts_products as $mts_id ) {
		$mts_name = get_post_field( 'post_name', $mts_id );

		// -- out of the gallery ------------------------------------------------
		$mts_gallery = array_values( array_filter(
			explode( ',', (string) get_post_meta( $mts_id, '_product_image_gallery', true ) ),
			static fn( $v ): bool => '' !== trim( $v ) && (int) $v !== $mts_att
		) );
		update_post_meta( $mts_id, '_product_image_gallery', implode( ',', $mts_gallery ) );

		// -- into the description ----------------------------------------------
		$mts_content = (string) get_post_field( 'post_content', $mts_id );

		if ( false !== strpos( $mts_content, 'Hang-Tab-Applications' ) ) {
			echo "  = {$mts_name} (description already had it)\n";
			continue;
		}

		$mts_block = "\n\n<figure class=\"wp-block-image mts-applications\">"
			. '<img src="' . esc_url( $mts_url ) . '" alt="'
			. esc_attr__( 'Hang tab applications: electronic accessories, cosmetic and personal care, and stationery displays', 'mytapestore' )
			. '" width="1536" height="1024" loading="lazy" decoding="async" />'
			. "</figure>\n";

		wp_update_post( array(
			'ID'           => $mts_id,
			'post_content' => $mts_content . $mts_block,
		) );

		echo "  + {$mts_name}\n";
	}
}

/* ------------------------------------------------------------ 2. stock */

echo "\n=== stock ===\n";

foreach ( array( 'desk-tapes-dispenser' ) as $mts_slug ) {
	$mts_post = get_page_by_path( $mts_slug, OBJECT, 'product' );
	if ( ! $mts_post ) {
		echo "  {$mts_slug}: not found\n";
		continue;
	}

	$mts_product = wc_get_product( $mts_post->ID );
	if ( ! $mts_product ) {
		echo "  {$mts_slug}: not a product\n";
		continue;
	}

	$mts_before = $mts_product->get_stock_status();

	// set_stock_status() + save() updates the lookup table too; writing the meta
	// directly would leave the shop archive still filtering it out.
	$mts_product->set_stock_status( 'instock' );
	$mts_product->save();

	echo "  {$mts_slug}: {$mts_before} -> " . wc_get_product( $mts_post->ID )->get_stock_status() . "\n";
}

echo "\ndone.\n";
