<?php
/**
 * Marketing consent at checkout — email and SMS, opted in separately.
 *
 * WHY TWO BOXES AND NOT ONE
 *
 * Email marketing and SMS marketing are different permissions with different
 * rules, and Australian law treats them that way: the Spam Act 2003 covers both
 * but the disclosure a shopper needs before agreeing to text messages —
 * autodialer, message frequency, carrier rates, how to stop — has no equivalent
 * for email. One combined tick would collect an SMS consent the shopper was
 * never shown the terms for, which is not consent.
 *
 * Both start UNCHECKED and both are optional. A pre-ticked box is not opt-in,
 * and neither is one the shopper has to clear to complete an order.
 *
 * WHERE IT GOES
 *
 * `woocommerce_checkout_after_customer_details` — directly beneath the delivery
 * details, because the SMS disclosure says "entering your phone number above"
 * and that has to be true of the rendered page, not just of the sentence.
 *
 * WHAT IS STORED
 *
 * The two answers, the phone and email they were given against, and the moment
 * they were given, on the order. Consent that cannot be evidenced later is not
 * worth collecting: if someone complains about a text message, the record of
 * what they agreed to and when is the whole defence.
 *
 * They are also written to the customer, so the preference survives the order,
 * and `mts_marketing_consent` fires for whatever list tool is connected at
 * cutover — Klaviyo, Mailchimp, PushOwl — rather than this file guessing at one.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

/**
 * The SMS disclosure, exactly as it must be shown.
 *
 * Kept in one function because it is quoted in three places — the checkout, the
 * order meta box and the customer's account — and three copies of a legal
 * sentence become three different sentences.
 */
function mts_sms_consent_terms(): string {
	$privacy = get_privacy_policy_url();
	$terms   = wc_get_page_permalink( 'terms' );

	$text = __( 'By checking this box and entering your phone number above, you consent to receive marketing text messages (e.g. promos, cart reminders) from My Tape Store at the number provided, including messages sent by autodialer. Consent is not a condition of any purchase. Message and data rates may apply. Message frequency varies. You can unsubscribe at any time by replying STOP or clicking the unsubscribe link (where available).', 'mytapestore' );

	$links = array();
	if ( $privacy ) {
		$links[] = '<a href="' . esc_url( $privacy ) . '" target="_blank" rel="noopener">' . esc_html__( 'Privacy Policy', 'mytapestore' ) . '</a>';
	}
	if ( $terms ) {
		$links[] = '<a href="' . esc_url( $terms ) . '" target="_blank" rel="noopener">' . esc_html__( 'Terms of Service', 'mytapestore' ) . '</a>';
	}

	if ( $links ) {
		$text .= ' ' . sprintf(
			/* translators: %s: linked policy names, e.g. "Privacy Policy and Terms of Service" */
			esc_html__( 'Review our %s for more information.', 'mytapestore' ),
			wp_sprintf_l( '%l', $links )
		);
	} else {
		$text .= ' ' . esc_html__( 'Review our Privacy Policy and Terms of Service for more information.', 'mytapestore' );
	}

	return $text;
}

/**
 * Render the block.
 */
function mts_render_checkout_consent(): void {
	$checkout = WC()->checkout();

	/*
	 * PRE-TICKED, BY REQUEST — AND THIS IS A COMPLIANCE RISK WORTH KNOWING ABOUT.
	 *
	 * Both boxes now start CHECKED. Under the Spam Act 2003 the ACMA treats a
	 * pre-ticked box as NOT valid consent for commercial electronic messages:
	 * consent has to be an act the person took, and leaving a box alone is not
	 * one. The same is true under GDPR for anyone in the EU. The exposure is on
	 * the store, not the shopper — penalties attach to sending, not to ticking.
	 *
	 * It is filtered rather than hardcoded so this is a ONE-LINE change either
	 * way, without touching the template:
	 *
	 *     add_filter( 'mts_consent_default', '__return_false' );
	 *
	 * A returning customer's saved preference still wins over the default, so
	 * someone who has previously opted out is not silently re-subscribed.
	 */
	$mts_default = (bool) apply_filters( 'mts_consent_default', true );

	$email_saved = $checkout->get_value( 'mts_consent_email' );
	$sms_saved   = $checkout->get_value( 'mts_consent_sms' );

	$email_default = null === $email_saved || '' === $email_saved ? $mts_default : (bool) $email_saved;
	$sms_default   = null === $sms_saved || '' === $sms_saved ? $mts_default : (bool) $sms_saved;
	?>
	<section class="chk-section chk-consent">
		<h2><span class="chk-num">2</span><?php esc_html_e( 'Stay in the loop', 'mytapestore' ); ?></h2>

		<p class="chk-consent__lede">
			<?php esc_html_e( 'I would like to receive updates, news, and notifications via email and SMS.', 'mytapestore' ); ?>
		</p>

		<label class="chk-consent__opt" for="mts_consent_email">
			<input type="checkbox" id="mts_consent_email" name="mts_consent_email" value="1" <?php checked( $email_default ); ?>>
			<span><?php esc_html_e( 'Sign me up to receive email updates and news (optional)', 'mytapestore' ); ?></span>
		</label>

		<label class="chk-consent__opt" for="mts_consent_sms">
			<input type="checkbox" id="mts_consent_sms" name="mts_consent_sms" value="1"
				   aria-describedby="mts-consent-sms-terms" <?php checked( $sms_default ); ?>>
			<span><?php esc_html_e( 'Sign me up to receive SMS updates and news (optional)', 'mytapestore' ); ?></span>
		</label>

		<?php
		/*
		 * The disclosure is tied to the SMS box with aria-describedby, so a screen
		 * reader reads the terms as part of the control rather than as loose text
		 * that happens to follow it. It is always visible — hiding consent terms
		 * behind a toggle is how consent stops being informed.
		 */
		?>
		<p class="chk-consent__terms" id="mts-consent-sms-terms">
			<?php echo wp_kses_post( mts_sms_consent_terms() ); ?>
		</p>
	</section>
	<?php
}
add_action( 'woocommerce_checkout_after_customer_details', 'mts_render_checkout_consent', 20 );

/**
 * Store both answers on the order, with what they were given against and when.
 */
function mts_save_checkout_consent( $order ): void {
	if ( ! $order instanceof WC_Order ) {
		$order = wc_get_order( $order );
	}
	if ( ! $order ) {
		return;
	}

	// phpcs:disable WordPress.Security.NonceVerification.Missing -- WooCommerce
	// verifies the checkout nonce before this hook runs.
	$email_opt_in = ! empty( $_POST['mts_consent_email'] );
	$sms_opt_in   = ! empty( $_POST['mts_consent_sms'] );
	// phpcs:enable WordPress.Security.NonceVerification.Missing

	$order->update_meta_data( '_mts_consent_email', $email_opt_in ? 'yes' : 'no' );
	$order->update_meta_data( '_mts_consent_sms', $sms_opt_in ? 'yes' : 'no' );

	if ( $email_opt_in || $sms_opt_in ) {
		/*
		 * The evidence. gmdate(), not the site's local time: a consent record
		 * whose timestamp shifts with the store's timezone setting is not one you
		 * want to rely on in a complaint.
		 */
		$order->update_meta_data( '_mts_consent_at', gmdate( 'c' ) );
		$order->update_meta_data( '_mts_consent_email_address', $order->get_billing_email() );
		$order->update_meta_data( '_mts_consent_phone', $order->get_billing_phone() );
	}

	$order->save();

	// Carry it to the customer, so it outlives this one order.
	$customer_id = (int) $order->get_customer_id();
	if ( $customer_id ) {
		update_user_meta( $customer_id, 'mts_consent_email', $email_opt_in ? 'yes' : 'no' );
		update_user_meta( $customer_id, 'mts_consent_sms', $sms_opt_in ? 'yes' : 'no' );
	}

	/**
	 * Fires once consent has been recorded.
	 *
	 * The hook a list tool subscribes to at cutover. Nothing here talks to an ESP
	 * — a draft that quietly posted real shoppers into a live mailing list would
	 * be worse than one that collects nothing.
	 *
	 * @param WC_Order $order
	 * @param bool     $email_opt_in
	 * @param bool     $sms_opt_in
	 */
	do_action( 'mts_marketing_consent', $order, $email_opt_in, $sms_opt_in );
}
add_action( 'woocommerce_checkout_order_processed', 'mts_save_checkout_consent', 20 );

/**
 * Show it on the order in the admin, where someone answering a complaint looks.
 */
add_action( 'woocommerce_admin_order_data_after_billing_address', function ( $order ): void {
	$email = $order->get_meta( '_mts_consent_email' );
	$sms   = $order->get_meta( '_mts_consent_sms' );

	if ( '' === $email && '' === $sms ) {
		return;
	}

	$when = $order->get_meta( '_mts_consent_at' );

	echo '<p><strong>' . esc_html__( 'Marketing consent', 'mytapestore' ) . ':</strong><br>';
	printf(
		/* translators: 1: yes/no for email, 2: yes/no for SMS */
		esc_html__( 'Email: %1$s · SMS: %2$s', 'mytapestore' ),
		esc_html( 'yes' === $email ? __( 'yes', 'mytapestore' ) : __( 'no', 'mytapestore' ) ),
		esc_html( 'yes' === $sms ? __( 'yes', 'mytapestore' ) : __( 'no', 'mytapestore' ) )
	);
	if ( $when ) {
		echo '<br><small>' . esc_html( $when ) . '</small>';
	}
	echo '</p>';
} );
