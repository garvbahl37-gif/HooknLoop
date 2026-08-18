<?php
/**
 * Contact form handler.
 *
 * The contact page had a form once: a copy of Contact Form 7's RENDERED output,
 * pasted into the page body from the old site. Contact Form 7 is not installed
 * here and the form it named (id 5) is a page called "Shop", so it had no
 * <form> element and empty field wrappers — three labels and a stray textarea.
 * inc/legacy-shortcodes.php now strips that corpse, which left the contact page
 * with no way to contact anybody.
 *
 * This is a real form: validated, nonce-checked, rate-limited, and it sends mail
 * through wp_mail() to the store address in mts_contact(). Every submission is
 * also stored, because a store that loses an enquiry because SMTP was
 * misconfigured that week has still lost the enquiry.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

const MTS_ENQUIRY_POST_TYPE = 'mts_enquiry';

/**
 * Private post type for enquiries — the durable record behind the email.
 */
function mts_register_enquiry_type(): void {
	register_post_type( MTS_ENQUIRY_POST_TYPE, array(
		'labels'              => array(
			'name'          => __( 'Enquiries', 'mytapestore' ),
			'singular_name' => __( 'Enquiry', 'mytapestore' ),
		),
		'public'              => false,
		'show_ui'             => true,
		'show_in_menu'        => 'woocommerce',
		'exclude_from_search' => true,
		'publicly_queryable'  => false,
		'has_archive'         => false,
		'rewrite'             => false,
		'supports'            => array( 'title', 'editor' ),
		'capability_type'     => 'post',
		'map_meta_cap'        => true,
	) );
}
add_action( 'init', 'mts_register_enquiry_type' );

/**
 * Handle a contact submission.
 *
 * On `init`, before output, so the POST-redirect-GET can actually redirect.
 */
function mts_handle_contact_form(): void {
	if ( ! isset( $_POST['mts_contact_submit'] ) ) {
		return;
	}

	$nonce = isset( $_POST['mts_contact_nonce'] ) ? sanitize_text_field( wp_unslash( $_POST['mts_contact_nonce'] ) ) : '';
	if ( ! wp_verify_nonce( $nonce, 'mts_contact' ) ) {
		mts_contact_redirect( 'error' );
	}

	/*
	 * Honeypot. A field no human sees and every naive bot fills. Checked before
	 * anything expensive, and answered with the SUCCESS state — telling a bot it
	 * was detected just teaches the next attempt.
	 */
	if ( ! empty( $_POST['mts_website'] ) ) {
		mts_contact_redirect( 'sent' );
	}

	$name    = sanitize_text_field( wp_unslash( $_POST['mts_contact_name'] ?? '' ) );
	$email   = sanitize_email( wp_unslash( $_POST['mts_contact_email'] ?? '' ) );
	$subject = sanitize_text_field( wp_unslash( $_POST['mts_contact_subject'] ?? '' ) );
	$message = sanitize_textarea_field( wp_unslash( $_POST['mts_contact_message'] ?? '' ) );

	if ( '' === $name || '' === $message || ! is_email( $email ) ) {
		mts_contact_redirect( 'invalid' );
	}

	/*
	 * One submission per address per minute. Not security — it is what stops a
	 * double-click, or an impatient refresh, filing the same enquiry twice and
	 * making the inbox look like a queue.
	 */
	$throttle = 'mts_contact_' . md5( $email );
	if ( get_transient( $throttle ) ) {
		mts_contact_redirect( 'sent' );
	}
	set_transient( $throttle, 1, MINUTE_IN_SECONDS );

	$contact = mts_contact();
	$to      = $contact['email'] ?: get_option( 'admin_email' );
	$subject = $subject ?: __( 'Website enquiry', 'mytapestore' );

	$enquiry_id = wp_insert_post( array(
		'post_type'    => MTS_ENQUIRY_POST_TYPE,
		'post_status'  => 'publish',
		/* translators: 1: sender name, 2: subject */
		'post_title'   => sprintf( __( '%1$s — %2$s', 'mytapestore' ), $name, $subject ),
		'post_content' => $message,
	) );

	if ( $enquiry_id && ! is_wp_error( $enquiry_id ) ) {
		update_post_meta( $enquiry_id, '_mts_name', $name );
		update_post_meta( $enquiry_id, '_mts_email', $email );
		update_post_meta( $enquiry_id, '_mts_subject', $subject );
	}

	$body = sprintf(
		"%s\n\n%s: %s\n%s: %s\n\n%s\n",
		__( 'New enquiry from the website.', 'mytapestore' ),
		__( 'Name', 'mytapestore' ),
		$name,
		__( 'Email', 'mytapestore' ),
		$email,
		$message
	);

	/*
	 * Reply-To is the customer; From stays on this domain. Sending as the
	 * customer's address is what gets a site's mail marked as spoofed and
	 * silently binned by the receiving server.
	 */
	$headers = array(
		'Content-Type: text/plain; charset=UTF-8',
		'Reply-To: ' . $name . ' <' . $email . '>',
	);

	wp_mail( $to, '[' . get_bloginfo( 'name' ) . '] ' . $subject, $body, $headers );

	/**
	 * Fires after an enquiry is recorded and mailed.
	 *
	 * @param int    $enquiry_id The stored enquiry.
	 * @param string $email      The sender.
	 */
	do_action( 'mts_contact_submitted', (int) $enquiry_id, $email );

	mts_contact_redirect( 'sent' );
}
add_action( 'init', 'mts_handle_contact_form', 20 );

/** POST-redirect-GET, so a refresh cannot re-send the enquiry. */
function mts_contact_redirect( string $status ): void {
	$back = wp_get_referer() ?: home_url( '/contact-us/' );
	wp_safe_redirect( add_query_arg( 'contact', $status, remove_query_arg( 'contact', $back ) ) . '#contact-form' );
	exit;
}

/** The outcome of a submission on this request, or ''. */
function mts_contact_status(): string {
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- display-only; the write it reports was nonce-checked.
	$status = isset( $_GET['contact'] ) ? sanitize_key( wp_unslash( $_GET['contact'] ) ) : '';
	return in_array( $status, array( 'sent', 'invalid', 'error' ), true ) ? $status : '';
}
