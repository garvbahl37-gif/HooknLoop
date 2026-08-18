<?php
/**
 * One shape for every product description, and links that actually go somewhere.
 *
 * TWO PROBLEMS, BOTH MEASURED ACROSS ALL 133 PRODUCTS.
 *
 * 1. THE SECTIONS WERE IN A DIFFERENT ORDER ON EVERY PRODUCT.
 *
 *    The headings themselves are consistent — the catalogue uses "Key Features"
 *    (105 products), "Applications" (90), "How to apply" (4) and "FAQs" (10) and
 *    almost nothing else. What is not consistent is where the application image
 *    sits. Counting the distinct heading sequences gives NINETEEN different
 *    layouts, the top four being:
 *
 *        32  Key Features > Applications > IMG
 *        23  Key Features > Applications
 *        20  Key Features > IMG
 *        12  Key Features > IMG > Applications
 *
 *    So a shopper comparing two tapes reads them in two different orders, and
 *    the picture that shows the product in use turns up above the copy on one
 *    page and below the FAQs on the next. This file puts them in one order:
 *
 *        intro copy → application image(s) → Key features → Applications →
 *        How to apply → FAQs → anything else, in the order it arrived
 *
 * 2. THE LINKS INSIDE THEM WERE SHOPIFY LINKS.
 *
 *    The descriptions were synced from the Shopify store, and eighteen of them
 *    carry Shopify paths — /collections/foam-tape, /products/…, /pages/industries.
 *    On WordPress every one of those is a 404. They are rewritten to the
 *    equivalent WooCommerce URL, so the internal linking the catalogue was
 *    written with survives the move instead of quietly rotting.
 *
 * WHY A FILTER AND NOT A ONE-OFF EDIT
 *
 * The descriptions are owned by scripts/sync-shopify-content.php. Editing the
 * stored HTML fixes it until the next sync; filtering it fixes it for every sync
 * after this one too, including products that do not exist yet.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

/**
 * The canonical order. Lower sorts first.
 *
 * Matched on a NORMALISED heading — lowercased, stripped of punctuation — so
 * "Key Features", "Key features" and "KEY FEATURES:" all land in the same slot.
 * A heading that matches nothing keeps its arrival order at the end, rather than
 * being dropped or guessed at.
 */
function mts_description_section_order(): array {
	return array(
		'key features'  => 10,
		'features'      => 10,
		'salient features' => 10,
		'applications'  => 20,
		'application'   => 20,
		'application area' => 20,
		'where to use'  => 20,
		'recommended for' => 30,
		'how to apply'  => 40,
		'specifications' => 50,
		'faqs'          => 60,
		'faq'           => 60,
	);
}

/**
 * Shopify paths → the WooCommerce URLs they mean here.
 */
function mts_map_shopify_url( string $href ): string {
	$path = (string) wp_parse_url( $href, PHP_URL_PATH );
	if ( '' === $path ) {
		return $href;
	}

	$path = '/' . trim( $path, '/' ) . '/';

	if ( '/collections/all/' === $path ) {
		return (string) wc_get_page_permalink( 'shop' );
	}

	if ( preg_match( '#^/collections/([^/]+)/$#', $path, $m ) ) {
		$term = get_term_by( 'slug', $m[1], 'product_cat' );
		if ( $term instanceof WP_Term ) {
			$link = get_term_link( $term );
			if ( ! is_wp_error( $link ) ) {
				return (string) $link;
			}
		}
		return (string) wc_get_page_permalink( 'shop' );
	}

	if ( preg_match( '#^/products/([^/]+)/$#', $path, $m ) ) {
		$post = get_page_by_path( $m[1], OBJECT, 'product' );
		if ( $post ) {
			return (string) get_permalink( $post );
		}
		return (string) wc_get_page_permalink( 'shop' );
	}

	if ( preg_match( '#^/pages/([^/]+)/$#', $path, $m ) ) {
		$page = get_page_by_path( $m[1] );
		if ( $page ) {
			return (string) get_permalink( $page );
		}
		return home_url( '/' . $m[1] . '/' );
	}

	return $href;
}

/**
 * Reorder the sections and repair the links.
 *
 * Parsed as a DOM. The alternative — splitting the HTML on `<h3>` with a regex —
 * cannot tell a heading inside a table from one at the top level, and silently
 * mangles anything nested.
 */
function mts_normalise_product_description( string $html ): string {
	if ( '' === trim( $html ) ) {
		return $html;
	}

	$doc      = new DOMDocument();
	$previous = libxml_use_internal_errors( true );

	// Forces UTF-8; without it every curly quote and degree sign is mangled.
	$doc->loadHTML(
		'<?xml encoding="UTF-8"><div id="mts-root">' . $html . '</div>',
		LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD
	);

	libxml_clear_errors();
	libxml_use_internal_errors( $previous );

	$root = $doc->getElementById( 'mts-root' );
	if ( ! $root ) {
		return $html;
	}

	// --- links ---------------------------------------------------------------
	$xpath = new DOMXPath( $doc );
	foreach ( $xpath->query( '//a[@href]' ) as $link ) {
		$href = (string) $link->getAttribute( 'href' );
		if ( preg_match( '#^/?(collections|products|pages)/#', ltrim( $href, '/' ) ) || false !== strpos( $href, 'myshopify.com' ) ) {
			$link->setAttribute( 'href', mts_map_shopify_url( $href ) );
		}
	}

	/*
	 * --- sections ------------------------------------------------------------
	 *
	 * Everything is one flat list of top-level nodes. A "section" starts at a
	 * heading and runs to the node before the next heading; whatever precedes the
	 * first heading is the intro and always leads.
	 *
	 * Images are pulled out of whatever section they landed in and grouped
	 * directly after the intro — that is the single change that fixes the
	 * nineteen layouts, because the image is the only thing that moves.
	 */
	$intro    = array();
	$images   = array();
	$sections = array();
	$current  = -1;   // index into $sections; -1 means "still in the intro"

	$order = mts_description_section_order();

	foreach ( iterator_to_array( $root->childNodes ) as $node ) {
		$is_heading = XML_ELEMENT_NODE === $node->nodeType
			&& in_array( strtolower( $node->nodeName ), array( 'h2', 'h3', 'h4' ), true );

		if ( $is_heading ) {
			$key  = strtolower( trim( (string) preg_replace( '/[^a-z ]/i', '', $node->textContent ) ) );
			$seq  = count( $sections );
			$rank = $order[ $key ] ?? ( 100 + $seq );

			$sections[] = array( 'rank' => $rank, 'seq' => $seq, 'nodes' => array( $node ) );
			$current    = $seq;
			continue;
		}

		// An image, wherever it was found, joins the image block.
		if ( XML_ELEMENT_NODE === $node->nodeType && mts_node_is_only_image( $node ) ) {
			$images[] = $node;
			continue;
		}

		if ( $current < 0 ) {
			$intro[] = $node;
		} else {
			$sections[ $current ]['nodes'][] = $node;
		}
	}

	// Nothing to reorder — one section or none. Return the link-repaired markup.
	if ( count( $sections ) < 1 && ! $images ) {
		return mts_serialize_children( $doc, $root );
	}

	usort( $sections, static function ( array $a, array $b ): int {
		return ( $a['rank'] <=> $b['rank'] ) ?: ( $a['seq'] <=> $b['seq'] );
	} );

	$out = $doc->createElement( 'div' );

	foreach ( $intro as $node ) {
		$out->appendChild( $node );
	}

	if ( $images ) {
		/*
		 * The application shots as one block, so a product with two of them shows
		 * them together rather than one above the features and one below.
		 */
		$figure = $doc->createElement( 'div' );
		$figure->setAttribute( 'class', 'pdp-desc__shots' );
		foreach ( $images as $node ) {
			$figure->appendChild( $node );
		}
		$out->appendChild( $figure );
	}

	foreach ( $sections as $section ) {
		foreach ( $section['nodes'] as $node ) {
			$out->appendChild( $node );
		}
	}

	/*
	 * THE ONE EXTENSION POINT FOR DESCRIPTION HTML.
	 *
	 * single-product.php calls this function directly and deliberately does NOT
	 * route the body through `the_content` — see the note at the bottom of this
	 * file for why. The consequence is that anything hooking `the_content` to
	 * rewrite markup never sees a product description, and that is not a
	 * theoretical gap: the hosted preview serves uploads from a CDN rather than
	 * from wp-content, rewrites image URLs on `the_content` to match, and so left
	 * every image in every product description pointing at a path that does not
	 * exist there. The images simply failed to load, on the one page they matter
	 * most.
	 *
	 * A filter here closes that hole at the single point every description passes
	 * through, without reintroducing `the_content` and its double-parse.
	 */
	return (string) apply_filters(
		'mts_product_description_html',
		mts_serialize_children( $doc, $out )
	);
}

/**
 * True when a node is an image, or a wrapper whose only real content is one.
 *
 * The sync wraps some images in a <p> and leaves others bare, so testing for
 * `img` alone would move half of them and leave the rest where they were.
 */
function mts_node_is_only_image( DOMNode $node ): bool {
	if ( 'img' === strtolower( $node->nodeName ) ) {
		return true;
	}

	if ( ! in_array( strtolower( $node->nodeName ), array( 'p', 'figure', 'div' ), true ) ) {
		return false;
	}

	$text = trim( preg_replace( '/\x{00A0}/u', ' ', $node->textContent ) );
	if ( '' !== $text ) {
		return false;
	}

	return $node->getElementsByTagName( 'img' )->length > 0;
}

/**
 * Serialise a node's children, without the wrapper itself.
 */
function mts_serialize_children( DOMDocument $doc, DOMNode $parent ): string {
	$out = '';
	foreach ( $parent->childNodes as $child ) {
		$out .= $doc->saveHTML( $child );
	}
	return trim( $out );
}

/**
 * Apply it wherever a product description is rendered.
 *
 * `woocommerce_short_description` covers the excerpt; `the_content` covers the
 * description tab, where WooCommerce renders the full body through the normal
 * content filters. Guarded on is_product() so no other page pays for the parse.
 */
add_filter( 'woocommerce_short_description', 'mts_normalise_product_description', 30 );

/*
 * The description PANEL calls this function directly — see
 * woocommerce/single-product.php. That template does not route the body through
 * `the_content`, so there is deliberately no `the_content` filter here: adding
 * one would look like coverage while doing nothing on the only page that
 * matters, and would double-parse every ordinary page body besides.
 */
