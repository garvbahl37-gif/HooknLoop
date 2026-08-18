<?php
/**
 * Checkout.
 *
 * READ THIS BEFORE EDITING.
 *
 * Nothing in this file computes, validates or submits anything. Every field,
 * every gateway, every total and the submit button itself come from
 * WooCommerce's own hooks:
 *
 *   woocommerce_checkout_billing / _shipping   the address fields
 *   woocommerce_checkout_order_review          totals + payment + place order
 *
 * Stripe and PayPal inject their card fields into those hooks and expect the
 * surrounding form, its nonce and its field names to be exactly what
 * WooCommerce produced. This template supplies layout — a two-column grid, the
 * design's section headings, the secure-checkout reassurance — and nothing
 * else. Hand-rolling any part of it risks taking an order the gateway never
 * authorised, or silently dropping an address.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

// Guests can only check out if the store allows it.
if ( ! $checkout->is_registration_enabled() && $checkout->is_registration_required() && ! is_user_logged_in() ) {
	echo '<div class="wrap"><p>' . esc_html( apply_filters( 'woocommerce_checkout_must_be_logged_in_message', __( 'You must be logged in to check out.', 'mytapestore' ) ) ) . '</p></div>';
	return;
}
?>

<div class="wrap chk__crumbs">
	<?php
	get_template_part( 'template-parts/breadcrumbs', null, array(
		'items' => array(
			array( 'label' => __( 'Home', 'mytapestore' ), 'href' => home_url( '/' ) ),
			array( 'label' => __( 'Cart', 'mytapestore' ), 'href' => wc_get_cart_url() ),
			array( 'label' => __( 'Checkout', 'mytapestore' ) ),
		),
	) );
	?>
</div>

<div class="wrap chk__notices">
	<?php
	/*
	 * Notices and the coupon toggle, INSIDE the page rather than above the
	 * breadcrumbs. woocommerce_before_checkout_form fires both, and calling it
	 * first put an "added to cart" banner and a coupon form flush against the
	 * header, above the trail that says where you are.
	 */
	/*
	 * The two prompts WooCommerce hangs off this hook — "Returning customer?
	 * Click here to login" and "Have a discount code? Enter it here" — are
	 * removed. Both are collapsed forms that open ON TOP of the checkout, and both
	 * ask the shopper to stop and do something else at the exact moment they have
	 * decided to buy. Sign-in lives at /my-account/, and the coupon field is on
	 * the cart — one step back, where someone hunting for a code actually is.
	 *
	 * Unhooked rather than skipped: the action still fires, so notices and
	 * anything a plugin adds here keep working.
	 */
	remove_action( 'woocommerce_before_checkout_form', 'woocommerce_checkout_login_form', 10 );
	remove_action( 'woocommerce_before_checkout_form', 'woocommerce_checkout_coupon_form', 10 );

	do_action( 'woocommerce_before_checkout_form', $checkout );
	?>
</div>

<form name="checkout" method="post" class="checkout woocommerce-checkout wrap chk__layout"
	  action="<?php echo esc_url( wc_get_checkout_url() ); ?>" enctype="multipart/form-data">

	<?php
	/*
	 * A PLAIN DIV. This was `.chk-col-2`, which is `grid-column: span 2` — a
	 * helper for making ONE FIELD span both columns of the inner `.chk-grid`.
	 * On the outer `.chk__layout` (1fr / 380px) it made the details column span
	 * both tracks, so the order summary had nowhere to sit and dropped to a row
	 * of its own underneath, leaving the entire right-hand side of the checkout
	 * blank on every desktop.
	 */
	?>
	<div class="chk__details">

		<?php if ( $checkout->get_checkout_fields() ) : ?>

			<?php do_action( 'woocommerce_checkout_before_customer_details' ); ?>

			<?php
			/*
			 * NO `.chk-grid` HERE. That class is `grid-template-columns: 1fr 1fr`,
			 * and the four things WooCommerce prints inside customer details are
			 * not four fields — they are four FIELD GROUPS: billing, the "create an
			 * account?" block, shipping, and order notes. Wrapping them in a
			 * two-column grid put the entire billing form in a half-width column,
			 * floated the account checkbox into the column beside it, and dropped
			 * order notes into the right-hand cell at whatever height the row
			 * happened to be. That is the crammed, unaligned checkout.
			 *
			 * Each group is a block at full width; the TWO-COLUMN grid belongs one
			 * level down, on each group's own __field-wrapper, where it can honour
			 * the form-row-first / form-row-last / form-row-wide classes Woo puts
			 * on every field to say how wide it wants to be.
			 */
			?>
			<section class="chk-section" id="customer_details">
				<h2><span class="chk-num">1</span><?php esc_html_e( 'Delivery details', 'mytapestore' ); ?></h2>
				<?php do_action( 'woocommerce_checkout_billing' ); ?>
				<?php do_action( 'woocommerce_checkout_shipping' ); ?>
			</section>

			<?php do_action( 'woocommerce_checkout_after_customer_details' ); ?>

		<?php endif; ?>

		<p class="chk-secure">
			<?php mts_the_icon( 'lock', 15 ); ?>
			<?php esc_html_e( 'Encrypted, secure checkout. Your card details never touch our servers.', 'mytapestore' ); ?>
		</p>
	</div>

	<aside class="chk__summary">
		<h2><?php esc_html_e( 'Your order', 'mytapestore' ); ?></h2>

		<?php do_action( 'woocommerce_checkout_before_order_review_heading' ); ?>
		<?php do_action( 'woocommerce_checkout_before_order_review' ); ?>

		<?php
		/*
		 * NOT `.chk-sum-rows`. That class is the TOTALS list — `display: flex;
		 * flex-direction: column`, whose every direct child is laid out
		 * `justify-content: space-between` as a label/value row. #payment is a
		 * direct child of this container, so it became one of those rows: the
		 * gateway list was squeezed into a 154px "label" on the left and the
		 * privacy text and Place order button into the "value" on the right.
		 * That is the uneven, unaligned payment block.
		 *
		 * The totals list carries the class itself, inside review-order.php,
		 * where it describes the thing it is actually for.
		 */
		?>
		<div id="order_review" class="woocommerce-checkout-review-order">
			<?php do_action( 'woocommerce_checkout_order_review' ); ?>
		</div>

		<?php do_action( 'woocommerce_checkout_after_order_review' ); ?>

		<div class="chk-pay-note">
			<?php foreach ( array( 'visa', 'mastercard', 'amex', 'paypal' ) as $mts_mark ) : ?>
				<?php $mts_src = mts_asset( "img/pay/{$mts_mark}.svg" ); ?>
				<?php if ( $mts_src ) : ?>
					<img src="<?php echo esc_url( $mts_src ); ?>" alt="<?php echo esc_attr( $mts_mark ); ?>" width="34" height="22" loading="lazy">
				<?php endif; ?>
			<?php endforeach; ?>
		</div>
	</aside>

</form>

<?php do_action( 'woocommerce_after_checkout_form', $checkout ); ?>
