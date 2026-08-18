<?php
/**
 * Collection filtering and sorting.
 *
 * The React build filtered an in-memory array in the browser. That is not
 * available here and should not be recreated: with 133 products and 684
 * variations, shipping the catalogue to the client to filter it would cost more
 * than the page itself, and the result would be invisible to search engines.
 *
 * So filters are real query variables. Every filter is a GET parameter, every
 * combination is a linkable URL, and the work happens in the database.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

/** Query-var names, kept in one place so template and query cannot drift. */
const MTS_F_STOCK  = 'in_stock';
const MTS_F_PRICE  = 'price_band';
const MTS_F_COLOUR = 'colour';
const MTS_F_SIZE   = 'size';
const MTS_F_SORT   = 'sortby';

/**
 * Price bands, as [slug => [label, min, max]]. A null max means "and above".
 */
function mts_price_bands(): array {
	// Brackets are the ones the Shopify theme ships (0–50, 50–100, 100–200, 200+),
	// which are in turn the brackets the original store used. They are not a
	// judgement call to re-make here: the three storefronts must offer the same
	// filters or the "same site" claim quietly stops being true.
	// Labels are built with wc_price() so they carry the store's currency,
	// separators and decimals — the Shopify panel shows "$0.00–$50.00", and a
	// hand-typed "$0 – $50" would drift the moment the store changes currency.
	$money = static function ( $amount ): string {
		return wp_strip_all_tags( wc_price( (float) $amount, array( 'decimals' => 2 ) ) );
	};

	return apply_filters( 'mts_price_bands', array(
		'a' => array( $money( 0 ) . '–' . $money( 50 ), 0, 50 ),
		'b' => array( $money( 50 ) . '–' . $money( 100 ), 50, 100 ),
		'c' => array( $money( 100 ) . '–' . $money( 200 ), 100, 200 ),
		'd' => array( $money( 200 ) . '+', 200, null ),
	) );
}

/** Sort options, matching SORTS in src/lib/filters.js. */
function mts_sort_options(): array {
	return array(
		'popular' => __( 'Most popular', 'mytapestore' ),
		'new'     => __( 'Newest', 'mytapestore' ),
		'price'   => __( 'Price: low to high', 'mytapestore' ),
		'price-d' => __( 'Price: high to low', 'mytapestore' ),
		'rating'  => __( 'Top rated', 'mytapestore' ),
		'name'    => __( 'Name A–Z', 'mytapestore' ),
	);
}

/** Read one filter from the request, sanitised. */
function mts_filter( string $key, $default = '' ) {
	if ( ! isset( $_GET[ $key ] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only browse filter.
		return $default;
	}

	$raw = wp_unslash( $_GET[ $key ] ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended

	return is_array( $raw )
		? array_values( array_filter( array_map( 'sanitize_title', $raw ) ) )
		: sanitize_text_field( $raw );
}

/** True when any filter is applied — drives the "Clear all" control. */
function mts_filters_active(): bool {
	foreach ( array( MTS_F_STOCK, MTS_F_PRICE, MTS_F_COLOUR, MTS_F_SIZE ) as $key ) {
		$value = mts_filter( $key );
		if ( '' !== $value && array() !== $value ) {
			return true;
		}
	}
	return false;
}

/** The current URL with one filter changed (or removed when $value is null). */
function mts_filter_url( string $key, $value ): string {
	$params = $_GET; // phpcs:ignore WordPress.Security.NonceVerification.Recommended

	if ( null === $value || '' === $value ) {
		unset( $params[ $key ] );
	} else {
		$params[ $key ] = $value;
	}

	unset( $params['paged'] );

	$base = strtok( (string) ( $_SERVER['REQUEST_URI'] ?? '/' ), '?' ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
	$base = esc_url_raw( home_url( $base ) );

	return $params ? add_query_arg( $params, $base ) : $base;
}

/**
 * Apply the filters and sort to the main product query.
 *
 * Runs on pre_get_posts rather than filtering results afterwards, so paging,
 * counts and the "no results" state all agree with each other.
 */
function mts_apply_product_filters( WP_Query $query ): void {
	if ( is_admin() || ! $query->is_main_query() ) {
		return;
	}

	if ( ! ( $query->is_post_type_archive( 'product' ) || $query->is_tax( 'product_cat' ) || $query->is_tax( 'product_tag' ) ) ) {
		return;
	}

	$meta = (array) $query->get( 'meta_query' );
	$tax  = (array) $query->get( 'tax_query' );

	// Stock. Accepts 'instock' or 'outofstock'; '1' is kept as a synonym for
	// 'instock' so any link already shared with the old value still works.
	$stock = (string) mts_filter( MTS_F_STOCK );
	if ( '1' === $stock ) {
		$stock = 'instock';
	}
	if ( in_array( $stock, array( 'instock', 'outofstock' ), true ) ) {
		$meta[] = array(
			'key'     => '_stock_status',
			'value'   => $stock,
			'compare' => '=',
		);
	}

	// Price band. _price is the lookup meta WooCommerce keeps in sync for both
	// simple and variable products, so one comparison covers the catalogue.
	$band  = (string) mts_filter( MTS_F_PRICE );
	$bands = mts_price_bands();
	if ( isset( $bands[ $band ] ) ) {
		list( , $min, $max ) = $bands[ $band ];
		$meta[] = array(
			'key'     => '_price',
			'value'   => null === $max ? $min : array( $min, $max ),
			'type'    => 'NUMERIC',
			'compare' => null === $max ? '>=' : 'BETWEEN',
		);
	}

	// Attribute filters.
	foreach ( array( MTS_F_COLOUR => mts_attr_taxonomy( 'colour' ), MTS_F_SIZE => mts_attr_taxonomy( 'size' ) ) as $key => $taxonomy ) {
		$terms = mts_filter( $key );
		$terms = is_array( $terms ) ? $terms : array_filter( array( $terms ) );
		if ( ! $terms || ! taxonomy_exists( $taxonomy ) ) {
			continue;
		}
		$tax[] = array(
			'taxonomy' => $taxonomy,
			'field'    => 'slug',
			'terms'    => $terms,
			'operator' => 'IN',
		);
	}

	if ( $meta ) {
		$query->set( 'meta_query', $meta );
	}
	if ( $tax ) {
		$query->set( 'tax_query', $tax );
	}

	// Sorting.
	//
	// Meta-backed sorts must NOT use $query->set('meta_key', …) with
	// orderby=meta_value_num. That produces an INNER JOIN on postmeta, so any
	// product missing the key vanishes from the results — changing the sort
	// silently changes the catalogue. This was not hypothetical: sorting Double
	// Sided Tape by price returned 20 of its 21 products, because "General
	// Purpose Adhesive Transfer Tape" has no _price row.
	//
	// The OR/NOT EXISTS pair below produces a LEFT JOIN instead: everything is
	// returned, and rows without the key sort to the end.
	$sort = (string) mts_filter( MTS_F_SORT );

	$order_by_meta = static function ( string $key, string $direction ) use ( $query, &$meta ): void {
		$meta[] = array(
			'relation'  => 'OR',
			'mts_sort'  => array( 'key' => $key, 'type' => 'NUMERIC', 'compare' => 'EXISTS' ),
			'mts_nosort' => array( 'key' => $key, 'compare' => 'NOT EXISTS' ),
		);
		$query->set( 'meta_query', $meta );
		$query->set( 'orderby', array( 'mts_sort' => $direction, 'title' => 'ASC' ) );
	};

	/*
	 * THE CATEGORY'S OWN ORDER.
	 *
	 * mytapestore.com.au puts each category's bestsellers on the first row, and
	 * returning customers navigate by that shape — WooCommerce's default (menu
	 * order, then title) throws it away. scripts/sync-site-structure.php stores
	 * the live order as `_mts_product_order` on the term; this renders it.
	 *
	 * It applies ONLY on an unfiltered, unsorted first page, for the same reason
	 * the Shopify theme skips it there: reordering page 1 of 3, or the results of
	 * a colour filter, would scramble a set the shopper deliberately narrowed.
	 * Anything not in the pinned list keeps its normal position after it, so a
	 * product added since the scrape still appears.
	 */
	if ( '' === $sort && ! $query->is_paged() && ! mts_filters_active() && $query->is_tax( 'product_cat' ) ) {
		$term = get_queried_object();
		$pinned = $term instanceof WP_Term
			? (array) get_term_meta( $term->term_id, '_mts_product_order', true )
			: array();
		$pinned = array_values( array_filter( array_map( 'intval', $pinned ) ) );

		if ( $pinned ) {
			$query->set( 'orderby', 'post__in_then_rest' );
			$query->set( 'mts_pinned', $pinned );
		}
	}

	switch ( $sort ) {
		case 'new':
			$query->set( 'orderby', 'date' );
			$query->set( 'order', 'DESC' );
			break;
		case 'price':
			$order_by_meta( '_price', 'ASC' );
			break;
		case 'price-d':
			$order_by_meta( '_price', 'DESC' );
			break;
		case 'rating':
			$order_by_meta( '_wc_average_rating', 'DESC' );
			break;
		case 'name':
			$query->set( 'orderby', 'title' );
			$query->set( 'order', 'ASC' );
			break;
		case 'popular':
			$order_by_meta( 'total_sales', 'DESC' );
			break;
	}
}
add_action( 'pre_get_posts', 'mts_apply_product_filters' );

/**
 * Twelve articles a page, as the Shopify blog does.
 *
 * sections/mts-blog.liquid opens with `assign per_page = 12`; WordPress was
 * paging the blog at its own default of 10, so the two stores disagreed about
 * where page one ended and every article after the tenth sat on a different page
 * from its Shopify counterpart.
 *
 * Set on the QUERY rather than by writing the `posts_per_page` option, for two
 * reasons: the option is global and would repage search and every other archive
 * with it, and this install's runtime rewrites options on boot (see
 * inc/permalinks.php), so an option would not survive anyway.
 */
function mts_blog_page_size( WP_Query $query ): void {
	if ( is_admin() || ! $query->is_main_query() ) {
		return;
	}

	if ( $query->is_home() || $query->is_category() || $query->is_tag() ) {
		$query->set( 'posts_per_page', 12 );
	}
}
add_action( 'pre_get_posts', 'mts_blog_page_size' );

/**
 * Render the pinned products first, then everything else in its normal order.
 *
 * WordPress can order by `post__in`, but only if the query is RESTRICTED to that
 * list — which would hide every product added since the order was captured. This
 * emits a CASE that assigns each pinned ID its position and everything else a
 * position past the end, so the pinned run leads and the rest follows intact.
 *
 * The IDs are integers by the time they arrive here (intval on the way in) and
 * are re-cast below, so the fragment carries no user input into SQL.
 */
function mts_pinned_orderby( string $orderby, WP_Query $query ) {
	if ( 'post__in_then_rest' !== $query->get( 'orderby' ) ) {
		return $orderby;
	}

	$pinned = array_values( array_filter( array_map( 'intval', (array) $query->get( 'mts_pinned' ) ) ) );
	if ( ! $pinned ) {
		return $orderby;
	}

	global $wpdb;

	$cases = array();
	foreach ( $pinned as $position => $id ) {
		$cases[] = sprintf( 'WHEN %d THEN %d', $id, $position );
	}

	return sprintf(
		'CASE %s.ID %s ELSE %d END ASC, %s.menu_order ASC, %s.post_title ASC',
		$wpdb->posts,
		implode( ' ', $cases ),
		count( $pinned ),
		$wpdb->posts,
		$wpdb->posts
	);
}
add_filter( 'posts_orderby', 'mts_pinned_orderby', 10, 2 );

/**
 * How many products in the current view are in / out of stock.
 *
 * Counted from the posts already loaded for this page rather than with two more
 * queries: the panel only needs to describe what is on screen, and an extra
 * round trip per filter group on every collection page is not worth it.
 *
 * @return array{instock:int,outofstock:int}
 */
function mts_stock_counts(): array {
	$counts = array( 'instock' => 0, 'outofstock' => 0 );

	if ( ! isset( $GLOBALS['wp_query'] ) || ! $GLOBALS['wp_query'] instanceof WP_Query ) {
		return $counts;
	}

	foreach ( (array) $GLOBALS['wp_query']->posts as $post ) {
		$product = wc_get_product( is_object( $post ) ? $post->ID : (int) $post );
		if ( ! $product ) {
			continue;
		}
		$counts[ $product->is_in_stock() ? 'instock' : 'outofstock' ]++;
	}

	return $counts;
}

/**
 * Find an attribute taxonomy by what it is CALLED, not by a guessed slug.
 *
 * Attribute slugs are merchant-chosen and this store proves why guessing fails:
 * the taxonomies here are `pa_color` and `pa_choose-your-size`, so a template
 * hardcoding `pa_colour` / `pa_size` silently renders no colour or size filter
 * at all — no error, just two missing groups.
 *
 * Matching on the label is also what the Shopify theme does.
 *
 * @param string $kind 'colour' or 'size'.
 */
function mts_attr_taxonomy( string $kind ): string {
	static $cache = array();

	if ( isset( $cache[ $kind ] ) ) {
		return $cache[ $kind ];
	}

	$needles = 'colour' === $kind ? array( 'colour', 'color' ) : array( 'size' );
	$found   = '';
	$best    = -1;

	foreach ( wc_get_attribute_taxonomies() as $tax ) {
		$label = strtolower( $tax->attribute_label . ' ' . $tax->attribute_name );

		foreach ( $needles as $needle ) {
			if ( false === strpos( $label, $needle ) ) {
				continue;
			}
			$taxonomy = wc_attribute_taxonomy_name( $tax->attribute_name );
			if ( ! taxonomy_exists( $taxonomy ) ) {
				continue;
			}
			// Several attributes can match ("Colour" and an unused "Colors").
			// Prefer whichever is actually attached to products.
			$count = (int) wp_count_terms( array( 'taxonomy' => $taxonomy, 'hide_empty' => true ) );
			if ( $count > $best ) {
				$best  = $count;
				$found = $taxonomy;
			}
			break;
		}
	}

	$cache[ $kind ] = $found;
	return $found;
}

/**
 * Attribute terms that actually appear on the products in THIS view.
 *
 * Scoped to the current result set rather than the whole store. Offering one of
 * 273 site-wide colours inside a 21-product category would be both unusable and
 * misleading — most choices would return nothing.
 *
 * @return WP_Term[]
 */
function mts_available_terms( string $taxonomy, int $limit = 40 ): array {
	if ( ! $taxonomy || ! taxonomy_exists( $taxonomy ) ) {
		return array();
	}

	$args = array(
		'taxonomy'   => $taxonomy,
		'hide_empty' => true,
		'orderby'    => 'count',
		'order'      => 'DESC',
		'number'     => $limit,
	);

	// Restrict to the products on screen where we have them.
	$ids = array();
	if ( isset( $GLOBALS['wp_query'] ) && $GLOBALS['wp_query'] instanceof WP_Query ) {
		foreach ( (array) $GLOBALS['wp_query']->posts as $post ) {
			$ids[] = is_object( $post ) ? (int) $post->ID : (int) $post;
		}
	}
	if ( $ids ) {
		$args['object_ids'] = $ids;
		unset( $args['number'] ); // object_ids and number do not combine reliably
	}

	$terms = get_terms( $args );
	if ( is_wp_error( $terms ) ) {
		return array();
	}

	/*
	 * SIZES SORT BY SIZE. Everything else sorts by how many products carry it.
	 *
	 * Every facet used to be ordered by frequency, which is right for colours —
	 * the ones most of the catalogue comes in should lead — and wrong for sizes,
	 * because a size list has an inherent order and a shopper reads it expecting
	 * that order. The masking-tape filter rendered:
	 *
	 *     24mm x 50m · 48mm x 50m · 36mm x 50m · 48mm x 25m · 72mm x 50m ·
	 *     50mm x 50m · 12mm x 50m · 18mm x 50m · 24mm x 25m · 25mm x 50m
	 *
	 * — descending by product count, which looks like no order at all. Finding
	 * 25mm in that list means reading all ten.
	 */
	if ( mts_taxonomy_is_size( $taxonomy ) ) {
		usort( $terms, static fn( $a, $b ): int => mts_compare_sizes( $a->name, $b->name ) );
	} else {
		usort( $terms, static fn( $a, $b ): int => (int) $b->count <=> (int) $a->count );
	}

	return array_slice( $terms, 0, $limit );
}

/**
 * Is this the size attribute?
 *
 * Matched on the LABEL, not the slug. The taxonomy is `pa_choose-your-size` on
 * this catalogue, `pa_size` elsewhere, and a slug test would silently stop
 * working the day an attribute is renamed in the admin.
 */
function mts_taxonomy_is_size( string $taxonomy ): bool {
	$label = function_exists( 'wc_attribute_label' ) ? wc_attribute_label( $taxonomy ) : $taxonomy;
	return (bool) preg_match( '/\bsizes?\b|\bwidths?\b|\blengths?\b/i', $label );
}

/**
 * Order two size labels the way a person would.
 *
 * "24mm x 50m" is two numbers, and sorting the STRING puts 100mm before 24mm and
 * 12mm before 3mm. So every number in the label is pulled out and compared in
 * turn — width first, then length — which orders
 *
 *     3mm x 66m · 12mm x 50m · 18mm x 50m · 24mm x 25m · 24mm x 50m · 25mm x 50m
 *
 * correctly, including the two 24mm entries that differ only in their length.
 *
 * Units are not converted. Nothing in this catalogue mixes mm with cm inside one
 * attribute, and a conversion table would be a guess about data that does not
 * exist. Labels with no digits in them fall back to a natural string compare.
 */
function mts_compare_sizes( string $a, string $b ): int {
	preg_match_all( '/\d+(?:\.\d+)?/', $a, $ma );
	preg_match_all( '/\d+(?:\.\d+)?/', $b, $mb );

	$na = array_map( 'floatval', $ma[0] );
	$nb = array_map( 'floatval', $mb[0] );

	if ( ! $na || ! $nb ) {
		return strnatcasecmp( $a, $b );
	}

	foreach ( $na as $i => $value ) {
		if ( ! isset( $nb[ $i ] ) ) {
			return 1; // "24mm" sorts before "24mm x 50m" — fewer numbers first.
		}
		if ( $value !== $nb[ $i ] ) {
			return $value <=> $nb[ $i ];
		}
	}

	if ( count( $nb ) > count( $na ) ) {
		return -1;
	}

	// Same numbers throughout — fall back to the text, so "Hook" and "Loop"
	// variants of one size keep a stable, predictable order.
	return strnatcasecmp( $a, $b );
}
