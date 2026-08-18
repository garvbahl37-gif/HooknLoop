<?php
/**
 * Wishlist card endpoint.
 *
 * Saved items live in the visitor's browser, exactly as on Shopify — no account
 * needed, nothing stored server-side. What the browser CANNOT do is build a
 * product card: the card carries the badge logic, the size count, the rating,
 * the stock dot, the live price and the right call to action for the product's
 * type, and all of that is server knowledge.
 *
 * The old wishlist snapshotted a few strings off the card at the moment the
 * heart was clicked and rebuilt a card from them later. That is why the wishlist
 * page showed stripped-down cards with "View product" where the rest of the
 * store shows "Add to cart", no badges, no rating and a price frozen at whatever
 * it was on the day the item was saved.
 *
 * This mirrors Shopify's approach (sections/mts-wish-card.liquid, fetched per
 * handle through the Section Rendering API): the browser holds IDs, the server
 * renders the cards. An ID whose product has since been deleted or unpublished
 * comes back absent, which is also how the script knows to prune the save.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

/**
 * Render catalogue cards for a list of product IDs.
 *
 * Public and read-only: it returns markup for published products that a visitor
 * could reach by URL anyway, so there is nothing to authenticate. It is capped
 * at 60 ids per request so a crafted URL cannot ask the site to render the
 * entire catalogue.
 */
function mts_wishlist_cards(): void {
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- public read-only endpoint, no state changes.
	$raw = isset( $_GET['ids'] ) ? sanitize_text_field( wp_unslash( $_GET['ids'] ) ) : '';

	$ids = array_slice(
		array_filter( array_map( 'absint', explode( ',', $raw ) ) ),
		0,
		60
	);

	if ( ! $ids ) {
		wp_send_json( array( 'cards' => array() ) );
	}

	$found = get_posts( array(
		'post_type'           => 'product',
		'post_status'         => 'publish',
		'post__in'            => $ids,
		'posts_per_page'      => count( $ids ),
		'fields'              => 'ids',
		'ignore_sticky_posts' => true,
	) );

	// Answer in the order the visitor saved them, newest first, not the order
	// the database happened to return.
	$ordered = array_values( array_intersect( $ids, $found ) );

	$cards = array();

	foreach ( $ordered as $id ) {
		$product = wc_get_product( $id );
		if ( ! $product || ! $product->is_visible() ) {
			continue;
		}

		$GLOBALS['post']    = get_post( $id ); // phpcs:ignore WordPress.WP.GlobalVariablesOverride
		$GLOBALS['product'] = $product;
		setup_postdata( $GLOBALS['post'] );

		ob_start();
		wc_get_template_part( 'content', 'product' );
		$cards[ (string) $id ] = ob_get_clean();
	}

	wp_reset_postdata();

	wp_send_json( array( 'cards' => $cards ) );
}

add_action( 'wp_ajax_mts_wish_cards', 'mts_wishlist_cards' );
add_action( 'wp_ajax_nopriv_mts_wish_cards', 'mts_wishlist_cards' );

/**
 * Hand the script the endpoint URL rather than have it guess at admin-ajax.php.
 */
add_action( 'wp_enqueue_scripts', function (): void {
	if ( ! wp_script_is( 'mts-wishlist', 'enqueued' ) ) {
		return;
	}
	wp_localize_script( 'mts-wishlist', 'mtsWishlist', array(
		'endpoint' => admin_url( 'admin-ajax.php?action=mts_wish_cards' ),
		'shopUrl'  => function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'shop' ) : home_url( '/shop/' ),
	) );
}, 20 );
