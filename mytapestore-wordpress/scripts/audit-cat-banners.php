<?php
/**
 * Which of the 403 category banners does the site actually use?
 *
 * assets/img/site/cat/ is 29MB — two thirds of the whole theme archive, and the
 * reason the zip is too large to upload through wp-admin on a typical host.
 *
 * woocommerce/archive-product.php looks them up BY SLUG:
 *
 *     mts_asset( 'img/site/cat/' . $term->slug . '.jpg' )
 *     mts_asset( 'img/site/cat/' . $term->slug . '-wide.jpg' )
 *
 * so a file whose basename matches no product_cat term can never be requested by
 * anything. Those are pure weight. This reports them before any are removed —
 * deleting artwork on an assumption about a naming convention is how a category
 * page silently loses its banner.
 *
 * @package mytapestore
 */

if ( ! defined( 'ABSPATH' ) ) {
	require_once '/wordpress/wp-load.php';
}

$mts_dir = get_template_directory() . '/assets/img/site/cat/';

if ( ! is_dir( $mts_dir ) ) {
	exit( "no cat banner directory\n" );
}

$mts_slugs = get_terms( array(
	'taxonomy'   => 'product_cat',
	'hide_empty' => false,
	'fields'     => 'slugs',
) );

$mts_slugs = is_wp_error( $mts_slugs ) ? array() : array_flip( (array) $mts_slugs );

printf( "product_cat terms : %d\n", count( $mts_slugs ) );

$mts_files  = array_diff( (array) scandir( $mts_dir ), array( '.', '..' ) );
$mts_used   = array();
$mts_unused = array();
$mts_kb_u   = 0;
$mts_kb_x   = 0;

foreach ( $mts_files as $mts_f ) {
	if ( ! preg_match( '/\.jpe?g$/i', $mts_f ) ) {
		continue;
	}

	// Strip the variant suffixes the template and any srcset may ask for.
	$mts_base = preg_replace( '/(-wide|-(800|1200|1600))?\.jpe?g$/i', '', $mts_f );
	$mts_size = (int) filesize( $mts_dir . $mts_f );

	if ( isset( $mts_slugs[ $mts_base ] ) ) {
		$mts_used[] = $mts_f;
		$mts_kb_u  += $mts_size;
	} else {
		$mts_unused[ $mts_base ][] = $mts_f;
		$mts_kb_x                 += $mts_size;
	}
}

printf( "banner files      : %d\n\n", count( $mts_used ) + array_sum( array_map( 'count', $mts_unused ) ) );
printf( "  USED   %4d files  %6.1f MB\n", count( $mts_used ), $mts_kb_u / 1048576 );
printf( "  UNUSED %4d files  %6.1f MB   (%d basenames with no matching term)\n\n",
	array_sum( array_map( 'count', $mts_unused ) ), $mts_kb_x / 1048576, count( $mts_unused ) );

if ( $mts_unused ) {
	echo "unused basenames (first 40):\n";
	$mts_i = 0;
	foreach ( $mts_unused as $mts_base => $mts_list ) {
		printf( "  %-52s %s\n", $mts_base, implode( ', ', $mts_list ) );
		if ( ++$mts_i >= 40 ) {
			printf( "  … and %d more\n", count( $mts_unused ) - 40 );
			break;
		}
	}
}

echo "\nterms with NO banner at all (page falls back):\n";
$mts_missing = 0;
foreach ( array_keys( $mts_slugs ) as $mts_slug ) {
	if ( ! file_exists( $mts_dir . $mts_slug . '.jpg' ) ) {
		if ( $mts_missing < 15 ) {
			echo "  {$mts_slug}\n";
		}
		++$mts_missing;
	}
}
printf( "  (%d terms without a banner)\n", $mts_missing );
