<?php
/**
 * Search suggestions — the WooCommerce half of the header's live search.
 *
 * WHAT THIS IS FOR
 *
 * The Shopify store has a live dropdown under the search box: categories first,
 * then products, then a "view all results" row. It is `.search-ac` in the
 * design, its CSS has been in this theme's stylesheet all along, and the
 * WordPress side simply never had the markup or the data behind it — typing in
 * the header did nothing until you pressed Enter. This is the missing half.
 *
 * Shopify serves it from its Predictive Search API. WooCommerce has no
 * equivalent, so this is it: one read-only endpoint returning the same two
 * groups in the same order.
 *
 * WHY NOT THE STORE API
 *
 * /wc/store/v1/products?search= exists and would half-work, but it returns the
 * full product object — descriptions, every variation, every image size — which
 * is roughly 40KB per keystroke for a panel that shows a name, a thumbnail and a
 * price. It also cannot return categories, and the panel leads with categories.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

const MTS_SUGGEST_LIMIT = 6;

/**
 * GET /wp-json/mts/v1/suggest?q=tape
 */
add_action( 'rest_api_init', function (): void {
	register_rest_route( 'mts/v1', '/suggest', array(
		'methods'  => WP_REST_Server::READABLE,
		/*
		 * Public, and deliberately so: this reads the same catalogue the
		 * collection pages already publish to anyone. There is nothing here a
		 * visitor cannot see by browsing, so a nonce would only break the panel
		 * on a cached page without protecting anything.
		 */
		'permission_callback' => '__return_true',
		'args' => array(
			'q' => array(
				'required'          => true,
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'validate_callback' => static fn( $value ): bool => is_string( $value ) && mb_strlen( trim( $value ) ) >= 2,
			),
		),
		'callback' => 'mts_search_suggest',
	) );
} );

/**
 * Build the two groups.
 */
function mts_search_suggest( WP_REST_Request $request ): WP_REST_Response {
	$term = trim( (string) $request->get_param( 'q' ) );

	/*
	 * CACHED, because this is not cheap. Measured on this catalogue, a cold
	 * suggestion took 0.7–1.0s: a full WordPress boot, a LIKE search, then
	 * get_price_html() per hit — which on a variable product reads every
	 * variation to work out its range. On the browser-hosted demo, where PHP
	 * itself is WebAssembly, that lands somewhere far worse on a phone.
	 *
	 * Shoppers type the same few prefixes over and over ("tap", "foa", "dou"),
	 * so a short transient turns almost all of it into one lookup. Fifteen
	 * minutes: long enough to matter, short enough that a price change shows up
	 * on the same visit.
	 */
	$cache_key = 'mts_suggest_' . md5( mb_strtolower( $term ) );
	$cached    = get_transient( $cache_key );

	if ( is_array( $cached ) ) {
		$response = new WP_REST_Response( $cached );
		$response->header( 'Cache-Control', 'public, max-age=300' );
		$response->header( 'X-MTS-Cache', 'hit' );
		return $response;
	}

	$payload = array(
		'query'      => $term,
		'categories' => mts_suggest_categories( $term ),
		'products'   => mts_suggest_products( $term ),
	);

	set_transient( $cache_key, $payload, 15 * MINUTE_IN_SECONDS );

	$response = new WP_REST_Response( $payload );
	$response->header( 'X-MTS-Cache', 'miss' );

	/*
	 * Cacheable for a minute. The catalogue does not change between keystrokes,
	 * and the same handful of prefixes ("tap", "foa", "dou") are typed over and
	 * over — so this turns most of the traffic into a CDN hit.
	 */
	$response->header( 'Cache-Control', 'public, max-age=60' );

	return $response;
}

/**
 * Matching product categories.
 *
 * Industry terms are excluded: they share the product_cat taxonomy but they are
 * not places to buy a tape, and mixing "Marine" in among "Marine Tape" would
 * make the group ambiguous.
 */
function mts_suggest_categories( string $term ): array {
	$terms = get_terms( array(
		'taxonomy'   => 'product_cat',
		'hide_empty' => true,
		'number'     => MTS_SUGGEST_LIMIT * 2,
		'search'     => $term,
	) );

	if ( is_wp_error( $terms ) ) {
		return array();
	}

	$skip = function_exists( 'mts_industry_slugs' ) ? (array) mts_industry_slugs() : array();
	$out  = array();

	foreach ( $terms as $found ) {
		if ( in_array( $found->slug, $skip, true ) ) {
			continue;
		}

		$link = get_term_link( $found );
		if ( is_wp_error( $link ) ) {
			continue;
		}

		$out[] = array(
			// Decoded, because the panel writes it with textContent. WordPress
			// stores "Hook &amp; Loop Tape"; left encoded, the dropdown would
			// literally read "Hook &amp;amp; Loop Tape".
			'title' => mts_suggest_text( $found->name ),
			'url'   => $link,
			'count' => (int) $found->count,
		);

		if ( count( $out ) >= MTS_SUGGEST_LIMIT ) {
			break;
		}
	}

	/*
	 * A term whose name STARTS with what was typed is a better answer than one
	 * that merely contains it — "Foam Tape" should beat "Double Sided Foam Tape"
	 * for the query "foam". Ties break on catalogue size, so the bigger category
	 * leads.
	 */
	$needle = mb_strtolower( $term );
	usort( $out, static function ( array $a, array $b ) use ( $needle ): int {
		$a_starts = (int) str_starts_with( mb_strtolower( $a['title'] ), $needle );
		$b_starts = (int) str_starts_with( mb_strtolower( $b['title'] ), $needle );
		return ( $b_starts <=> $a_starts ) ?: ( $b['count'] <=> $a['count'] );
	} );

	return $out;
}

/**
 * Plain text, for a panel that renders with textContent.
 *
 * WordPress stores titles HTML-encoded — "Hook &amp; Loop Tape", "Velcro&reg;"
 * — which is right for markup and wrong for a text node, where it shows the
 * entity rather than the character.
 */
function mts_suggest_text( string $value ): string {
	return trim( html_entity_decode( wp_strip_all_tags( $value ), ENT_QUOTES | ENT_HTML5, 'UTF-8' ) );
}

/**
 * A price the panel can print as plain text.
 *
 * get_price_html() is markup written for a page, and flattening it with
 * wp_strip_all_tags() alone produced
 *
 *     "&#36;27.82 &ndash; &#36;187.07Price range: &#36;27.82 through &#36;187.07"
 *
 * — two faults at once. The tail is WooCommerce's `<span class="screen-reader-text">`,
 * which exists so a screen reader hears "Price range: $27.82 through $187.07"
 * instead of a bare dash; stripping tags turns that from an accessibility aid
 * into duplicated visible text. And the entities are never decoded, because the
 * value ends up in textContent rather than in HTML.
 *
 * So the assistive span is removed as an ELEMENT first, then the rest is
 * flattened and decoded.
 */
function mts_suggest_price( WC_Product $product ): string {
	$html = (string) $product->get_price_html();

	// The screen-reader span, with its contents.
	$html = (string) preg_replace(
		'#<span[^>]*class="[^"]*screen-reader-text[^"]*"[^>]*>.*?</span>#is',
		'',
		$html
	);

	$text = wp_strip_all_tags( $html, true );
	$text = html_entity_decode( $text, ENT_QUOTES | ENT_HTML5, 'UTF-8' );

	// Collapse the whitespace the removed markup leaves behind.
	return trim( (string) preg_replace( '/\s+/u', ' ', $text ) );
}

/**
 * Matching products.
 */
function mts_suggest_products( string $term ): array {
	/*
	 * TITLES ONLY, for this query alone.
	 *
	 * WordPress's `s` searches post_title, post_excerpt AND post_content. These
	 * products carry 1–3KB descriptions each, so a three-letter prefix meant a
	 * LIKE '%foa%' across the whole catalogue's prose — the single most expensive
	 * part of the request, and it produced worse suggestions: searching "foam"
	 * matched every product whose description merely mentions foam.
	 *
	 * A dropdown of product NAMES should match product names.
	 */
	$mts_titles_only = static function ( string $search, WP_Query $q ) use ( $term ): string {
		global $wpdb;

		if ( ! $q->get( 'mts_suggest' ) ) {
			return $search;
		}

		$like = '%' . $wpdb->esc_like( $term ) . '%';
		return $wpdb->prepare( " AND {$wpdb->posts}.post_title LIKE %s ", $like );
	};

	add_filter( 'posts_search', $mts_titles_only, 10, 2 );

	$query = new WP_Query( array(
		'mts_suggest'            => true,
		'post_type'              => 'product',
		'post_status'            => 'publish',
		'posts_per_page'         => MTS_SUGGEST_LIMIT,
		's'                      => $term,
		'ignore_sticky_posts'    => true,
		'no_found_rows'          => true,
		'update_post_term_cache' => false,
		/*
		 * Out-of-stock products are still shown. Hiding them would mean a shopper
		 * typing the exact name of something this store sells is told it does not
		 * exist — the product page says "out of stock" perfectly well, and that is
		 * a better answer than silence.
		 */
		'tax_query'              => array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query
			array(
				'taxonomy' => 'product_visibility',
				'field'    => 'name',
				'terms'    => 'exclude-from-search',
				'operator' => 'NOT IN',
			),
		),
	) );

	remove_filter( 'posts_search', $mts_titles_only, 10 );

	$out = array();

	foreach ( $query->posts as $post ) {
		$product = wc_get_product( $post );
		if ( ! $product ) {
			continue;
		}

		$image = (int) $product->get_image_id();

		$out[] = array(
			'title' => mts_suggest_text( $product->get_name() ),
			'url'   => (string) $product->get_permalink(),
			'image' => $image ? (string) wp_get_attachment_image_url( $image, 'woocommerce_gallery_thumbnail' ) : '',
			/*
			 * The rendered price string, not a number. A variable product's price
			 * is a RANGE, and formatting money in JavaScript would mean a second
			 * implementation of the store's currency rules that has to agree with
			 * the PHP one forever.
			 */
			'price' => mts_suggest_price( $product ),
		);
	}

	wp_reset_postdata();

	return $out;
}
