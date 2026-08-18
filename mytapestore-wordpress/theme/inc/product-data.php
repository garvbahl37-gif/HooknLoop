<?php
/**
 * Product data the Shopify product page shows but WooCommerce has no field for.
 *
 * On Shopify these live in metafields:
 *   product.vendor                  → the Brand chip and the Brand spec row
 *   product.metafields.custom.key_specs → the four ticked lines under the gallery
 *   product.metafields.custom.specs → the engineering rows in the Specifications
 *                                     table (thickness, adhesive, temperature…)
 *
 * WooCommerce has no vendor field and no repeatable spec field, so the sync in
 * scripts/sync-shopify-content.php writes them to post meta and these readers
 * hand them back in the same shape the Liquid template consumed.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

/**
 * The product's brand — Shopify's `product.vendor`.
 *
 * Falls back to a "Brand" product attribute where one exists, so a product
 * added in WordPress after the sync still shows something true. It returns an
 * empty string rather than the shop name: "Brand: My Tape Store" on a roll of
 * Kikusui tape is not a fallback, it is a wrong answer, and it was on every
 * product page.
 */
function mts_product_brand( WC_Product $product ): string {
	$brand = (string) get_post_meta( $product->get_id(), '_mts_brand', true );
	if ( '' !== $brand ) {
		return $brand;
	}

	foreach ( array( 'brand', 'pa_brand', 'Brand' ) as $key ) {
		$value = $product->get_attribute( $key );
		if ( $value ) {
			// get_attribute() joins multiples with ", " — the first is the brand.
			return trim( explode( ',', $value )[0] );
		}
	}

	return '';
}

/**
 * The four ticked "key specs" beside the gallery, in order. Capped at four by
 * the caller, as on Shopify.
 *
 * @return string[]
 */
function mts_product_key_specs( WC_Product $product ): array {
	$specs = get_post_meta( $product->get_id(), '_mts_key_specs', true );
	if ( ! is_array( $specs ) ) {
		return array();
	}
	return array_values( array_filter( array_map( 'strval', $specs ), 'strlen' ) );
}

/**
 * The engineering spec rows for the Specifications tab.
 *
 * @return array<int, array{label: string, value: string}>
 */
function mts_product_specs( WC_Product $product ): array {
	$specs = get_post_meta( $product->get_id(), '_mts_specs', true );
	if ( ! is_array( $specs ) ) {
		return array();
	}

	$rows = array();
	foreach ( $specs as $spec ) {
		if ( ! is_array( $spec ) || empty( $spec['label'] ) || ! isset( $spec['value'] ) ) {
			continue;
		}
		$rows[] = array(
			'label' => (string) $spec['label'],
			'value' => (string) $spec['value'],
		);
	}
	return $rows;
}

/**
 * Product-category terms that are NOT industries.
 *
 * WooCommerce keeps industries and categories in the same `product_cat`
 * taxonomy, exactly as Shopify keeps them both in collections. The product page
 * has to tell them apart in four places — the eyebrow above the H1, the
 * Category spec row, the "Recommended for" chips and the related-products
 * fallback — so the split is made once, here, from the same handle list the
 * Liquid templates use.
 *
 * @return WP_Term[]
 */
function mts_industry_slugs(): array {
	return array(
		'aerospace-defense',
		'building-construction',
		'display-signage',
		'electronics-electrical',
		'flooring',
		'framing-insulation',
		'glass-glazing',
		'hvac-plumbing',
		'joinery-kitchen-furniture',
		'manufacturing',
		'marine',
		'marking-safety',
		'nameplates',
		'pool-spa',
		'printing',
		'roofing-gutters',
		'sheathing-moisture-management',
		'solar-energy',
		'telecommunication',
		'transport-automotive-rv',
		'warehouse-packaging-logistics',
		'windows-doors-decking',
		'all',
		'frontpage',
		'bestsellers',
		'uncategorised',
		'uncategorized',
	);
}

/**
 * Every product_cat term on the product, split into real categories and the
 * industries it serves.
 *
 * @return array{categories: WP_Term[], industries: WP_Term[]}
 */
function mts_product_terms( WC_Product $product ): array {
	$terms = get_the_terms( $product->get_id(), 'product_cat' );
	if ( ! $terms || is_wp_error( $terms ) ) {
		return array(
			'categories' => array(),
			'industries' => array(),
		);
	}

	$skip       = mts_industry_slugs();
	$categories = array();
	$industries = array();

	foreach ( $terms as $term ) {
		if ( in_array( $term->slug, $skip, true ) ) {
			$industries[] = $term;
		} else {
			$categories[] = $term;
		}
	}

	return array(
		'categories' => $categories,
		'industries' => $industries,
	);
}

/**
 * The product's primary category — the first term that is a category rather
 * than an industry. Null when the product only sits in industries.
 */
function mts_primary_category( WC_Product $product ): ?WP_Term {
	$split = mts_product_terms( $product );
	return $split['categories'][0] ?? ( $split['industries'][0] ?? null );
}

/**
 * Resolve a colour option value to a CSS background — the PHP twin of
 * snippets/mts-swatch-fill.liquid, value for value.
 *
 * The theme had its own shorter table with DIFFERENT colours in it (orange
 * #ec7211 against the design's #df3c22, black #111111 against #1a1a1a), so
 * swatches for the same product were literally different colours on the two
 * stores. Two-tone hazard values ("B/Y Left", "Red/White Danger") resolve to a
 * diagonal stripe rather than falling back to a plain text chip.
 *
 * Returns '' when nothing sensible maps, which is the caller's signal to render
 * the value as text instead.
 */
function mts_swatch_fill( string $value ): string {
	$v = strtolower( trim( $value ) );

	$named = array(
		'black'       => '#1a1a1a',
		'white'       => '#ffffff',
		'orange'      => '#df3c22',
		'brown'       => '#6b4423',
		'red'         => '#c0392b',
		'blue'        => '#2b5cb8',
		'navy'        => '#1f2d5a',
		'green'       => '#2e7d32',
		'yellow'      => '#e8b800',
		'grey'        => '#8a8a8a',
		'gray'        => '#8a8a8a',
		'dark grey'   => '#4d4d4d',
		'dark gray'   => '#4d4d4d',
		'silver'      => '#c7c7c7',
		'aluminium'   => '#c7c7c7',
		'gold'        => '#c9a227',
		'pink'        => '#e35b8f',
		'purple'      => '#7b4bb8',
		'clear'       => 'linear-gradient(135deg,#eee 25%,#fff 25% 50%,#eee 50% 75%,#fff 75%)',
		'transparent' => 'linear-gradient(135deg,#eee 25%,#fff 25% 50%,#eee 50% 75%,#fff 75%)',
	);

	if ( isset( $named[ $v ] ) ) {
		return $named[ $v ];
	}

	if ( false === strpos( $v, '/' ) ) {
		return '';
	}

	$stripped = str_replace( array( ' left', ' right' ), '', $v );
	$stripped = trim( (string) preg_replace( '#\s*/\s*#', '/', $stripped ) );
	$halves   = explode( '/', $stripped );

	if ( 2 !== count( $halves ) ) {
		return '';
	}

	$resolve = static function ( string $half ): string {
		$half = trim( $half );
		$by   = array(
			'black'  => '#1a1a1a',
			'white'  => '#ffffff',
			'yellow' => '#e8b800',
			'red'    => '#c0392b',
			'green'  => '#2e7d32',
			'orange' => '#ff6a1a',
			'fluro'  => '#ff6a1a',
		);
		foreach ( $by as $needle => $hex ) {
			if ( false !== strpos( $half, $needle ) ) {
				return $hex;
			}
		}
		$initials = array(
			'b' => '#1a1a1a',
			'w' => '#ffffff',
			'y' => '#e8b800',
			'r' => '#c0392b',
			'g' => '#2e7d32',
			'o' => '#ff6a1a',
		);
		return $initials[ substr( $half, 0, 1 ) ] ?? '';
	};

	$c1 = $resolve( $halves[0] );
	$c2 = $resolve( $halves[1] );

	if ( '' === $c1 || '' === $c2 ) {
		return '';
	}

	return sprintf( 'repeating-linear-gradient(45deg, %1$s 0 7px, %2$s 7px 14px)', $c1, $c2 );
}

/**
 * Intrinsic pixel size of a theme asset, as [width, height].
 *
 * Banner markup used to hardcode width="2000" height="560" on files that are
 * 1600×893 and 1800×1005 — a declared aspect ratio that does not match the
 * pixels makes the browser reserve the wrong box, and `object-fit: cover` then
 * crops and scales to fit it. Ask the file.
 *
 * @return array{0:int,1:int}|null
 */
function mts_image_size( string $url ): ?array {
	$path = mts_asset_path( $url );
	if ( ! $path ) {
		return null;
	}

	$cache = wp_cache_get( $path, 'mts_image_size' );
	if ( is_array( $cache ) ) {
		return $cache;
	}

	$size = @getimagesize( $path ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- a missing/corrupt file is answered with null, not a warning.
	if ( ! $size ) {
		return null;
	}

	$dims = array( (int) $size[0], (int) $size[1] );
	wp_cache_set( $path, $dims, 'mts_image_size' );
	return $dims;
}

/**
 * Filesystem path for a theme asset URL, or '' when the URL is not one.
 */
function mts_asset_path( string $url ): string {
	$base = get_template_directory_uri() . '/assets/';
	if ( 0 !== strpos( $url, $base ) ) {
		return '';
	}
	$path = get_template_directory() . '/assets/' . substr( $url, strlen( $base ) );
	return file_exists( $path ) ? $path : '';
}

/**
 * A srcset for a banner, built from the sibling files that actually exist.
 *
 * scripts/pull-collection-banners.py writes `<handle>.jpg` (2000w),
 * `<handle>-1200.jpg` and `<handle>-800.jpg`. Only the ones on disk are offered,
 * so a category whose artwork has not been re-pulled still renders — it just
 * gets the single file it always had.
 */
function mts_banner_srcset( string $url ): string {
	$path = mts_asset_path( $url );
	if ( ! $path ) {
		return '';
	}

	$dims = mts_image_size( $url );
	if ( ! $dims ) {
		return '';
	}

	$dir  = dirname( $path );
	$name = pathinfo( $path, PATHINFO_FILENAME );
	$ext  = pathinfo( $path, PATHINFO_EXTENSION );
	$base = dirname( $url );

	$parts = array();
	foreach ( array( 800, 1200 ) as $width ) {
		if ( $width >= $dims[0] ) {
			continue;
		}
		if ( file_exists( "{$dir}/{$name}-{$width}.{$ext}" ) ) {
			$parts[] = "{$base}/{$name}-{$width}.{$ext} {$width}w";
		}
	}

	if ( ! $parts ) {
		return '';
	}

	$parts[] = "{$url} {$dims[0]}w";
	return implode( ', ', $parts );
}

/**
 * Render a price the way Liquid's `money` filter does: plain text, no markup.
 *
 * wc_price() wraps every amount in <span class="woocommerce-Price-amount">, and
 * those spans landed inside .pdp-buy__price, .pdp-vtier b and every cart total —
 * places where the design's CSS styles the element it was told about, not a
 * nested span. Same number, no nesting.
 */
function mts_money( float $amount ): string {
	return trim( wp_strip_all_tags( wc_price( $amount ) ) );
}

/**
 * Put a variation attribute's options into ascending numeric order.
 *
 * WHY THIS IS NEEDED
 *
 * Thirteen products shipped with their size dropdown in the order WooCommerce
 * happened to store the terms, which is neither alphabetical nor numeric.
 * double-sided-premium-tissue-tape offered
 *
 *     24mm x 50m · 48mm x 50m · 36mm x 50m · 72mm x 50m · 12mm x 50m ·
 *     18mm x 50m · 09mm x 50m · 06mm x 50m
 *
 * — a shopper looking for 12mm has to read the whole list, and it reads as
 * carelessness on a page that is otherwise precise.
 *
 * WHY NOT SORT THE TERMS IN THE DATABASE
 *
 * Because the cutover is theme-only: the live database stays and this theme
 * goes on top of it. A fix written into wp_term_relationships would never
 * travel. Sorting at render time works against whatever ordering the live
 * install happens to have, which is the only place it can work.
 *
 * WHAT IT SORTS ON
 *
 * Every number in the label, in order, compared as a tuple — so
 * "1.1mm thick x 09mm x 50m" is (1.1, 9, 50) and sorts after
 * "1.1mm thick x 06mm x 50m" but before "1.6mm thick x 12mm x 33m". That also
 * makes "09mm" and "9mm" equal, which a string sort gets wrong.
 *
 * ATTRIBUTES WITH NO NUMBERS ARE LEFT ALONE. Colours are curated — Black,
 * White, Clear, Brown — and reordering them would be a regression dressed up as
 * a fix. The sort only runs when every option carries a number to sort on.
 *
 * @param array<int,array{value:string,label:string}> $choices
 * @return array<int,array{value:string,label:string}>
 */
function mts_sort_variation_choices( array $choices ): array {
	if ( count( $choices ) < 2 ) {
		return $choices;
	}

	$keys = array();

	foreach ( $choices as $i => $choice ) {
		if ( ! preg_match_all( '/\d+(?:\.\d+)?/', (string) $choice['label'], $found ) ) {
			// One option without a number and the whole list is left as authored.
			return $choices;
		}
		$keys[ $i ] = array_map( 'floatval', $found[0] );
	}

	uksort(
		$choices,
		static function ( $a, $b ) use ( $keys ): int {
			$x = $keys[ $a ];
			$y = $keys[ $b ];
			$n = min( count( $x ), count( $y ) );

			for ( $i = 0; $i < $n; $i++ ) {
				if ( $x[ $i ] !== $y[ $i ] ) {
					return $x[ $i ] <=> $y[ $i ];
				}
			}

			// Same numbers as far as both go: the shorter label first.
			return count( $x ) <=> count( $y );
		}
	);

	return array_values( $choices );
}

/**
 * Order the terms WooCommerce fetches for a variation dropdown.
 *
 * mts_sort_variation_choices() fixes the swatches, but NOT the <select> — and
 * that took a wrong answer to find. wc_dropdown_variation_attribute_options()
 * ignores the order of the `options` array it is handed: at
 * wc-template-functions.php it calls wc_get_product_terms() and re-fetches the
 * terms itself, using the passed array only to decide WHICH to include. So the
 * dropdown kept rendering 12mm · 140mm · 18mm · 24mm … — alphabetical, because
 * every attribute in this store is configured `orderby=menu_order` and every
 * menu_order is 0.
 *
 * WooCommerce has a built-in `name_num` ordering that would fix this, but it is
 * a per-attribute setting in wp_woocommerce_attribute_taxonomies — database,
 * not code — so it would not survive the theme-only cutover onto the live
 * install. This filter does, and it applies to every consumer of
 * wc_get_product_terms() rather than to one template.
 *
 * @param mixed  $terms    Term objects, or names/slugs/ids depending on $args.
 * @param int    $product_id
 * @param string $taxonomy
 * @return mixed
 */
function mts_order_product_terms( $terms, $product_id, $taxonomy ) {
	if ( ! is_array( $terms ) || count( $terms ) < 2 || ! str_starts_with( (string) $taxonomy, 'pa_' ) ) {
		return $terms;
	}

	// Reuse the one sorting authority, so the swatches and the select can never
	// disagree about what "ascending" means.
	$choices = array();
	foreach ( $terms as $i => $term ) {
		$label = is_object( $term ) ? (string) ( $term->name ?? '' ) : (string) $term;
		$choices[] = array( 'value' => (string) $i, 'label' => $label );
	}

	$sorted = mts_sort_variation_choices( $choices );

	// Unchanged means it had nothing numeric to sort on — colours, finishes —
	// and the authored order is kept.
	if ( wp_list_pluck( $sorted, 'value' ) === wp_list_pluck( $choices, 'value' ) ) {
		return $terms;
	}

	$out = array();
	foreach ( $sorted as $choice ) {
		$out[] = $terms[ (int) $choice['value'] ];
	}

	return $out;
}
add_filter( 'woocommerce_get_product_terms', 'mts_order_product_terms', 10, 3 );
