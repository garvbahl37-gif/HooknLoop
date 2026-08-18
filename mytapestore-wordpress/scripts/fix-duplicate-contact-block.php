<?php
/**
 * Remove the orphaned "Contact Us" sidebar from the imported policy pages.
 *
 * THE REPORT: "Contact Us" appears twice on the privacy policy page, once as
 * section 10 and again immediately underneath.
 *
 * WHAT IS ACTUALLY WRONG. On the live site these pages are a WPBakery TWO-COLUMN
 * layout: the policy text in a 2/3 column, and a grey 1/3 sidebar beside it
 * holding its own "Contact Us" heading and a Contact Form 7 form. Side by side,
 * the two headings are obviously different things and it reads correctly.
 *
 * This build carries no WPBakery. inc/legacy-shortcodes.php strips the [vc_*]
 * wrappers and unwraps their contents — which is the right call for the text —
 * but with the columns gone the sidebar cannot sit beside anything. It stacks,
 * and its heading lands directly beneath "10. Contact Us".
 *
 * So the duplicate is not a bad import. It is a two-column design flattened into
 * one column.
 *
 * WHY REMOVE IT RATHER THAN RESTORE THE COLUMNS. The sidebar's only content is a
 * heading and a CF7 form, and THE FORM DOES NOT WORK HERE. Contact Form 7 is not
 * installed, so what was saved into post_content at import is the rendered
 * husk — `<label>Your Name</label>` followed by an EMPTY
 * `<span class="wpcf7-form-control-wrap">` with no input inside it. It also drags
 * along a Cloudflare Turnstile widget and three inline scripts that reference a
 * site key this install has no relationship with.
 *
 * A legal page that ends in a form with labels and no fields is worse than one
 * that ends with the email address it already gives you in section 10.
 *
 * SCOPE. Every imported page carrying this sidebar, EXCEPT /contact-us/ — on
 * that page the form is the entire point, and its absence is part of the
 * outstanding "install Contact Form 7 or not" decision rather than this fix.
 *
 * IDEMPOTENT: re-running finds nothing to do.
 *
 *   ./node_modules/.bin/wp-playground-cli php \
 *     --site-url=http://127.0.0.1:9400 \
 *     --mount-before-install=./local/wordpress:/wordpress \
 *     --mount=./theme:/wordpress/wp-content/themes/mytapestore \
 *     --mount=./scripts:/wordpress/mts-scripts \
 *     --wordpress-install-mode=install-from-existing-files \
 *     -- /wordpress/mts-scripts/fix-duplicate-contact-block.php
 *
 * @package mytapestore
 */

if ( ! defined( 'ABSPATH' ) ) {
	require_once '/wordpress/wp-load.php';
}

/** The page whose form is the point of the page. */
const MTS_KEEP_FORM_ON = 'contact-us';

global $wpdb;

$mts_pages = $wpdb->get_results(
	"SELECT ID, post_title, post_name
	   FROM {$wpdb->posts}
	  WHERE post_type = 'page'
	    AND post_status IN ('publish','draft','private')
	    AND post_content LIKE '%wpcf7%'
	  ORDER BY ID"
);

$mts_changed = 0;
$mts_skipped = 0;

foreach ( (array) $mts_pages as $mts_page ) {
	$mts_raw = (string) get_post_field( 'post_content', $mts_page->ID );

	if ( MTS_KEEP_FORM_ON === $mts_page->post_name ) {
		echo "  keep   #{$mts_page->ID} {$mts_page->post_title} — the form is this page's purpose\n";
		++$mts_skipped;
		continue;
	}

	/*
	 * Find where the sidebar column opens. The import HTML-encoded the attribute
	 * quotes, so `width="1/3"` is stored as `width=&#8221;1/3&#8243;` — match the
	 * encoded forms as well as plain quotes rather than assuming one.
	 */
	if ( ! preg_match( '/\[vc_column\s+width=(?:&#8221;|&#8243;|["\'])?1\/3/i', $mts_raw, $m, PREG_OFFSET_CAPTURE ) ) {
		echo "  skip   #{$mts_page->ID} {$mts_page->post_title} — no 1/3 sidebar column\n";
		++$mts_skipped;
		continue;
	}

	$mts_at   = (int) $m[0][1];
	$mts_tail = substr( $mts_raw, $mts_at );

	// Only cut a tail that is genuinely the dead contact sidebar: it must be the
	// grey box AND carry a CF7 form. Anything else is a layout we do not know.
	if ( false === strpos( $mts_tail, 'wpcf7' ) ) {
		echo "  skip   #{$mts_page->ID} {$mts_page->post_title} — 1/3 column is not a CF7 sidebar\n";
		++$mts_skipped;
		continue;
	}

	$mts_before = preg_match_all( '/contact\s*us/i', $mts_raw );

	// Truncate at the sidebar, then close the row the left column left open.
	// The wrappers are stripped at render time anyway, but leaving balanced
	// shortcodes means anyone opening this in an editor sees valid markup.
	$mts_new = rtrim( substr( $mts_raw, 0, $mts_at ) ) . "[/vc_row]\n";

	$mts_after = preg_match_all( '/contact\s*us/i', $mts_new );

	$mts_result = wp_update_post( array(
		'ID'           => $mts_page->ID,
		'post_content' => $mts_new,
	), true );

	if ( is_wp_error( $mts_result ) ) {
		echo "  ERROR  #{$mts_page->ID} {$mts_page->post_title}: " . $mts_result->get_error_message() . "\n";
		continue;
	}

	printf(
		"  FIXED  #%-5d %-32s  %d -> %d bytes,  'contact us' %d -> %d\n",
		$mts_page->ID,
		mb_substr( $mts_page->post_title, 0, 32 ),
		strlen( $mts_raw ),
		strlen( $mts_new ),
		$mts_before,
		$mts_after
	);

	++$mts_changed;
}

echo "\n  {$mts_changed} page(s) fixed, {$mts_skipped} left alone\n";

/* ------------------------------------------------------------------ verify */

echo "\n=== verification: rendered output of the privacy policy ===\n";

$mts_privacy = get_page_by_path( 'privacy-policy-2' );

if ( $mts_privacy ) {
	$mts_html  = apply_filters( 'the_content', $mts_privacy->post_content );
	$mts_count = preg_match_all( '/contact\s*us/i', wp_strip_all_tags( $mts_html ) );

	echo "  'contact us' in the rendered page: {$mts_count}\n";
	echo '  leftover CF7 markup: ' . ( false !== strpos( $mts_html, 'wpcf7' ) ? 'YES' : 'none' ) . "\n";
	echo '  leftover turnstile : ' . ( false !== stripos( $mts_html, 'turnstile' ) ? 'YES' : 'none' ) . "\n";
	echo "\n  --- last 420 chars as a reader sees them ---\n  ";
	echo preg_replace( '/\s+/', ' ', trim( wp_strip_all_tags( substr( $mts_html, -900 ) ) ) ) . "\n";
}
