<?php
/**
 * Account sidebar — snippets/mts-account-sidebar.liquid.
 *
 * Shopify's sidebar is a profile card (initials disc, name, email) above a
 * bordered list of links. WooCommerce ships a bare <ul> of <li><a>, which this
 * theme has no styles for at all, so the account area opened with an unstyled
 * bullet list where the design has the nav.
 *
 * THE LIST IS NOT HARDCODED, AND MUST NOT BECOME HARDCODED.
 * wc_get_account_menu_items() is filtered by 'woocommerce_account_menu_items'.
 * Subscriptions, bookings, wholesale and B2B plugins add their tabs through it,
 * and WooCommerce itself removes "Payment methods" when no installed gateway
 * supports saved cards. Writing out six links by hand loses all of that
 * invisibly: the tab simply is not there, and nothing anywhere says why.
 *
 * THE <ul>/<li> ARE GONE ON PURPOSE. `.acct__nav` is a flex column whose direct
 * children are the rows, so an intervening <li> makes every item full-height and
 * strips the hairline separators. The classes that mattered came with them:
 * `woocommerce-MyAccount-navigation-link` and
 * `woocommerce-MyAccount-navigation-link--{endpoint}` are what plugins query for,
 * so they move onto the <a> rather than disappearing.
 *
 * There is no hand-written `is-active` below and that is not an omission —
 * wc_get_account_menu_item_classes() already appends `is-active` to the current
 * item, and `is-active` is also the design's own active class. One call gives
 * both. aria-current is set separately because Woo's class list carries no
 * accessibility information.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

/**
 * Fired before the navigation markup, as in the stock template.
 *
 * @since 2.6.0
 */
do_action( 'woocommerce_before_account_navigation' );

$mts_user = wp_get_current_user();

/*
 * Shopify prints customer.name and falls back to "Your account". WordPress
 * accounts created at checkout frequently have no first or last name at all, and
 * display_name then defaults to the login (often the email address), so the
 * fallback chain has to end somewhere deliberate rather than printing a raw
 * username into the design's profile card.
 */
$mts_name = trim( $mts_user->first_name . ' ' . $mts_user->last_name );
if ( '' === $mts_name ) {
	$mts_name = trim( (string) $mts_user->display_name );
}
if ( '' === $mts_name ) {
	$mts_name = __( 'Your account', 'mytapestore' );
}

$mts_items = wc_get_account_menu_items();

/*
 * Sign out is pulled out of the loop so it can stay LAST and keep the design's
 * muted treatment. `.acct__nav-item:last-child` is what removes the trailing
 * hairline, and `--out` is the modifier that turns the row red on hover; both
 * depend on this row being the final child, which it is not once the Wishlist
 * link (Shopify has one, WooCommerce has no endpoint for it) is appended.
 */
$mts_logout = isset( $mts_items['customer-logout'] ) ? 'customer-logout' : '';
unset( $mts_items['customer-logout'] );

/*
 * Icons per endpoint, matching the Shopify sidebar. Anything a plugin adds falls
 * back to a chevron rather than rendering with no icon, which would leave its
 * label misaligned against every other row in a flex list with a fixed gap.
 */
$mts_icons = array(
	'dashboard'       => 'grid',
	'orders'          => 'layers',
	'downloads'       => 'arrowRight',
	'edit-address'    => 'mapPin',
	'payment-methods' => 'card',
	'edit-account'    => 'user',
	'wishlist'        => 'heart',
	'customer-logout' => 'close',
);
?>

<aside class="acct__side">

	<div class="acct__profile">
		<?php
		/*
		 * The same initials the header disc uses, so the two agree on who is
		 * signed in. aria-hidden because the name is spelled out on the very next
		 * line — a screen reader announcing "J. Jitesh Bhalla" is noise.
		 */
		?>
		<span class="acct__avatar" aria-hidden="true"><?php echo esc_html( mts_user_initials() ); ?></span>
		<b><?php echo esc_html( $mts_name ); ?></b>
		<?php if ( $mts_user->user_email ) : ?>
			<span class="num"><?php echo esc_html( $mts_user->user_email ); ?></span>
		<?php endif; ?>
	</div>

	<nav class="acct__nav woocommerce-MyAccount-navigation" aria-label="<?php esc_attr_e( 'Account pages', 'mytapestore' ); ?>">

		<?php foreach ( $mts_items as $mts_endpoint => $mts_label ) : ?>
			<?php
			/*
			 * wc_get_account_endpoint_url() and nothing hand-written. Endpoint
			 * slugs are store settings (WooCommerce → Advanced) and are
			 * translated on non-English stores, so a literal
			 * /my-account/edit-address/ is a 404 the moment either changes.
			 */
			?>
			<a class="acct__nav-item <?php echo esc_attr( wc_get_account_menu_item_classes( $mts_endpoint ) ); ?>"
			   href="<?php echo esc_url( wc_get_account_endpoint_url( $mts_endpoint ) ); ?>"
			   <?php echo wc_is_current_account_menu_item( $mts_endpoint ) ? 'aria-current="page"' : ''; ?>>
				<?php mts_the_icon( isset( $mts_icons[ $mts_endpoint ] ) ? $mts_icons[ $mts_endpoint ] : 'chevronRight', 17 ); ?>
				<span><?php echo esc_html( $mts_label ); ?></span>
			</a>
		<?php endforeach; ?>

		<?php
		/*
		 * Wishlist USED to be hardcoded here, pointing at the standalone /wishlist/
		 * page — a page with its own full layout and no `.acct__main` in it. So
		 * assets/js/acct.js could not swap a panel for it and fell back to a real
		 * navigation: five sidebar rows changed panels silently and the sixth
		 * reloaded the entire site.
		 *
		 * inc/account-wishlist.php now registers /my-account/wishlist/ as a real
		 * WooCommerce endpoint and filters it into wc_get_account_menu_items(), so
		 * it is rendered by the loop above like every other row — with the same URL
		 * helper, the same active state and the same swap behaviour.
		 */
		?>
		<?php if ( $mts_logout ) : ?>
			<?php
			/*
			 * wc_get_account_endpoint_url( 'customer-logout' ) returns the URL
			 * already wrapped in wp_nonce_url(). Writing the logout path out by
			 * hand drops that nonce, and WordPress then answers with its own
			 * "Are you sure you want to log out?" interstitial instead of logging
			 * the shopper out — which reads as the button not working.
			 */
			?>
			<a class="acct__nav-item acct__nav-item--out <?php echo esc_attr( wc_get_account_menu_item_classes( $mts_logout ) ); ?>"
			   href="<?php echo esc_url( wc_get_account_endpoint_url( $mts_logout ) ); ?>">
				<?php mts_the_icon( 'close', 17 ); ?>
				<span><?php esc_html_e( 'Sign out', 'mytapestore' ); ?></span>
			</a>
		<?php endif; ?>

	</nav>

</aside>

<?php
/**
 * Fired after the navigation markup, as in the stock template.
 *
 * @since 2.6.0
 */
do_action( 'woocommerce_after_account_navigation' );
