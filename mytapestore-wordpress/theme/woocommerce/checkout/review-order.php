<?php
/**
 * Checkout order review — the line list and totals inside the summary rail.
 *
 * THIS IS STILL A <table> ON PURPOSE.
 *
 * Two things make the obvious rewrite — a stack of divs in .chk-lines — a bug
 * rather than an improvement:
 *
 * 1. wc_cart_totals_shipping_html() renders cart/cart-shipping.php, whose root
 *    node is a bare <tr> carrying the `shipping_method[0]` radios. Outside a
 *    table the parser throws the row and cell tags away, and on the AJAX
 *    re-render jQuery does the same. The shipping selector is how the customer
 *    picks what they are charged; it cannot be allowed to depend on markup that
 *    silently evaporates.
 * 2. woocommerce_review_order_before_cart_contents / _after_cart_contents /
 *    _before_order_total / _after_order_total are documented tbody and tfoot
 *    hooks, and extensions echo raw <tr><th>…</th><td>…</td></tr> into them.
 *    Same disappearing act, except the missing row is a gift-card balance or a
 *    surcharge someone is meant to pay.
 *
 * So the table stays and the design goes INSIDE it: each line is a .chk-line
 * grid in the product cell, and mts-wordpress-overrides.css already dresses
 * `#order_review .shop_table` for exactly this shape.
 *
 * The root element must keep `woocommerce-checkout-review-order-table` and must
 * be the only node with that class. WC_AJAX::update_order_review() returns this
 * whole template as a fragment keyed on that selector and checkout.js does
 * $(key).replaceWith(value) — rename it and the totals freeze at whatever they
 * were when the page loaded, while the order is placed against the real ones.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

/*
 * The design shows quantity as a bubble on the thumbnail, which can hold a
 * number and nothing else. woocommerce_checkout_cart_item_quantity is where an
 * extension swaps "× 2" for a control — an editable quantity, a subscription
 * interval — so when something is actually listening its markup is rendered in
 * the cell the stock template used, where a widget fits. With nothing listening
 * the bubble is the only quantity on screen and the two never print twice.
 */
$mts_qty_is_filtered = has_filter( 'woocommerce_checkout_cart_item_quantity' );
?>
<table class="shop_table woocommerce-checkout-review-order-table">

	<?php // The rail is headed "Your order" in form-checkout.php; the table itself is unlabelled, so name it for screen readers. ?>
	<caption class="screen-reader-text"><?php esc_html_e( 'Order summary', 'mytapestore' ); ?></caption>

	<tbody>
		<?php
		do_action( 'woocommerce_review_order_before_cart_contents' );

		foreach ( WC()->cart->get_cart() as $mts_item_key => $mts_item ) {
			$mts_product = apply_filters( 'woocommerce_cart_item_product', $mts_item['data'], $mts_item, $mts_item_key );

			if ( ! $mts_product instanceof WC_Product || ! $mts_product->exists() || $mts_item['quantity'] <= 0 ) {
				continue;
			}

			if ( ! apply_filters( 'woocommerce_checkout_cart_item_visible', true, $mts_item, $mts_item_key ) ) {
				continue;
			}

			/*
			 * Variation and add-on data as one line, not the <dl class="variation">
			 * the default form returns: .chk-line__info is a two-line flex column
			 * (name, then muted detail) and a definition list dropped into it
			 * stacks a label and a value per attribute, tripling the row height.
			 * The flat form runs the same woocommerce_get_item_data filter, so
			 * anything a plugin added is still here — just joined with the
			 * middot the rest of the store uses.
			 */
			$mts_item_data = wc_get_formatted_cart_item_data( $mts_item, true );
			$mts_item_data = implode( ' · ', array_filter( array_map( 'trim', explode( "\n", $mts_item_data ) ) ) );
			?>
			<tr class="<?php echo esc_attr( apply_filters( 'woocommerce_cart_item_class', 'cart_item', $mts_item, $mts_item_key ) ); ?>">

				<td class="product-name">
					<div class="chk-line">
						<span class="chk-line__img">
							<?php
							echo apply_filters( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
								'woocommerce_cart_item_thumbnail',
								$mts_product->get_image( 'woocommerce_thumbnail' ),
								$mts_item,
								$mts_item_key
							);
							?>
							<?php
							/*
							 * The quantity is printed AS IS, exactly as the stock
							 * template does. number_format_i18n() defaults to zero
							 * decimals, so a line sold by the metre — 2.5 — was
							 * displayed to the customer as "3" on the order review,
							 * while the price beside it was still for 2.5. It also
							 * inserts a thousands separator, turning a 1000-unit
							 * trade order into "1,000" inside a bubble sized for
							 * two or three characters.
							 */
							?>
							<em><?php echo esc_html( (string) $mts_item['quantity'] ); ?></em>
						</span>

						<span class="chk-line__info">
							<b><?php echo wp_kses_post( apply_filters( 'woocommerce_cart_item_name', $mts_product->get_name(), $mts_item, $mts_item_key ) ); ?></b>

							<?php if ( '' !== $mts_item_data ) : ?>
								<em><?php echo wp_kses_post( $mts_item_data ); ?></em>
							<?php endif; ?>

							<?php
							if ( $mts_qty_is_filtered ) {
								echo apply_filters( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
									'woocommerce_checkout_cart_item_quantity',
									' <strong class="product-quantity">' . sprintf( '&times;&nbsp;%s', esc_html( $mts_item['quantity'] ) ) . '</strong>',
									$mts_item,
									$mts_item_key
								);
							}
							?>
						</span>
					</div>
				</td>

				<td class="product-total num">
					<?php
					echo wp_kses_post( apply_filters(
						'woocommerce_cart_item_subtotal',
						WC()->cart->get_product_subtotal( $mts_product, $mts_item['quantity'] ),
						$mts_item,
						$mts_item_key
					) );
					?>
				</td>

			</tr>
			<?php
		}

		do_action( 'woocommerce_review_order_after_cart_contents' );
		?>
	</tbody>

	<tfoot>

		<?php
		/*
		 * Every row below is a wc_cart_totals_*_html() call rather than a figure
		 * read off the cart. Those helpers are what apply the display-tax
		 * setting, the "estimated" suffixes and the woocommerce_cart_totals_*
		 * filters; formatting the numbers here instead would show a subtotal
		 * that disagrees with the one the order is actually built from.
		 */
		?>
		<tr class="cart-subtotal">
			<th><?php esc_html_e( 'Subtotal', 'mytapestore' ); ?></th>
			<td class="num"><?php wc_cart_totals_subtotal_html(); ?></td>
		</tr>

		<?php foreach ( WC()->cart->get_coupons() as $mts_code => $mts_coupon ) : ?>
			<tr class="cart-discount coupon-<?php echo esc_attr( sanitize_title( $mts_code ) ); ?>">
				<th><?php wc_cart_totals_coupon_label( $mts_coupon ); ?></th>
				<?php // wc_cart_totals_coupon_html() also prints the "[Remove]" link the checkout JS binds to. Do not swap it for a formatted amount. ?>
				<td class="num"><?php wc_cart_totals_coupon_html( $mts_coupon ); ?></td>
			</tr>
		<?php endforeach; ?>

		<?php if ( WC()->cart->needs_shipping() && WC()->cart->show_shipping() ) : ?>

			<?php do_action( 'woocommerce_review_order_before_shipping' ); ?>

			<?php wc_cart_totals_shipping_html(); ?>

			<?php do_action( 'woocommerce_review_order_after_shipping' ); ?>

		<?php endif; ?>

		<?php foreach ( WC()->cart->get_fees() as $mts_fee ) : ?>
			<tr class="fee">
				<th><?php echo esc_html( $mts_fee->name ); ?></th>
				<td class="num"><?php wc_cart_totals_fee_html( $mts_fee ); ?></td>
			</tr>
		<?php endforeach; ?>

		<?php if ( wc_tax_enabled() && ! WC()->cart->display_prices_including_tax() ) : ?>
			<?php if ( 'itemized' === get_option( 'woocommerce_tax_total_display' ) ) : ?>
				<?php foreach ( WC()->cart->get_tax_totals() as $mts_tax_code => $mts_tax ) : ?>
					<tr class="tax-rate tax-rate-<?php echo esc_attr( sanitize_title( $mts_tax_code ) ); ?>">
						<th><?php echo esc_html( $mts_tax->label ); ?></th>
						<td class="num"><?php echo wp_kses_post( $mts_tax->formatted_amount ); ?></td>
					</tr>
				<?php endforeach; ?>
			<?php else : ?>
				<tr class="tax-total">
					<th><?php echo esc_html( WC()->countries->tax_or_vat() ); ?></th>
					<td class="num"><?php wc_cart_totals_taxes_total_html(); ?></td>
				</tr>
			<?php endif; ?>
		<?php endif; ?>

		<?php do_action( 'woocommerce_review_order_before_order_total' ); ?>

		<tr class="order-total">
			<th><?php esc_html_e( 'Total', 'mytapestore' ); ?></th>
			<td class="num"><?php wc_cart_totals_order_total_html(); ?></td>
		</tr>

		<?php do_action( 'woocommerce_review_order_after_order_total' ); ?>

	</tfoot>

</table>
