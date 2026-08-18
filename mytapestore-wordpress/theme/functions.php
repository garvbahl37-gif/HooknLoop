<?php
/**
 * My Tape Store theme bootstrap.
 *
 * This file exists to do three things, in order of importance:
 *
 *   1. Guarantee that assets/mts-styles.css is the ONLY stylesheet on the page.
 *      That is the entire basis of the exact-parity contract — the ported CSS
 *      assumes a browser-default 16px root and no competing cascade, exactly as
 *      the React app and the Shopify theme do. One stray vendor stylesheet and
 *      the design drifts.
 *
 *   2. Declare the WooCommerce support the templates rely on.
 *
 *   3. Register the menus and image sizes the design needs.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

define( 'MTS_VERSION', wp_get_theme()->get( 'Version' ) );

/**
 * Style handles that are allowed to survive the purge in mts_enforce_single_stylesheet().
 *
 * Deliberately tiny. Add a handle here only when a plugin's CSS is *functional*
 * rather than cosmetic — a payment field that will not render without it, say —
 * and note why. Anything cosmetic gets restyled in the source CSS instead.
 */
function mts_stylesheet_allowlist(): array {
	$allowed = array( 'mts-styles' );

	// The admin bar is staff-only and never renders for a customer, so its CSS
	// (and the dashicons font it depends on) is exempt rather than fought with.
	if ( is_admin_bar_showing() ) {
		$allowed[] = 'admin-bar';
		$allowed[] = 'dashicons';
	}

	return apply_filters( 'mts_stylesheet_allowlist', array_merge( $allowed, mts_functional_plugin_styles() ) );
}

/**
 * Plugin stylesheets that are FUNCTIONAL, and therefore survive the purge.
 *
 * WHY THIS EXISTS AT ALL
 *
 * This draft runs WooCommerce and nothing else, so a one-handle allowlist has
 * never cost it anything. mytapestore.com.au runs fourteen plugins that enqueue
 * CSS across fifty-six handles, and the theme-only cutover puts this theme on
 * top of them. Shipping the current allowlist there would strip every one of
 * those on the first request.
 *
 * Most of it deserves to go — that purge is the whole basis of the parity
 * contract and most of the performance win. But some of it is not decoration:
 *
 *   STRIPE is the one that matters. Its checkout stylesheets position the card
 *   fields and the Payment Element. Without them the fields render wrong or not
 *   at all, and the store cannot take money. This is precisely the "functional
 *   rather than cosmetic" case the allowlist was written to admit.
 *
 *   VARIATION SWATCHES, TIER PRICING and SMART COUPONS draw interactive
 *   controls — swatch grids, quantity break tables, coupon fields. They work
 *   without CSS in the sense that the form still posts, but they present as
 *   unstyled lists a shopper cannot read.
 *
 *   SELECT2 is WooCommerce's own dependency for the country and state pickers.
 *
 * DELIBERATELY NOT HERE: kapee-*, js_composer, vc_*, testimonial-free,
 * wp-carousel-free, easy-sale-badges, woo-fly-cart, shortcodes-ultimate. Those
 * are the outgoing theme's chrome and cosmetic add-ons — the things this design
 * replaces. Letting them back in would mean two designs fighting.
 *
 * Nothing here has any effect on this draft, where none of these plugins exist.
 * It is inert until the day it is needed, which is the point.
 *
 * @return string[]
 */
function mts_functional_plugin_styles(): array {
	return array(
		// Stripe — card fields and the Payment Element. Cannot be dropped.
		'stripelink_styles',
		'wc-stripe-blocks-checkout-style',
		'wc-stripe-upe-classic',
		'woocommerce_stripe_styles',

		// PayPal Payments.
		'ppcp-gateway',
		'gateway',

		// WooCommerce's own country/state pickers.
		'select2',

		// Interactive product controls.
		'woo-variation-swatches',
		'woo-variation-swatches-inline',
		'tiered-pricing-table-front-css',
		'wt-smart-coupon-for-woo',
		'wt-smart-coupon-giveaway',

		// Shipping method presentation at checkout.
		'sendle-tracking-style',

		// AddressFinder, if it is kept in preference to the theme's own finder.
		'addressfinder-woocommerce',

		// Contact Form 7 — thirteen forms live in the imported page content.
		'contact-form-7',
	);
}

/**
 * Dequeue non-allowlisted styles that came through wp_enqueue_scripts.
 *
 * Priority 9999 so it fires after WooCommerce and every plugin has queued up.
 * This is the cheap pass — it stops the work early. It is NOT the guarantee;
 * mts_block_foreign_stylesheets() below is.
 *
 * NOTE: styles only, never scripts. Plugin JavaScript is functional — Stripe's
 * card fields, the variation form, the shipping calculator — and blanket
 * dequeuing it would break checkout. Weight is reclaimed by removing plugins at
 * the source, not by starving the survivors of their JS.
 */
function mts_enforce_single_stylesheet(): void {
	if ( is_admin() ) {
		return;
	}

	$allowed = mts_stylesheet_allowlist();

	foreach ( wp_styles()->queue as $handle ) {
		if ( ! in_array( $handle, $allowed, true ) ) {
			wp_dequeue_style( $handle );
		}
	}
}
add_action( 'wp_enqueue_scripts', 'mts_enforce_single_stylesheet', 9999 );

/**
 * The actual guarantee: suppress the <link> tag for anything not allowlisted.
 *
 * Iterating wp_styles()->queue is not sufficient, and this was proven rather
 * than assumed — a first pass that only filtered the queue still shipped
 * dashicons and WooCommerce's wc-blocks.css. Two classes of stylesheet escape
 * a queue-based purge entirely:
 *
 *   - DEPENDENCIES. ->queue holds only top-level handles; anything pulled in
 *     via a $deps array is never listed there.
 *   - BLOCK STYLES. Registered through the block type registry and printed by
 *     wp_enqueue_block_style()/enqueue_block_assets, which do not pass through
 *     wp_enqueue_scripts at all.
 *
 * style_loader_tag runs for every stylesheet immediately before it is printed,
 * whatever route it took to get there. It is the last gate, so it is the one
 * worth trusting.
 */
function mts_block_foreign_stylesheets( string $tag, string $handle ): string {
	if ( is_admin() ) {
		return $tag;
	}

	return in_array( $handle, mts_stylesheet_allowlist(), true ) ? $tag : '';
}
add_filter( 'style_loader_tag', 'mts_block_foreign_stylesheets', 9999, 2 );

/**
 * Stop core from emitting per-block stylesheets and the global styles blob.
 *
 * Cheaper than filtering them out one by one after the fact, and it keeps
 * wp_head free of the inline <style> islands the block system generates.
 */
function mts_disable_block_styles(): void {
	add_filter( 'should_load_separate_core_block_assets', '__return_false' );
	remove_action( 'wp_enqueue_scripts', 'wp_enqueue_global_styles' );
	remove_action( 'wp_footer', 'wp_enqueue_global_styles', 1 );
	remove_action( 'wp_body_open', 'wp_global_styles_render_svg_filters' );
	remove_action( 'wp_enqueue_scripts', 'wp_common_block_scripts_and_styles' );
}
add_action( 'init', 'mts_disable_block_styles' );

/**
 * Enqueue the one stylesheet, plus the small vanilla scripts that replace React.
 *
 * The React app is an authoring tool, not a runtime: WooCommerce renders
 * server-side and only genuinely interactive pieces get JavaScript.
 */
function mts_enqueue_assets(): void {
	$dir = get_stylesheet_directory();
	$uri = get_stylesheet_directory_uri();

	$css = $dir . '/assets/mts-styles.css';
	wp_enqueue_style(
		'mts-styles',
		$uri . '/assets/mts-styles.css',
		array(),
		file_exists( $css ) ? (string) filemtime( $css ) : MTS_VERSION
	);

	/*
	 * `product` and `cart` bind to WooCommerce's own jQuery custom events —
	 * show_variation, updated_wc_div — which jQuery.trigger() dispatches only to
	 * jQuery handlers, never as native events. Declaring the dependency is what
	 * guarantees jQuery has executed before they run; without it they were
	 * racing a script they could not see.
	 */
	$deps = array(
		'product' => array( 'jquery' ),
		'cart'    => array( 'jquery' ),
	);

	foreach ( array( 'header-nav', 'hero-slider', 'industry-strip', 'filters', 'cards', 'product', 'cart', 'widgets', 'wishlist', 'popup', 'auth', 'acct', 'card', 'search', 'address' ) as $script ) {
		$path = $dir . "/assets/js/{$script}.js";
		if ( ! file_exists( $path ) ) {
			continue;
		}
		wp_enqueue_script(
			"mts-{$script}",
			$uri . "/assets/js/{$script}.js",
			$deps[ $script ] ?? array(),
			(string) filemtime( $path ),
			array( 'strategy' => 'defer', 'in_footer' => true )
		);
	}

	/*
	 * The suggestions endpoint, resolved server-side. rest_url() knows whether
	 * this install serves pretty permalinks or ?rest_route=, and a hardcoded
	 * /wp-json/ path is a 404 on the ones that do not.
	 */
	if ( wp_script_is( 'mts-search', 'enqueued' ) ) {
		wp_localize_script( 'mts-search', 'mtsSearch', array(
			'endpoint' => esc_url_raw( rest_url( 'mts/v1/suggest' ) ),
		) );
	}

	/*
	 * The chat assistant and the address finder, resolved the same way and for
	 * the same reason.
	 *
	 * Note what is NOT here: neither API key. The browser is told where OUR
	 * endpoints are; the keys stay in wp-config.php and never leave the server.
	 */
	if ( wp_script_is( 'mts-widgets', 'enqueued' ) ) {
		/*
		 * FILTERABLE, because the answer is not the same everywhere.
		 *
		 * On a real WordPress install this is the theme's own REST route: PHP
		 * runs on the server, so the Groq key sits in wp-config.php and never
		 * reaches a browser.
		 *
		 * The hosted preview is WP Playground — WordPress compiled to WebAssembly,
		 * running inside the visitor's own tab. There is no server, so anything
		 * the "server" knows is in a file the public can download. A key placed
		 * there would be a published key. The preview therefore filters this to a
		 * small Vercel function that holds the key as an environment variable, and
		 * the widget never learns it either way.
		 *
		 * One widget, one contract, two deployments — and no build in which the
		 * key is reachable from the client.
		 */
		wp_localize_script( 'mts-widgets', 'mtsChat', array(
			'endpoint' => esc_url_raw( apply_filters( 'mts_chat_endpoint', rest_url( 'mts/v1/chat' ) ) ),
		) );
	}

	/*
	 * The address finder is FULLY LOCAL — a static file, not an endpoint.
	 *
	 * It used to be handed two REST URLs and asked the server on every
	 * keystroke. The whole Australian locality list is 289KB (~113KB gzipped),
	 * so it is cheaper to send it once and match in the browser: no request per
	 * keystroke, no debounce, no API key, and nothing for the store owner to
	 * install. The file ships inside the theme, so it works the moment the theme
	 * is activated on any WordPress.
	 *
	 * The version string is the file's mtime, so a refreshed locality list
	 * invalidates the browser cache without anyone having to think about it.
	 */
	if ( wp_script_is( 'mts-address', 'enqueued' ) ) {
		$index = $dir . '/assets/data/au-localities.txt';

		/*
		 * `index` is the whole feature for suburb, state and postcode: a static
		 * file, fetched once, matched in memory, no network per keystroke.
		 *
		 * `street` is the one addition that needs a server, and it is deliberately
		 * OPTIONAL — an empty string when no Checkify key is configured. The
		 * street field then stays an ordinary text input and everything else
		 * behaves exactly as before, which is what makes this safe to ship to an
		 * install that has no key yet.
		 */
		wp_localize_script( 'mts-address', 'mtsAddress', array(
			'index'  => file_exists( $index )
				? esc_url_raw( add_query_arg( 'v', (string) filemtime( $index ), $uri . '/assets/data/au-localities.txt' ) )
				: '',
			'street' => mts_street_enabled()
				? esc_url_raw( apply_filters( 'mts_street_endpoint', rest_url( 'mts/v1/street' ) ) )
				: '',
		) );
	}

	/*
	 * WooCommerce only localises wc_add_to_cart_params onto the `wc-add-to-cart`
	 * handle, and only enqueues that handle when AJAX add-to-cart is switched on
	 * in settings. The product page's add button reads wc_ajax_url from it, so
	 * ask for the handle explicitly rather than depending on a shop setting.
	 */
	if ( function_exists( 'is_product' ) && ( is_product() || is_shop() || is_product_taxonomy() ) ) {
		wp_enqueue_script( 'wc-add-to-cart' );
	}

	/*
	 * The Store API is what lets the product page add to the cart WITHOUT a page
	 * reload — for variable products as well as simple ones.
	 *
	 * WooCommerce's older ?wc-ajax=add_to_cart endpoint cannot do it: its handler
	 * calls WC()->cart->add_to_cart( $product_id, $quantity ) with no variation,
	 * so on any variable product it answers {"error":true} and adds nothing.
	 * Verified against this store — that is why an earlier attempt at an AJAX add
	 * appeared to work while the item was really being added by a second, native
	 * form submit behind it.
	 *
	 * The nonce is minted here rather than fetched at click time so the first add
	 * costs one request, not two. assets/js/product.js re-fetches it from
	 * /wp-json/wc/store/v1/cart and retries once if the server rejects it, which
	 * is what keeps this working on a page served from a full-page cache.
	 */
	if ( function_exists( 'is_product' ) ) {
		$store = array(
			'root'  => esc_url_raw( rest_url( 'wc/store/v1/' ) ),
			'nonce' => wp_create_nonce( 'wc_store_api' ),
		);

		// The grids need it too: a card's "Add to cart" goes through the same
		// endpoint, so that it also adds without leaving the collection page.
		if ( is_product() ) {
			wp_localize_script( 'mts-product', 'mtsStore', $store );
		} elseif ( is_cart() ) {
			// The cart's remove and quantity controls run through the same API,
			// so a click changes the row instead of re-rendering the page.
			wp_localize_script( 'mts-cart', 'mtsStore', $store );
		} elseif ( is_shop() || is_product_taxonomy() || is_search() || is_front_page() ) {
			wp_localize_script( 'mts-cards', 'mtsStore', $store );
		}
	}
}
add_action( 'wp_enqueue_scripts', 'mts_enqueue_assets' );

/**
 * Drop WordPress core's own front-end cruft.
 *
 * These are core's contributions to the cascade and the wp_head noise. Removing
 * them is part of keeping the page to a single stylesheet.
 */
function mts_trim_core_output(): void {
	// Emoji detection script + its inline styles.
	remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
	remove_action( 'wp_print_styles', 'print_emoji_styles' );
	remove_action( 'admin_print_scripts', 'print_emoji_detection_script' );
	remove_action( 'admin_print_styles', 'print_emoji_styles' );

	// Block editor front-end CSS — the design does not use blocks.
	wp_dequeue_style( 'wp-block-library' );
	wp_dequeue_style( 'wp-block-library-theme' );
	wp_dequeue_style( 'global-styles' );
	wp_dequeue_style( 'classic-theme-styles' );

	// Legacy head noise.
	remove_action( 'wp_head', 'wp_generator' );
	remove_action( 'wp_head', 'wlwmanifest_link' );
	remove_action( 'wp_head', 'rsd_link' );
	remove_action( 'wp_head', 'wp_shortlink_wp_head' );
}
add_action( 'init', 'mts_trim_core_output' );
add_action( 'wp_enqueue_scripts', 'mts_trim_core_output', 100 );

/**
 * Theme supports and menu locations.
 */
function mts_setup(): void {
	load_theme_textdomain( 'mytapestore', get_template_directory() . '/languages' );

	add_theme_support( 'title-tag' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'automatic-feed-links' );
	add_theme_support( 'customize-selective-refresh-widgets' );
	add_theme_support( 'html5', array(
		'search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script',
	) );

	// WooCommerce. Gallery features are declared so single-product markup matches
	// the React ProductPage, which has a thumbnail rail and a zoomable main image.
	add_theme_support( 'woocommerce', array(
		'thumbnail_image_width' => 400,
		'single_image_width'    => 900,
	) );
	add_theme_support( 'wc-product-gallery-zoom' );
	add_theme_support( 'wc-product-gallery-lightbox' );
	add_theme_support( 'wc-product-gallery-slider' );

	register_nav_menus( array(
		'primary'   => __( 'Primary (category bar)', 'mytapestore' ),
		'utility'   => __( 'Utility (account / search row)', 'mytapestore' ),
		'footer-1'  => __( 'Footer — Shop', 'mytapestore' ),
		'footer-2'  => __( 'Footer — Industries', 'mytapestore' ),
		'footer-3'  => __( 'Footer — Customer Service', 'mytapestore' ),
	) );
}
add_action( 'after_setup_theme', 'mts_setup' );

/**
 * Content width, used by oEmbed and wide images.
 */
function mts_content_width(): void {
	$GLOBALS['content_width'] = 1280;
}
add_action( 'after_setup_theme', 'mts_content_width', 0 );

/*
 * API KEYS, WHEN THEY TRAVEL WITH THE THEME.
 *
 * MTS-API-KEYS.php is not in version control and is not part of the theme's
 * source. It is generated from .env by scripts/write-api-keys.sh so the handover
 * archive arrives working — upload, activate, done — instead of asking whoever
 * installs it to hand-edit wp-config.php on a host that hides it behind SFTP.
 *
 * OPTIONAL BY DESIGN. On any install where the file is absent — which includes
 * every copy of this theme in git — the two features it powers degrade quietly:
 * the chat widget answers from its built-in script, and the checkout's street
 * field stays an ordinary text input. Suburb, state and postcode autocomplete
 * regardless, because those need no key at all.
 *
 * The file itself uses defined() || define(), so anything already set in
 * wp-config.php wins. Moving the keys there later is a cut and paste with no
 * corresponding change here — and wp-config.php, sitting above the web root,
 * is the better home once the site is live.
 */
$mts_keys = get_template_directory() . '/MTS-API-KEYS.php';

if ( is_readable( $mts_keys ) ) {
	require_once $mts_keys;
}

require_once get_template_directory() . '/inc/config.php';
require_once get_template_directory() . '/inc/permalinks.php';
require_once get_template_directory() . '/inc/imported-content.php';
require_once get_template_directory() . '/inc/internal-links.php';
require_once get_template_directory() . '/inc/icons.php';
require_once get_template_directory() . '/inc/nav.php';
require_once get_template_directory() . '/inc/legacy-shortcodes.php';
require_once get_template_directory() . '/inc/filters.php';
require_once get_template_directory() . '/inc/seo.php';
require_once get_template_directory() . '/inc/search-suggest.php';
require_once get_template_directory() . '/inc/address-lookup.php';
require_once get_template_directory() . '/inc/address-street.php';
require_once get_template_directory() . '/inc/chat-assistant.php';
require_once get_template_directory() . '/inc/tiered-pricing.php';
require_once get_template_directory() . '/inc/product-data.php';
require_once get_template_directory() . '/inc/product-description.php';
require_once get_template_directory() . '/inc/wishlist.php';
require_once get_template_directory() . '/inc/account-wishlist.php';
require_once get_template_directory() . '/inc/newsletter.php';
require_once get_template_directory() . '/inc/contact-form.php';
require_once get_template_directory() . '/inc/payment-gateways.php';
require_once get_template_directory() . '/inc/checkout-consent.php';
require_once get_template_directory() . '/inc/woocommerce.php';
