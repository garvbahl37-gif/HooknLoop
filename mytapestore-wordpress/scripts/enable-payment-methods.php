<?php
/**
 * Enable offline payment methods so checkout can actually complete.
 *
 * The store had ZERO payment gateways enabled, so every checkout ended on
 * "Invalid payment method." and no order could be placed — the draft could be
 * browsed but not bought from, which makes the whole purchase path untestable.
 *
 * These are the two OFFLINE methods WooCommerce ships: bank transfer and cash on
 * delivery. They are deliberately the choice here rather than a card gateway:
 * Stripe/PayPal need real credentials and a merchant account, and belong to the
 * cutover, not to a review build. An offline method takes a real order through
 * the real checkout, so the flow, the emails and the order records are all
 * genuine — only the money movement is manual.
 *
 * BEFORE GOING LIVE: decide the real gateway and disable whichever of these the
 * business does not actually offer.
 *
 * Run (note --site-url; see fix-site-url.php for why):
 *   ./node_modules/.bin/wp-playground-cli php \
 *     --site-url=http://localhost:9400 \
 *     --mount-before-install=./local/wordpress:/wordpress \
 *     --mount=./theme:/wordpress/wp-content/themes/mytapestore \
 *     --mount=./scripts:/wordpress/mts-scripts \
 *     --wordpress-install-mode=install-from-existing-files \
 *     -- /wordpress/mts-scripts/enable-payment-methods.php
 *
 * Idempotent.
 *
 * @package mytapestore
 */

if ( ! defined( 'ABSPATH' ) ) {
	require_once '/wordpress/wp-load.php';
}

$mts_methods = array(
	'bacs' => array(
		'enabled'     => 'yes',
		'title'       => 'Direct bank transfer',
		'description' => 'Pay by EFT. Your order ships once the funds have cleared — please use your order number as the payment reference.',
	),
	'cod'  => array(
		'enabled'     => 'yes',
		'title'       => 'Pay on account',
		'description' => 'For approved trade accounts. We will invoice against your account on the usual terms.',
	),
);

foreach ( $mts_methods as $mts_id => $mts_settings ) {
	$mts_key      = 'woocommerce_' . $mts_id . '_settings';
	$mts_existing = (array) get_option( $mts_key, array() );
	$mts_merged   = array_merge( $mts_existing, $mts_settings );

	update_option( $mts_key, $mts_merged );
	echo "  {$mts_id}: enabled — \"{$mts_settings['title']}\"\n";
}

// The gateway list is cached per request; clear it so the next page load sees them.
if ( function_exists( 'WC' ) ) {
	delete_transient( 'wc_payment_gateways' );
}

echo "\navailable at checkout:\n";
foreach ( WC()->payment_gateways()->get_available_payment_gateways() as $mts_gateway ) {
	echo "  - {$mts_gateway->get_title()}\n";
}
