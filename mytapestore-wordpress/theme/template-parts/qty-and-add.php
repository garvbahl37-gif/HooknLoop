<?php
/**
 * Stock line, quantity stepper, add-to-cart, buy-it-now — the design's markup.
 *
 * This replaces WooCommerce's default quantity input and button because the
 * design does not style WooCommerce's classes — it styles ITS OWN
 * (.qty, .btn--brand, .pdp-buy__add).
 *
 * ORDER IS PART OF THE DESIGN, and it was wrong: Buy-it-now sat above the line
 * total and the "added" confirmation sat between them. Shopify reads
 * stock → quantity + add + wishlist → line total → buy it now → confirmation,
 * which puts the running total under the control that changes it and the
 * confirmation directly under the button that triggers it.
 *
 * What is NOT changed, and must not be:
 *   - the input is still name="quantity", which is what WooCommerce reads;
 *   - the submit is still name="add-to-cart" with the product ID as its value
 *     (simple products) or the variation form's own submit (variable ones);
 *   - the surrounding <form>, its action and its nonce are WooCommerce's.
 *
 * @param WC_Product $args['product']
 * @param bool       $args['is_variable']
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

$mts_product     = $args['product'] ?? null;
$mts_is_variable = ! empty( $args['is_variable'] );

if ( ! $mts_product instanceof WC_Product ) {
	return;
}

$mts_min      = 1;
$mts_max      = $mts_product->is_sold_individually() ? 1 : (int) $mts_product->get_max_purchase_quantity();
$mts_in_stock = $mts_product->is_in_stock();
$mts_unit     = (float) wc_get_price_to_display( $mts_product );

/*
 * Did the visitor just add THIS product? WooCommerce redirects back here after
 * an add, so the confirmation has to be rendered on that load rather than
 * flashed by JavaScript before it. assets/js/product.js takes the state away
 * again after ~2.6s.
 */
$mts_just_added = ( mts_just_added_product() === $mts_product->get_id() );
?>
<div class="pdp-buy__section">

	<?php
	/*
	 * Stock is the last thing read before committing: whether it can actually
	 * ship. Both states are always in the markup and one is hidden, so choosing
	 * a sold-out variation can flip them without a page load.
	 */
	?>
	<div class="pdp-buy__stock">
		<span class="pdp-buy__instock" data-mts-instock <?php echo $mts_in_stock ? '' : 'hidden'; ?>>
			<span class="pdp-buy__dot" aria-hidden="true"></span>
			<?php esc_html_e( 'In stock — dispatched in 1–2 business days', 'mytapestore' ); ?>
		</span>
		<span class="pdp-buy__oos" data-mts-oos <?php echo $mts_in_stock ? 'hidden' : ''; ?>>
			<?php esc_html_e( 'Currently out of stock', 'mytapestore' ); ?>
		</span>
	</div>

	<?php
	/*
	 * NOTHING that renders the add-to-cart form may appear in this file.
	 *
	 * This partial is included FROM that form (see
	 * woocommerce/single-product/add-to-cart/variable.php and simple.php). A stray
	 * woocommerce_template_single_add_to_cart() call sat here briefly and produced
	 * unbounded recursion — form → this partial → form → … — which surfaced as
	 * "Allowed memory size exhausted" on the line that happened to allocate next,
	 * several files away from the actual cause.
	 */
	?>
	<?php if ( $mts_is_variable ) : ?>
		<?php
		/*
		 * THE THREE FIELDS WOOCOMMERCE CANNOT ADD A VARIABLE PRODUCT WITHOUT.
		 *
		 * These normally come from Woo's own
		 * single-product/add-to-cart/variation-add-to-cart-button.php, which
		 * inc/woocommerce.php unhooks so the design's button can take its place.
		 * Unhooking it removed the BUTTON — and, silently, these inputs with it.
		 *
		 * WC_Form_Handler::add_to_cart_action() returns immediately when
		 * $_REQUEST['add-to-cart'] is absent, so every "Add to cart" and every
		 * "Buy it now" on a variable product posted a form the server ignored:
		 * no error, no notice, no item. Nothing on screen said anything had
		 * happened, which is exactly how it was reported.
		 *
		 * class="variation_id" is load-bearing, not decorative —
		 * wc-add-to-cart-variation.js writes the matched variation's ID into
		 * that element. Rename it and the cart gets a product with no variation.
		 */
		?>
		<input type="hidden" name="add-to-cart" value="<?php echo esc_attr( (string) $mts_product->get_id() ); ?>">
		<input type="hidden" name="product_id" value="<?php echo esc_attr( (string) $mts_product->get_id() ); ?>">
		<input type="hidden" name="variation_id" class="variation_id" value="0">
	<?php endif; ?>

	<?php
	/*
	 * Marks this POST as coming from the product page's own buy box.
	 *
	 * inc/woocommerce.php suppresses WooCommerce's "has been added to your cart"
	 * banner for these, because the button turning green IS the confirmation
	 * here. It cannot decide that with is_product(): the add runs on `wp_loaded`,
	 * before the main query has been parsed, so at that moment WordPress does not
	 * yet know what page this is — which is why the banner kept appearing.
	 */
	?>
	<input type="hidden" name="mts_pdp_add" value="1">

	<div class="pdp-buy__actions">

		<div class="qty" role="group" aria-label="<?php esc_attr_e( 'Quantity', 'mytapestore' ); ?>">
			<button type="button" data-mts-qty-down aria-label="<?php esc_attr_e( 'Decrease quantity', 'mytapestore' ); ?>">
				<?php mts_the_icon( 'minus', 16 ); ?>
			</button>
			<input class="num" type="text" inputmode="numeric" pattern="[0-9]*"
				   name="quantity" value="1" data-mts-qty
				   data-min="<?php echo esc_attr( (string) $mts_min ); ?>"
				   data-max="<?php echo esc_attr( (string) ( $mts_max > 0 ? $mts_max : '' ) ); ?>"
				   aria-label="<?php esc_attr_e( 'Quantity', 'mytapestore' ); ?>">
			<button type="button" data-mts-qty-up aria-label="<?php esc_attr_e( 'Increase quantity', 'mytapestore' ); ?>">
				<?php mts_the_icon( 'plus', 16 ); ?>
			</button>
		</div>

		<button type="submit" data-mts-add
				class="btn btn--brand btn--lg pdp-buy__add single_add_to_cart_button<?php echo $mts_just_added ? ' is-added' : ''; ?>"
				<?php echo $mts_in_stock ? '' : 'disabled'; ?>
				<?php if ( ! $mts_is_variable ) : ?>
					name="add-to-cart" value="<?php echo esc_attr( (string) $mts_product->get_id() ); ?>"
				<?php endif; ?>>
			<span data-mts-add-idle <?php echo $mts_just_added ? 'hidden' : ''; ?>><?php mts_the_icon( 'cart', 19 ); ?> <?php echo esc_html( $mts_product->single_add_to_cart_text() ); ?></span>
			<span data-mts-add-done <?php echo $mts_just_added ? '' : 'hidden'; ?>><?php mts_the_icon( 'check', 19 ); ?> <?php esc_html_e( 'Added to cart', 'mytapestore' ); ?></span>
		</button>

		<button type="button" class="pdp-buy__wish"
				data-mts-wish="<?php echo esc_attr( (string) $mts_product->get_id() ); ?>"
				aria-pressed="false"
				aria-label="<?php esc_attr_e( 'Add to wishlist', 'mytapestore' ); ?>">
			<?php mts_the_icon( 'heart', 20 ); ?>
		</button>

	</div>

	<p class="pdp-buy__linetotal" data-mts-linetotal-wrap>
		<?php esc_html_e( 'Total', 'mytapestore' ); ?>
		<b class="num" data-mts-linetotal><?php echo esc_html( mts_money( $mts_unit ) ); ?></b>
	</p>

	<?php
	/*
	 * BUY IT NOW.
	 *
	 * A second submit on the SAME WooCommerce form, so the product is added
	 * through Woo's own validated path — variation matching, stock checks and the
	 * nonce all still apply. It only sets a flag; inc/woocommerce.php reads that
	 * flag after a successful add and redirects to checkout. Nothing here
	 * bypasses the cart.
	 */
	?>
	<button type="submit" name="mts_buy_now" value="1" data-mts-buynow
			class="btn btn--dark btn--lg btn--block pdp-buy__buynow"
			<?php echo $mts_in_stock ? '' : 'disabled'; ?>
			<?php if ( ! $mts_is_variable ) : ?>
				formnovalidate="formnovalidate"
			<?php endif; ?>>
		<?php mts_the_icon( 'lock', 17 ); ?>
		<?php esc_html_e( 'Buy it now', 'mytapestore' ); ?>
	</button>

	<?php
	/*
	 * Shown only in the moment after an add, and only alongside the green
	 * button — it carries the one thing the button cannot: the way to the cart.
	 * It is not a duplicate notice; WooCommerce's own banner is suppressed in
	 * inc/woocommerce.php precisely so this is the only confirmation on screen.
	 */
	?>
	<div class="pdp-buy__added" role="status" data-mts-added <?php echo $mts_just_added ? '' : 'hidden'; ?>>
		<?php mts_the_icon( 'check', 18 ); ?>
		<span data-mts-added-text><?php esc_html_e( 'Added to your cart.', 'mytapestore' ); ?></span>
		<a href="<?php echo esc_url( wc_get_cart_url() ); ?>"><?php esc_html_e( 'View cart &amp; checkout →', 'mytapestore' ); ?></a>
	</div>

</div>
