<?php
/**
 * The wishlist, as a real account endpoint at /my-account/wishlist/.
 *
 * WHY
 *
 * The sidebar's Wishlist row pointed at /wishlist/ — a standalone page with its
 * own full layout and no `.acct__main` in it. assets/js/acct.js swaps the account
 * panel out of the response it fetches, finds no panel in that one, and falls
 * back to a real navigation. So every other row in the sidebar changed panels
 * silently and Wishlist reloaded the whole site: header, hero, footer and all.
 *
 * Making it an endpoint means the sidebar has six rows that all behave the same
 * way, which is the only version of this a shopper can predict.
 *
 * The standalone /wishlist/ page stays exactly as it is — the header's heart icon
 * points there, and it is reachable signed out, which an account endpoint is not.
 * The two render the same cards from the same source.
 *
 * WHERE THE LIST LIVES
 *
 * In the browser, not the database: assets/js/wishlist.js keeps the ids in
 * localStorage and asks inc/wishlist.php to render cards for them. So this
 * endpoint prints the shell and the script fills it, exactly as the standalone
 * page does.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

const MTS_WISHLIST_ENDPOINT = 'wishlist';

/**
 * Register the endpoint.
 *
 * EP_PAGES because /my-account/ is a page. Registering it is only half the job —
 * the rewrite rules have to be regenerated once for the URL to resolve, which is
 * what the flush below does, guarded so it happens once rather than on every
 * request.
 */
add_action( 'init', function (): void {
	add_rewrite_endpoint( MTS_WISHLIST_ENDPOINT, EP_PAGES );

	if ( get_option( 'mts_wishlist_endpoint_v' ) !== '1' ) {
		/*
		 * On `wp_loaded`, NOT here. Flushing inside `init` writes whatever rules
		 * exist at this instant — and at priority 5 that is before WooCommerce
		 * has registered the account endpoints, before the product post type is
		 * registered, and before every taxonomy. The result is a rule set missing
		 * most of the shop. See inc/permalinks.php for the version of this
		 * mistake that actually shipped.
		 */
		add_action( 'wp_loaded', function (): void {
			flush_rewrite_rules( false );
			update_option( 'mts_wishlist_endpoint_v', '1' );
		}, 98 );
	}
}, 5 );

/**
 * Tell WordPress the endpoint exists, so get_query_var() can see it.
 */
add_filter( 'query_vars', function ( array $vars ): array {
	$vars[] = MTS_WISHLIST_ENDPOINT;
	return $vars;
} );

/**
 * Put it in the account menu, between Addresses and Account details.
 *
 * Filtered in rather than hardcoded in navigation.php: this is what makes
 * wc_get_account_endpoint_url(), wc_is_current_account_menu_item() and the
 * active-state classes work for it like any other row.
 */
add_filter( 'woocommerce_account_menu_items', function ( array $items ): array {
	$out = array();
	foreach ( $items as $key => $label ) {
		if ( 'customer-logout' === $key ) {
			$out[ MTS_WISHLIST_ENDPOINT ] = __( 'Wishlist', 'mytapestore' );
		}
		$out[ $key ] = $label;
	}

	// No logout row (already absent, or filtered out elsewhere) — append.
	if ( ! isset( $out[ MTS_WISHLIST_ENDPOINT ] ) ) {
		$out[ MTS_WISHLIST_ENDPOINT ] = __( 'Wishlist', 'mytapestore' );
	}

	return $out;
} );

/**
 * The endpoint's title, used for <title> and the panel heading.
 */
add_filter( 'woocommerce_endpoint_' . MTS_WISHLIST_ENDPOINT . '_title', function (): string {
	return __( 'Wishlist', 'mytapestore' );
} );

/**
 * Render it.
 *
 * The same shell the standalone page uses, so both are filled by the same
 * script and neither can drift from the other.
 */
add_action( 'woocommerce_account_' . MTS_WISHLIST_ENDPOINT . '_endpoint', function (): void {
	?>
	<div class="acct__panel">

		<div class="acct__panel-head">
			<h2><?php esc_html_e( 'Wishlist', 'mytapestore' ); ?></h2>
			<p class="acct__lede"><?php esc_html_e( 'Products you have saved. They stay here on this device.', 'mytapestore' ); ?></p>
		</div>

		<?php
		/*
		 * Empty by default and hidden until the script has looked: rendering the
		 * empty state first and then replacing it makes a saved list flash "you
		 * have nothing saved" on every visit.
		 */
		?>
		<div class="grid-products grid-products--fit" data-mts-wish-grid hidden></div>

		<div class="col__empty" data-mts-wish-empty hidden>
			<?php mts_the_icon( 'heart', 34 ); ?>
			<p><?php esc_html_e( 'Nothing saved yet. Tap the heart on any product to keep it here.', 'mytapestore' ); ?></p>
			<a class="btn btn--brand btn--lg" href="<?php echo esc_url( wc_get_page_permalink( 'shop' ) ); ?>">
				<?php esc_html_e( 'Browse products', 'mytapestore' ); ?> <?php mts_the_icon( 'arrowRight', 18 ); ?>
			</a>
		</div>

	</div>
	<?php
} );
