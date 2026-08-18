<?php
/**
 * Edit one address — the Shopify address form (snippets/mts-address-fields.liquid).
 *
 * Renders inside the account shell, so this file starts at .acct__panel. The
 * form itself takes .contact__form, which is how a bare form gets the design's
 * card + bordered-input treatment everywhere else in this theme (see the contact
 * page): .contact__form label and .contact__form input are descendant rules, so
 * they reach WooCommerce's own <label> / <input> without anything being renamed.
 *
 * EVERY FIELD IS STILL woocommerce_form_field(). Shopify's snippet hand-writes
 * ten inputs and a country <select>; that is not portable here. Woo's country and
 * state fields carry class="country_to_state" and the state field is REBUILT by
 * country-select.js on every country change — it is a <select> for Australia, a
 * plain <input> for a country with no states, and absent entirely for others.
 * Hand-writing them freezes whatever shape the page loaded with, and a customer
 * who switches country gets a state field that no longer matches, fails
 * validation, and reports it as "it won't save my address". woocommerce_form_field()
 * is also the only thing that fires woocommerce_form_field_{$type} and applies
 * the locale rules from woocommerce_get_country_locale (which hide postcode in
 * Ireland, require state in the US, and so on).
 *
 * THE TWO THINGS THAT FAIL SILENTLY IF LOST.
 * WC_Form_Handler::save_address() bails with `return` — no notice, no error, the
 * page simply reloads looking like it worked — when either the
 * woocommerce-edit-address-nonce or the hidden input[name="action"][value="edit_address"]
 * is missing. The hidden input is the easy one to drop while re-marking-up a
 * <p> into a flex row, so it is deliberately kept next to the nonce.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hook - woocommerce_before_edit_account_address_form.
 */
do_action( 'woocommerce_before_edit_account_address_form' );

if ( ! $load_address ) {
	/*
	 * /my-account/edit-address/ with no type is the index, and Woo renders the
	 * address list through this same template. Not a redirect — my-address.php
	 * has to be reachable from here or the "Addresses" nav item lands on a blank
	 * page.
	 */
	wc_get_template( 'myaccount/my-address.php' );
} else {
	$mts_page_title = ( 'billing' === $load_address )
		? __( 'Billing address', 'mytapestore' )
		: __( 'Shipping address', 'mytapestore' );

	$mts_lede = ( 'billing' === $load_address )
		? __( 'Where your invoice and order confirmations are addressed.', 'mytapestore' )
		: __( 'Where your orders are delivered. Offered at checkout by default.', 'mytapestore' );
	?>

	<div class="acct__panel">

		<h2>
			<?php
			/*
			 * wp_kses_post, not esc_html: the stock template echoes this filter raw
			 * and plugins pass markup through it (a country flag, a "verified" mark).
			 * Escaping it to text would print their tags on the page; dropping the
			 * filter would delete their heading.
			 */
			echo wp_kses_post( apply_filters( 'woocommerce_my_account_edit_address_title', $mts_page_title, $load_address ) );
			?>
		</h2>
		<p class="acct__lede"><?php echo esc_html( $mts_lede ); ?></p>

		<form method="post" novalidate class="contact__form mts-address-form">

			<?php
			/*
			 * No action attribute, exactly as stock. The form posts to the URL it
			 * was served from, which is the only URL where WC_Form_Handler is
			 * listening for this nonce. Pointing it at the account root instead
			 * loses $load_address and the handler writes billing fields over the
			 * shipping address.
			 */
			?>
			<div class="woocommerce-address-fields">

				<?php
				/*
				 * Dynamic hook — woocommerce_before_edit_address_form_billing or
				 * ..._shipping. Address-autocomplete and B2B plugins mount here and
				 * need to know which of the two forms they are decorating.
				 */
				do_action( "woocommerce_before_edit_address_form_{$load_address}" );
				?>

				<div class="woocommerce-address-fields__field-wrapper">
					<?php
					foreach ( $address as $mts_key => $mts_field ) {
						woocommerce_form_field( $mts_key, $mts_field, wc_get_post_data_by_key( $mts_key, $mts_field['value'] ) );
					}
					?>
				</div>

				<?php do_action( "woocommerce_after_edit_address_form_{$load_address}" ); ?>

				<p class="acct__form-actions">
					<button type="submit" class="btn btn--brand btn--lg" name="save_address"
							value="<?php esc_attr_e( 'Save address', 'mytapestore' ); ?>">
						<?php mts_the_icon( 'check', 16 ); ?>
						<?php esc_html_e( 'Save address', 'mytapestore' ); ?>
					</button>

					<a class="btn btn--ghost" href="<?php echo esc_url( wc_get_endpoint_url( 'edit-address' ) ); ?>">
						<?php esc_html_e( 'Cancel', 'mytapestore' ); ?>
					</a>

					<?php
					/*
					 * Both of these are load-bearing and both fail silently. Keep them
					 * together and keep them inside the form — hidden inputs generate
					 * no box, so the flex row is unaffected by their being here.
					 */
					wp_nonce_field( 'woocommerce-edit_address', 'woocommerce-edit-address-nonce' );
					?>
					<input type="hidden" name="action" value="edit_address" />
				</p>

			</div>

		</form>

	</div>

	<?php
}

/**
 * Hook - woocommerce_after_edit_account_address_form.
 */
do_action( 'woocommerce_after_edit_account_address_form' );
