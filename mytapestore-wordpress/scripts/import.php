<?php
/**
 * Import exported mytapestore.com.au content into the local WordPress install.
 *
 * Runs INSIDE the Playground WordPress instance:
 *   npm run import
 *
 * Idempotent. Every created object records the live site's ID in _mts_source_id
 * (or the term meta equivalent), and re-running updates the matching object
 * rather than creating a second one. That matters because this will be run many
 * times as the export is refreshed.
 *
 * Deliberately NOT imported:
 *   - wp_snippets   — holds an unauthenticated RCE backdoor on the live site.
 *                     The rebuild is the opportunity to leave it behind.
 *   - users         — no customer PII on a development machine.
 *   - orders        — same reason; the templates never need real orders.
 *   - plugin options— the new theme replaces the plugins that owned them.
 *
 * @package mytapestore
 */

declare( strict_types = 1 );

// MTS_DEBUG_HEADER — surface fatals; PHP-WASM otherwise dies silently.
ini_set( 'display_errors', '1' );
ini_set( 'display_startup_errors', '1' );
ini_set( 'memory_limit', '1024M' );
error_reporting( E_ALL );
register_shutdown_function( static function () {
	$e = error_get_last();
	if ( $e && in_array( $e['type'], array( E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR ), true ) ) {
		fwrite( STDERR, "\nFATAL: {$e['message']}\n  in {$e['file']}:{$e['line']}\n" );
	}
} );

if ( PHP_SAPI !== 'cli' && ! defined( 'MTS_IMPORT' ) ) {
	define( 'MTS_IMPORT', true );
}

require_once '/wordpress/wp-load.php';
require_once ABSPATH . 'wp-admin/includes/image.php';
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';

if ( ! class_exists( 'WooCommerce' ) ) {
	fwrite( STDERR, "WooCommerce is not active — cannot import products.\n" );
	exit( 1 );
}

const CONTENT_DIR = '/wordpress/mts-content';
const UPLOAD_PREFIX = '/wp-content/uploads/';

/** Read one exported collection. */
function mts_load( string $name ) {
	$path = CONTENT_DIR . "/{$name}.json";
	if ( ! file_exists( $path ) ) {
		echo "  (missing {$name}.json — skipped)\n";
		return array();
	}
	return json_decode( (string) file_get_contents( $path ), true ) ?: array();
}

function mts_say( string $line ): void {
	echo $line . "\n";
	flush();
}

/* -------------------------------------------------------------------------
 * 1. Attachments
 *
 * fetch-media.py has already put the files on disk at the same relative path
 * production serves them from, so this only has to create the database rows
 * that let WordPress see them.
 * ---------------------------------------------------------------------- */

/** @var array<string,int> live URL => local attachment ID */
$GLOBALS['mts_attachments'] = array();

function mts_attachment_from_url( string $url, string $alt = '', string $title = '' ): int {
	if ( isset( $GLOBALS['mts_attachments'][ $url ] ) ) {
		return $GLOBALS['mts_attachments'][ $url ];
	}

	$pos = strpos( $url, UPLOAD_PREFIX );
	if ( false === $pos ) {
		return 0;
	}

	$relative = substr( $url, $pos + strlen( UPLOAD_PREFIX ) );
	$relative = explode( '?', $relative )[0];

	$uploads   = wp_upload_dir();
	$full_path = trailingslashit( $uploads['basedir'] ) . $relative;

	if ( ! file_exists( $full_path ) ) {
		return 0;
	}

	// Already imported on a previous run?
	$existing = get_posts( array(
		'post_type'      => 'attachment',
		'posts_per_page' => 1,
		'fields'         => 'ids',
		'meta_key'       => '_wp_attached_file',
		'meta_value'     => $relative,
	) );
	if ( $existing ) {
		$GLOBALS['mts_attachments'][ $url ] = (int) $existing[0];
		return (int) $existing[0];
	}

	$filetype = wp_check_filetype( basename( $relative ), null );
	$id       = wp_insert_attachment( array(
		'guid'           => trailingslashit( $uploads['baseurl'] ) . $relative,
		'post_mime_type' => $filetype['type'] ?: 'image/jpeg',
		'post_title'     => $title ?: preg_replace( '/\.[^.]+$/', '', basename( $relative ) ),
		'post_content'   => '',
		'post_status'    => 'inherit',
	), $full_path );

	if ( is_wp_error( $id ) || ! $id ) {
		return 0;
	}

	update_post_meta( $id, '_wp_attached_file', $relative );
	if ( $alt ) {
		update_post_meta( $id, '_wp_attachment_image_alt', $alt );
	}

	// Record dimensions WITHOUT generating resized variants.
	//
	// wp_generate_attachment_metadata() would resize every image into every
	// registered size. Playground runs PHP in WebAssembly, where GD is roughly
	// an order of magnitude slower than native — 520 images turns a two-minute
	// import into an hour-plus one. The templates only ever request the full
	// size locally, so the variants are dead weight here. Regenerate them on the
	// real server (`wp media regenerate`) if they are ever needed.
	$size = @getimagesize( $full_path );
	wp_update_attachment_metadata( $id, array(
		'file'   => $relative,
		'width'  => $size[0] ?? 0,
		'height' => $size[1] ?? 0,
		'sizes'  => array(),
	) );

	$GLOBALS['mts_attachments'][ $url ] = (int) $id;
	return (int) $id;
}

/* -------------------------------------------------------------------------
 * 2. Product categories — created first, parents wired up in a second pass
 *    because a child can appear before its parent in the export.
 * ---------------------------------------------------------------------- */

function mts_import_categories(): array {
	$rows = mts_load( 'product-categories' );
	mts_say( sprintf( 'Categories: %d', count( $rows ) ) );

	$map = array();  // live term id => local term id

	foreach ( $rows as $row ) {
		$name = html_entity_decode( (string) $row['name'], ENT_QUOTES, 'UTF-8' );
		$slug = (string) $row['slug'];

		$term = get_term_by( 'slug', $slug, 'product_cat' );
		if ( $term ) {
			$term_id = (int) $term->term_id;
			wp_update_term( $term_id, 'product_cat', array(
				'name'        => $name,
				'description' => (string) ( $row['description'] ?? '' ),
			) );
		} else {
			$created = wp_insert_term( $name, 'product_cat', array(
				'slug'        => $slug,
				'description' => (string) ( $row['description'] ?? '' ),
			) );
			if ( is_wp_error( $created ) ) {
				mts_say( "  ! {$slug}: " . $created->get_error_message() );
				continue;
			}
			$term_id = (int) $created['term_id'];
		}

		update_term_meta( $term_id, '_mts_source_id', (int) $row['id'] );
		$map[ (int) $row['id'] ] = $term_id;

		if ( ! empty( $row['image']['src'] ) ) {
			$thumb = mts_attachment_from_url( $row['image']['src'], (string) ( $row['image']['alt'] ?? '' ) );
			if ( $thumb ) {
				update_term_meta( $term_id, 'thumbnail_id', $thumb );
			}
		}
	}

	// Second pass: hierarchy.
	$parented = 0;
	foreach ( $rows as $row ) {
		$parent = (int) ( $row['parent'] ?? 0 );
		if ( ! $parent || ! isset( $map[ (int) $row['id'] ], $map[ $parent ] ) ) {
			continue;
		}
		wp_update_term( $map[ (int) $row['id'] ], 'product_cat', array( 'parent' => $map[ $parent ] ) );
		$parented++;
	}

	mts_say( sprintf( '  %d terms, %d re-parented', count( $map ), $parented ) );
	return $map;
}

/* -------------------------------------------------------------------------
 * 3. Global product attributes (Size, Colour, …) — needed before products so
 *    variable products can reference the taxonomies.
 * ---------------------------------------------------------------------- */

function mts_import_attributes(): array {
	$rows = mts_load( 'product-attributes' );
	mts_say( sprintf( 'Attributes: %d', count( $rows ) ) );

	$map      = array();
	$existing = wc_get_attribute_taxonomies();
	$by_slug  = array();
	foreach ( $existing as $tax ) {
		$by_slug[ $tax->attribute_name ] = (int) $tax->attribute_id;
	}

	foreach ( $rows as $row ) {
		$slug = wc_sanitize_taxonomy_name( (string) $row['slug'] );
		$slug = preg_replace( '/^pa_/', '', $slug );

		if ( isset( $by_slug[ $slug ] ) ) {
			$map[ (int) $row['id'] ] = $by_slug[ $slug ];
			continue;
		}

		$id = wc_create_attribute( array(
			'name'         => (string) $row['name'],
			'slug'         => $slug,
			'type'         => (string) ( $row['type'] ?? 'select' ),
			'order_by'     => (string) ( $row['order_by'] ?? 'menu_order' ),
			'has_archives' => (bool) ( $row['has_archives'] ?? false ),
		) );

		if ( is_wp_error( $id ) ) {
			mts_say( "  ! {$slug}: " . $id->get_error_message() );
			continue;
		}
		$map[ (int) $row['id'] ] = (int) $id;
	}

	// Attribute taxonomies are registered on init; register them now so terms
	// can be attached within this same request.
	delete_transient( 'wc_attribute_taxonomies' );
	WC_Cache_Helper::invalidate_cache_group( 'woocommerce-attributes' );
	foreach ( wc_get_attribute_taxonomies() as $tax ) {
		$name = wc_attribute_taxonomy_name( $tax->attribute_name );
		if ( ! taxonomy_exists( $name ) ) {
			register_taxonomy( $name, 'product', array( 'hierarchical' => false, 'show_ui' => false ) );
		}
	}

	mts_say( sprintf( '  %d attribute taxonomies', count( $map ) ) );
	return $map;
}

/* -------------------------------------------------------------------------
 * 4. Products
 * ---------------------------------------------------------------------- */

function mts_find_by_source_id( int $source_id, string $type = 'product' ): int {
	$found = get_posts( array(
		'post_type'        => $type,
		'post_status'      => 'any',
		'posts_per_page'   => 1,
		'fields'           => 'ids',
		'meta_key'         => '_mts_source_id',
		'meta_value'       => $source_id,
		'suppress_filters' => false,
	) );
	return $found ? (int) $found[0] : 0;
}

/** Build the WC_Product_Attribute list for a product. */
/**
 * @param array<int,int> $attr_map Live attribute ID => LOCAL attribute ID.
 *
 * The map is not optional. Attribute IDs are per-install auto-increments, so a
 * live ID means nothing here: using it raw resolved Size's terms onto the
 * Colour taxonomy and vice versa, and the product page then offered '20mm x
 * 25m' under a heading reading 'Colour'.
 */
function mts_build_attributes( array $raw, int $product_id, array $attr_map ): array {
	$out = array();

	foreach ( $raw as $position => $attr ) {
		$options = array_values( array_filter( (array) ( $attr['options'] ?? array() ) ) );
		if ( ! $options ) {
			continue;
		}

		$object = new WC_Product_Attribute();
		$object->set_name( (string) $attr['name'] );
		$object->set_position( (int) $position );
		$object->set_visible( (bool) ( $attr['visible'] ?? true ) );
		$object->set_variation( (bool) ( $attr['variation'] ?? false ) );

		$live_id = (int) ( $attr['id'] ?? 0 );
		$attr_id = $attr_map[ $live_id ] ?? 0;
		if ( $live_id > 0 && ! $attr_id ) {
			continue; // unmapped global attribute: better absent than wrong
		}
		if ( $attr_id > 0 ) {
			// Global attribute: options are term names that must exist.
			$taxonomy = wc_attribute_taxonomy_name_by_id( $attr_id );
			if ( ! $taxonomy || ! taxonomy_exists( $taxonomy ) ) {
				continue;
			}
			$term_ids = array();
			foreach ( $options as $option ) {
				$option = html_entity_decode( (string) $option, ENT_QUOTES, 'UTF-8' );
				$term   = get_term_by( 'name', $option, $taxonomy );
				if ( ! $term ) {
					$made = wp_insert_term( $option, $taxonomy );
					if ( is_wp_error( $made ) ) {
						continue;
					}
					$term_ids[] = (int) $made['term_id'];
				} else {
					$term_ids[] = (int) $term->term_id;
				}
			}
			if ( ! $term_ids ) {
				continue;
			}
			$object->set_id( $attr_id );
			$object->set_name( $taxonomy );
			$object->set_options( $term_ids );
			wp_set_object_terms( $product_id, $term_ids, $taxonomy );
		} else {
			$object->set_options( array_map(
				static fn( $o ) => html_entity_decode( (string) $o, ENT_QUOTES, 'UTF-8' ),
				$options
			) );
		}

		$out[] = $object;
	}

	return $out;
}

/**
 * Assign a SKU only when it is free, or already belongs to this object.
 *
 * WooCommerce throws WC_Data_Exception on a duplicate SKU, and an uncaught
 * throw kills the whole import — which is exactly what happened the first time
 * this ran: one collision took down all 133 products with no partial progress.
 *
 * A collision is expected rather than exceptional here. A previous partial run
 * can leave a variation holding the SKU, and the live export contains its own
 * duplicates. Uniqueness matters to WooCommerce, not to the design work, so a
 * contested SKU is dropped and noted instead of being made fatal.
 */
function mts_safe_set_sku( WC_Product $product, string $sku ): bool {
	if ( '' === $sku ) {
		return true;
	}

	$owner = wc_get_product_id_by_sku( $sku );
	if ( $owner && $owner !== $product->get_id() ) {
		return false;
	}

	try {
		$product->set_sku( $sku );
		return true;
	} catch ( WC_Data_Exception $e ) {
		return false;
	}
}

/** Copy the Tiered Price Table plugin's B2B pricing rules across verbatim. */
function mts_copy_tiered_pricing( int $product_id, array $row ): void {
	$keys = array( 'tiered_pricing_type', 'tiered_pricing_fixed_rules', 'tiered_pricing_percentage_rules', 'tiered_pricing_minimum' );
	foreach ( $keys as $key ) {
		if ( isset( $row[ $key ] ) && '' !== $row[ $key ] && array() !== $row[ $key ] ) {
			update_post_meta( $product_id, '_' . $key, $row[ $key ] );
		}
	}
	foreach ( $row as $key => $value ) {
		if ( str_contains( $key, '_tiered_pricing_' ) && $value ) {
			update_post_meta( $product_id, $key, $value );
		}
	}
}

function mts_import_products( array $cat_map, array $attr_map ): array {
	$rows       = mts_load( 'products' );
	$variations = mts_load( 'product-variations' );
	mts_say( sprintf( 'Products: %d (%d with variations)', count( $rows ), count( $variations ) ) );

	$map         = array();
	$count       = 0;
	$var_count   = 0;
	$sku_clashes = 0;
	$failed      = array();

	$limit = (int) ( getenv( 'MTS_LIMIT' ) ?: 0 );
	if ( $limit > 0 ) {
		$rows = array_slice( $rows, 0, $limit );
		mts_say( "  (limited to {$limit})" );
	}

	foreach ( $rows as $row ) {
		$source_id = (int) $row['id'];

		// One malformed product must never abort the remaining 132.
		try {
		$existing  = mts_find_by_source_id( $source_id );

		$product = 'variable' === $row['type']
			? new WC_Product_Variable( $existing ?: 0 )
			: new WC_Product_Simple( $existing ?: 0 );

		$product->set_name( html_entity_decode( (string) $row['name'], ENT_QUOTES, 'UTF-8' ) );
		$product->set_slug( (string) $row['slug'] );
		$product->set_status( (string) $row['status'] );
		$product->set_description( (string) ( $row['description'] ?? '' ) );
		$product->set_short_description( (string) ( $row['short_description'] ?? '' ) );
		mts_safe_set_sku( $product, (string) ( $row['sku'] ?? '' ) );
		$product->set_catalog_visibility( (string) ( $row['catalog_visibility'] ?? 'visible' ) );
		$product->set_featured( (bool) ( $row['featured'] ?? false ) );
		$product->set_menu_order( (int) ( $row['menu_order'] ?? 0 ) );
		$product->set_stock_status( (string) ( $row['stock_status'] ?? 'instock' ) );
		$product->set_manage_stock( (bool) ( $row['manage_stock'] ?? false ) );
		if ( null !== ( $row['stock_quantity'] ?? null ) ) {
			$product->set_stock_quantity( (int) $row['stock_quantity'] );
		}
		if ( '' !== ( $row['regular_price'] ?? '' ) ) {
			$product->set_regular_price( (string) $row['regular_price'] );
		}
		if ( '' !== ( $row['sale_price'] ?? '' ) ) {
			$product->set_sale_price( (string) $row['sale_price'] );
		}
		if ( '' !== ( $row['weight'] ?? '' ) ) {
			$product->set_weight( (string) $row['weight'] );
		}
		$dims = (array) ( $row['dimensions'] ?? array() );
		if ( ! empty( $dims['length'] ) ) { $product->set_length( (string) $dims['length'] ); }
		if ( ! empty( $dims['width'] ) )  { $product->set_width( (string) $dims['width'] ); }
		if ( ! empty( $dims['height'] ) ) { $product->set_height( (string) $dims['height'] ); }

		$term_ids = array();
		foreach ( (array) ( $row['categories'] ?? array() ) as $cat ) {
			if ( isset( $cat_map[ (int) $cat['id'] ] ) ) {
				$term_ids[] = $cat_map[ (int) $cat['id'] ];
			}
		}
		if ( $term_ids ) {
			$product->set_category_ids( $term_ids );
		}

		$product_id = $product->save();
		if ( ! $product_id ) {
			mts_say( "  ! failed: {$row['slug']}" );
			continue;
		}

		update_post_meta( $product_id, '_mts_source_id', $source_id );
		mts_copy_tiered_pricing( $product_id, $row );

		// Images.
		$gallery = array();
		foreach ( (array) ( $row['images'] ?? array() ) as $i => $image ) {
			$att = mts_attachment_from_url(
				(string) $image['src'],
				(string) ( $image['alt'] ?? '' ),
				(string) ( $image['name'] ?? '' )
			);
			if ( ! $att ) {
				continue;
			}
			if ( 0 === $i ) {
				set_post_thumbnail( $product_id, $att );
			} else {
				$gallery[] = $att;
			}
		}
		if ( $gallery ) {
			update_post_meta( $product_id, '_product_image_gallery', implode( ',', $gallery ) );
		}

		// Attributes (reload so the object has its saved ID).
		$product    = wc_get_product( $product_id );
		$attributes = mts_build_attributes( (array) ( $row['attributes'] ?? array() ), $product_id, $attr_map );
		if ( $attributes ) {
			$product->set_attributes( $attributes );
			$product->save();
		}

		// Variations.
		if ( 'variable' === $row['type'] && isset( $variations[ (string) $source_id ] ) ) {
			foreach ( $variations[ (string) $source_id ] as $vrow ) {
				$v_existing = mts_find_by_source_id( (int) $vrow['id'], 'product_variation' );
				$variation  = new WC_Product_Variation( $v_existing ?: 0 );
				$variation->set_parent_id( $product_id );
				$variation->set_status( 'publish' );
				if ( '' !== ( $vrow['regular_price'] ?? '' ) ) {
					$variation->set_regular_price( (string) $vrow['regular_price'] );
				}
				if ( '' !== ( $vrow['sale_price'] ?? '' ) ) {
					$variation->set_sale_price( (string) $vrow['sale_price'] );
				}
				$variation->set_stock_status( (string) ( $vrow['stock_status'] ?? 'instock' ) );
				if ( ! empty( $vrow['sku'] ) && ! mts_safe_set_sku( $variation, (string) $vrow['sku'] ) ) {
					$sku_clashes++;
				}

				$attrs = array();
				foreach ( (array) ( $vrow['attributes'] ?? array() ) as $vattr ) {
					$v_live = (int) ( $vattr['id'] ?? 0 );
					$aid    = $attr_map[ $v_live ] ?? 0;
					$key    = $aid > 0
						? wc_attribute_taxonomy_name_by_id( $aid )
						: sanitize_title( (string) $vattr['name'] );
					if ( ! $key ) {
						continue;
					}
					$value = html_entity_decode( (string) ( $vattr['option'] ?? '' ), ENT_QUOTES, 'UTF-8' );
					if ( $aid > 0 && $key ) {
						$term = get_term_by( 'name', $value, $key );
						$value = $term ? $term->slug : sanitize_title( $value );
					}
					$attrs[ $key ] = $value;
				}
				$variation->set_attributes( $attrs );

				if ( ! empty( $vrow['image']['src'] ) ) {
					$att = mts_attachment_from_url( (string) $vrow['image']['src'] );
					if ( $att ) {
						$variation->set_image_id( $att );
					}
				}

				$vid = $variation->save();
				if ( $vid ) {
					update_post_meta( $vid, '_mts_source_id', (int) $vrow['id'] );
					$var_count++;
				}
			}
			WC_Product_Variable::sync( $product_id );
		}

		} catch ( Throwable $e ) {
			$failed[] = $row['slug'] . ': ' . $e->getMessage();
			continue;
		}

		$map[ $source_id ] = $product_id;
		$count++;
		if ( 0 === $count % 5 ) {
			mts_say( sprintf( '  %d/%d products, %d variations', $count, count( $rows ), $var_count ) );
		}
	}

	mts_say( sprintf( '  done: %d products, %d variations, %d SKU clashes skipped', $count, $var_count, $sku_clashes ) );
	foreach ( $failed as $line ) {
		mts_say( '  ! ' . $line );
	}
	return $map;
}

/* -------------------------------------------------------------------------
 * 5. Pages and posts
 * ---------------------------------------------------------------------- */

function mts_import_posts( string $collection, string $post_type ): array {
	$rows = mts_load( $collection );
	mts_say( sprintf( '%s: %d', ucfirst( $collection ), count( $rows ) ) );

	$map = array();
	foreach ( $rows as $row ) {
		$source_id = (int) $row['id'];
		$existing  = mts_find_by_source_id( $source_id, $post_type );

		$postarr = array(
			'ID'            => $existing ?: 0,
			'post_type'     => $post_type,
			'post_status'   => 'publish',
			'post_title'    => html_entity_decode( (string) ( $row['title']['rendered'] ?? '' ), ENT_QUOTES, 'UTF-8' ),
			'post_name'     => (string) $row['slug'],
			'post_content'  => (string) ( $row['content']['rendered'] ?? '' ),
			'post_excerpt'  => wp_strip_all_tags( (string) ( $row['excerpt']['rendered'] ?? '' ) ),
			'post_date'     => (string) ( $row['date'] ?? '' ),
			'menu_order'    => (int) ( $row['menu_order'] ?? 0 ),
		);

		$id = wp_insert_post( array_filter( $postarr, static fn( $v ) => '' !== $v && null !== $v ), true );
		if ( is_wp_error( $id ) ) {
			mts_say( "  ! {$row['slug']}: " . $id->get_error_message() );
			continue;
		}

		update_post_meta( $id, '_mts_source_id', $source_id );
		$map[ $source_id ] = (int) $id;
	}

	mts_say( sprintf( '  %d imported', count( $map ) ) );
	return $map;
}

/* -------------------------------------------------------------------------
 * 6. Menus
 * ---------------------------------------------------------------------- */

function mts_import_menus( array $page_map, array $cat_map ): void {
	$menus = mts_load( 'menus' );
	$items = mts_load( 'menu-items' );
	mts_say( sprintf( 'Menus: %d (%d items)', count( $menus ), count( $items ) ) );

	$menu_map = array();
	foreach ( $menus as $menu ) {
		$name     = html_entity_decode( (string) $menu['name'], ENT_QUOTES, 'UTF-8' );
		$existing = wp_get_nav_menu_object( $name );
		$menu_id  = $existing ? (int) $existing->term_id : (int) wp_create_nav_menu( $name );
		if ( $menu_id ) {
			$menu_map[ (int) $menu['id'] ] = $menu_id;
		}
	}

	// Menu items are REPLACED, not appended.
	//
	// wp_update_nav_menu_item() with an ID of 0 creates a new item every call,
	// so re-running the importer previously doubled every menu — which showed up
	// as a nav bar with "Home" and "Double Sided Tape" listed twice and six mega
	// panels instead of three. Clearing first makes the whole import idempotent,
	// which it has to be: it is run repeatedly as the export is refreshed.
	foreach ( $menu_map as $local_menu_id ) {
		foreach ( (array) wp_get_nav_menu_items( $local_menu_id, array( 'post_status' => 'any' ) ) as $existing ) {
			wp_delete_post( (int) $existing->ID, true );
		}
	}

	// Parents must exist before children, so seed in export order and keep a
	// live-item-id => local-item-id map as we go.
	$item_map = array();
	$made     = 0;
	usort( $items, static fn( $a, $b ) => ( (int) $a['parent'] <=> (int) $b['parent'] ) ?: ( (int) $a['menu_order'] <=> (int) $b['menu_order'] ) );

	foreach ( $items as $item ) {
		$menus_of_item = (array) ( $item['menus'] ?? array() );
		$live_menu     = (int) ( is_array( $menus_of_item ) ? ( $menus_of_item[0] ?? 0 ) : $menus_of_item );
		if ( ! isset( $menu_map[ $live_menu ] ) ) {
			continue;
		}

		$args = array(
			'menu-item-title'     => html_entity_decode( (string) ( $item['title']['rendered'] ?? '' ), ENT_QUOTES, 'UTF-8' ),
			'menu-item-url'       => (string) ( $item['url'] ?? '' ),
			'menu-item-status'    => 'publish',
			'menu-item-position'  => (int) ( $item['menu_order'] ?? 0 ),
			'menu-item-parent-id' => $item_map[ (int) ( $item['parent'] ?? 0 ) ] ?? 0,
			'menu-item-type'      => 'custom',
		);

		/*
		 * "Home" always means the site root.
		 *
		 * The live menu links Home to a page that exists only to hold the old
		 * builder's homepage layout. Imported and followed, that lands on a
		 * near-empty article with a "Home > Home" breadcrumb instead of the
		 * storefront. This has to live INSIDE the importer: a one-off repair
		 * script was undone the moment the menus were rebuilt.
		 */
		if ( 0 === strcasecmp( trim( wp_strip_all_tags( $args['menu-item-title'] ) ), 'home' ) ) {
			$args['menu-item-url']  = '/';
			$args['menu-item-type'] = 'custom';
			$new_id = wp_update_nav_menu_item( $menu_map[ $live_menu ], 0, $args );
			if ( ! is_wp_error( $new_id ) ) {
				$item_map[ (int) $item['id'] ] = (int) $new_id;
				$made++;
			}
			continue;
		}

		// Point at the local object where we can, so permalinks stay correct.
		$object    = (string) ( $item['object'] ?? '' );
		$object_id = (int) ( $item['object_id'] ?? 0 );
		if ( 'page' === $object && isset( $page_map[ $object_id ] ) ) {
			$args['menu-item-type']      = 'post_type';
			$args['menu-item-object']    = 'page';
			$args['menu-item-object-id'] = $page_map[ $object_id ];
			unset( $args['menu-item-url'] );
		} elseif ( 'product_cat' === $object && isset( $cat_map[ $object_id ] ) ) {
			$args['menu-item-type']      = 'taxonomy';
			$args['menu-item-object']    = 'product_cat';
			$args['menu-item-object-id'] = $cat_map[ $object_id ];
			unset( $args['menu-item-url'] );
		}

		$new_id = wp_update_nav_menu_item( $menu_map[ $live_menu ], 0, $args );
		if ( ! is_wp_error( $new_id ) ) {
			$item_map[ (int) $item['id'] ] = (int) $new_id;
			$made++;
		}
	}

	mts_say( sprintf( '  %d menus, %d items', count( $menu_map ), $made ) );

	// Best-effort assignment to the theme's locations by name.
	$locations = get_theme_mod( 'nav_menu_locations', array() );
	foreach ( $menu_map as $menu_id ) {
		$menu = wp_get_nav_menu_object( $menu_id );
		if ( ! $menu ) {
			continue;
		}
		$slug = sanitize_title( $menu->name );
		if ( str_contains( $slug, 'main' ) || str_contains( $slug, 'primary' ) || str_contains( $slug, 'categor' ) ) {
			$locations['primary'] = $menu_id;
		}
	}
	set_theme_mod( 'nav_menu_locations', $locations );
}

/* -------------------------------------------------------------------------
 * Run
 * ---------------------------------------------------------------------- */

$started = microtime( true );
mts_say( '--- importing mytapestore.com.au content ---' );

// Imports are slow enough without WooCommerce recalculating lookup tables and
// firing webhooks on every single save.
add_filter( 'intermediate_image_sizes_advanced', '__return_empty_array' );
add_filter( 'big_image_size_threshold', '__return_false' );
wp_defer_term_counting( true );
wp_defer_comment_counting( true );
remove_all_actions( 'woocommerce_update_product' );

$cat_map  = mts_import_categories();
$attr_map = mts_import_attributes();
$prod_map = mts_import_products( $cat_map, $attr_map );
$page_map = mts_import_posts( 'pages', 'page' );
mts_import_posts( 'posts', 'post' );
mts_import_menus( $page_map, $cat_map );

wp_defer_term_counting( false );
wp_defer_comment_counting( false );

// Point WooCommerce's own pages at the imported ones where they exist.
foreach ( array( 'shop' => 'woocommerce_shop_page_id', 'cart' => 'woocommerce_cart_page_id', 'checkout' => 'woocommerce_checkout_page_id', 'my-account' => 'woocommerce_myaccount_page_id' ) as $slug => $option ) {
	$page = get_page_by_path( $slug );
	if ( $page ) {
		update_option( $option, $page->ID );
	}
}

// A fresh WooCommerce install hides the storefront behind a coming-soon page.
update_option( 'woocommerce_coming_soon', 'no' );
update_option( 'blogname', 'My Tape Store' );

flush_rewrite_rules( false );

mts_say( sprintf(
	"\n--- done in %.1fs: %d products, %d categories, %d pages ---",
	microtime( true ) - $started,
	count( $prod_map ),
	count( $cat_map ),
	count( $page_map )
) );
