<?php
/**
 * Group the products that need an application image by what they ACTUALLY ARE.
 *
 * The first pass grouped on each product's first product_cat term and produced
 * 24 groups — but that list mixed product TYPES (glue-dots, magnetic-tapes) with
 * INDUSTRIES (aerospace-defense, building-construction, hvac-plumbing). An
 * application image has to show the tape doing its job, so grouping 23 products
 * under "building construction" would mean one picture standing in for a foam
 * tape, a filament tape and a flashing tape at once. That is how you get a
 * generic photo that means nothing on any of the three pages.
 *
 * So this reports EVERY term each product carries, plus the product title, and
 * lets the grouping key be chosen from evidence rather than from whichever term
 * happened to sort first.
 *
 * @package mytapestore
 */

if ( ! defined( 'ABSPATH' ) ) {
	require_once '/wordpress/wp-load.php';
}

/**
 * Does this product's description already show an application image?
 *
 * ANY IMAGE COUNTS. This test used to look for applications/application/-apps/
 * uses in the <img> FILENAME, and that was wrong in a way that cost real work:
 * 90 of the 133 products already carried a plate, and 87 of those are hosted on
 * cdn.shopify.com under hashed names like bf7ccc7751cf.jpg. A filename test
 * cannot see them. The audit reported 126 products missing artwork when the true
 * figure was 43, and 83 products were given a second plate stacked under the one
 * they already had.
 *
 * The lesson is that the filename was never evidence of anything. These images
 * came from the live site with whatever names their original author chose, and
 * nothing ever required those names to describe the contents.
 *
 * So the test is now positional: this store puts a single editorial image in a
 * product description and that image IS the applications plate. If a description
 * already contains an <img> we did not add, the product is not missing one.
 */
function mts_has_app_image( int $id ): string {
	$content = (string) get_post_field( 'post_content', $id );

	if ( ! preg_match_all( '#<img[^>]+src=["\']([^"\']+)["\']#i', $content, $m ) ) {
		return '';
	}

	foreach ( $m[1] as $src ) {
		return strtolower( basename( (string) ( wp_parse_url( $src, PHP_URL_PATH ) ?: $src ) ) );
	}

	return '';
}

/*
 * Industry terms describe WHO BUYS, not WHAT IT IS. They are never a good key
 * for an application image, so they are demoted when choosing one.
 */
const MTS_INDUSTRY_TERMS = array(
	'aerospace-defense', 'building-construction', 'automotive', 'hvac-plumbing',
	'printing', 'display-signage', 'electronics-electrical', 'framing-insulation',
	'marine', 'transport-automotive-rv', 'warehouse-packaging-logistics',
	'airconditioning-refrigeration-tapes', 'picture-framing-tapes',
	'tapes-for-school-library', 'telecommunication', 'solar-energy',
	'roofing-gutters', 'windows-doors-decking', 'pool-spa', 'signage',
	'sheathing-moisture-management', 'tapes-for-visual-arts-entertainment',
);

$products = get_posts( array(
	'post_type'   => 'product',
	'post_status' => 'publish',
	'numberposts' => -1,
) );

$rows = array();

foreach ( $products as $p ) {
	if ( '' !== mts_has_app_image( $p->ID ) ) {
		continue;
	}

	$terms = get_the_terms( $p->ID, 'product_cat' );
	$slugs = ( $terms && ! is_wp_error( $terms ) ) ? wp_list_pluck( $terms, 'slug' ) : array();

	// Prefer a term that describes the product; fall back to whatever exists.
	$type = '';
	foreach ( $slugs as $s ) {
		if ( ! in_array( $s, MTS_INDUSTRY_TERMS, true ) ) {
			$type = $s;
			break;
		}
	}

	$rows[] = array(
		'id'    => $p->ID,
		'title' => $p->post_title,
		'slug'  => $p->post_name,
		'terms' => $slugs,
		'type'  => $type,
	);
}

printf( "%d products need an application image\n\n", count( $rows ) );

echo "=== products whose ONLY categories are industries (no type term) ===\n";
$orphans = 0;
foreach ( $rows as $r ) {
	if ( '' === $r['type'] ) {
		printf( "  %-52s [%s]\n", mb_substr( $r['title'], 0, 52 ), implode( ', ', $r['terms'] ) );
		++$orphans;
	}
}
printf( "  (%d)\n", $orphans );

$groups = array();
foreach ( $rows as $r ) {
	$key = '' !== $r['type'] ? $r['type'] : '(industry-only)';
	$groups[ $key ][] = $r;
}
ksort( $groups );

printf( "\n=== grouped by PRODUCT TYPE (%d groups) ===\n", count( $groups ) );
foreach ( $groups as $key => $list ) {
	printf( "\n  %s  (%d)\n", $key, count( $list ) );
	foreach ( array_slice( $list, 0, 6 ) as $r ) {
		printf( "      %s\n", mb_substr( $r['title'], 0, 68 ) );
	}
	if ( count( $list ) > 6 ) {
		printf( "      … and %d more\n", count( $list ) - 6 );
	}
}

file_put_contents( '/keys/app-image-audit.json', wp_json_encode( array(
	'groups' => $groups,
	'total'  => count( $rows ),
), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) );

echo "\nwrote /keys/app-image-audit.json\n";
