<?php
/**
 * Two faults to characterise before anything is changed.
 *
 * 1. THE AUDIT UNDER-COUNTED. It decided a product "has an application image"
 *    only when an <img> filename contained applications/application/-apps/uses.
 *    The glue dots page visibly carries a four-panel "Ideal for mailing houses,
 *    print industry…" plate that the audit did not see, so a second plate was
 *    added underneath it. Filename matching was the wrong test: these came from
 *    the live site with whatever names the original author gave them.
 *
 * 2. THE NEW PLATES DO NOT LOAD. Suspected cause: they were imported by a CLI
 *    run where the demo mu-plugin was NOT loaded, so wp_upload_bits()/
 *    wp_get_attachment_url() produced http://127.0.0.1:9400/wp-content/uploads/…
 *    and that absolute URL was written into post_content. On the deployed
 *    preview there is no such host. The pre-existing images work because they
 *    carry live-site URLs the mu-plugin rewrites, or relative ones.
 *
 * Prints the evidence for both rather than assuming either.
 *
 * @package mytapestore
 */

if ( ! defined( 'ABSPATH' ) ) {
	require_once '/wordpress/wp-load.php';
}

echo "=== 1. every <img> inside a sample of product descriptions ===\n";

$sample = array( 'glue-dots-removable-10mm-1500-roll-atg-dispenser-compatible', 'felt-tape', 'magnetic-tapes-adhesive-backed' );

foreach ( get_posts( array( 'post_type' => 'product', 'post_status' => 'publish', 'numberposts' => 6 ) ) as $p ) {
	$c = (string) $p->post_content;
	if ( ! preg_match_all( '#<img[^>]+src=["\']([^"\']+)["\']#i', $c, $m ) ) {
		continue;
	}
	echo "\n  {$p->post_title}\n";
	foreach ( $m[1] as $src ) {
		echo "      {$src}\n";
	}
}

echo "\n\n=== 2. how many products carry an <img> AT ALL in the description? ===\n";

$with_any   = 0;
$with_named = 0;
$with_ours  = 0;
$none       = 0;
$hosts      = array();

foreach ( get_posts( array( 'post_type' => 'product', 'post_status' => 'publish', 'numberposts' => -1 ) ) as $p ) {
	$c = (string) $p->post_content;

	if ( ! preg_match_all( '#<img[^>]+src=["\']([^"\']+)["\']#i', $c, $m ) ) {
		++$none;
		continue;
	}

	++$with_any;

	foreach ( $m[1] as $src ) {
		$host = (string) ( wp_parse_url( $src, PHP_URL_HOST ) ?: '(relative)' );
		$hosts[ $host ] = ( $hosts[ $host ] ?? 0 ) + 1;

		$file = strtolower( basename( (string) ( wp_parse_url( $src, PHP_URL_PATH ) ?: $src ) ) );

		if ( preg_match( '/applications?|-apps|uses/', $file ) ) {
			++$with_named;
		}
		if ( str_contains( $file, '-applications.jpg' ) ) {
			++$with_ours;
		}
	}
}

printf( "  products with ANY image in description : %d\n", $with_any );
printf( "  products with NO image in description  : %d\n", $none );
printf( "  <img> whose filename looks like an application plate : %d\n", $with_named );
printf( "  <img> that are OURS (-applications.jpg)              : %d\n", $with_ours );

echo "\n  hosts appearing in description <img> src:\n";
arsort( $hosts );
foreach ( $hosts as $h => $n ) {
	printf( "    %-46s %d\n", $h, $n );
}

echo "\n\n=== 3. what does the mu-plugin rewrite? ===\n";
echo '  MTS_MEDIA_BASE defined: ' . ( defined( 'MTS_MEDIA_BASE' ) ? MTS_MEDIA_BASE : 'NO — not loaded in this CLI run' ) . "\n";
echo '  upload_dir baseurl    : ' . ( wp_upload_dir()['baseurl'] ?? '?' ) . "\n";
echo '  home_url              : ' . home_url() . "\n";

echo "\n\n=== 4. products that now carry TWO plates (ours + a pre-existing one) ===\n";

$dupes = 0;
foreach ( get_posts( array( 'post_type' => 'product', 'post_status' => 'publish', 'numberposts' => -1 ) ) as $p ) {
	$c = (string) $p->post_content;
	if ( ! preg_match_all( '#<img[^>]+src=["\']([^"\']+)["\']#i', $c, $m ) ) {
		continue;
	}

	$ours  = 0;
	$other = 0;
	foreach ( $m[1] as $src ) {
		$file = strtolower( basename( (string) ( wp_parse_url( $src, PHP_URL_PATH ) ?: $src ) ) );
		if ( str_contains( $file, '-applications.jpg' ) ) {
			++$ours;
		} else {
			++$other;
		}
	}

	if ( $ours && $other ) {
		if ( $dupes < 15 ) {
			printf( "  %-56s ours=%d other=%d\n", mb_substr( $p->post_title, 0, 56 ), $ours, $other );
		}
		++$dupes;
	}
}
printf( "\n  %d product(s) now show our plate ALONGSIDE a pre-existing image\n", $dupes );
