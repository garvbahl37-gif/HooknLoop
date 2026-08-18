<?php
/**
 * Filter sidebar — ported from the Shopify theme's mts-filter-panel snippet.
 *
 * Structure is copied from that snippet exactly, because the CSS targets it
 * exactly:
 *
 *   form.filt-card                 the whole panel is ONE form
 *     div.filt          [group]
 *       button.filt__title         collapsible heading + .filt__chev
 *       div.filt__body             the options
 *         label.filt__check        input + <span>label</span> + b.filt__count
 *
 * An earlier version of this file was written from class names in the React
 * source instead, and invented .filt__box / .filt__dot wrappers that no rule
 * matches — the panel rendered as unstyled text running out of its column. The
 * lesson is recorded here so it is not repeated: port the artefact, do not
 * reconstruct it from a class list.
 *
 * It is a plain <form method="get">, so with JavaScript off it still filters on
 * submit. assets/js/filters.js auto-submits on change and drives the collapse.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

$mts_action = '';
if ( is_tax( array( 'product_cat', 'product_tag' ) ) ) {
	$mts_term_obj = get_queried_object();
	$mts_action   = $mts_term_obj instanceof WP_Term ? (string) get_term_link( $mts_term_obj ) : '';
}
if ( ! $mts_action ) {
	$mts_action = function_exists( 'wc_get_page_permalink' ) ? (string) wc_get_page_permalink( 'shop' ) : home_url( '/shop/' );
}

$mts_sort    = (string) mts_filter( MTS_F_SORT );
$mts_stock_raw = (string) mts_filter( MTS_F_STOCK );
if ( '1' === $mts_stock_raw ) {
	$mts_stock_raw = 'instock'; // legacy value from earlier shared links
}
$mts_band    = (string) mts_filter( MTS_F_PRICE );
$mts_sizes   = mts_available_terms( mts_attr_taxonomy( 'size' ) );
$mts_colours = mts_available_terms( mts_attr_taxonomy( 'colour' ) );
$mts_bands   = mts_price_bands();

$mts_chosen_colours = mts_filter( MTS_F_COLOUR );
$mts_chosen_colours = is_array( $mts_chosen_colours ) ? $mts_chosen_colours : array_filter( array( $mts_chosen_colours ) );
$mts_chosen_sizes   = mts_filter( MTS_F_SIZE );
$mts_chosen_sizes   = is_array( $mts_chosen_sizes ) ? $mts_chosen_sizes : array_filter( array( $mts_chosen_sizes ) );

/** Named CSS colours the swatch can paint directly; anything else stays neutral. */
$mts_swatch = static function ( string $label ): string {
	$named = array(
		'black' => '#111111', 'white' => '#ffffff', 'red' => '#c8102e', 'blue' => '#1f4fd8',
		'green' => '#1f8a4c', 'yellow' => '#f2c200', 'orange' => '#ec7211', 'grey' => '#8a8a8a',
		'gray' => '#8a8a8a', 'silver' => '#c4c8cc', 'brown' => '#7a4a21', 'clear' => 'transparent',
		'transparent' => 'transparent', 'gold' => '#c9a227', 'pink' => '#e46ea1', 'purple' => '#7a4bbf',
	);
	$key = strtolower( trim( $label ) );
	return $named[ $key ] ?? '';
};
?>
<form class="filt-card" data-mts-filters action="<?php echo esc_url( $mts_action ); ?>" method="get">

	<?php if ( $mts_sort ) : ?>
		<input type="hidden" name="<?php echo esc_attr( MTS_F_SORT ); ?>" value="<?php echo esc_attr( $mts_sort ); ?>">
	<?php endif; ?>

	<?php
	/*
	 * Availability offers BOTH states with their counts, matching the Shopify
	 * panel. A single "in stock only" tickbox hides the fact that a category has
	 * out-of-stock lines at all; showing "Out of stock 0", greyed and disabled,
	 * answers the question without sending anyone to an empty result.
	 *
	 * They are radios rather than checkboxes because the two are mutually
	 * exclusive — a product cannot be both.
	 */
	$mts_stock_counts = mts_stock_counts();
	$mts_stock_opts   = array(
		'instock'    => array( __( 'In stock', 'mytapestore' ), $mts_stock_counts['instock'] ),
		'outofstock' => array( __( 'Out of stock', 'mytapestore' ), $mts_stock_counts['outofstock'] ),
	);
	?>
	<div class="filt" data-mts-filt-group>
		<button type="button" class="filt__title" data-mts-filt-toggle aria-expanded="true">
			<span><?php esc_html_e( 'Availability', 'mytapestore' ); ?></span>
			<?php mts_the_icon( 'chevronDown', 16, 'filt__chev' ); ?>
		</button>
		<div class="filt__body" data-mts-filt-body>
			<?php foreach ( $mts_stock_opts as $mts_value => $mts_opt ) : ?>
				<?php $mts_on = ( $mts_stock_raw === $mts_value ); ?>
				<label class="filt__check">
					<input type="checkbox" name="<?php echo esc_attr( MTS_F_STOCK ); ?>"
						   value="<?php echo esc_attr( $mts_value ); ?>"
						   <?php checked( $mts_on ); ?>
						   <?php disabled( 0 === $mts_opt[1] && ! $mts_on ); ?>>
					<span><?php echo esc_html( $mts_opt[0] ); ?></span>
					<b class="filt__count num"><?php echo esc_html( number_format_i18n( $mts_opt[1] ) ); ?></b>
				</label>
			<?php endforeach; ?>
		</div>
	</div>

	<?php if ( $mts_colours ) : ?>
		<div class="filt" data-mts-filt-group>
			<button type="button" class="filt__title" data-mts-filt-toggle aria-expanded="true">
				<span><?php esc_html_e( 'Filter by colour', 'mytapestore' ); ?></span>
				<?php mts_the_icon( 'chevronDown', 16, 'filt__chev' ); ?>
			</button>
			<div class="filt__body" data-mts-filt-body>
				<div class="filt__colours">
					<?php foreach ( $mts_colours as $mts_colour ) : ?>
						<?php $mts_fill = $mts_swatch( $mts_colour->name ); ?>
						<label class="filt__check filt__check--colour">
							<input type="checkbox" name="<?php echo esc_attr( MTS_F_COLOUR ); ?>[]"
								   value="<?php echo esc_attr( $mts_colour->slug ); ?>"
								   <?php checked( in_array( $mts_colour->slug, $mts_chosen_colours, true ) ); ?>>
							<span class="filt__dot" <?php echo $mts_fill ? 'style="background: ' . esc_attr( $mts_fill ) . '"' : ''; ?>></span>
							<span><?php echo esc_html( $mts_colour->name ); ?></span>
							<?php if ( $mts_colour->count ) : ?>
								<b class="filt__count num"><?php echo esc_html( number_format_i18n( (int) $mts_colour->count ) ); ?></b>
							<?php endif; ?>
						</label>
					<?php endforeach; ?>
				</div>
			</div>
		</div>
	<?php endif; ?>

	<?php if ( $mts_sizes ) : ?>
		<div class="filt" data-mts-filt-group>
			<button type="button" class="filt__title" data-mts-filt-toggle aria-expanded="true">
				<span><?php esc_html_e( 'Filter by size', 'mytapestore' ); ?></span>
				<?php mts_the_icon( 'chevronDown', 16, 'filt__chev' ); ?>
			</button>
			<div class="filt__body" data-mts-filt-body>
				<div class="filt__cats">
					<?php foreach ( $mts_sizes as $mts_size ) : ?>
						<label class="filt__check">
							<input type="checkbox" name="<?php echo esc_attr( MTS_F_SIZE ); ?>[]"
								   value="<?php echo esc_attr( $mts_size->slug ); ?>"
								   <?php checked( in_array( $mts_size->slug, $mts_chosen_sizes, true ) ); ?>>
							<span><?php echo esc_html( $mts_size->name ); ?></span>
							<?php if ( $mts_size->count ) : ?>
								<b class="filt__count num"><?php echo esc_html( number_format_i18n( (int) $mts_size->count ) ); ?></b>
							<?php endif; ?>
						</label>
					<?php endforeach; ?>
				</div>
			</div>
		</div>
	<?php endif; ?>

	<div class="filt" data-mts-filt-group>
		<button type="button" class="filt__title" data-mts-filt-toggle aria-expanded="true">
			<span><?php esc_html_e( 'Filter by price', 'mytapestore' ); ?></span>
			<?php mts_the_icon( 'chevronDown', 16, 'filt__chev' ); ?>
		</button>
		<div class="filt__body" data-mts-filt-body>
			<label class="filt__check">
				<input type="radio" name="<?php echo esc_attr( MTS_F_PRICE ); ?>" value="" <?php checked( '', $mts_band ); ?>>
				<span><?php esc_html_e( 'All prices', 'mytapestore' ); ?></span>
			</label>
			<?php foreach ( $mts_bands as $mts_slug => $mts_def ) : ?>
				<label class="filt__check">
					<input type="radio" name="<?php echo esc_attr( MTS_F_PRICE ); ?>"
						   value="<?php echo esc_attr( (string) $mts_slug ); ?>"
						   <?php checked( (string) $mts_slug, $mts_band ); ?>>
					<span><?php echo esc_html( $mts_def[0] ); ?></span>
				</label>
			<?php endforeach; ?>
		</div>
	</div>

	<noscript>
		<button class="btn btn--brand btn--block" type="submit"><?php esc_html_e( 'Apply filters', 'mytapestore' ); ?></button>
	</noscript>

	<?php if ( mts_filters_active() ) : ?>
		<a class="filt__clear" href="<?php echo esc_url( $mts_action ); ?>"><?php esc_html_e( 'Clear all filters', 'mytapestore' ); ?></a>
	<?php endif; ?>

</form>
