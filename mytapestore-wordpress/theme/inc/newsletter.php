<?php
/**
 * Newsletter signup — the handler the two signup forms never had.
 *
 * The footer form and the popup both POSTed to the homepage with the address in
 * `mts_newsletter_email`, and NOTHING anywhere read that field. So on every page
 * of the store a visitor could type their address, press Subscribe, watch the
 * page reload, and be told nothing — while the address was discarded. A form
 * that silently throws away what it collects is worse than no form: the visitor
 * believes they subscribed and never hears from you again.
 *
 * WHAT THIS DOES, AND WHAT IT DELIBERATELY DOES NOT
 *
 * It stores the address locally, in a private post type, so nothing is lost
 * while the mailing-list provider is being decided (this repo carries Klaviyo,
 * Brevo and Mailchimp work in parallel). It does NOT pretend to be a mailing
 * list: there is no send, no double opt-in email, no list management. When a
 * provider is chosen, hook `mts_newsletter_subscribed` and push the address on;
 * the local record then becomes the audit trail rather than the system of record.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

const MTS_SUBSCRIBER_POST_TYPE = 'mts_subscriber';

/**
 * A private post type for subscribers.
 *
 * Not an option array: an option is a single row that every write has to read,
 * merge and re-serialise, which loses addresses the moment two people subscribe
 * in the same second. Posts are individually addressable, searchable in the
 * admin, and exportable without a migration.
 *
 * `public => false` keeps them out of the front end entirely — a subscriber
 * record must never become a URL.
 */
function mts_register_subscriber_type(): void {
	register_post_type( MTS_SUBSCRIBER_POST_TYPE, array(
		'labels'              => array(
			'name'          => __( 'Subscribers', 'mytapestore' ),
			'singular_name' => __( 'Subscriber', 'mytapestore' ),
		),
		'public'              => false,
		'show_ui'             => true,
		'show_in_menu'        => 'woocommerce',
		'exclude_from_search' => true,
		'publicly_queryable'  => false,
		'has_archive'         => false,
		'rewrite'             => false,
		'supports'            => array( 'title' ),
		'capability_type'     => 'post',
		'map_meta_cap'        => true,
	) );
}
add_action( 'init', 'mts_register_subscriber_type' );

/**
 * Has this address already subscribed?
 *
 * Matched on the post title, which IS the address — a second signup from the
 * same person is a no-op that still reports success, because telling someone
 * "you are already on this list" is information about another person's data
 * when the form is on a public page.
 */
function mts_subscriber_exists( string $email ): bool {
	$existing = get_posts( array(
		'post_type'              => MTS_SUBSCRIBER_POST_TYPE,
		'post_status'            => 'any',
		'title'                  => $email,
		'posts_per_page'         => 1,
		'fields'                 => 'ids',
		'no_found_rows'          => true,
		'update_post_meta_cache' => false,
		'update_post_term_cache' => false,
	) );

	return ! empty( $existing );
}

/**
 * Handle a signup POST from either form.
 *
 * Runs on `init` so the redirect happens before any output — a redirect after
 * the header has been sent is a "headers already sent" warning, not a redirect.
 */
function mts_handle_newsletter_signup(): void {
	if ( ! isset( $_POST['mts_newsletter_email'] ) ) {
		return;
	}

	$nonce = isset( $_POST['mts_newsletter_nonce'] ) ? sanitize_text_field( wp_unslash( $_POST['mts_newsletter_nonce'] ) ) : '';
	if ( ! wp_verify_nonce( $nonce, 'mts_newsletter' ) ) {
		mts_newsletter_redirect( 'error' );
	}

	$email = sanitize_email( wp_unslash( $_POST['mts_newsletter_email'] ) );

	if ( ! is_email( $email ) ) {
		mts_newsletter_redirect( 'invalid' );
	}

	$source = isset( $_POST['mts_newsletter_source'] )
		? sanitize_key( wp_unslash( $_POST['mts_newsletter_source'] ) )
		: 'footer';

	if ( ! mts_subscriber_exists( $email ) ) {
		$id = wp_insert_post( array(
			'post_type'   => MTS_SUBSCRIBER_POST_TYPE,
			'post_status' => 'publish',
			'post_title'  => $email,
		) );

		if ( $id && ! is_wp_error( $id ) ) {
			update_post_meta( $id, '_mts_source', $source );
			update_post_meta( $id, '_mts_signed_up', current_time( 'mysql' ) );
		}
	}

	/**
	 * Push the address to the mailing-list provider.
	 *
	 * @param string $email  The subscriber's address.
	 * @param string $source 'footer' or 'popup'.
	 */
	do_action( 'mts_newsletter_subscribed', $email, $source );

	mts_newsletter_redirect( 'ok' );
}
add_action( 'init', 'mts_handle_newsletter_signup', 20 );

/**
 * Send the visitor back where they came from, carrying the outcome.
 *
 * POST-redirect-GET: without the redirect, a refresh re-submits the form and
 * the browser shows the "confirm form resubmission" dialog.
 */
function mts_newsletter_redirect( string $status ): void {
	$back = wp_get_referer() ?: home_url( '/' );
	wp_safe_redirect( add_query_arg( 'newsletter', $status, remove_query_arg( 'newsletter', $back ) ) . '#newsletter' );
	exit;
}

/**
 * The outcome of the signup on this request, or '' when there wasn't one.
 */
function mts_newsletter_status(): string {
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- display-only, and the write it reports was already nonce-checked.
	$status = isset( $_GET['newsletter'] ) ? sanitize_key( wp_unslash( $_GET['newsletter'] ) ) : '';
	return in_array( $status, array( 'ok', 'invalid', 'error' ), true ) ? $status : '';
}

/**
 * The message to show for that outcome.
 */
function mts_newsletter_message(): string {
	switch ( mts_newsletter_status() ) {
		case 'ok':
			return __( "You're on the list — we'll be in touch.", 'mytapestore' );
		case 'invalid':
			return __( 'That address does not look right. Please check it and try again.', 'mytapestore' );
		case 'error':
			return __( 'Something went wrong. Please try again.', 'mytapestore' );
	}
	return '';
}
