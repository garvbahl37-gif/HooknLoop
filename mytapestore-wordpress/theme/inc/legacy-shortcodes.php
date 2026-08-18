<?php
/**
 * Neutralise the page builder's shortcodes.
 *
 * Every page on the live site was authored in WPBakery, which stores layout as
 * shortcodes wrapped around the real copy:
 *
 *   [vc_row][vc_column][vc_column_text]Real words here.[/vc_column_text]…
 *
 * This theme deliberately does not ship WPBakery — removing it is most of the
 * performance win. But an unregistered shortcode is not ignored by WordPress;
 * it is printed verbatim, which is why the pages rendered as walls of
 * `[vc_row disable_element="yes" css=".vc_custom_17259…"]`.
 *
 * The fix is to register the containers as PASS-THROUGH: render their inner
 * content, discard the wrapper. The copy, headings and images survive; the
 * layout attributes (which describe a grid this design does not use) are
 * dropped. 946 of the ~1,000 shortcodes in the imported content are these
 * containers.
 *
 * This is a migration aid, not a permanent fixture. The long-term answer is to
 * rewrite each page's content as clean HTML — but that is a content task, and
 * pages must be readable before anyone can do it.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

/**
 * Container shortcodes: emit inner content, drop the wrapper.
 *
 * @return string[]
 */
function mts_passthrough_shortcodes(): array {
	return apply_filters( 'mts_passthrough_shortcodes', array(
		'vc_row',
		'vc_row_inner',
		'vc_column',
		'vc_column_inner',
		'vc_column_text',
		'vc_section',
		'vc_tta_section',
		'vc_tta_tabs',
		'vc_tta_accordion',
		'vc_toggle',
		'vc_tab',
		'vc_tabs',
		'vc_raw_html',
		'vc_empty_space',
		'su_row',
		'su_column',
		'su_box',
		'su_note',
	) );
}

/**
 * Shortcodes with no useful text content — render nothing rather than their
 * attribute soup.
 *
 * @return string[]
 */
function mts_dropped_shortcodes(): array {
	return apply_filters( 'mts_dropped_shortcodes', array(
		'vc_separator',
		'vc_line_chart',
		'vc_progress_bar',
		'vc_icon',
		'vc_btn',
		'vc_video',
		'vc_gallery',
		'vc_widget_sidebar',
		'vc_wp_text',
		'rev_slider',
		'kapee_products',
		'kapee_banner',
		'kapee_carousel',
		'su_divider',
		'su_spacer',
	) );
}

/**
 * Register the handlers.
 *
 * Priority 5 on init so these are in place before anything renders, but late
 * enough that a real plugin — if WPBakery is ever reinstalled — can claim the
 * tags first. add_shortcode() overwrites, so we check before registering and
 * leave a genuine implementation alone.
 */
function mts_register_legacy_shortcodes(): void {
	foreach ( mts_passthrough_shortcodes() as $tag ) {
		if ( shortcode_exists( $tag ) ) {
			continue;
		}
		add_shortcode( $tag, static function ( $atts, $content = null ) {
			return null === $content ? '' : do_shortcode( $content );
		} );
	}

	foreach ( mts_dropped_shortcodes() as $tag ) {
		if ( shortcode_exists( $tag ) ) {
			continue;
		}
		add_shortcode( $tag, '__return_empty_string' );
	}

	// Images carry a live-site attachment ID, which means nothing locally, so
	// they are resolved through the map the importer records.
	if ( ! shortcode_exists( 'vc_single_image' ) ) {
		add_shortcode( 'vc_single_image', 'mts_render_vc_single_image' );
	}
}
add_action( 'init', 'mts_register_legacy_shortcodes', 5 );

/**
 * Render [vc_single_image image="1234"] by mapping the live attachment ID to
 * the local one, falling back to nothing rather than a broken image.
 */
function mts_render_vc_single_image( $atts ): string {
	$atts = shortcode_atts( array( 'image' => '', 'alt' => '' ), (array) $atts, 'vc_single_image' );
	$live = (int) $atts['image'];

	if ( ! $live ) {
		return '';
	}

	$local = get_posts( array(
		'post_type'      => 'attachment',
		'post_status'    => 'inherit',
		'posts_per_page' => 1,
		'fields'         => 'ids',
		'meta_key'       => '_mts_source_id',
		'meta_value'     => $live,
	) );

	if ( ! $local ) {
		return '';
	}

	return wp_get_attachment_image( (int) $local[0], 'large', false, array(
		'class'   => 'pdp-desc__img',
		'loading' => 'lazy',
		'alt'     => $atts['alt'],
	) );
}

/**
 * Belt and braces: strip any builder shortcode that slipped past registration.
 *
 * Runs after do_shortcode on the_content, so it only ever sees leftovers — a
 * tag from a plugin nobody catalogued. Better an invisible gap than
 * `[vc_custom_heading text="…"]` printed to a customer.
 */
function mts_strip_orphan_builder_shortcodes( string $content ): string {
	if ( false === strpos( $content, '[' ) ) {
		return $content;
	}
	return (string) preg_replace( '/\[\/?(?:vc_|su_|kapee_|rev_)[a-z0-9_]*[^\]]*\]/i', '', $content );
}
add_filter( 'the_content', 'mts_strip_orphan_builder_shortcodes', 20 );
add_filter( 'term_description', 'mts_strip_orphan_builder_shortcodes', 20 );
add_filter( 'woocommerce_short_description', 'mts_strip_orphan_builder_shortcodes', 20 );

/**
 * Remove dead Contact Form 7 markup.
 *
 * The policy pages carry a pasted copy of CF7's RENDERED output — <div
 * class="wpcf7">, labels, a stray <textarea>, a Turnstile caption — but this
 * site has no Contact Form 7 installed and the form it names (id 5) is a page
 * called "Shop". So it is not a form that fails to submit; it is not a form at
 * all: no <form> element, and the Name/Email/Subject control wrappers are empty.
 *
 * A visitor on Shipping & Delivery saw "Contact Us" followed by three orphaned
 * labels, one unlabelled comment box and no button.
 *
 * The test is deliberately narrow: a wpcf7 block containing a real <form> is
 * left alone, so installing the plugin restores the form rather than fighting
 * this filter.
 */
function mts_strip_dead_cf7( string $content ): string {
	if ( false === stripos( $content, 'wpcf7' ) ) {
		return $content;
	}

	$offset = 0;

	while ( preg_match( '#<div[^>]*class="[^"]*\bwpcf7\b[^"]*"[^>]*>#i', $content, $open, PREG_OFFSET_CAPTURE, $offset ) ) {
		$start = (int) $open[0][1];
		$after = $start + strlen( $open[0][0] );

		/*
		 * Find the MATCHING close tag by counting nested <div>s. A non-greedy
		 * regex stops at the first </div>, which here is the end of
		 * .screen-reader-response — so it removed the wrapper's opening tag and
		 * left the labels, the textarea and the Turnstile caption on the page.
		 * That is the state the policy pages were in.
		 */
		$depth = 1;
		$scan  = $after;
		$end   = false;

		while ( $depth > 0 && preg_match( '#</?div\b[^>]*>#i', $content, $tag, PREG_OFFSET_CAPTURE, $scan ) ) {
			$depth += ( '/' === $tag[0][0][1] ) ? -1 : 1;
			$scan   = (int) $tag[0][1] + strlen( $tag[0][0] );
			if ( 0 === $depth ) {
				$end = $scan;
			}
		}

		if ( false === $end ) {
			break; // unbalanced markup — leave it alone rather than truncate the page
		}

		$block = substr( $content, $start, $end - $start );

		// A block with a real <form> in it is a working form. Leave it.
		if ( false !== stripos( $block, '<form' ) ) {
			$offset = $end;
			continue;
		}

		$content = substr( $content, 0, $start ) . substr( $content, $end );
		$offset  = $start;
	}

	return $content;
}
add_filter( 'the_content', 'mts_strip_dead_cf7', 21 );

/**
 * ...and the heading that introduced it.
 *
 * Stripping the form on its own leaves a "Contact Us" heading with nothing
 * under it, which reads as a page that failed to load rather than one that
 * simply ends. The heading only goes when it is the LAST thing left.
 */
function mts_strip_trailing_contact_heading( string $content ): string {
	return (string) preg_replace(
		'#<h[23][^>]*>\s*Contact\s*Us\s*</h[23]>\s*(?:<p>\s*(?:&nbsp;|\s)*</p>\s*)*$#i',
		'',
		$content
	);
}
add_filter( 'the_content', 'mts_strip_trailing_contact_heading', 22 );
