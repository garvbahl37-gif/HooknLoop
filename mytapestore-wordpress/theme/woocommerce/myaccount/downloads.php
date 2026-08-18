<?php
/**
 * Downloads.
 *
 * The only account endpoint with no override, so it rendered as a bare
 * WooCommerce notice — "No downloads available yet" — with no heading above it
 * and no card around it. Every sibling panel (Orders, Addresses, Account
 * details) leads with a title and sits in a panel, and this one dropped out of
 * that rhythm; it also left the panel with no heading for the account
 * navigation to move focus to.
 *
 * The download TABLE itself stays WooCommerce's: `woocommerce_available_downloads`
 * carries the signed, expiring download URLs and the remaining-downloads count,
 * and rebuilding it by hand would mean rebuilding the permission checks that
 * make those links safe to hand out.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

$mts_downloads = WC()->customer->get_downloadable_products();
?>

<div class="acct__panel">

	<div class="acct__panel-head">
		<h2><?php esc_html_e( 'Downloads', 'mytapestore' ); ?></h2>
		<p class="acct__lede"><?php esc_html_e( 'Datasheets and documents that came with your orders.', 'mytapestore' ); ?></p>
	</div>

	<?php if ( $mts_downloads ) : ?>
		<?php do_action( 'woocommerce_before_available_downloads' ); ?>
		<?php do_action( 'woocommerce_available_downloads', $mts_downloads ); ?>
		<?php do_action( 'woocommerce_after_available_downloads' ); ?>
	<?php else : ?>
		<?php
		/*
		 * The honest empty state, in the design's own empty-state shape rather
		 * than Woo's blue info bar — the same one the wishlist and an empty
		 * collection use, so an account with nothing in it still looks like part
		 * of this store.
		 */
		?>
		<div class="col__empty">
			<?php mts_the_icon( 'layers', 34 ); ?>
			<p><?php esc_html_e( 'No downloads yet. Datasheets appear here once an order containing one is complete.', 'mytapestore' ); ?></p>
			<a class="btn btn--brand btn--lg" href="<?php echo esc_url( wc_get_page_permalink( 'shop' ) ); ?>">
				<?php esc_html_e( 'Browse products', 'mytapestore' ); ?> <?php mts_the_icon( 'arrowRight', 18 ); ?>
			</a>
		</div>
	<?php endif; ?>

</div>
