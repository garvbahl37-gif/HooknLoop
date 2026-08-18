<?php
/**
 * Checkout coupon form — the "have a code?" strip above the checkout.
 *
 * form-checkout.php renders this inside .chk__notices, from
 * woocommerce_before_checkout_form. Only the copy and one dead wrapper change
 * here; the plumbing is deliberately identical to the stock template, because
 * checkout.js binds to it by selector and every one of those selectors is load
 * bearing:
 *
 *   a.showcoupon                    click handler that slideToggles the form
 *   form.checkout_coupon            submit handler; posts to the apply_coupon
 *                                   AJAX endpoint with wc_checkout_params.apply_coupon_nonce
 *   #woocommerce-checkout-form-coupon  aria-controls target of the toggle link
 *   #coupon_code                    read for the value, focused on error,
 *                                   cleared on success
 *   input[name="coupon_code"]       the value actually sent to the endpoint
 *
 * #coupon_code must stay the LAST element inside its wrapper. On a rejected
 * code the script appends <span class="coupon-error-notice"> to the input's
 * parent and later removes it with $input.next( '.coupon-error-notice' ) — put
 * anything after the input and the error message is appended once and then
 * never cleared, so the customer keeps reading "coupon does not exist" under a
 * code that has since been accepted.
 *
 * The inline display:none is not redundant with the .hide() the script does on
 * init: without it the form is painted expanded and collapses a moment later.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

// Coupons off in WooCommerce settings means no form at all — not a form that
// posts to a handler which will refuse it.
if ( ! wc_coupons_enabled() ) {
	return;
}
?>

<div class="woocommerce-form-coupon-toggle">
	<?php
	/*
	 * Still routed through wc_print_notice() rather than hand-written markup:
	 * it produces the .woocommerce-info box the overrides style, and
	 * woocommerce_checkout_coupon_message is the filter stores use to reword
	 * the prompt or hide it for wholesale customers.
	 */
	wc_print_notice(
		apply_filters(
			'woocommerce_checkout_coupon_message',
			esc_html__( 'Have a discount code?', 'mytapestore' )
			. ' <a href="#" role="button" aria-label="' . esc_attr__( 'Enter your discount code', 'mytapestore' ) . '"'
			. ' aria-controls="woocommerce-checkout-form-coupon" aria-expanded="false" class="showcoupon">'
			. esc_html__( 'Enter it here', 'mytapestore' ) . '</a>'
		),
		'notice'
	);
	?>
</div>

<form class="checkout_coupon woocommerce-form-coupon" method="post" style="display:none" id="woocommerce-checkout-form-coupon">

	<p class="form-row form-row-first">
		<label for="coupon_code" class="screen-reader-text"><?php esc_html_e( 'Coupon:', 'mytapestore' ); ?></label>
		<input type="text" name="coupon_code" class="input-text" id="coupon_code" value=""
			   autocomplete="off" autocapitalize="characters" spellcheck="false"
			   placeholder="<?php esc_attr_e( 'Discount code', 'mytapestore' ); ?>">
	</p>

	<p class="form-row form-row-last">
		<?php // .button, not .btn: mts-wordpress-overrides.css dresses `.checkout_coupon .button` and nothing dresses .btn inside this strip. ?>
		<button type="submit" class="button" name="apply_coupon" value="<?php esc_attr_e( 'Apply coupon', 'mytapestore' ); ?>">
			<?php esc_html_e( 'Apply', 'mytapestore' ); ?>
		</button>
	</p>

	<?php
	/*
	 * Stock closes with <div class="clear"></div>. That is a float clear for
	 * Storefront's two-column coupon row; .checkout_coupon is a flex container
	 * here, so the empty div survives as a zero-width flex item and only adds a
	 * trailing gap. Dropped, not styled away.
	 */
	?>
</form>
