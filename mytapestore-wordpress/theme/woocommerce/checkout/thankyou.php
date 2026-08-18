<?php
/**
 * Order received — the confirmation screen.
 *
 * The design has a finished pattern for this and the theme was not using it:
 * .cart-done is the sibling of .cart-empty (green tick, headline, reassurance,
 * a panel of what happens next), and it rendered as WooCommerce's bare
 * <ul class="order_details"> because nothing in the stylesheet targets that.
 *
 * NOTHING HERE IS COSMETIC-ONLY. do_action( 'woocommerce_thankyou' ) is where
 * the order table and the customer's addresses come from
 * (woocommerce_order_details_table, hooked at priority 10), and it is also where
 * every conversion pixel, every accounting sync and every "order complete"
 * webhook fires. do_action( 'woocommerce_thankyou_{gateway}' ) is where offline
 * gateways print their payment instructions — drop it and a BACS customer never
 * sees the bank account they are supposed to transfer to. Both fire outside the
 * failed/succeeded branch, exactly as the stock template fires them, because a
 * failed order still has to reach the gateway's own handler.
 *
 * The success message keeps going through checkout/order-received.php rather
 * than being inlined, because woocommerce_thankyou_order_received_text is the
 * documented way to reword it and stores do reword it.
 *
 * @package mytapestore
 * @var WC_Order|false $order
 */

defined( 'ABSPATH' ) || exit;
?>

<div class="woocommerce-order">

	<?php if ( ! $order ) : ?>

		<?php
		/*
		 * No order behind the URL — a stale bookmark, or someone who reloaded
		 * after the session expired. Woo's own copy explains it; all this adds
		 * is a way out of the dead end.
		 */
		?>
		<div class="wrap cart-done">
			<span class="cart-empty__icon"><?php mts_the_icon( 'cart', 40 ); ?></span>
			<h1><?php esc_html_e( 'Order received', 'mytapestore' ); ?></h1>
			<?php wc_get_template( 'checkout/order-received.php', array( 'order' => false ) ); ?>
			<div class="cart-done__cta">
				<a class="btn btn--brand btn--lg" href="<?php echo esc_url( wc_get_page_permalink( 'shop' ) ); ?>">
					<?php esc_html_e( 'Continue shopping', 'mytapestore' ); ?> <?php mts_the_icon( 'arrowRight', 18 ); ?>
				</a>
			</div>
		</div>

	<?php else : ?>

		<?php
		do_action( 'woocommerce_before_thankyou', $order->get_id() );

		$mts_failed = $order->has_status( 'failed' );

		// Same guard the stock template uses before printing the billing email:
		// the order-received URL outlives the checkout session, so the address is
		// only echoed back to the account that owns the order.
		$mts_show_email = is_user_logged_in() && $order->get_user_id() === get_current_user_id() && $order->get_billing_email();
		?>

		<?php if ( $mts_failed ) : ?>

			<div class="wrap cart-done">
				<?php // .cart-empty__icon is the neutral shell of the same rule as .cart-done__tick; the green tick would be a lie here. ?>
				<span class="cart-empty__icon"><?php mts_the_icon( 'close', 40 ); ?></span>
				<h1><?php esc_html_e( 'Payment was declined', 'mytapestore' ); ?></h1>

				<?php // Class kept verbatim: gateway scripts and support macros look for it to tell a decline from a success. ?>
				<p class="woocommerce-notice woocommerce-notice--error woocommerce-thankyou-order-failed">
					<?php esc_html_e( 'Unfortunately your order cannot be processed as the originating bank/merchant has declined your transaction. Please attempt your purchase again.', 'mytapestore' ); ?>
				</p>

				<div class="cart-done__cta woocommerce-thankyou-order-failed-actions">
					<?php // get_checkout_payment_url() carries the order key; a hand-built /checkout/ link loses the order and starts a second one. ?>
					<a class="btn btn--brand btn--lg" href="<?php echo esc_url( $order->get_checkout_payment_url() ); ?>">
						<?php mts_the_icon( 'refresh', 18 ); ?> <?php esc_html_e( 'Try payment again', 'mytapestore' ); ?>
					</a>
					<?php if ( is_user_logged_in() ) : ?>
						<a class="btn btn--ghost btn--lg" href="<?php echo esc_url( wc_get_page_permalink( 'myaccount' ) ); ?>">
							<?php esc_html_e( 'My account', 'mytapestore' ); ?>
						</a>
					<?php endif; ?>
				</div>
			</div>

		<?php else : ?>

			<div class="wrap cart-done">
				<span class="cart-done__tick"><?php mts_the_icon( 'check', 40 ); ?></span>
				<h1><?php esc_html_e( 'Order confirmed', 'mytapestore' ); ?></h1>

				<?php wc_get_template( 'checkout/order-received.php', array( 'order' => $order ) ); ?>

				<?php if ( $mts_show_email ) : ?>
					<span class="cart-done__optin">
						<?php mts_the_icon( 'mail', 14 ); ?>
						<?php
						printf(
							/* translators: %s: customer email address */
							esc_html__( 'Confirmation emailed to %s', 'mytapestore' ),
							esc_html( $order->get_billing_email() )
						);
						?>
					</span>
				<?php else : ?>
					<span class="cart-done__optin">
						<?php mts_the_icon( 'mail', 14 ); ?>
						<?php esc_html_e( 'A confirmation email is on its way', 'mytapestore' ); ?>
					</span>
				<?php endif; ?>

				<ul class="cart-done__steps">
					<li>
						<span class="cart-done__step-ic"><?php mts_the_icon( 'check', 13 ); ?></span>
						<?php esc_html_e( 'Order received and confirmed', 'mytapestore' ); ?>
					</li>
					<li>
						<span class="cart-done__step-ic"><?php mts_the_icon( 'warehouse', 13 ); ?></span>
						<?php esc_html_e( 'Picked and packed at our Australian warehouse', 'mytapestore' ); ?>
					</li>
					<li>
						<span class="cart-done__step-ic"><?php mts_the_icon( 'truck', 13 ); ?></span>
						<?php esc_html_e( 'Dispatched with tracking, 3–5 business days', 'mytapestore' ); ?>
					</li>
				</ul>

				<div class="cart-done__cta">
					<?php if ( is_user_logged_in() && $order->get_user_id() === get_current_user_id() ) : ?>
						<a class="btn btn--brand btn--lg" href="<?php echo esc_url( $order->get_view_order_url() ); ?>">
							<?php esc_html_e( 'Track this order', 'mytapestore' ); ?> <?php mts_the_icon( 'arrowRight', 18 ); ?>
						</a>
						<a class="btn btn--ghost btn--lg" href="<?php echo esc_url( wc_get_page_permalink( 'shop' ) ); ?>">
							<?php esc_html_e( 'Continue shopping', 'mytapestore' ); ?>
						</a>
					<?php else : ?>
						<a class="btn btn--brand btn--lg" href="<?php echo esc_url( wc_get_page_permalink( 'shop' ) ); ?>">
							<?php esc_html_e( 'Continue shopping', 'mytapestore' ); ?> <?php mts_the_icon( 'arrowRight', 18 ); ?>
						</a>
					<?php endif; ?>
				</div>
			</div>

		<?php endif; ?>

		<div class="wrap page-prose">

			<?php if ( ! $mts_failed ) : ?>

				<h2><?php esc_html_e( 'Your order', 'mytapestore' ); ?></h2>

				<?php
				/*
				 * Stock renders these facts as <li>s in a .order_details list.
				 * They become a .cart__sum-rows definition list — same
				 * information, the design's dt/dd row — and the wrapper keeps
				 * every class stock put on the list, because order-confirmation
				 * tracking snippets are routinely pasted in as DOM scrapers of
				 * .woocommerce-order-overview__total rather than as a hook.
				 *
				 * A <dl> may only contain dt/dd (or <div>s of them), so the
				 * total sits outside it — still inside the wrapper, so those
				 * scrapers still resolve.
				 */
				?>
				<div class="woocommerce-order-overview woocommerce-thankyou-order-details order_details">

					<dl class="cart__sum-rows">
						<div class="woocommerce-order-overview__order order">
							<dt><?php esc_html_e( 'Order number', 'mytapestore' ); ?></dt>
							<dd class="num"><?php echo esc_html( $order->get_order_number() ); ?></dd>
						</div>

						<div class="woocommerce-order-overview__date date">
							<dt><?php esc_html_e( 'Date', 'mytapestore' ); ?></dt>
							<dd class="num"><?php echo esc_html( wc_format_datetime( $order->get_date_created() ) ); ?></dd>
						</div>

						<?php if ( $mts_show_email ) : ?>
							<div class="woocommerce-order-overview__email email">
								<dt><?php esc_html_e( 'Email', 'mytapestore' ); ?></dt>
								<dd class="num"><?php echo esc_html( $order->get_billing_email() ); ?></dd>
							</div>
						<?php endif; ?>

						<?php if ( $order->get_payment_method_title() ) : ?>
							<div class="woocommerce-order-overview__payment-method method">
								<dt><?php esc_html_e( 'Payment method', 'mytapestore' ); ?></dt>
								<dd><?php echo wp_kses_post( $order->get_payment_method_title() ); ?></dd>
							</div>
						<?php endif; ?>
					</dl>

					<div class="cart__total woocommerce-order-overview__total total">
						<span><?php esc_html_e( 'Total', 'mytapestore' ); ?></span>
						<?php // get_formatted_order_total() carries the tax suffix ("incl. GST"); a bare wc_price() would drop it. ?>
						<b class="num"><?php echo wp_kses_post( $order->get_formatted_order_total() ); ?></b>
					</div>

				</div>

			<?php endif; ?>

			<?php
			/*
			 * Order of these two is the stock order and matters: the gateway
			 * hook prints payment instructions that belong above the order
			 * table, and several gateways assume they are rendering before
			 * woocommerce_order_details_table has run.
			 */
			do_action( 'woocommerce_thankyou_' . $order->get_payment_method(), $order->get_id() );
			do_action( 'woocommerce_thankyou', $order->get_id() );
			?>

		</div>

	<?php endif; ?>

</div>
