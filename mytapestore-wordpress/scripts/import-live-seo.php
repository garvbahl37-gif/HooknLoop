<?php
/**
 * Store the live site's real titles and descriptions on the draft's content.
 *
 * Reads build/live-seo.json, produced by scripts/pull-live-seo.py, and writes
 * two meta keys per item:
 *
 *   _mts_seo_title        the live <title>, with " | My Tape Store" removed
 *   _mts_seo_description   the live meta description
 *
 * WHY META RATHER THAN OVERWRITING THE POST TITLE
 *
 * Because they are different things. "Foam Tape- Single Sided | Strong Adhesion
 * & Versatile Use" is a search-results headline; the H1 on the page is "Foam
 * Tape – Single Sided". Writing the SEO string into post_title would put the
 * keyword tail into the page heading, the breadcrumb and the menu.
 *
 * ANYTHING WITHOUT A MATCH ON LIVE IS LEFT ALONE and keeps the generated meta —
 * that is correct for the pages this draft added, which have no live
 * counterpart to copy.
 *
 *   ./node_modules/.bin/wp-playground-cli php \
 *     --site-url=http://127.0.0.1:9400 \
 *     --mount-before-install=./local/wordpress:/wordpress \
 *     --mount=./theme:/wordpress/wp-content/themes/mytapestore \
 *     --mount=./scripts:/wordpress/mts-scripts \
 *     --mount=./build:/wordpress/mts-build \
 *     --wordpress-install-mode=install-from-existing-files \
 *     -- /wordpress/mts-scripts/import-live-seo.php
 *
 * @package mytapestore
 */

if ( ! defined( 'ABSPATH' ) ) {
	require_once '/wordpress/wp-load.php';
}

$mts_file = '/wordpress/mts-build/live-seo.json';

if ( ! is_readable( $mts_file ) ) {
	echo "missing {$mts_file} — run scripts/pull-live-seo.py first\n";
	return;
}

$mts_rows = json_decode( (string) file_get_contents( $mts_file ), true );

if ( ! is_array( $mts_rows ) ) {
	echo "could not parse the SEO file\n";
	return;
}

$mts_done = array( 'title' => 0, 'desc' => 0, 'skipped' => 0 );

foreach ( $mts_rows as $mts_key => $mts_seo ) {
	list( $mts_kind, $mts_slug ) = array_pad( explode( '|', (string) $mts_key, 2 ), 2, '' );

	$mts_title = trim( (string) ( $mts_seo['title'] ?? '' ) );
	$mts_desc  = trim( (string) ( $mts_seo['description'] ?? '' ) );

	if ( '' === $mts_title && '' === $mts_desc ) {
		++$mts_done['skipped'];
		continue;
	}

	if ( 'product_cat' === $mts_kind ) {
		$mts_term = get_term_by( 'slug', $mts_slug, 'product_cat' );
		if ( ! $mts_term ) {
			++$mts_done['skipped'];
			continue;
		}
		if ( '' !== $mts_title ) {
			update_term_meta( $mts_term->term_id, '_mts_seo_title', $mts_title );
			++$mts_done['title'];
		}
		if ( '' !== $mts_desc ) {
			update_term_meta( $mts_term->term_id, '_mts_seo_description', $mts_desc );
			++$mts_done['desc'];
		}
		continue;
	}

	$mts_post = get_page_by_path( $mts_slug, OBJECT, $mts_kind );
	if ( ! $mts_post ) {
		++$mts_done['skipped'];
		continue;
	}
	if ( '' !== $mts_title ) {
		update_post_meta( $mts_post->ID, '_mts_seo_title', $mts_title );
		++$mts_done['title'];
	}
	if ( '' !== $mts_desc ) {
		update_post_meta( $mts_post->ID, '_mts_seo_description', $mts_desc );
		++$mts_done['desc'];
	}
}

echo "imported {$mts_done['title']} titles, {$mts_done['desc']} descriptions";
echo " ({$mts_done['skipped']} had no match in this draft)\n";
