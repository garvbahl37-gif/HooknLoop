<?php
/**
 * Variable product add-to-cart, in the design's markup.
 *
 * The variations form is left structurally intact — its class, its
 * data-product_variations payload and the hidden variation_id are what
 * wc-add-to-cart-variation.js binds to. The form also CARRIES `.pdp-buybox`,
 * because that class draws the white bordered card the design puts around the
 * options and the buy actions; it does not belong on a wrapper around the whole
 * buy column.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

global $product;

$attribute_keys  = array_keys( $attributes );
$variations_json = wp_json_encode( $available_variations );
$variations_attr = function_exists( 'wc_esc_json' ) ? wc_esc_json( $variations_json ) : _wp_specialchars( $variations_json, ENT_QUOTES, 'UTF-8', true );

do_action( 'woocommerce_before_add_to_cart_form' );
?>
<form class="variations_form cart pdp-buybox" data-mts-product-form data-mts-addtocart
	  action="<?php echo esc_url( apply_filters( 'woocommerce_add_to_cart_form_action', $product->get_permalink() ) ); ?>"
	  method="post" enctype="multipart/form-data"
	  data-product_id="<?php echo absint( $product->get_id() ); ?>"
	  data-product_variations="<?php echo $variations_attr; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>">
	<?php do_action( 'woocommerce_before_variations_form' ); ?>

	<?php if ( empty( $available_variations ) && false !== $available_variations ) : ?>
		<p class="stock out-of-stock"><?php esc_html_e( 'This product is currently out of stock and unavailable.', 'mytapestore' ); ?></p>
	<?php else : ?>
		<?php
		/*
		 * Order matters and is the design's: options first, then the volume
		 * pricing they apply to, then quantity and the buttons. Every option row
		 * lives in ONE .pdp-buy__section — the hairline rule the stylesheet draws
		 * above a section separates options from price breaks, so a section per
		 * option would rule between Size and Colour too.
		 */
		?>
		<?php
		/*
		 * `variations` IS LOAD-BEARING. Do not remove it to tidy the class list.
		 *
		 * wc-add-to-cart-variation.js collects the attribute dropdowns with
		 *     $form.find( '.variations select' )
		 * and nothing else. Without an ancestor carrying this class it finds ZERO
		 * attribute fields, so it never matches a variation, never fills the
		 * hidden variation_id, and — because it also owns the button's state —
		 * leaves .single_add_to_cart_button permanently `disabled`.
		 *
		 * That is not a styling problem. The Add to cart and Buy it now buttons
		 * were genuinely unclickable in a browser, while a hand-made POST to the
		 * same endpoint succeeded, because the POST skipped the script that was
		 * disabling them.
		 */
		?>
		<div class="pdp-buy__section variations">
			<?php
			get_template_part( 'template-parts/product-options', null, array(
				'attributes' => $attributes,
				'product'    => $product,
			) );
			?>
		</div>

		<a class="reset_variations" href="#" style="visibility:hidden;"><?php esc_html_e( 'Clear', 'mytapestore' ); ?></a>

		<?php get_template_part( 'template-parts/volume-pricing', null, array( 'product' => $product ) ); ?>

		<?php do_action( 'woocommerce_after_variations_table' ); ?>

		<div class="single_variation_wrap">
			<?php do_action( 'woocommerce_before_single_variation' ); ?>
			<?php
			/**
			 * woocommerce_single_variation prints the variation price and stock
			 * into .woocommerce-variation. The design has no such block — its
			 * price lives in .pdp-buy__price above the card — so the container is
			 * kept (the variation script writes to it, and assets/js/product.js
			 * mirrors what it writes into the design's own price, SKU and stock
			 * elements) and hidden. Woo's default button is unhooked in
			 * inc/woocommerce.php so ours can take its place.
			 */
			do_action( 'woocommerce_single_variation' );
			?>
			<?php get_template_part( 'template-parts/qty-and-add', null, array( 'product' => $product, 'is_variable' => true ) ); ?>
			<?php do_action( 'woocommerce_after_single_variation' ); ?>
		</div>
	<?php endif; ?>

	<?php do_action( 'woocommerce_after_variations_form' ); ?>
</form>
<?php
do_action( 'woocommerce_after_add_to_cart_form' );
