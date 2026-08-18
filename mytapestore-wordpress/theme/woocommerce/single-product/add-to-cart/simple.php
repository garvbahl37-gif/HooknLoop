<?php
/**
 * Simple product add-to-cart, in the design's markup.
 *
 * The <form> and every WooCommerce hook are preserved exactly; only the
 * quantity control and the button are re-expressed so the stylesheet applies.
 * As on a variable product the form itself carries `.pdp-buybox`.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

global $product;

if ( ! $product->is_purchasable() ) {
	return;
}

/*
 * OUT OF STOCK: show the notice and stop.
 *
 * This block used to also call do_action( 'woocommerce_simple_add_to_cart' ),
 * and that single line took the page down with a fatal.
 *
 * `woocommerce_simple_add_to_cart` is the hook that RENDERS THIS TEMPLATE —
 * WooCommerce binds woocommerce_simple_add_to_cart() to it, which calls
 * wc_get_template( 'single-product/add-to-cart/simple.php' ). Firing it from
 * inside the template re-entered the template, which fired it again, until PHP
 * exhausted 268MB and the request died with a bare HTTP 500. WooCommerce's own
 * copy of this file does not have the line; it was added here by mistake.
 *
 * It only ever triggered on an out-of-stock SIMPLE product, which is why it hid
 * for so long — three products in this catalogue, and every one of them
 * returned a critical error instead of a page.
 */
if ( ! $product->is_in_stock() ) {
	echo wc_get_stock_html( $product ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	return;
}

do_action( 'woocommerce_before_add_to_cart_form' );
?>
<form class="cart pdp-buybox" data-mts-product-form data-mts-addtocart
	  action="<?php echo esc_url( apply_filters( 'woocommerce_add_to_cart_form_action', $product->get_permalink() ) ); ?>"
	  method="post" enctype="multipart/form-data">
	<?php do_action( 'woocommerce_before_add_to_cart_button' ); ?>
	<?php do_action( 'woocommerce_before_add_to_cart_quantity' ); ?>

	<?php get_template_part( 'template-parts/volume-pricing', null, array( 'product' => $product ) ); ?>

	<?php get_template_part( 'template-parts/qty-and-add', null, array( 'product' => $product, 'is_variable' => false ) ); ?>

	<?php do_action( 'woocommerce_after_add_to_cart_quantity' ); ?>
	<?php do_action( 'woocommerce_after_add_to_cart_button' ); ?>
</form>
<?php
do_action( 'woocommerce_after_add_to_cart_form' );
