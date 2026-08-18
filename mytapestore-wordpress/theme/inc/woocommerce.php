<?php
/**
 * WooCommerce integration.
 *
 * The design's markup lives in this theme's woocommerce/ template overrides.
 * This file's job is to get WooCommerce out of the way first: strip the default
 * wrappers, notices placement and hook-injected markup that would otherwise
 * fight the ported layout.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

/**
 * Replace WooCommerce's default page wrappers with the design's own.
 *
 * Woo wraps archive and single templates in markup borrowed from Storefront.
 * The React design has its own container structure, so the defaults are removed
 * rather than styled around.
 */
remove_action( 'woocommerce_before_main_content', 'woocommerce_output_content_wrapper', 10 );
remove_action( 'woocommerce_after_main_content', 'woocommerce_output_content_wrapper_end', 10 );

function mts_wrapper_start(): void {
	// The cart and checkout carry their own page class on Shopify (main.cart,
	// main.checkout), and a few rules hang off it.
	$class = 'mts-main';
	if ( function_exists( 'is_cart' ) && is_cart() ) {
		$class .= ' cart';
	} elseif ( function_exists( 'is_checkout' ) && is_checkout() ) {
		$class .= ' checkout';
	}
	echo '<main id="main" class="' . esc_attr( $class ) . '">';
}
function mts_wrapper_end(): void {
	echo '</main>';
}
add_action( 'woocommerce_before_main_content', 'mts_wrapper_start', 10 );
add_action( 'woocommerce_after_main_content', 'mts_wrapper_end', 10 );

/**
 * Remove the default sidebar. The design uses an inline filter panel on
 * collection pages (FilterPanel.jsx), not a widget area.
 */
remove_action( 'woocommerce_sidebar', 'woocommerce_get_sidebar', 10 );

/**
 * Woo's breadcrumb is replaced by the design's own Breadcrumbs component.
 */
remove_action( 'woocommerce_before_main_content', 'woocommerce_breadcrumb', 20 );

/**
 * Products per page on collection pages — matches the React CollectionPage grid.
 */
add_filter( 'loop_shop_per_page', fn() => 24, 20 );

/**
 * Related products: 4 across, one row, to match ProductPage.jsx.
 */
add_filter( 'woocommerce_output_related_products_args', function ( array $args ): array {
	$args['posts_per_page'] = 4;
	$args['columns']        = 4;
	return $args;
}, 20 );

/**
 * Declare compatibility with WooCommerce High-Performance Order Storage.
 *
 * The theme never queries order tables directly, so it is compatible by
 * construction — but Woo shows an incompatibility warning unless it is declared.
 */
add_action( 'before_woocommerce_init', function (): void {
	if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
		\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility(
			'custom_order_tables',
			__FILE__,
			true
		);
	}
} );

/**
 * Drop WooCommerce's own variation add-to-cart button.
 *
 * The design's button is emitted by template-parts/qty-and-add.php inside the
 * same form. Leaving Woo's in place would render two buttons and two quantity
 * inputs, and the browser would post whichever came last.
 */
remove_action( 'woocommerce_single_variation', 'woocommerce_single_variation_add_to_cart_button', 20 );

/**
 * Normalise `redirect_to` before anything reads it.
 *
 * WooCommerce's own BlockTypesController::redirect_to_field() (Blocks/
 * BlockTypesController.php:335) does esc_url_raw( $_GET['redirect_to'] ) with no
 * type check. esc_url() calls ltrim(), which on PHP 8 is a fatal TypeError when
 * handed an array — so a request to /my-account/?redirect_to[]=x returned an
 * uncaught HTTP 500 on the SIGN-IN PAGE, to anyone, without logging in.
 *
 * That is an upstream bug and the fix belongs upstream, but a storefront must
 * not 500 because a query string is the wrong shape. Anything non-scalar is
 * dropped here, before the hook that crashes on it runs — a value that was never
 * a URL cannot be a valid redirect target anyway.
 *
 * Priority 1 on `init`: earlier than WooCommerce's own hooks, which is the whole
 * point.
 */
add_action( 'init', function (): void {
	if ( isset( $_GET['redirect_to'] ) && ! is_scalar( $_GET['redirect_to'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		unset( $_GET['redirect_to'], $_REQUEST['redirect_to'] );
	}
	if ( isset( $_POST['redirect'] ) && ! is_scalar( $_POST['redirect'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Missing
		unset( $_POST['redirect'], $_REQUEST['redirect'] );
	}
}, 1 );

/**
 * Default the address country to the store's own.
 *
 * A new customer opening the address book got "Select a country / region…" and
 * 251 options to scroll — on a store that ships Australia-wide, whose every
 * other field (postcode, state, phone) is shaped for Australia, and whose whole
 * proposition is being Australian owned. Leaving it unset also means the
 * State field renders as a plain text box until a country is picked, because
 * Woo cannot know which state list to show.
 *
 * Only ever fills a BLANK country, so a customer who genuinely orders from
 * elsewhere keeps their choice on every subsequent edit.
 */
add_filter( 'woocommerce_address_to_edit', function ( array $address, string $type ): array {
	$key = $type . '_country';

	if ( isset( $address[ $key ] ) && empty( $address[ $key ]['value'] ) ) {
		$base = wc_get_base_location();
		$address[ $key ]['value'] = $base['country'] ?? 'AU';
	}

	return $address;
}, 10, 2 );

/**
 * The "added to cart" confirmation is the BUTTON, not a notice.
 *
 * WooCommerce answers a successful add with a green banner — «"Economy
 * Packaging Tape" has been added to your cart. View cart» — pinned above the
 * product. The design has no such banner: it turns the Add to cart button green
 * for a moment and then puts it back. Two confirmations for one action is one
 * too many, and the banner is the one that pushes the page down and has to be
 * scrolled past.
 *
 * Keyed to the `mts_pdp_add` field the buy box posts, NOT to is_product(): the
 * add runs on `wp_loaded`, before the main query is parsed, so at the moment
 * this filter fires WordPress does not yet know which page it is on and
 * is_product() is false. That is why an earlier version of this filter let the
 * banner through every time.
 *
 * Only the add-to-cart SUCCESS message is suppressed. Errors still show —
 * "please choose product options" has to be readable — and quick-adds from the
 * collection grid keep their notice, because there is no green button there to
 * confirm anything.
 */
add_filter( 'wc_add_to_cart_message_html', function ( $message ) {
	// phpcs:ignore WordPress.Security.NonceVerification.Missing -- reading our own form marker; WooCommerce has already verified this request.
	return empty( $_POST['mts_pdp_add'] ) ? $message : '';
}, 10 );

/**
 * Remember which product was just added, so the next page load can show it.
 *
 * WooCommerce redirects back to the product page after an add, which throws away
 * any state the click had. Parking the ID in the session is what lets the button
 * come back already green — and it survives the redirect, which an optimistic
 * client-side flash would not.
 */
add_action( 'woocommerce_add_to_cart', function ( $cart_item_key, $product_id ) {
	if ( function_exists( 'WC' ) && WC()->session ) {
		WC()->session->set( 'mts_just_added', (int) $product_id );
	}
}, 10, 2 );

/**
 * Read that flag once, then clear it — so a refresh does not re-flash the
 * button for an add that happened two page loads ago.
 */
function mts_just_added_product(): int {
	if ( ! function_exists( 'WC' ) || ! WC()->session ) {
		return 0;
	}

	$id = (int) WC()->session->get( 'mts_just_added', 0 );
	if ( $id ) {
		WC()->session->set( 'mts_just_added', 0 );
	}
	return $id;
}

/**
 * "Clear cart" — the control the design puts beside the cart heading.
 *
 * It submits the cart form, so WooCommerce has already verified that form's
 * nonce by the time this runs; the check is repeated here rather than assumed,
 * because emptying a cart on a bare GET is a one-click griefing vector.
 */
add_action( 'wp_loaded', function (): void {
	if ( empty( $_POST['mts_empty_cart'] ) || ! function_exists( 'WC' ) || ! WC()->cart ) {
		return;
	}

	$nonce = isset( $_POST['woocommerce-cart-nonce'] ) ? sanitize_text_field( wp_unslash( $_POST['woocommerce-cart-nonce'] ) ) : '';
	if ( ! wp_verify_nonce( $nonce, 'woocommerce-cart' ) ) {
		return;
	}

	WC()->cart->empty_cart();
	wc_add_notice( __( 'Your cart has been cleared.', 'mytapestore' ) );
	wp_safe_redirect( wc_get_cart_url() );
	exit;
}, 25 );

/**
 * Drop selectWoo (select2) from the front end.
 *
 * WooCommerce enhances the country and state dropdowns with selectWoo, and
 * selectWoo hides the original <select> through ITS OWN stylesheet — which this
 * theme dequeues along with every other vendor sheet. The result was TWO visible
 * controls stacked per field on checkout and in the address book: a styled
 * native select reading "Australia", and an unstyled selectWoo box reading
 * "Australia" directly beneath it. Same again for State.
 *
 * Safe to remove: country-select.js guards its enhancement with
 * `if ( $().selectWoo )` (assets/js/frontend/country-select.js:10), so without
 * the library it skips the widget and keeps the part that actually matters —
 * rebuilding the State field when the country changes. selectWoo is enqueued on
 * its own line (class-wc-frontend-scripts.php:492), not as a dependency, so
 * nothing else loses a script it needs.
 *
 * The native select is the better control here anyway: the design styles it
 * (.chk-select select, .checkout select), it is keyboard accessible without
 * help, and on a phone it opens the platform picker.
 */
add_action( 'wp_enqueue_scripts', function (): void {
	wp_dequeue_script( 'selectWoo' );
	wp_dequeue_script( 'select2' );
	wp_dequeue_style( 'select2' );
	wp_dequeue_style( 'selectWoo' );
}, 99 );

/**
 * Drop PhotoSwipe.
 *
 * WooCommerce ships its own lightbox and prints ~60 lines of .pswp markup into
 * the footer of every product page. This theme has its own — .pdp-lightbox, in
 * the design's markup, styled by the one stylesheet — so PhotoSwipe was a second
 * viewer that nothing opened, with a stylesheet the theme dequeues anyway (so if
 * anything ever HAD opened it, it would have rendered unstyled).
 */
add_action( 'wp_enqueue_scripts', function (): void {
	wp_dequeue_script( 'photoswipe' );
	wp_dequeue_script( 'photoswipe-ui-default' );
	wp_dequeue_script( 'wc-single-product' );
}, 99 );

add_action( 'after_setup_theme', function (): void {
	remove_theme_support( 'wc-product-gallery-lightbox' );
	remove_theme_support( 'wc-product-gallery-zoom' );
	remove_theme_support( 'wc-product-gallery-slider' );
}, 99 );

/**
 * "Buy it now": after WooCommerce has successfully added the item, go to checkout.
 *
 * Hooked on the redirect filter rather than doing its own add, so every check
 * WooCommerce performs — purchasable, in stock, valid variation, nonce — has
 * already passed by the time this runs. If the add fails, Woo keeps the visitor
 * on the product page with its error and this never fires.
 */
add_filter( 'woocommerce_add_to_cart_redirect', function ( $url ) {
	// phpcs:ignore WordPress.Security.NonceVerification.Missing -- WooCommerce has already verified this request.
	if ( ! empty( $_REQUEST['mts_buy_now'] ) && function_exists( 'wc_get_checkout_url' ) ) {
		return wc_get_checkout_url();
	}
	return $url;
} );
