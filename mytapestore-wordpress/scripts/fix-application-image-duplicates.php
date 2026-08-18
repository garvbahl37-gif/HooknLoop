<?php
/**
 * Undo the plates that should never have been added, and make the rest resolve.
 *
 * TWO FAULTS, BOTH MINE.
 *
 * FAULT 1 — THE AUDIT UNDER-COUNTED, SO 83 PRODUCTS GOT A SECOND PLATE.
 *
 * audit-application-images.php decided a product already had an application
 * image by looking for applications/application/-apps/uses in the <img>
 * FILENAME. That test cannot see the ones that were actually there: 87 of them
 * are hosted on cdn.shopify.com with hashed names like bf7ccc7751cf.jpg. The
 * glue dots page carries a four-panel "Ideal for mailing houses, print
 * industry…" plate under exactly such a name, was scored as missing, and got a
 * second plate stacked beneath the first.
 *
 * Filename matching was the wrong test from the start. These images arrived from
 * the live site with whatever names their original author gave them, and nothing
 * required those names to describe the contents.
 *
 * The correct test is POSITIONAL, not lexical: did the description already carry
 * an image that we did not put there? If so, the product was never missing one.
 *
 * FAULT 2 — THE URLS POINT AT A HOST THAT DOES NOT EXIST.
 *
 * The plates were imported by a WP-CLI run in which the demo mu-plugin is not
 * loaded, so wp_upload_dir() returned the local install's own base and
 * http://127.0.0.1:9400/wp-content/uploads/… was written into post_content. That
 * is correct for the local install and is rewritten by the documented
 * `wp search-replace` step on a real deployment — but on the hosted preview
 * there is no such host, and every one of these images fails to load.
 *
 * The preview already has a rewriter for exactly this, mts_demo_rewrite_urls().
 * It only knew the spelling `localhost:9400`; the loopback IP is handled there
 * now. This script additionally normalises what is stored, so the content does
 * not depend on a rewriter being present at all.
 *
 * IDEMPOTENT. Re-running finds nothing to remove and nothing to rewrite.
 *
 * @package mytapestore
 */

if ( ! defined( 'ABSPATH' ) ) {
	require_once '/wordpress/wp-load.php';
}

/** The block this project appends. Matching on it is exact — no guessing. */
const MTS_OUR_FIGURE = '#\s*<figure class="wp-block-image mts-applications">.*?</figure>\s*#s';

/** Our plates are the only images whose filename ends this way. */
const MTS_OUR_FILE = '-applications.jpg';

$products = get_posts( array(
	'post_type'   => 'product',
	'post_status' => 'publish',
	'numberposts' => -1,
) );

$removed   = 0;
$kept      = 0;
$rewritten = 0;

foreach ( $products as $p ) {
	$content = (string) $p->post_content;
	$before  = $content;

	/* ---------- fault 1: did this product already have an image of its own? */

	preg_match_all( '#<img[^>]+src=["\']([^"\']+)["\']#i', $content, $m );

	$foreign = 0;
	foreach ( $m[1] as $src ) {
		$file = strtolower( basename( (string) ( wp_parse_url( $src, PHP_URL_PATH ) ?: $src ) ) );
		if ( ! str_contains( $file, MTS_OUR_FILE ) ) {
			++$foreign;
		}
	}

	$has_ours = false !== strpos( $content, MTS_OUR_FILE );

	if ( $has_ours && $foreign > 0 ) {
		// It already had one. Ours is redundant — take it back out.
		$content = (string) preg_replace( MTS_OUR_FIGURE, "\n", $content );
		$content = rtrim( $content ) . "\n";
		++$removed;
	} elseif ( $has_ours ) {
		++$kept;
	}

	/* ------------------- fault 2: make the surviving URLs host-independent */

	/*
	 * Stored as a ROOT-RELATIVE path. An absolute URL bakes in whichever host
	 * happened to be running when the import ran, which is the whole reason
	 * these broke. A root-relative path is correct on the local install, on the
	 * developer's domain, and on live, with no search-replace needed — and the
	 * preview's upload rewriting handles the one case where uploads are served
	 * from a different origin.
	 */
	$content = str_replace(
		array(
			'http://127.0.0.1:9400/wp-content/uploads/',
			'https://127.0.0.1:9400/wp-content/uploads/',
			'http://localhost:9400/wp-content/uploads/',
			'https://localhost:9400/wp-content/uploads/',
		),
		'/wp-content/uploads/',
		$content
	);

	if ( $content !== $before ) {
		if ( false !== strpos( $before, '127.0.0.1:9400/wp-content/uploads/' )
			|| false !== strpos( $before, 'localhost:9400/wp-content/uploads/' ) ) {
			++$rewritten;
		}

		wp_update_post( array( 'ID' => $p->ID, 'post_content' => $content ) );
	}
}

printf( "  removed our plate (product already had one) : %d\n", $removed );
printf( "  kept our plate (product genuinely had none) : %d\n", $kept );
printf( "  posts with URLs made host-independent       : %d\n", $rewritten );

/* --------------------------------------------------------------- verify */

echo "\n=== verification ===\n";

$no_image  = 0;
$still_abs = 0;
$dupes     = 0;

foreach ( get_posts( array( 'post_type' => 'product', 'post_status' => 'publish', 'numberposts' => -1 ) ) as $p ) {
	$c = (string) $p->post_content;

	if ( ! preg_match_all( '#<img[^>]+src=["\']([^"\']+)["\']#i', $c, $m ) ) {
		++$no_image;
		continue;
	}

	$ours = $other = 0;
	foreach ( $m[1] as $src ) {
		if ( str_contains( strtolower( $src ), MTS_OUR_FILE ) ) {
			++$ours;
		} else {
			++$other;
		}
		if ( preg_match( '#https?://(127\.0\.0\.1|localhost):9400#', $src ) ) {
			++$still_abs;
		}
	}

	if ( $ours && $other ) {
		++$dupes;
	}
}

printf( "  products with NO image at all in description : %d\n", $no_image );
printf( "  products showing two plates                  : %d\n", $dupes );
printf( "  <img> still pointing at a dev host           : %d\n", $still_abs );
