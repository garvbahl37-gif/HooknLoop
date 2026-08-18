<?php
/**
 * Attach an application plate to every product that has none.
 *
 * Reads build/application-web/<type-slug>.jpg, mounted at /plates, imports each
 * once into the media library, and appends it to the DESCRIPTION of every
 * published product in that type group.
 *
 * WHY THE DESCRIPTION AND NOT THE GALLERY
 *
 * A previous pass appended the hang-tab plate to _product_image_gallery, which
 * put it in the thumbnail rail beside the product shots. That is not where the
 * live site shows it: on mytapestore.com.au the applications image sits inside
 * the description. It is editorial content about how the tape is used, not
 * another photograph of the roll, and in the gallery it competes with the
 * product shots it is supposed to support.
 *
 * WHY ONE PLATE PER TYPE AND NOT PER PRODUCT
 *
 * 126 products need artwork, but they are 31 distinct tape types. Applications
 * are a property of the TYPE: every width of double-sided foam tape mounts the
 * same mirror, and generating 126 near-identical images would cost 4x more and
 * produce 126 chances for one of them to be subtly wrong. The grouping key is
 * deliberately the product-type term, never an industry term — see
 * audit-application-images.php for why that distinction matters.
 *
 * IDEMPOTENT on both halves: an image already in the library is reused rather
 * than re-imported, and a product whose description already carries the plate is
 * skipped. Re-running after adding one new plate touches only that group.
 *
 *   ./node_modules/.bin/wp-playground-cli php \
 *     --site-url=http://127.0.0.1:9400 \
 *     --mount-before-install=./local/wordpress:/wordpress \
 *     --mount=./theme:/wordpress/wp-content/themes/mytapestore \
 *     --mount=./scripts:/wordpress/mts-scripts \
 *     --mount=./build/deploy/uploads:/wordpress/wp-content/uploads \
 *     --mount=./build/application-web:/plates \
 *     --wordpress-install-mode=install-from-existing-files \
 *     -- /wordpress/mts-scripts/install-application-images.php
 *
 * @package mytapestore
 */

if ( ! defined( 'ABSPATH' ) ) {
	require_once '/wordpress/wp-load.php';
}

require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/image.php';

const MTS_PLATES = '/plates';

/** Industry terms describe who buys, not what it is — never a grouping key. */
const MTS_INDUSTRY_TERMS = array(
	'aerospace-defense', 'building-construction', 'automotive', 'hvac-plumbing',
	'printing', 'display-signage', 'electronics-electrical', 'framing-insulation',
	'marine', 'transport-automotive-rv', 'warehouse-packaging-logistics',
	'airconditioning-refrigeration-tapes', 'picture-framing-tapes',
	'tapes-for-school-library', 'telecommunication', 'solar-energy',
	'roofing-gutters', 'windows-doors-decking', 'pool-spa', 'signage',
	'sheathing-moisture-management', 'tapes-for-visual-arts-entertainment',
);

const MTS_APP_MARKERS = array( 'applications', 'application', '-apps', 'uses' );

/** Does this product's description already show an applications plate? */
function mts_app_plate_present( int $id ): bool {
	$content = (string) get_post_field( 'post_content', $id );

	if ( preg_match_all( '#<img[^>]+src=["\']([^"\']+)["\']#i', $content, $m ) ) {
		foreach ( $m[1] as $src ) {
			$file = strtolower( basename( (string) ( parse_url( $src, PHP_URL_PATH ) ?: $src ) ) );
			foreach ( MTS_APP_MARKERS as $marker ) {
				if ( false !== strpos( $file, $marker ) ) {
					return true;
				}
			}
		}
	}

	return false;
}

/** The product-type term for a product, preferring a non-industry category. */
function mts_type_slug( int $id ): string {
	$terms = get_the_terms( $id, 'product_cat' );

	if ( ! $terms || is_wp_error( $terms ) ) {
		return '';
	}

	$slugs = wp_list_pluck( $terms, 'slug' );

	foreach ( $slugs as $s ) {
		if ( ! in_array( $s, MTS_INDUSTRY_TERMS, true ) ) {
			return (string) $s;
		}
	}

	return (string) ( $slugs[0] ?? '' );
}

/**
 * Import a plate once and return its attachment id.
 *
 * Keyed on the destination filename so a second run finds the existing
 * attachment instead of creating a duplicate — which would leave the media
 * library holding six copies of the same picture after six runs.
 */
function mts_import_plate( string $slug ): int {
	global $wpdb;

	$src = MTS_PLATES . '/' . $slug . '.jpg';

	if ( ! is_readable( $src ) ) {
		return 0;
	}

	$filename = $slug . '-applications.jpg';

	$existing = (int) $wpdb->get_var( $wpdb->prepare(
		"SELECT post_id FROM {$wpdb->postmeta}
		  WHERE meta_key = '_wp_attached_file' AND meta_value LIKE %s LIMIT 1",
		'%' . $wpdb->esc_like( $filename )
	) );

	if ( $existing ) {
		return $existing;
	}

	$upload = wp_upload_bits( $filename, null, (string) file_get_contents( $src ) );

	if ( ! empty( $upload['error'] ) ) {
		echo "    upload failed for {$slug}: {$upload['error']}\n";
		return 0;
	}

	$attachment_id = wp_insert_attachment( array(
		'post_mime_type' => 'image/jpeg',
		'post_title'     => ucwords( str_replace( '-', ' ', $slug ) ) . ' applications',
		'post_content'   => '',
		'post_status'    => 'inherit',
	), $upload['file'] );

	if ( ! $attachment_id || is_wp_error( $attachment_id ) ) {
		return 0;
	}

	wp_update_attachment_metadata(
		$attachment_id,
		wp_generate_attachment_metadata( $attachment_id, $upload['file'] )
	);

	return (int) $attachment_id;
}

/* ------------------------------------------------------------------ run */

$plates = glob( MTS_PLATES . '/*.jpg' ) ?: array();

if ( ! $plates ) {
	exit( "no plates found at " . MTS_PLATES . " — run prep-application-images.py first\n" );
}

printf( "%d plate(s) available\n\n", count( $plates ) );

$products = get_posts( array(
	'post_type'   => 'product',
	'post_status' => 'publish',
	'numberposts' => -1,
) );

$attached = 0;
$skipped  = 0;
$noplate  = array();
$ids      = array();

foreach ( $products as $p ) {
	if ( mts_app_plate_present( $p->ID ) ) {
		++$skipped;
		continue;
	}

	$type = mts_type_slug( $p->ID );

	if ( '' === $type || ! is_readable( MTS_PLATES . '/' . $type . '.jpg' ) ) {
		$noplate[ $type ?: '(none)' ][] = $p->post_title;
		continue;
	}

	if ( ! isset( $ids[ $type ] ) ) {
		$ids[ $type ] = mts_import_plate( $type );
		if ( $ids[ $type ] ) {
			echo "  imported {$type}-applications.jpg (#{$ids[ $type ]})\n";
		}
	}

	$att = (int) $ids[ $type ];

	if ( ! $att ) {
		continue;
	}

	$url = (string) wp_get_attachment_url( $att );
	$alt = sprintf(
		/* translators: %s: product type, e.g. "double sided tape" */
		__( '%s applications: three real-world uses', 'mytapestore' ),
		str_replace( '-', ' ', $type )
	);

	// Alt text lives on the attachment, so every product using this plate
	// describes it identically and a screen reader is not told three things.
	if ( ! get_post_meta( $att, '_wp_attachment_image_alt', true ) ) {
		update_post_meta( $att, '_wp_attachment_image_alt', $alt );
	}

	$block = "\n\n<figure class=\"wp-block-image mts-applications\">"
		. '<img src="' . esc_url( $url ) . '" alt="' . esc_attr( $alt ) . '"'
		. ' width="1536" height="1024" loading="lazy" decoding="async" />'
		. "</figure>\n";

	$result = wp_update_post( array(
		'ID'           => $p->ID,
		'post_content' => (string) get_post_field( 'post_content', $p->ID ) . $block,
	), true );

	if ( is_wp_error( $result ) ) {
		echo "    FAILED {$p->post_title}: " . $result->get_error_message() . "\n";
		continue;
	}

	++$attached;
}

printf( "\n  attached : %d\n  already had one : %d\n", $attached, $skipped );

if ( $noplate ) {
	echo "\n  NO PLATE AVAILABLE for these types:\n";
	foreach ( $noplate as $type => $list ) {
		printf( "    %-34s %d product(s)\n", $type, count( $list ) );
	}
}

/* --------------------------------------------------------------- verify */

echo "\n=== verification: re-scan every published product ===\n";

$still = 0;
foreach ( get_posts( array( 'post_type' => 'product', 'post_status' => 'publish', 'numberposts' => -1, 'fields' => 'ids' ) ) as $id ) {
	if ( ! mts_app_plate_present( (int) $id ) ) {
		++$still;
	}
}

printf( "  products still without an application image: %d\n", $still );
