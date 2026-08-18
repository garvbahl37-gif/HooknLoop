<?php
/**
 * Cart — the Shopify cart (sections/mts-cart.liquid), node for node.
 *
 * Line list on the left inside .cart__items, sticky summary on the right. Both
 * are grid children of .cart__layout; the items column was missing entirely, so
 * the form landed in the first grid track and the summary in the second with
 * nothing holding the heading, the "continue shopping" link or the upsell.
 *
 * As on the product page, the FORM is WooCommerce's. The <form
 * class="woocommerce-cart-form">, its nonce, the `cart[key][qty]` quantity
 * inputs, the remove links and the `update_cart` submit are all left exactly as
 * WooCommerce expects them — only the markup around them is the design's. Cart
 * mutation is a POST with a nonce; re-inventing it to make it prettier is how a
 * cart starts silently failing to update.
 *
 * The summary is NOT woocommerce_cart_totals(). That template renders a <table
 * class="shop_table"> of its own, which this theme has no styles for — it was
 * dropped inside .cart__sum-rows, a flex column expecting <div><dt><dd>, and
 * produced an unstyled table where the design has the order summary. The rows
 * are built here from the same cart totals the template reads, and every
 * WooCommerce totals hook is still fired so shipping, coupons and fees keep
 * working.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

do_action( 'woocommerce_before_cart' );

$mts_count = mts_cart_count();
?>

<div class="wrap cart__crumbs">
	<?php
	get_template_part( 'template-parts/breadcrumbs', null, array(
		'items' => array(
			array( 'label' => __( 'Home', 'mytapestore' ), 'href' => home_url( '/' ) ),
			array( 'label' => __( 'Cart', 'mytapestore' ) ),
		),
	) );
	?>
</div>

<div class="wrap cart__layout">

	<div class="cart__items">

		<div class="cart__head">
			<h1>
				<?php esc_html_e( 'Your cart', 'mytapestore' ); ?>
				<span class="num" data-mts-cart-items>
					<?php
					printf(
						/* translators: %s: item count */
						esc_html( _n( '%s item', '%s items', $mts_count, 'mytapestore' ) ),
						esc_html( number_format_i18n( $mts_count ) )
					);
					?>
				</span>
			</h1>
			<?php
			/*
			 * Empty the cart. The design has this control and the theme did not —
			 * `.cart__clear` was reused for "Update cart", which the AJAX quantity
			 * stepper below makes unnecessary. It posts to the same cart form with
			 * the same nonce.
			 */
			?>
			<button type="submit" form="mts-cart-form" class="cart__clear" name="mts_empty_cart" value="1">
				<?php esc_html_e( 'Clear cart', 'mytapestore' ); ?>
			</button>
		</div>

		<form id="mts-cart-form" class="woocommerce-cart-form" data-mts-cart-form
			  action="<?php echo esc_url( wc_get_cart_url() ); ?>" method="post">
			<?php do_action( 'woocommerce_before_cart_table' ); ?>
			<?php do_action( 'woocommerce_before_cart_contents' ); ?>

			<ul class="cart__list">
				<?php
				foreach ( WC()->cart->get_cart() as $cart_item_key => $cart_item ) {
					$_product   = apply_filters( 'woocommerce_cart_item_product', $cart_item['data'], $cart_item, $cart_item_key );
					$product_id = apply_filters( 'woocommerce_cart_item_product_id', $cart_item['product_id'], $cart_item, $cart_item_key );

					if ( ! $_product || ! $_product->exists() || $cart_item['quantity'] <= 0 || ! apply_filters( 'woocommerce_cart_item_visible', true, $cart_item, $cart_item_key ) ) {
						continue;
					}

					$product_permalink = apply_filters( 'woocommerce_cart_item_permalink', $_product->is_visible() ? $_product->get_permalink( $cart_item ) : '', $cart_item, $cart_item_key );
					$mts_max           = $_product->is_sold_individually() ? 1 : (int) $_product->get_max_purchase_quantity();
					?>
					<li class="cart-line <?php echo esc_attr( apply_filters( 'woocommerce_cart_item_class', 'cart_item', $cart_item, $cart_item_key ) ); ?>"
						data-key="<?php echo esc_attr( $cart_item_key ); ?>">

						<a class="cart-line__img" href="<?php echo esc_url( $product_permalink ?: '#' ); ?>">
							<?php
							echo apply_filters( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
								'woocommerce_cart_item_thumbnail',
								$_product->get_image( 'woocommerce_thumbnail' ),
								$cart_item,
								$cart_item_key
							);
							?>
						</a>

						<div class="cart-line__info">
							<a class="cart-line__name" href="<?php echo esc_url( $product_permalink ?: '#' ); ?>">
								<?php echo wp_kses_post( apply_filters( 'woocommerce_cart_item_name', $_product->get_name(), $cart_item, $cart_item_key ) ); ?>
							</a>

							<?php
							// Variation data. Shopify prints "50mm x 25m · Black" on one
							// line; wc_get_formatted_cart_item_data() returns a <dl>,
							// which is a different shape and a different set of styles,
							// so the values are read straight off the line item.
							$mts_meta = array();
							foreach ( (array) ( $cart_item['variation'] ?? array() ) as $mts_key => $mts_value ) {
								if ( '' === $mts_value ) {
									continue;
								}
								$mts_taxonomy = urldecode( str_replace( 'attribute_', '', $mts_key ) );
								$mts_term     = taxonomy_exists( $mts_taxonomy ) ? get_term_by( 'slug', $mts_value, $mts_taxonomy ) : null;
								$mts_meta[]   = $mts_term ? $mts_term->name : urldecode( (string) $mts_value );
							}
							if ( $mts_meta ) {
								echo '<span class="cart-line__variant">' . esc_html( implode( ' · ', $mts_meta ) ) . '</span>';
							}

							if ( $_product->get_sku() ) {
								printf(
									'<span class="cart-line__sku num">%s: %s</span>',
									esc_html__( 'SKU', 'mytapestore' ),
									esc_html( $_product->get_sku() )
								);
							}

							echo wp_kses_post( apply_filters( 'woocommerce_cart_item_backorder_notification', '', $product_id ) );
							?>

							<span class="cart-line__unit num">
								<?php echo esc_html( mts_money( (float) wc_get_price_to_display( $_product ) ) ); ?>
								<em><?php esc_html_e( 'Inc GST', 'mytapestore' ); ?></em>
							</span>
						</div>

						<div class="cart-line__qty">
							<?php
							/*
							 * The design's stepper, not woocommerce_quantity_input().
							 * Woo's renders a bare number input with no − / + controls,
							 * so the cart had spinner arrows where the rest of the store
							 * has buttons — and no way to change a quantity without
							 * finding "Update cart" afterwards. The input keeps Woo's
							 * name, so a no-JS submit still updates the cart.
							 */
							?>
							<div class="qty" role="group" aria-label="<?php echo esc_attr( sprintf( /* translators: %s: product name */ __( 'Quantity for %s', 'mytapestore' ), $_product->get_name() ) ); ?>">
								<button type="button" data-mts-line-down aria-label="<?php esc_attr_e( 'Decrease quantity', 'mytapestore' ); ?>">
									<?php mts_the_icon( 'minus', 15 ); ?>
								</button>
								<input class="num" type="text" inputmode="numeric" pattern="[0-9]*"
									   name="cart[<?php echo esc_attr( $cart_item_key ); ?>][qty]"
									   value="<?php echo esc_attr( (string) $cart_item['quantity'] ); ?>"
									   data-mts-line-qty
									   data-max="<?php echo esc_attr( (string) ( $mts_max > 0 ? $mts_max : '' ) ); ?>"
									   aria-label="<?php esc_attr_e( 'Quantity', 'mytapestore' ); ?>">
								<button type="button" data-mts-line-up aria-label="<?php esc_attr_e( 'Increase quantity', 'mytapestore' ); ?>">
									<?php mts_the_icon( 'plus', 15 ); ?>
								</button>
							</div>
						</div>

						<div class="cart-line__total num" data-mts-line-total>
							<?php
							// get_product_subtotal() is the authority — it is what the
							// order will be built from, including any line discount.
							echo esc_html( wp_strip_all_tags( apply_filters(
								'woocommerce_cart_item_subtotal',
								WC()->cart->get_product_subtotal( $_product, $cart_item['quantity'] ),
								$cart_item,
								$cart_item_key
							) ) );
							?>
						</div>

						<a class="cart-line__remove" href="<?php echo esc_url( wc_get_cart_remove_url( $cart_item_key ) ); ?>"
						   data-mts-line-remove
						   aria-label="<?php echo esc_attr( sprintf( /* translators: %s: product name */ __( 'Remove %s from cart', 'mytapestore' ), $_product->get_name() ) ); ?>">
							<?php mts_the_icon( 'close', 18 ); ?>
						</a>
					</li>
					<?php
				}
				?>
			</ul>

			<?php do_action( 'woocommerce_cart_contents' ); ?>

			<div class="cart__actions">
				<?php if ( wc_coupons_enabled() ) : ?>
					<?php
					/*
					 * A CARD, not two loose controls.
					 *
					 * This was a bare square-cornered input butted against a square
					 * button, floating under the cart with no frame of its own — the
					 * only thing on the page not sitting in the design's card
					 * language, directly beneath two items that are. It read as
					 * unfinished markup, which is what it was.
					 *
					 * Now it is a panel with the same hairline and radius as the cart
					 * lines above it, a label, and the input and button joined into
					 * one control. The `.coupon` class stays on the wrapper: it is
					 * what WooCommerce's own cart script looks for, and `#coupon_code`
					 * and `name="apply_coupon"` are the contract for applying a code
					 * at all.
					 */
					?>
					<div class="coupon cart__coupon">
						<span class="cart__coupon-head">
							<?php mts_the_icon( 'tag', 16 ); ?>
							<label for="coupon_code"><?php esc_html_e( 'Discount code', 'mytapestore' ); ?></label>
						</span>

						<div class="cart__coupon-control">
							<input type="text" name="coupon_code" class="input-text" id="coupon_code" value=""
								   autocomplete="off" autocapitalize="characters" spellcheck="false"
								   placeholder="<?php esc_attr_e( 'Enter code', 'mytapestore' ); ?>">
							<button type="submit" class="btn btn--dark" name="apply_coupon" value="<?php esc_attr_e( 'Apply coupon', 'mytapestore' ); ?>">
								<?php esc_html_e( 'Apply', 'mytapestore' ); ?>
							</button>
						</div>

						<?php do_action( 'woocommerce_cart_coupon' ); ?>
					</div>
				<?php endif; ?>

				<?php
				/*
				 * Kept for the no-JS path only: with the stepper wired, quantities
				 * post themselves. Hidden by CSS rather than removed, because
				 * without it a visitor without JavaScript could change a number and
				 * have nothing to submit it with.
				 */
				?>
				<noscript>
					<button type="submit" class="btn btn--ghost" name="update_cart" value="<?php esc_attr_e( 'Update cart', 'mytapestore' ); ?>">
						<?php esc_html_e( 'Update cart', 'mytapestore' ); ?>
					</button>
				</noscript>

				<?php do_action( 'woocommerce_cart_actions' ); ?>
				<?php wp_nonce_field( 'woocommerce-cart', 'woocommerce-cart-nonce' ); ?>
			</div>

			<?php do_action( 'woocommerce_after_cart_contents' ); ?>
			<?php do_action( 'woocommerce_after_cart_table' ); ?>
		</form>

		<a class="cart__continue" href="<?php echo esc_url( wc_get_page_permalink( 'shop' ) ); ?>">
			<?php mts_the_icon( 'chevronRight', 15, 'cart__continue-icon' ); ?>
			<?php esc_html_e( 'Continue shopping', 'mytapestore' ); ?>
		</a>
	</div>

	<aside class="cart__summary">
		<?php do_action( 'woocommerce_before_cart_collaterals' ); ?>

		<h2><?php esc_html_e( 'Order summary', 'mytapestore' ); ?></h2>

		<dl class="cart__sum-rows">
			<div>
				<dt>
					<?php esc_html_e( 'Subtotal', 'mytapestore' ); ?>
					<span data-mts-cart-items>
						<?php
						printf(
							/* translators: %s: item count */
							esc_html( _n( '%s item', '%s items', $mts_count, 'mytapestore' ) ),
							esc_html( number_format_i18n( $mts_count ) )
						);
						?>
					</span>
				</dt>
				<dd class="num" data-mts-cart-subtotal><?php echo wp_kses_post( WC()->cart->get_cart_subtotal() ); ?></dd>
			</div>

			<?php foreach ( WC()->cart->get_coupons() as $mts_code => $mts_coupon ) : ?>
				<div>
					<dt><?php echo esc_html( wc_cart_totals_coupon_label( $mts_coupon, false ) ); ?></dt>
					<dd class="num">−<?php echo wp_kses_post( wc_price( (float) WC()->cart->get_coupon_discount_amount( $mts_code ) ) ); ?></dd>
				</div>
			<?php endforeach; ?>

			<div>
				<dt><?php esc_html_e( 'Shipping', 'mytapestore' ); ?></dt>
				<dd><?php esc_html_e( 'Calculated at checkout', 'mytapestore' ); ?></dd>
			</div>

			<div>
				<dt><?php esc_html_e( 'Estimated delivery', 'mytapestore' ); ?></dt>
				<dd><?php esc_html_e( '3–5 business days', 'mytapestore' ); ?></dd>
			</div>

			<div>
				<dt><?php esc_html_e( 'GST', 'mytapestore' ); ?></dt>
				<dd class="cart__sum-note"><?php esc_html_e( 'Included in all prices', 'mytapestore' ); ?></dd>
			</div>
		</dl>

		<div class="cart__total">
			<span><?php esc_html_e( 'Total', 'mytapestore' ); ?></span>
			<b class="num" data-mts-cart-total><?php echo wp_kses_post( WC()->cart->get_total() ); ?></b>
		</div>

		<a href="<?php echo esc_url( wc_get_checkout_url() ); ?>" class="btn btn--brand btn--lg btn--block cart__checkout">
			<?php mts_the_icon( 'lock', 18 ); ?> <?php esc_html_e( 'Proceed to checkout', 'mytapestore' ); ?>
		</a>

		<ul class="cart__trust">
			<li><?php mts_the_icon( 'lock', 15 ); ?> <?php esc_html_e( 'Secure checkout', 'mytapestore' ); ?></li>
			<li><?php mts_the_icon( 'truck', 15 ); ?> <?php esc_html_e( 'Fast Australia-wide dispatch', 'mytapestore' ); ?></li>
			<li><?php mts_the_icon( 'refresh', 15 ); ?> <?php esc_html_e( 'Easy returns', 'mytapestore' ); ?></li>
		</ul>

		<div class="cart__pay">
			<?php foreach ( array( 'visa', 'mastercard', 'amex', 'paypal' ) as $mts_mark ) : ?>
				<?php $mts_src = mts_asset( "img/pay/{$mts_mark}.svg" ); ?>
				<?php if ( $mts_src ) : ?>
					<img src="<?php echo esc_url( $mts_src ); ?>" alt="<?php echo esc_attr( $mts_mark ); ?>" width="35" height="22" loading="lazy">
				<?php endif; ?>
			<?php endforeach; ?>
			<span class="cart__pay-badge"><?php mts_the_icon( 'shieldCheck', 13 ); ?> <?php esc_html_e( 'SSL secured', 'mytapestore' ); ?></span>
		</div>

		<?php do_action( 'woocommerce_after_cart_collaterals' ); ?>
	</aside>

</div>

<?php do_action( 'woocommerce_after_cart' ); ?>
