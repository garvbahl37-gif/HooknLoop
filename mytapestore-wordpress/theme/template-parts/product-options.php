<?php
/**
 * Variation options, rendered SERVER-SIDE, in the Shopify markup.
 *
 * Each attribute gets:
 *   - a label: <span> with the attribute name, plus a <b> naming the chosen
 *     value on colour attributes. The name used to be printed as a bare text
 *     node, so `.pdp-opt__label > span` — the uppercase, letter-spaced, faint
 *     treatment the design gives every option label — matched nothing.
 *   - COLOUR: a row of .pdp-swatch buttons carrying data-mts-opt, which is the
 *     attribute the page script binds to. They previously carried
 *     data-mts-swatch, which nothing in the theme listened for, so clicking a
 *     colour did nothing at all.
 *   - everything else: the real <select> inside .pdp-opt__select, with the
 *     chevron the stylesheet positions over it.
 *
 * The <select> is always present and always the thing that posts — hidden on
 * colour attributes, visible otherwise. It is what wc-add-to-cart-variation.js
 * reads, so with JavaScript off the product is still purchasable.
 *
 * @param array      $args['attributes'] attribute_name => options
 * @param WC_Product $args['product']
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

$mts_attributes = (array) ( $args['attributes'] ?? array() );
$mts_product    = $args['product'] ?? null;

if ( ! $mts_attributes || ! $mts_product instanceof WC_Product ) {
	return;
}

$mts_index = 0;

foreach ( $mts_attributes as $mts_name => $mts_options ) :
	$mts_label     = wc_attribute_label( $mts_name );
	$mts_is_colour = (bool) preg_match( '/colou?r/i', $mts_label . ' ' . $mts_name );
	$mts_selected  = $mts_product->get_variation_default_attribute( $mts_name );
	$mts_id        = 'mts-attr-' . sanitize_title( $mts_name );

	// Resolve each option to [value, label] once, so the select and the swatches
	// cannot disagree about what a value means.
	$mts_choices = array();
	foreach ( (array) $mts_options as $mts_option ) {
		if ( taxonomy_exists( $mts_name ) ) {
			$mts_term = get_term_by( 'slug', $mts_option, $mts_name );
			if ( ! $mts_term ) {
				continue;
			}
			$mts_choices[] = array( 'value' => $mts_term->slug, 'label' => $mts_term->name );
		} else {
			$mts_choices[] = array( 'value' => $mts_option, 'label' => $mts_option );
		}
	}

	/*
	 * Ascending, so a shopper can find their size by scanning rather than
	 * reading. Sorted HERE — after the labels are resolved and before anything
	 * is rendered — so the swatches and the <select> below cannot disagree: the
	 * select is rebuilt from this same ordered list a few lines down.
	 */
	$mts_choices = mts_sort_variation_choices( $mts_choices );
	$mts_options = array_column( $mts_choices, 'value' );

	if ( ! $mts_choices ) {
		continue;
	}

	// The label under a colour name is the SELECTED value, or the design's
	// "Select" prompt when WooCommerce has not preselected one.
	$mts_selected_label = '';
	foreach ( $mts_choices as $mts_choice ) {
		if ( (string) $mts_choice['value'] === (string) $mts_selected ) {
			$mts_selected_label = $mts_choice['label'];
			break;
		}
	}
	?>
	<div class="pdp-opt<?php echo $mts_is_colour ? ' pdp-opt--colour' : ''; ?>">
		<div class="pdp-opt__label">
			<span><?php echo esc_html( $mts_label ); ?></span>
			<?php if ( $mts_is_colour ) : ?>
				<b data-mts-opt-selected="<?php echo esc_attr( (string) $mts_index ); ?>">
					<?php echo esc_html( $mts_selected_label ? $mts_selected_label : __( 'Select', 'mytapestore' ) ); ?>
				</b>
			<?php endif; ?>
		</div>

		<?php if ( $mts_is_colour ) : ?>
			<?php
			/*
			 * Colour is chosen from swatches, never a dropdown — a colour named in
			 * a list is a word; a filled circle is the thing itself.
			 */
			?>
			<div class="pdp-opt__swatches" role="radiogroup" aria-label="<?php echo esc_attr( $mts_label ); ?>">
				<?php foreach ( $mts_choices as $mts_choice ) : ?>
					<?php
					$mts_fill = mts_swatch_fill( $mts_choice['label'] );
					$mts_on   = (string) $mts_choice['value'] === (string) $mts_selected;
					?>
					<button type="button"
							class="pdp-swatch<?php echo $mts_on ? ' is-active' : ''; ?>"
							data-mts-opt="<?php echo esc_attr( (string) $mts_index ); ?>"
							data-mts-select="<?php echo esc_attr( $mts_id ); ?>"
							data-value="<?php echo esc_attr( $mts_choice['value'] ); ?>"
							data-label="<?php echo esc_attr( $mts_choice['label'] ); ?>"
							title="<?php echo esc_attr( $mts_choice['label'] ); ?>"
							aria-label="<?php echo esc_attr( $mts_choice['label'] ); ?>"
							aria-pressed="<?php echo $mts_on ? 'true' : 'false'; ?>">
						<?php if ( $mts_fill ) : ?>
							<span class="pdp-swatch__dot" style="background: <?php echo esc_attr( $mts_fill ); ?>"></span>
						<?php else : ?>
							<span class="pdp-swatch__txt"><?php echo esc_html( $mts_choice['label'] ); ?></span>
						<?php endif; ?>
					</button>
				<?php endforeach; ?>
			</div>
		<?php endif; ?>

		<div class="pdp-opt__select"<?php echo $mts_is_colour ? ' hidden' : ''; ?>>
			<?php
			wc_dropdown_variation_attribute_options( array(
				'options'   => $mts_options,
				'attribute' => $mts_name,
				'product'   => $mts_product,
				'selected'  => $mts_selected,
				'id'        => $mts_id,
			) );
			?>
			<?php if ( ! $mts_is_colour ) : ?>
				<?php mts_the_icon( 'chevronDown', 16 ); ?>
			<?php endif; ?>
		</div>
	</div>
	<?php
	++$mts_index;
endforeach;
