<?php
/**
 * Strip everything that exists only for the demo, before a production build.
 *
 * WHAT THIS REMOVES, AND WHY EACH ONE MATTERS
 *
 * 1. THE DEMO MU-PLUGIN. wp-content/mu-plugins/00-mts-demo.php exists to make
 *    the browser-hosted preview work: it points media at the Vercel CDN, hides
 *    the admin bar, empties the cart for each visitor, prints a "Development
 *    preview" flag — and forces `noindex, nofollow, noarchive` on every page.
 *
 *    Shipping it live would de-index the entire store and serve every product
 *    image from a preview host. This is the single most dangerous file in the
 *    build.
 *
 * 2. TEST ORDERS. Placed while proving checkout worked end to end. They would
 *    land in the live order list and, worse, in revenue reporting.
 *
 * 3. THE REVIEW ACCOUNT. `mtsreview`, with a password written down in a script.
 *
 * 4. THE PLACEHOLDER GATEWAYS' SETTINGS. inc/payment-gateways.php has to be
 *    deleted from the theme by hand at cutover — it is code, not data — but its
 *    saved settings are cleared here so the real plugins start clean.
 *
 * WHAT IT DOES NOT DO
 *
 * It does not touch products, categories, pages, posts, media or URLs. It is a
 * cleanup, not a migration.
 *
 * DRY RUN BY DEFAULT. Pass --commit to actually delete.
 *
 *   ./node_modules/.bin/wp-playground-cli php \
 *     --site-url=http://localhost:9400 \
 *     --mount-before-install=./local/wordpress:/wordpress \
 *     --mount=./theme:/wordpress/wp-content/themes/mytapestore \
 *     --mount=./scripts:/wordpress/mts-scripts \
 *     --wordpress-install-mode=install-from-existing-files \
 *     -- /wordpress/mts-scripts/prepare-production.php --commit
 *
 * @package mytapestore
 */

if ( ! defined( 'ABSPATH' ) ) {
	require_once '/wordpress/wp-load.php';
}

$mts_commit = in_array( '--commit', (array) ( $argv ?? array() ), true );

echo "=== production preparation ===\n";
echo $mts_commit ? "MODE: COMMIT — changes will be written\n\n" : "MODE: DRY RUN — nothing will be changed (pass --commit)\n\n";

$mts_did = static function ( string $what ) use ( $mts_commit ): void {
	echo ( $mts_commit ? '  removed  ' : '  would remove  ' ) . $what . "\n";
};

/* ------------------------------------------------- 1. the demo mu-plugin */

echo "demo runtime:\n";
$mts_mu = WP_CONTENT_DIR . '/mu-plugins/00-mts-demo.php';
if ( file_exists( $mts_mu ) ) {
	$mts_did( '00-mts-demo.php  (forces noindex sitewide + CDN media)' );
	if ( $mts_commit ) {
		unlink( $mts_mu );
	}
} else {
	echo "  not present — good\n";
}

/* ------------------------------------------------------- 2. test orders */

echo "\ntest orders:\n";
$mts_orders = wc_get_orders( array( 'limit' => -1, 'return' => 'ids', 'status' => 'any' ) );
if ( $mts_orders ) {
	$mts_did( count( $mts_orders ) . ' order(s): #' . implode( ', #', array_slice( $mts_orders, 0, 12 ) ) );
	if ( $mts_commit ) {
		foreach ( $mts_orders as $mts_id ) {
			$mts_order = wc_get_order( $mts_id );
			if ( $mts_order ) {
				$mts_order->delete( true );
			}
		}
	}
} else {
	echo "  none\n";
}

/* ----------------------------------------------------- 3. test accounts */

echo "\ntest accounts:\n";
foreach ( array( 'mtsreview' ) as $mts_login ) {
	$mts_user = get_user_by( 'login', $mts_login );
	if ( ! $mts_user ) {
		echo "  {$mts_login}: not present\n";
		continue;
	}
	$mts_did( "user {$mts_login} (#{$mts_user->ID})" );
	if ( $mts_commit ) {
		require_once ABSPATH . 'wp-admin/includes/user.php';
		wp_delete_user( $mts_user->ID );
	}
}

/* ------------------------------------------- 4. placeholder gateway data */

echo "\nplaceholder gateway settings:\n";
foreach ( array( 'stripe', 'stripe_afterpay_clearpay', 'eh_paypal_express', 'ppcp' ) as $mts_gw ) {
	$mts_key = 'woocommerce_' . $mts_gw . '_settings';
	if ( null === get_option( $mts_key, null ) ) {
		continue;
	}
	$mts_did( $mts_key );
	if ( $mts_commit ) {
		delete_option( $mts_key );
	}
}
delete_option( 'mts_gateway_order_set' );
delete_option( 'mts_offline_gateways_retired' );

/* --------------------------------------------------------- 5. transients */

echo "\ncaches:\n";
global $wpdb;
$mts_n = (int) $wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE '\\_transient\\_mts\\_%' OR option_name LIKE '\\_transient\\_timeout\\_mts\\_%'" );
echo ( $mts_commit ? '  cleared ' : '  would clear ' ) . "{$mts_n} theme transient row(s)\n";

/* ----------------------------------------------------- what is left to do */

echo "\n--- STILL REQUIRES A HUMAN ---\n";
echo "  · delete theme/inc/payment-gateways.php and its require in functions.php\n";
echo "    (placeholder gateways — orders never reach 'processing')\n";
echo "  · install and configure the real Stripe and PayPal plugins\n";
echo "  · place one real transaction end to end before opening traffic\n";
echo "  · decide on the pre-ticked consent boxes:\n";
echo "    add_filter( 'mts_consent_default', '__return_false' ) to un-tick\n";
echo "  · reconcile prices against the live catalogue product by product\n";

echo "\n" . ( $mts_commit ? "done.\n" : "dry run only — nothing was changed.\n" );
