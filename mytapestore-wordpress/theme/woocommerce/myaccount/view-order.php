<?php
/**
 * A single order — the Shopify order page (sections/mts-customers-order.liquid).
 *
 * Renders INSIDE the account shell (myaccount/my-account.php →
 * .woocommerce-MyAccount-content), so this file starts at .acct__panel and never
 * emits .wrap, .acct, .page-hero or .page-prose. Shopify's order page is a
 * standalone page with a dark hero band above it; here the sidebar is beside the
 * content, and a full-bleed ink band dropped into a 1fr grid cell would be a
 * dark rectangle floating in the middle of the account layout. The hero's
 * eyebrow/h1/date becomes the panel head + .acct__lede, which is the same
 * information in the vocabulary this column actually has.
 *
 * do_action( 'woocommerce_view_order' ) IS THE PAGE. It is not decorative.
 * wc-template-hooks.php binds woocommerce_order_details_table to it, which
 * renders order/order-details.php — the line-item table, the totals, the
 * downloads, the purchase notes, the order-again/pay/cancel actions — and then
 * order/order-details-customer.php for the billing and shipping addresses.
 * Remove the hook and this page is one sentence and nothing else. Every totals
 * row (subtotal, per-method shipping, per-rate tax, total) that the Shopify
 * <tfoot> spells out by hand comes from $order->get_order_item_totals() inside
 * that template, already correct for refunds, fees and tax display settings, so
 * nothing here rebuilds them.
 *
 * The consequence to know about: those two templates are WooCommerce's, not
 * this theme's, so the order table and the address columns arrive with Woo's
 * class names and no design classes. They are styled by selector in
 * mts-wordpress-overrides.css rather than re-marked-up here — the same approach
 * the checkout already takes with #order_review .shop_table.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

// WC_Shortcode_My_Account::view_order() already rejects orders that do not
// belong to the visitor, but this template calls methods on $order immediately
// and a null here would be a fatal on the account page rather than a notice.
if ( ! $order instanceof WC_Order ) {
	return;
}

$mts_notes = $order->get_customer_order_notes();
?>

<div class="acct__panel">

	<div class="acct__panel-head">
		<h2>
			<?php
			printf(
				/* translators: %s: order number, e.g. "#1001" */
				esc_html__( 'Order %s', 'mytapestore' ),
				esc_html( _x( '#', 'hash before order number', 'mytapestore' ) . $order->get_order_number() )
			);
			?>
		</h2>
		<?php
		/*
		 * wc_get_endpoint_url() and nothing else — the endpoint slug is
		 * translatable and renameable in WooCommerce → Advanced, so a hand-written
		 * /my-account/orders/ is a 404 on any store that touched those settings.
		 */
		?>
		<a class="acct__viewall" href="<?php echo esc_url( wc_get_endpoint_url( 'orders' ) ); ?>">
			<?php esc_html_e( 'All orders', 'mytapestore' ); ?>
			<?php mts_the_icon( 'chevronRight', 14 ); ?>
		</a>
	</div>

	<p class="acct__lede">
		<?php
		/*
		 * The status sentence is filtered (woocommerce_order_details_status, since
		 * WC 10.1) and the default is reproduced sprintf-for-sprintf, marks and
		 * all: plugins that add "estimated delivery" or a dispatch note to this
		 * line do it by matching or replacing this exact shape, and the <mark>
		 * wrappers are what a stylesheet or a script keys on to pull the number,
		 * date or status back out. Rewriting it as three separate spans looks the
		 * same and breaks all of that silently.
		 *
		 * Only the text domain moves to the theme's, per the theme's own rule; on
		 * a store that gets translated this string has to be translated with the
		 * theme rather than inherited from WooCommerce's catalogue.
		 */
		echo wp_kses_post(
			apply_filters(
				'woocommerce_order_details_status',
				sprintf(
					/* translators: 1: order number 2: order date 3: order status */
					esc_html__( 'Order #%1$s was placed on %2$s and is currently %3$s.', 'mytapestore' ),
					'<mark class="order-number">' . $order->get_order_number() . '</mark>', // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
					'<mark class="order-date">' . wc_format_datetime( $order->get_date_created() ) . '</mark>', // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
					'<mark class="order-status">' . wc_get_order_status_name( $order->get_status() ) . '</mark>' // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				),
				$order
			)
		);
		?>
	</p>

	<?php if ( $mts_notes ) : ?>
		<div class="acct__panel-head">
			<h3><?php esc_html_e( 'Order updates', 'mytapestore' ); ?></h3>
		</div>
		<?php
		/*
		 * Customer-facing order notes — the "we've dispatched your tape" messages.
		 * Shopify's order page has no equivalent, so there is no ported markup to
		 * match and nothing in the design vocabulary describes a dated note with a
		 * rich-text body. WooCommerce's own class names are kept and styled by
		 * selector in mts-wordpress-overrides.css, rather than bending
		 * .acct-order__items (a flex row built for a thumbnail, a name and a
		 * quantity) around block-level note content.
		 *
		 * The stock <div class="clear"> nodes are dropped: they clear floats in a
		 * layout that has none here, and they are the only thing in this block that
		 * no hook, script or style reads.
		 */
		?>
		<ol class="woocommerce-OrderUpdates commentlist notes">
			<?php foreach ( $mts_notes as $mts_note ) : ?>
				<li class="woocommerce-OrderUpdate comment note">
					<div class="woocommerce-OrderUpdate-inner comment_container">
						<div class="woocommerce-OrderUpdate-text comment-text">
							<p class="woocommerce-OrderUpdate-meta meta">
								<?php
								echo esc_html( date_i18n(
									__( 'l jS \o\f F Y, h:ia', 'mytapestore' ),
									strtotime( $mts_note->comment_date )
								) );
								?>
							</p>
							<div class="woocommerce-OrderUpdate-description description">
								<?php echo wp_kses_post( wpautop( wptexturize( $mts_note->comment_content ) ) ); ?>
							</div>
						</div>
					</div>
				</li>
			<?php endforeach; ?>
		</ol>
	<?php endif; ?>

	<?php
	/*
	 * Everything below the heading — line items, totals, downloads, actions and
	 * both addresses — comes from here. See the file header before touching it.
	 * The nested hooks it carries (woocommerce_order_details_before_order_table,
	 * _before_order_table_items, _after_order_table_items, _after_order_table,
	 * woocommerce_after_order_details, woocommerce_order_details_after_customer_address)
	 * are where gift-card, tracking and returns plugins print, and they only
	 * exist while this one call does.
	 */
	do_action( 'woocommerce_view_order', $order_id );
	?>

</div>
