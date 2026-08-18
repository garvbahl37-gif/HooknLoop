<?php
/**
 * "Shop by category" — a DROPDOWN, not the long scrolling list.
 *
 * This theme still shipped the earlier React design: a 236px scroll box holding
 * all 62 categories. Shopify replaced it, and for a reason that applies here
 * identically — scrolling inside a scrolling page to find a category, on a page
 * where the visitor already knows roughly what they want, is worse than one
 * click. The dropdown keeps the grouped structure (Double-Sided / Single-Sided /
 * Dispensers) as headings, shows product counts, and names the current category
 * in its closed state.
 *
 * Built as a button + panel rather than a bare <select> so the group headings,
 * the counts and the active state can be styled — a native select allows none of
 * that. Keyboard behaviour (Arrow keys, Home/End, Escape, type-ahead, focus
 * return) is in assets/js/header-nav.js.
 *
 *   aside.rail.rail--select
 *     div.rail__head                 icon + "Shop by category"
 *     div.rail-dd
 *       button.rail-dd__toggle       current category + caret
 *       div.rail-dd__panel           search box + grouped options
 *
 * @param int $args['active'] Term ID currently being viewed.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

$mts_active = (int) ( $args['active'] ?? 0 );

$mts_shop_url = function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'shop' ) : home_url( '/shop/' );

/*
 * The groups come from the PRIMARY MENU, not from the taxonomy.
 *
 * Shopify builds this rail from the category linklist, whose top level is
 * "Double-Sided Tape / Single-Sided Tapes / Dispensers & Accessories" and whose
 * children are the categories. WooCommerce's product_cat taxonomy on this store
 * is FLAT — every category is top-level — so reading the taxonomy produced 40-odd
 * groups of one entry each where Shopify shows a handful of groups with the
 * whole range under them. The imported menu carries exactly the structure
 * Shopify's linklist does, so it is the right source.
 *
 * The taxonomy is still the fallback: a site whose menu has not been assigned
 * gets a usable rail rather than an empty one.
 */
$mts_groups = array();
$mts_label  = __( 'All categories', 'mytapestore' );

/** Resolve a menu item to its product_cat term, so counts and the active state work. */
$mts_term_for = static function ( $item ): ?WP_Term {
	if ( 'taxonomy' === $item->type && 'product_cat' === $item->object ) {
		$term = get_term( (int) $item->object_id, 'product_cat' );
		return $term instanceof WP_Term ? $term : null;
	}
	// A custom link into /product-category/<slug>/ still names a real category.
	if ( preg_match( '~/product-category/(?:.*/)?([^/?\#]+)~', (string) $item->url, $m ) ) {
		$term = get_term_by( 'slug', $m[1], 'product_cat' );
		return $term instanceof WP_Term ? $term : null;
	}
	return null;
};

foreach ( mts_menu_tree( 'primary' ) as $mts_root ) {
	$mts_entries = array();

	foreach ( $mts_root->mts_children as $mts_child ) {
		$mts_term = $mts_term_for( $mts_child );
		if ( ! $mts_term ) {
			continue;
		}
		$mts_entries[] = array(
			'name' => $mts_child->title ?: $mts_term->name,
			'url'  => get_term_link( $mts_term ),
			'id'   => (int) $mts_term->term_id,
			'n'    => (int) $mts_term->count,
		);
	}

	// A top-level menu item with no category children is still worth listing —
	// it becomes its own single-entry group so nothing is unreachable.
	if ( ! $mts_entries ) {
		$mts_term = $mts_term_for( $mts_root );
		if ( ! $mts_term ) {
			continue;
		}
		$mts_entries[] = array(
			'name' => $mts_root->title ?: $mts_term->name,
			'url'  => get_term_link( $mts_term ),
			'id'   => (int) $mts_term->term_id,
			'n'    => (int) $mts_term->count,
		);
	}

	$mts_groups[] = array(
		'title'   => $mts_root->title,
		'entries' => $mts_entries,
	);
}

if ( ! $mts_groups ) {
	$mts_terms = get_terms( array(
		'taxonomy'   => 'product_cat',
		'hide_empty' => true,
		'orderby'    => 'name',
		'exclude'    => array( (int) get_option( 'default_product_cat' ) ),
	) );

	if ( is_wp_error( $mts_terms ) || ! $mts_terms ) {
		return;
	}

	$mts_groups[] = array(
		'title'   => __( 'All categories', 'mytapestore' ),
		'entries' => array_map(
			static fn( $t ) => array( 'name' => $t->name, 'url' => get_term_link( $t ), 'id' => (int) $t->term_id, 'n' => (int) $t->count ),
			$mts_terms
		),
	);
}

foreach ( $mts_groups as $mts_group ) {
	foreach ( $mts_group['entries'] as $mts_entry ) {
		if ( $mts_active === $mts_entry['id'] ) {
			$mts_label = $mts_entry['name'];
		}
	}
}
?>
<aside class="rail rail--select" aria-label="<?php esc_attr_e( 'Shop by category', 'mytapestore' ); ?>" data-mts-rail>
	<div class="rail__head">
		<?php mts_the_icon( 'grid', 16 ); ?> <?php esc_html_e( 'Shop by category', 'mytapestore' ); ?>
	</div>

	<div class="rail-dd" data-mts-dd>
		<button type="button" class="rail-dd__toggle" data-mts-dd-toggle
				aria-haspopup="listbox" aria-expanded="false" aria-controls="mts-cat-list">
			<span class="rail-dd__label" data-mts-dd-label><?php echo esc_html( $mts_label ); ?></span>
			<span class="rail-dd__caret"><?php mts_the_icon( 'chevronDown', 16 ); ?></span>
		</button>

		<div class="rail-dd__panel" id="mts-cat-list" role="listbox"
			 aria-label="<?php esc_attr_e( 'Shop by category', 'mytapestore' ); ?>" data-mts-dd-panel hidden>
			<div class="rail-dd__search">
				<?php mts_the_icon( 'search', 15 ); ?>
				<input type="text" placeholder="<?php esc_attr_e( 'Search categories', 'mytapestore' ); ?>"
					   aria-label="<?php esc_attr_e( 'Search categories', 'mytapestore' ); ?>"
					   autocomplete="off" data-mts-rail-input>
			</div>

			<div class="rail-dd__scroll" data-mts-rail-list>
				<p class="rail__none" data-mts-rail-none hidden><?php esc_html_e( 'No categories match.', 'mytapestore' ); ?></p>

				<a href="<?php echo esc_url( $mts_shop_url ); ?>" class="rail-dd__opt" role="option"
				   aria-selected="false" data-mts-rail-item data-name="all products">
					<span><?php esc_html_e( 'All products', 'mytapestore' ); ?></span>
				</a>

				<?php foreach ( $mts_groups as $mts_group ) : ?>
					<div class="rail-dd__group" data-mts-rail-sect>
						<div class="rail-dd__group-label"><?php echo esc_html( $mts_group['title'] ); ?></div>
						<?php foreach ( $mts_group['entries'] as $mts_entry ) : ?>
							<?php $mts_on = ( $mts_active === $mts_entry['id'] ); ?>
							<a href="<?php echo esc_url( (string) $mts_entry['url'] ); ?>"
							   class="rail-dd__opt<?php echo $mts_on ? ' is-active' : ''; ?>"
							   role="option" aria-selected="<?php echo $mts_on ? 'true' : 'false'; ?>"
							   data-mts-rail-item data-name="<?php echo esc_attr( strtolower( $mts_entry['name'] ) ); ?>">
								<span><?php echo esc_html( $mts_entry['name'] ); ?></span>
								<?php if ( $mts_entry['n'] > 0 ) : ?>
									<b class="num"><?php echo esc_html( number_format_i18n( $mts_entry['n'] ) ); ?></b>
								<?php endif; ?>
							</a>
						<?php endforeach; ?>
					</div>
				<?php endforeach; ?>
			</div>
		</div>
	</div>
</aside>
