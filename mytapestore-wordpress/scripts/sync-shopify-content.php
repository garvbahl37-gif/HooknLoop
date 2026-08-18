<?php
/**
 * Write the Shopify product content into WooCommerce.
 *
 * Reads content/shopify-products.json (produced by pull-shopify-content.py) and
 * for each product that exists in WooCommerce sets:
 *
 *   post_content      the description as the Shopify PDP renders it, replacing
 *                     the old site's [vc_row]/su-column page-builder residue
 *   _mts_brand        Shopify's `vendor` — the Brand chip said "My Tape Store"
 *                     on every product because WooCommerce has no vendor field
 *                     and the template fell back to the shop name
 *   _mts_specs        the engineering rows for the Specifications tab
 *   _mts_key_specs    the ticked strip beside the gallery
 *
 * It matches on SLUG, which is the Shopify handle — both catalogues came from
 * the same source, so the handles line up. Anything that does not match is
 * reported rather than guessed at.
 *
 * Run:
 *   ./node_modules/.bin/wp-playground-cli php \
 *     --site-url=http://localhost:9400 \
 *     --mount-before-install=./local/wordpress:/wordpress \
 *     --mount=./theme:/wordpress/wp-content/themes/mytapestore \
 *     --mount=./scripts:/wordpress/mts-scripts \
 *     --mount=./content:/wordpress/mts-content \
 *     --wordpress-install-mode=install-from-existing-files \
 *     /wordpress/mts-scripts/sync-shopify-content.php
 *
 * ALWAYS pass --site-url. Without it the CLI boots on a random port and writes
 * that port into the siteurl/home options, so the live dev server then
 * canonical-redirects every visitor to a dead address.
 *
 * Idempotent: running it twice writes the same values.
 *
 * @package mytapestore
 */

if ( ! defined( 'ABSPATH' ) ) {
	require_once '/wordpress/wp-load.php';
}

if ( ! function_exists( 'wc_get_product' ) ) {
	fwrite( STDERR, "WooCommerce is not active.\n" );
	exit( 1 );
}

$mts_source = '/wordpress/mts-content/shopify-products.json';

if ( ! file_exists( $mts_source ) ) {
	fwrite( STDERR, "missing {$mts_source} — run scripts/pull-shopify-content.py first.\n" );
	exit( 1 );
}

$mts_records = json_decode( (string) file_get_contents( $mts_source ), true );

if ( ! is_array( $mts_records ) ) {
	fwrite( STDERR, "{$mts_source} is not valid JSON.\n" );
	exit( 1 );
}

echo count( $mts_records ) . " products in the Shopify export\n\n";

$mts_updated = 0;
$mts_missing = array();
$mts_stats   = array( 'desc' => 0, 'brand' => 0, 'specs' => 0, 'key' => 0, 'tiers_cleared' => 0 );

foreach ( $mts_records as $mts_record ) {
	$mts_handle = (string) ( $mts_record['handle'] ?? '' );
	if ( '' === $mts_handle ) {
		continue;
	}

	$mts_post = get_page_by_path( $mts_handle, OBJECT, 'product' );

	if ( ! $mts_post ) {
		$mts_missing[] = $mts_handle;
		continue;
	}

	$mts_id      = (int) $mts_post->ID;
	$mts_changes = array();

	// --- description ------------------------------------------------------
	$mts_desc = trim( (string) ( $mts_record['description'] ?? '' ) );
	if ( '' !== $mts_desc && $mts_desc !== $mts_post->post_content ) {
		wp_update_post( array(
			'ID'           => $mts_id,
			'post_content' => wp_slash( $mts_desc ),
		) );
		$mts_changes[] = 'description';
		$mts_stats['desc']++;
	}

	// --- brand ------------------------------------------------------------
	$mts_brand = trim( (string) ( $mts_record['vendor'] ?? '' ) );
	if ( '' !== $mts_brand ) {
		if ( get_post_meta( $mts_id, '_mts_brand', true ) !== $mts_brand ) {
			update_post_meta( $mts_id, '_mts_brand', $mts_brand );
			$mts_changes[] = "brand={$mts_brand}";
			$mts_stats['brand']++;
		}
	}

	// --- engineering specs ------------------------------------------------
	$mts_specs = array();
	foreach ( (array) ( $mts_record['specs'] ?? array() ) as $mts_spec ) {
		$mts_label = trim( (string) ( $mts_spec['label'] ?? '' ) );
		$mts_value = trim( (string) ( $mts_spec['value'] ?? '' ) );
		if ( '' !== $mts_label && '' !== $mts_value ) {
			$mts_specs[] = array( 'label' => $mts_label, 'value' => $mts_value );
		}
	}
	if ( $mts_specs ) {
		update_post_meta( $mts_id, '_mts_specs', $mts_specs );
		$mts_changes[] = count( $mts_specs ) . ' specs';
		$mts_stats['specs']++;
	} else {
		delete_post_meta( $mts_id, '_mts_specs' );
	}

	// --- key specs --------------------------------------------------------
	$mts_key = array_values( array_filter( array_map(
		static fn( $s ) => trim( (string) $s ),
		(array) ( $mts_record['key_specs'] ?? array() )
	), 'strlen' ) );

	if ( $mts_key ) {
		update_post_meta( $mts_id, '_mts_key_specs', $mts_key );
		$mts_changes[] = count( $mts_key ) . ' key specs';
		$mts_stats['key']++;
	} else {
		delete_post_meta( $mts_id, '_mts_key_specs' );
	}

	/*
	 * --- volume tiers -----------------------------------------------------
	 *
	 * The legacy site carried quantity price breaks on products Shopify does
	 * NOT show them on — Kikusui, for one, rendered a four-band discount table
	 * in WooCommerce and none on Shopify. A price break the two stores disagree
	 * about is worse than a cosmetic difference: it is two different prices for
	 * the same quantity of the same product.
	 *
	 * Shopify is the reference, so where Shopify shows no bands the flag below
	 * suppresses them here too. The underlying tier meta is left untouched, so
	 * turning them back on is a one-line change and no pricing data is lost.
	 */
	$mts_has_tiers = ! empty( $mts_record['has_volume_tiers'] );
	if ( $mts_has_tiers ) {
		delete_post_meta( $mts_id, '_mts_hide_tiers' );
	} elseif ( ! get_post_meta( $mts_id, '_mts_hide_tiers', true ) ) {
		update_post_meta( $mts_id, '_mts_hide_tiers', '1' );
		$mts_changes[] = 'tiers hidden';
		$mts_stats['tiers_cleared']++;
	}

	if ( $mts_changes ) {
		++$mts_updated;
		echo "  {$mts_handle}: " . implode( ', ', $mts_changes ) . "\n";
	}
}

echo "\n--- summary ---\n";
echo "updated:        {$mts_updated}\n";
echo "descriptions:   {$mts_stats['desc']}\n";
echo "brands:         {$mts_stats['brand']}\n";
echo "spec sets:      {$mts_stats['specs']}\n";
echo "key spec sets:  {$mts_stats['key']}\n";
echo "tiers hidden:   {$mts_stats['tiers_cleared']}\n";

if ( $mts_missing ) {
	echo "\nno WooCommerce product for " . count( $mts_missing ) . " Shopify handle(s):\n";
	foreach ( $mts_missing as $mts_handle ) {
		echo "  - {$mts_handle}\n";
	}
}
