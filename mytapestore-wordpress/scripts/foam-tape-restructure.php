<?php
/**
 * Foam tape category restructure — tasks 3, 4 and 5 from the brief.
 *
 * WHAT THE BRIEF ASKS FOR, AND WHY IT HANGS TOGETHER
 *
 *   /foam-tape/                  becomes the broad foam-tape landing page,
 *                                holding all ten foam and high-bond lines, and
 *                                comes OUT of the menu ("Don't add this url in
 *                                the menu").
 *   /foam-tape-double-sided/     gains the seven double-sided lines.
 *   /single-sided-foam-tape/     is NEW, goes INTO the Single Sided Tapes menu,
 *                                carries /foam-tape/'s copy, and holds only the
 *                                three genuinely single-sided lines.
 *
 * So the menu stops pointing at a mixed bag and points at the three products a
 * shopper looking for single-sided foam actually wants, while /foam-tape/
 * survives as an indexable page covering the whole family. Nothing is deleted
 * and no URL 404s.
 *
 * THE MENU ITEM IS REPOINTED, NOT REPLACED. Item 1796 already sits in the right
 * place under Single Sided Tapes; editing its target keeps its position and
 * menu_order, where deleting and re-adding would drop it to the end of the
 * list and quietly reorder the menu.
 *
 * IDEMPOTENT. Re-running adds nothing twice: term assignment uses append and
 * the new category is looked up before it is created.
 *
 *   ./node_modules/.bin/wp-playground-cli php \
 *     --site-url=http://127.0.0.1:9400 \
 *     --mount-before-install=./local/wordpress:/wordpress \
 *     --mount=./theme:/wordpress/wp-content/themes/mytapestore \
 *     --mount=./scripts:/wordpress/mts-scripts \
 *     --wordpress-install-mode=install-from-existing-files \
 *     -- /wordpress/mts-scripts/foam-tape-restructure.php
 *
 * @package mytapestore
 */

if ( ! defined( 'ABSPATH' ) ) {
	require_once '/wordpress/wp-load.php';
}

/** The seven double-sided / high-bond lines. */
$mts_double = array(
	'double-sided-pe-foam-tape',
	'high-bond-acrylic-tape-clear',
	'high-bond-acrylic-tape-dark-grey',
	'high-bond-acrylic-tape-white',
	'high-bond-acrylic-tape-grey',
	'spacer-glazing-tape',
	'structural-glazing-tape',
);

/** The three single-sided foam lines. */
$mts_single = array(
	'pvc-nitrile-foam-tape',
	'polyethylene-foam-tape',
	'polyurethane-foam-tape',
);

/**
 * Resolve product slugs to IDs, complaining loudly about any that are missing
 * rather than silently assigning a shorter list.
 */
$mts_ids = static function ( array $slugs ) : array {
	$out = array();
	foreach ( $slugs as $slug ) {
		$post = get_page_by_path( $slug, OBJECT, 'product' );
		if ( ! $post ) {
			echo "  MISSING PRODUCT: {$slug}\n";
			continue;
		}
		$out[] = (int) $post->ID;
	}
	return $out;
};

/** Add products to a category without disturbing what is already there. */
$mts_assign = static function ( array $ids, int $term_id, string $label ) : void {
	$added = 0;
	foreach ( $ids as $id ) {
		$existing = wp_get_object_terms( $id, 'product_cat', array( 'fields' => 'ids' ) );
		if ( in_array( $term_id, (array) $existing, true ) ) {
			continue;
		}
		wp_set_object_terms( $id, array( $term_id ), 'product_cat', true );
		++$added;
	}
	echo "  {$label}: {$added} added, " . ( count( $ids ) - $added ) . " already there\n";
};

echo "=== foam tape restructure ===\n\n";

$mts_double_ids = $mts_ids( $mts_double );
$mts_single_ids = $mts_ids( $mts_single );

/* ------------------------------------------------- 3. foam-tape-double-sided */

echo "3. /foam-tape-double-sided/\n";
$mts_dbl = get_term_by( 'slug', 'foam-tape-double-sided', 'product_cat' );
if ( ! $mts_dbl ) {
	echo "  TERM MISSING — aborting\n";
	return;
}
$mts_assign( $mts_double_ids, (int) $mts_dbl->term_id, 'products' );

/* ------------------------------------------------------------- 4. foam-tape */

echo "\n4. /foam-tape/  (all ten, and out of the menu)\n";
$mts_foam = get_term_by( 'slug', 'foam-tape', 'product_cat' );
if ( ! $mts_foam ) {
	echo "  TERM MISSING — aborting\n";
	return;
}
$mts_assign( array_merge( $mts_single_ids, $mts_double_ids ), (int) $mts_foam->term_id, 'products' );

/* --------------------------------------------- 5. single-sided-foam-tape */

echo "\n5. /single-sided-foam-tape/\n";
$mts_new = get_term_by( 'slug', 'single-sided-foam-tape', 'product_cat' );

if ( ! $mts_new ) {
	$mts_created = wp_insert_term(
		'Foam Tape – Single Sided',
		'product_cat',
		array(
			'slug'        => 'single-sided-foam-tape',
			/*
			 * The brief says to put /foam-tape/'s content in it. Copied rather
			 * than moved: /foam-tape/ stays a real page covering the whole
			 * family and still needs its copy.
			 */
			'description' => (string) $mts_foam->description,
			'parent'      => (int) $mts_foam->parent,
		)
	);
	if ( is_wp_error( $mts_created ) ) {
		echo '  FAILED: ' . $mts_created->get_error_message() . "\n";
		return;
	}
	$mts_new = get_term( (int) $mts_created['term_id'], 'product_cat' );
	echo "  created term {$mts_new->term_id}\n";
} else {
	echo "  term {$mts_new->term_id} already exists\n";
}

$mts_assign( $mts_single_ids, (int) $mts_new->term_id, 'products' );

// The on-page SEO blocks the collection template renders, carried across so the
// new page is not a bare grid.
$mts_blocks = get_term_meta( (int) $mts_foam->term_id, '_mts_seo_blocks', true );
if ( $mts_blocks && ! get_term_meta( (int) $mts_new->term_id, '_mts_seo_blocks', true ) ) {
	update_term_meta( (int) $mts_new->term_id, '_mts_seo_blocks', $mts_blocks );
	echo "  copied _mts_seo_blocks from /foam-tape/\n";
}

// Banner artwork: reuse foam-tape's, which is the single-sided photograph.
$mts_thumb = get_term_meta( (int) $mts_foam->term_id, 'thumbnail_id', true );
if ( $mts_thumb && ! get_term_meta( (int) $mts_new->term_id, 'thumbnail_id', true ) ) {
	update_term_meta( (int) $mts_new->term_id, 'thumbnail_id', $mts_thumb );
	echo "  copied thumbnail_id\n";
}

/* ------------------------------------------------------------------ the menu */

echo "\n   menu\n";
$mts_moved = 0;
foreach ( (array) get_posts( array( 'post_type' => 'nav_menu_item', 'numberposts' => -1, 'post_status' => 'publish' ) ) as $mts_item ) {
	$object_id = (int) get_post_meta( $mts_item->ID, '_menu_item_object_id', true );
	$object    = (string) get_post_meta( $mts_item->ID, '_menu_item_object', true );

	if ( 'product_cat' !== $object || (int) $mts_foam->term_id !== $object_id ) {
		continue;
	}

	// Repoint in place — keeps position and menu_order.
	update_post_meta( $mts_item->ID, '_menu_item_object_id', (int) $mts_new->term_id );
	echo "  menu item {$mts_item->ID} repointed: /foam-tape/ -> /single-sided-foam-tape/\n";
	++$mts_moved;
}

if ( ! $mts_moved ) {
	echo "  no menu item pointed at /foam-tape/ — nothing to repoint\n";
}

echo "\ndone.\n";
