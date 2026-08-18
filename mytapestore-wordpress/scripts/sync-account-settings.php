<?php
/**
 * Turn on the account features the design assumes exist.
 *
 * The theme ships a full account area — sign in, register, orders, addresses —
 * and WooCommerce was configured with registration switched OFF, so
 * /my-account/ offered a login form and no way to create the account it wanted
 * you to log into. Guest checkout was likewise unset, which on a trade store is
 * the difference between an order and an abandoned cart.
 *
 * Every value below is a WooCommerce setting, not a theme option — they are the
 * same switches the WooCommerce → Accounts & Privacy screen writes.
 *
 * Run (note --site-url; see fix-site-url.php for why):
 *   ./node_modules/.bin/wp-playground-cli php \
 *     --site-url=http://localhost:9400 \
 *     --mount-before-install=./local/wordpress:/wordpress \
 *     --mount=./theme:/wordpress/wp-content/themes/mytapestore \
 *     --mount=./scripts:/wordpress/mts-scripts \
 *     --wordpress-install-mode=install-from-existing-files \
 *     -- /wordpress/mts-scripts/sync-account-settings.php
 *
 * Idempotent.
 *
 * @package mytapestore
 */

if ( ! defined( 'ABSPATH' ) ) {
	require_once '/wordpress/wp-load.php';
}

$mts_settings = array(
	// A sign-in page with no way to sign up is a dead end.
	'woocommerce_enable_myaccount_registration'          => 'yes',

	// Let people register during checkout too, rather than bouncing them out of
	// a purchase to go and make an account first.
	'woocommerce_enable_signup_and_login_from_checkout'  => 'yes',
	'woocommerce_enable_checkout_login_reminder'         => 'yes',

	// Guest checkout stays ON. Forcing an account on a trade buyer placing one
	// urgent order is the single most expensive thing this screen can do.
	'woocommerce_enable_guest_checkout'                  => 'yes',

	// Let customers choose their own username and password. Generated ones mean
	// a "check your email for your password" round trip mid-purchase.
	'woocommerce_registration_generate_username'         => 'no',
	'woocommerce_registration_generate_password'         => 'no',
);

foreach ( $mts_settings as $mts_key => $mts_value ) {
	$mts_was = get_option( $mts_key );
	if ( $mts_was === $mts_value ) {
		echo "  = {$mts_key}: already {$mts_value}\n";
		continue;
	}
	update_option( $mts_key, $mts_value );
	echo "  ~ {$mts_key}: " . var_export( $mts_was, true ) . " -> {$mts_value}\n";
}

/*
 * The My Account page must exist and be mapped, or every account URL 404s and
 * the header's account icon points at nothing.
 */
$mts_account_id = (int) get_option( 'woocommerce_myaccount_page_id' );
$mts_account    = $mts_account_id ? get_post( $mts_account_id ) : null;
echo "\nmy-account page: " . ( $mts_account ? "#{$mts_account_id} '{$mts_account->post_title}' ({$mts_account->post_status})" : 'MISSING' ) . "\n";

if ( function_exists( 'WC' ) ) {
	foreach ( array( 'orders', 'view-order', 'edit-account', 'edit-address', 'lost-password', 'customer-logout' ) as $mts_endpoint ) {
		$mts_slug = get_option( 'woocommerce_myaccount_' . str_replace( '-', '_', $mts_endpoint ) . '_endpoint', $mts_endpoint );
		echo "  endpoint {$mts_endpoint}: /{$mts_slug}\n";
	}
}

// Endpoints are rewrite rules; without this the new ones 404 until someone
// visits Settings → Permalinks by hand.
flush_rewrite_rules( false );
echo "\nrewrite rules flushed\n";
