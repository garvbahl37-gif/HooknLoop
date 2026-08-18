<?php
/**
 * Saved addresses — the Shopify addresses page (sections/mts-customers-addresses.liquid).
 *
 * Renders INSIDE the account shell (myaccount/my-account.php →
 * .woocommerce-MyAccount-content), so this file starts at .acct__panel and never
 * emits .wrap or .acct — the shell owns the two-column grid and the sidebar.
 * .acct__panel is the `min-width: 0` that stops a long address line blowing the
 * 256px/1fr track out; without it the sidebar gets squeezed off-screen.
 *
 * WHERE THIS DIVERGES FROM SHOPIFY, AND WHY IT HAS TO.
 * Shopify stores an arbitrary list of addresses with one marked default, so its
 * page is a list with add/edit/delete forms toggled open by JavaScript. Woo has
 * no such list: it has exactly two NAMED addresses per customer (billing and
 * shipping), each edited on its own /my-account/edit-address/{name}/ page. So
 * the "Default" tag has nothing to point at and the JS toggles have nothing to
 * toggle — assets/js carries no address handler in this theme, and shipping
 * markup that depends on a script nobody wrote is markup that renders as a dead
 * button. The cards keep the design's .mts-address-grid shell and each one gets
 * the panel-head treatment (title + action) that Shopify puts on section
 * headers, which is the same shape as Woo's stock <header> + <a class="edit">.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

$mts_customer_id = get_current_user_id();

/*
 * Which address types exist is a STORE SETTING, not a layout decision. With
 * "ship to billing address only" on, or shipping switched off entirely, there is
 * no shipping address to edit — hardcoding two cards would offer a form that
 * saves nowhere. The filter is kept because subscription and B2B plugins add
 * their own address types through it and would otherwise vanish from the page.
 */
if ( ! wc_ship_to_billing_address_only() && wc_shipping_enabled() ) {
	$mts_address_types = apply_filters(
		'woocommerce_my_account_get_addresses',
		array(
			'billing'  => __( 'Billing address', 'mytapestore' ),
			'shipping' => __( 'Shipping address', 'mytapestore' ),
		),
		$mts_customer_id
	);
} else {
	$mts_address_types = apply_filters(
		'woocommerce_my_account_get_addresses',
		array(
			'billing' => __( 'Billing address', 'mytapestore' ),
		),
		$mts_customer_id
	);
}
?>

<div class="acct__panel">

	<h2><?php esc_html_e( 'Addresses', 'mytapestore' ); ?></h2>

	<p class="acct__lede">
		<?php
		/*
		 * The filter survives with the design's sentence as its default. Address
		 * validation and dropshipping plugins replace this line to explain their
		 * own rules, and a store that has one of those installed reads as broken
		 * when the explanation silently disappears. wp_kses_post rather than
		 * esc_html because the replacements are routinely a sentence with a link.
		 */
		echo wp_kses_post( apply_filters(
			'woocommerce_my_account_my_address_description',
			esc_html__( 'Saved addresses are offered at checkout.', 'mytapestore' )
		) );
		?>
	</p>

	<?php if ( $mts_address_types ) : ?>
		<div class="mts-address-grid">
			<?php foreach ( $mts_address_types as $mts_name => $mts_title ) : ?>
				<?php
				// Empty string when the customer has never filled this address in.
				$mts_formatted = wc_get_account_formatted_address( $mts_name );
				?>
				<div class="mts-address woocommerce-Address">

					<div class="acct__panel-head woocommerce-Address-title">
						<h3><?php echo esc_html( $mts_title ); ?></h3>
						<?php
						/*
						 * wc_get_endpoint_url() and nothing else. The endpoint slug is
						 * translatable and renameable in WooCommerce → Advanced, so a
						 * hand-written /my-account/edit-address/billing/ is a 404 on any
						 * store that touched those settings, or on any non-English store.
						 */
						?>
						<a class="acct__viewall" href="<?php echo esc_url( wc_get_endpoint_url( 'edit-address', $mts_name ) ); ?>"
						   aria-label="<?php
							echo esc_attr( sprintf(
								/* translators: %s: address type, e.g. "Billing address" */
								$mts_formatted ? __( 'Edit %s', 'mytapestore' ) : __( 'Add %s', 'mytapestore' ),
								$mts_title
							) );
							?>">
							<?php echo esc_html( $mts_formatted ? __( 'Edit', 'mytapestore' ) : __( 'Add', 'mytapestore' ) ); ?>
							<?php mts_the_icon( 'chevronRight', 14 ); ?>
						</a>
					</div>

					<address>
						<?php
						if ( $mts_formatted ) {
							// Already a formatted, <br>-separated block from Woo.
							echo wp_kses_post( $mts_formatted );
						} else {
							esc_html_e( 'No address saved yet.', 'mytapestore' );
						}

						/*
						 * Since 8.7.0 this is where address-validation and
						 * "verified by" plugins print their badge. It must stay
						 * inside the loop and keep receiving $mts_name — a plugin
						 * that gets no address type cannot tell billing from
						 * shipping and prints its badge on both.
						 */
						do_action( 'woocommerce_my_account_after_my_address', $mts_name );
						?>
					</address>

				</div>
			<?php endforeach; ?>
		</div>
	<?php else : ?>
		<?php
		/*
		 * Only reachable when a plugin filters every address type away. Stock Woo
		 * renders an empty <div> here; the design has a real empty state, and an
		 * account page that shows a heading over blank space reads as a failed
		 * page load rather than a store with no address types.
		 */
		?>
		<div class="col__empty">
			<?php mts_the_icon( 'mapPin', 34 ); ?>
			<p><?php esc_html_e( 'No addresses saved yet. Add one and it will be offered at checkout.', 'mytapestore' ); ?></p>
		</div>
	<?php endif; ?>

</div>
