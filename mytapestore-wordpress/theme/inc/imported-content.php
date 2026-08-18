<?php
/**
 * Strip the old site's page-builder chrome out of imported page and post bodies.
 *
 * WHAT IS IN THERE
 *
 * mytapestore.com.au runs the Kapee theme with WPBakery, and the import brought
 * their markup across verbatim. On the contact page that means the entire visible
 * body is builder output:
 *
 *   <div class="kapee-element kapee-heading …"><h2>Send Us Message</h2>
 *   <div class="heading-tagline">Contact us to get any support or help.</div>
 *   … Get In Touch … Our Office … Working Hours … Want to work with us?
 *
 * None of it renders as designed here, and it cannot:
 *
 *   · the layout is `.kapee-*` classes and this theme has no such stylesheet, so
 *     every block stacks as a bare div
 *   · the icons are FontAwesome `<i class="fas fa-envelope">` and FontAwesome is
 *     not loaded, so they are empty boxes
 *   · wpautop wraps builder divs in paragraphs and leaves orphan `</p>` tags
 *     scattered through the output
 *   · `[vc_row]` and friends print as literal text, because this theme does not
 *     register WPBakery's shortcodes
 *   · and it DUPLICATES the page — page-contact.php already renders the phone,
 *     the email, the ABN and the dispatch note in the design's own contact card,
 *     directly above it
 *
 * So the contact page showed its details twice: once styled, once as a column of
 * unstyled headings with broken icons.
 *
 * WHY A FILTER RATHER THAN AN EDIT
 *
 * Editing the stored post_content fixes one page until the next content sync
 * overwrites it. Filtering fixes every imported page — the policies, the city
 * landing pages, anything pulled next — and survives a re-import.
 *
 * WHAT IS KEPT
 *
 * Only builder containers are removed. Any real prose the page carries OUTSIDE
 * them is untouched and renders in `.page-prose`, the design's long-form skin.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

/**
 * Remove page-builder blocks from a body of imported HTML.
 *
 * Parsed as a DOM rather than pattern-matched: a Kapee block is thirty-odd
 * nested divs, and "delete from the opening tag to the next closing one"
 * truncates at the first inner </div>, which is how this markup ends up as tag
 * soup in the first place.
 */
function mts_strip_builder_markup( string $html ): string {
	// WPBakery tags only — anything between them is content and stays.
	$html = (string) preg_replace( '#\[/?vc_[a-z_]*[^\]]*\]#i', '', $html );

	if ( '' === trim( wp_strip_all_tags( $html ) ) && false === strpos( $html, '<img' ) ) {
		return '';
	}

	$doc      = new DOMDocument();
	$previous = libxml_use_internal_errors( true );

	// The XML declaration forces UTF-8. Without it DOMDocument assumes
	// ISO-8859-1 and every curly quote and en-dash in the copy arrives mangled.
	$doc->loadHTML(
		'<?xml encoding="UTF-8"><div id="mts-root">' . $html . '</div>',
		LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD
	);

	libxml_clear_errors();
	libxml_use_internal_errors( $previous );

	$xpath = new DOMXPath( $doc );

	$drop = $xpath->query(
		'//*[contains(concat(" ", normalize-space(@class), " "), " kapee-element ")]'
		. ' | //script | //noscript'
	);

	foreach ( $drop as $node ) {
		if ( $node->parentNode ) {
			$node->parentNode->removeChild( $node );
		}
	}

	$root = $doc->getElementById( 'mts-root' );
	if ( ! $root ) {
		return $html;
	}

	$out = '';
	foreach ( $root->childNodes as $child ) {
		$out .= $doc->saveHTML( $child );
	}

	/*
	 * wpautop has already run by the time `the_content` fires, and it wrapped the
	 * builder divs it did not understand. Removing those divs leaves the wrappers
	 * behind as empty paragraphs, which print as blank gaps in the prose column.
	 */
	$out = (string) preg_replace( '#<p>\s*(?:&nbsp;|\x{00A0}|<br\s*/?>)?\s*</p>#iu', '', $out );
	$out = (string) preg_replace( '#(?:\s*</p>){2,}#i', '</p>', $out );

	return trim( $out );
}

/**
 * Apply it to page and post bodies.
 *
 * Priority 20 — after wpautop (10), so the paragraph cleanup above has the
 * markup it is actually correcting. The `strpos` guard means an ordinary body
 * with no builder markup in it costs one substring search and nothing else.
 */
function mts_filter_imported_content( string $content ): string {
	if ( is_admin() ) {
		return $content;
	}

	if ( false === strpos( $content, 'kapee-element' ) && false === strpos( $content, '[vc_' ) ) {
		return $content;
	}

	return mts_strip_builder_markup( $content );
}
add_filter( 'the_content', 'mts_filter_imported_content', 20 );
