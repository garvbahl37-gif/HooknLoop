<?php
/**
 * A customer account for reviewing the signed-in pages.
 *
 * Orders, Downloads, Addresses, Account details and the Wishlist cannot be
 * looked at signed out, so internal review needs one account that always exists.
 * Credentials are printed rather than hidden — this is a draft on a local
 * machine, not a live store, and the alternative is a reviewer who cannot get in.
 *
 * Run (note --site-url; see fix-site-url.php for why):
 *   ./node_modules/.bin/wp-playground-cli php \
 *     --site-url=http://localhost:9400 \
 *     --mount-before-install=./local/wordpress:/wordpress \
 *     --mount=./scripts:/wordpress/mts-scripts \
 *     --wordpress-install-mode=install-from-existing-files \
 *     -- /wordpress/mts-scripts/make-review-user.php
 *
 * Idempotent.
 *
 * @package mytapestore
 */

if ( ! defined( 'ABSPATH' ) ) {
	require_once '/wordpress/wp-load.php';
}

$mts_login = 'mtsreview';
$mts_email = 'review@mytapestore.test';
$mts_pass  = 'ReviewPass!2026';

$mts_user = get_user_by( 'login', $mts_login );

if ( ! $mts_user ) {
	$mts_id = wp_insert_user( array(
		'user_login' => $mts_login,
		'user_email' => $mts_email,
		'user_pass'  => $mts_pass,
		'first_name' => 'Review',
		'last_name'  => 'Account',
		'role'       => 'customer',
	) );

	if ( is_wp_error( $mts_id ) ) {
		fwrite( STDERR, $mts_id->get_error_message() . "\n" );
		exit( 1 );
	}

	echo "created user #{$mts_id}\n";
} else {
	$mts_id = (int) $mts_user->ID;
	wp_set_password( $mts_pass, $mts_id );
	echo "reset password on existing user #{$mts_id}\n";
}

// A billing address, so the Addresses panel has something in it to review.
foreach ( array(
	'billing_first_name' => 'Review',
	'billing_last_name'  => 'Account',
	'billing_company'    => 'My Tape Store',
	'billing_address_1'  => '12 Wattle Road',
	'billing_city'       => 'Dandenong South',
	'billing_state'      => 'VIC',
	'billing_postcode'   => '3175',
	'billing_country'    => 'AU',
	'billing_email'      => $mts_email,
	'billing_phone'      => '0402 416 298',
) as $mts_key => $mts_value ) {
	update_user_meta( $mts_id, $mts_key, $mts_value );
}

echo "login:    {$mts_login}\n";
echo "email:    {$mts_email}\n";
echo "password: {$mts_pass}\n";
