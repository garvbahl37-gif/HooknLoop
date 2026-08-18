<?php
/**
 * Search form — the masthead's centre element, reused inside the mobile drawer.
 *
 * Structure is dictated by header.css: .hd-search is a 50px flex row holding a
 * faint leading glyph (.hd-search__pre), the field, and a pill CTA
 * (.hd-search__btn). The field itself is unclassed — it is styled via
 * `.hd-search input`, so it must be a direct child.
 *
 * post_type=product is submitted so the search lands on the product results
 * WooCommerce renders, rather than WordPress's blog-post search.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

$mts_in_drawer = ! empty( $args['in_drawer'] );
$mts_field_id  = $mts_in_drawer ? 'mts-search-drawer' : 'mts-search';
?>
<?php
/*
 * `.search-ac` is the positioning context for the suggestions panel, which is
 * absolutely positioned to `top: calc(100% + 8px)`. Without this wrapper the
 * panel anchors to whichever ancestor happens to be positioned — the header —
 * and lands in the wrong place at every breakpoint.
 *
 * The whole structure, and every class below, matches
 * mytapestore-shopify/theme/snippets/mts-search-form.liquid. The stylesheet has
 * carried the rules for it since the port; only the markup and the data were
 * missing on this side.
 */
?>
<div class="search-ac" data-mts-search>
	<form class="hd-search" role="search" method="get" action="<?php echo esc_url( home_url( '/' ) ); ?>">
		<span class="hd-search__pre"><?php mts_the_icon( 'search', 20 ); ?></span>

		<label class="screen-reader-text" for="<?php echo esc_attr( $mts_field_id ); ?>">
			<?php esc_html_e( 'Search products', 'mytapestore' ); ?>
		</label>
		<?php
		/*
		 * The combobox contract: `aria-expanded` tracks the panel, `aria-controls`
		 * names it, and assets/js/search.js moves `aria-activedescendant` as the
		 * arrow keys walk the list — so a screen reader announces each suggestion
		 * without focus ever leaving the field.
		 */
		?>
		<input
			id="<?php echo esc_attr( $mts_field_id ); ?>"
			type="search"
			name="s"
			value="<?php echo esc_attr( get_search_query() ); ?>"
			placeholder="<?php esc_attr_e( 'Search tapes, brands or sizes…', 'mytapestore' ); ?>"
			role="combobox"
			aria-expanded="false"
			aria-autocomplete="list"
			aria-controls="<?php echo esc_attr( $mts_field_id ); ?>-panel"
			autocomplete="off"
			data-mts-search-input>

		<input type="hidden" name="post_type" value="product">

		<button class="hd-search__btn" type="submit"><?php esc_html_e( 'Search', 'mytapestore' ); ?></button>
	</form>

	<div class="search-ac__panel"
		 id="<?php echo esc_attr( $mts_field_id ); ?>-panel"
		 role="listbox"
		 aria-label="<?php esc_attr_e( 'Search suggestions', 'mytapestore' ); ?>"
		 data-mts-search-panel
		 hidden></div>
</div>
