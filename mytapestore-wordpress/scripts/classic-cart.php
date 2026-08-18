<?php
/**
 * Switch Cart, Checkout and My Account to the classic shortcodes.
 *
 * WooCommerce 9 provisions these pages with BLOCKS (wp:woocommerce/cart etc).
 * Block-based cart and checkout render entirely in JavaScript through the Store
 * API and ignore the theme's PHP templates — so woocommerce/cart/cart.php and
 * woocommerce/checkout/form-checkout.php were simply never called, and the
 * design could not be applied at all.
 *
 * The classic shortcodes route through those templates, which is what this
 * design needs. This is a supported configuration, not a hack: the shortcode
 * path is still fully maintained, and it is what the live mytapestore.com.au
 * runs today (its checkout is the classic one, with Stripe and PayPal hooked
 * into it), so it also keeps the two sites behaviourally identical.
 */
require '/wordpress/wp-load.php';

$pages = array(
    'woocommerce_cart_page_id'      => '[woocommerce_cart]',
    'woocommerce_checkout_page_id'  => '[woocommerce_checkout]',
    'woocommerce_myaccount_page_id' => '[woocommerce_my_account]',
);

foreach ( $pages as $option => $shortcode ) {
    $id = (int) get_option( $option );
    if ( ! $id ) {
        printf( "  %-32s no page configured\n", $option );
        continue;
    }
    $page = get_post( $id );
    if ( ! $page ) {
        continue;
    }
    if ( false !== strpos( (string) $page->post_content, $shortcode ) ) {
        printf( "  %-32s already classic\n", $page->post_title );
        continue;
    }
    wp_update_post( array( 'ID' => $id, 'post_content' => $shortcode ) );
    printf( "  %-32s -> %s\n", $page->post_title, $shortcode );
}
