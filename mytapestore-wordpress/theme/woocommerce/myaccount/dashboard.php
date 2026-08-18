<?php
/**
 * Account dashboard — the Shopify account overview (sections/mts-account-page.liquid
 * signed-in branch, and its classic-accounts twin mts-customers-account.liquid).
 *
 * Renders INSIDE the account shell (myaccount/my-account.php → .acct__main), so
 * this file starts at .acct__panel and never emits .wrap, .acct or the sidebar.
 *
 * WHAT REPLACED WHAT, AND WHY NOTHING IS LOST.
 * Stock is two sentences: "Hello Jitesh (not Jitesh? Log out)" and a paragraph
 * of links to the other three tabs. Both are navigation written as prose, and
 * this theme already has the navigation — as the sidebar, permanently on screen,
 * one column to the left. Printing it again as a sentence is the same links
 * twice with different wording. The "not you? log out" affordance moves to the
 * sidebar's Sign out row, which carries the logout nonce, so the escape hatch is
 * still one click away from every account page rather than only this one.
 *
 * What takes their place is the design's overview: the greeting, three counters,
 * and the details summary with the two actions Shopify puts under it. The
 * counters are the only genuinely new information on the page — orders placed
 * and lifetime spend are things a trade customer reorders against.
 *
 * .page-stats is a four-column grid holding three tiles. That is not a bug being
 * copied blind: it is the Shopify layout, the fourth column is deliberate
 * breathing room, and "fixing" it to repeat(3,1fr) is a visible parity break.
 *
 * EVERY HOOK SURVIVES, INCLUDING THE TWO DEPRECATED ONES.
 * woocommerce_before_my_account / woocommerce_after_my_account have been marked
 * @deprecated since 2.6.0 and are still in the stock template four majors later,
 * because older extensions mount their dashboard panels on them. Removing them
 * costs nothing to keep and silently blanks those panels.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

/*
 * $current_user is handed in by woocommerce_account_content(). Guarded anyway:
 * get_user_by() returns false for a deleted-but-still-logged-in session, and a
 * fatal on ->first_name would take out the whole account area rather than one
 * greeting.
 */
$mts_user    = isset( $current_user ) && $current_user instanceof WP_User ? $current_user : wp_get_current_user();
$mts_user_id = (int) $mts_user->ID;

$mts_first = trim( (string) $mts_user->first_name );
$mts_name  = trim( $mts_first . ' ' . $mts_user->last_name );
if ( '' === $mts_name ) {
	$mts_name = trim( (string) $mts_user->display_name );
}

/*
 * Both counters go through WooCommerce's own accessors rather than a query of
 * our own. get_order_count()/get_total_spent() read the customer data store,
 * which is transient-cached and — importantly — HPOS-aware; a hand-rolled
 * WP_Query against the posts table returns zero on any store that has migrated
 * its orders, which is most of them now.
 */
$mts_orders = (int) wc_get_customer_order_count( $mts_user_id );
$mts_spent  = (float) wc_get_customer_total_spent( $mts_user_id );

$mts_phone   = (string) get_user_meta( $mts_user_id, 'billing_phone', true );
$mts_address = wc_get_account_formatted_address( 'billing', $mts_user_id );
?>

<?php
/*
 * NO WELCOME PANEL, NO STAT TILES HERE.
 *
 * Both moved into the masthead in my-account.php. They were duplicating the
 * page's own job: a heading that said "Welcome back, Review" above three
 * red-outlined tiles reading 0 / $0.00 / 0, which looked like three alerts and
 * told a returning trade buyer nothing they could act on.
 *
 * The tiles also carried a layout bug worth recording: `.page-stats` is
 * `repeat(4, 1fr)` and only three stats were ever rendered, so a phantom fourth
 * column ate 240px of the content width — the dead gap on the right of every
 * dashboard.
 *
 * The dashboard now opens on the thing a customer came for.
 */
?>

<div class="acct__panel" id="details">

	<div class="acct__panel-head">
		<div>
			<h2><?php esc_html_e( 'Account details', 'mytapestore' ); ?></h2>
			<p class="acct__lede"><?php esc_html_e( 'Your contact details and default delivery address.', 'mytapestore' ); ?></p>
		</div>
		<a class="acct__panel-action" href="<?php echo esc_url( wc_get_account_endpoint_url( 'edit-account' ) ); ?>">
			<?php esc_html_e( 'Edit', 'mytapestore' ); ?> <?php mts_the_icon( 'arrowRight', 14 ); ?>
		</a>
	</div>

	<?php
	/*
	 * A SPEC TABLE, not the cart's totals list.
	 *
	 * These rows carried `.cart__sum-rows`, which is the checkout's label/amount
	 * layout — built to push a short label left and a number hard right. Applied
	 * to an address it stranded four lines of it against the right edge, and it
	 * meant the account borrowed the visual language of a receipt.
	 *
	 * `.acct__spec` is a two-column grid with the label set in the head face as
	 * small caps: the same way the product pages present specifications, which is
	 * the store's own vocabulary for "here are the facts about this thing".
	 */
	?>
	<dl class="acct__spec">
		<div>
			<dt><?php esc_html_e( 'Name', 'mytapestore' ); ?></dt>
			<dd><?php echo esc_html( '' !== $mts_name ? $mts_name : '—' ); ?></dd>
		</div>
		<div>
			<dt><?php esc_html_e( 'Email', 'mytapestore' ); ?></dt>
			<dd class="num"><?php echo esc_html( $mts_user->user_email ); ?></dd>
		</div>
		<?php if ( '' !== $mts_phone ) : ?>
			<?php
			/*
			 * The row is omitted rather than shown with an em dash. Most accounts on
			 * this store are created at checkout with no phone on file, and a
			 * permanently blank "Phone —" row reads as data that failed to load.
			 */
			?>
			<div>
				<dt><?php esc_html_e( 'Phone', 'mytapestore' ); ?></dt>
				<dd class="num"><?php echo esc_html( $mts_phone ); ?></dd>
			</div>
		<?php endif; ?>
		<div>
			<dt><?php esc_html_e( 'Default address', 'mytapestore' ); ?></dt>
			<dd>
				<?php
				if ( $mts_address ) {
					// Already a formatted, <br>-separated block from WooCommerce.
					echo wp_kses_post( $mts_address );
				} else {
					esc_html_e( 'No address saved yet.', 'mytapestore' );
				}
				?>
			</dd>
		</div>
	</dl>

	<div class="acct__form-actions">
		<?php
		/*
		 * wc_get_account_endpoint_url() rather than a literal path — the
		 * edit-address slug is renameable in WooCommerce → Advanced and translated
		 * on non-English stores, so /my-account/edit-address/ is a 404 waiting to
		 * happen. It is also the same call the sidebar makes, so the two links
		 * cannot drift apart.
		 */
		?>
		<a class="btn btn--brand" href="<?php echo esc_url( wc_get_account_endpoint_url( 'edit-address' ) ); ?>">
			<?php esc_html_e( 'Manage addresses', 'mytapestore' ); ?> <?php mts_the_icon( 'arrowRight', 16 ); ?>
		</a>
		<a class="btn btn--ghost" href="<?php echo esc_url( home_url( '/wishlist/' ) ); ?>">
			<?php esc_html_e( 'View wishlist', 'mytapestore' ); ?>
		</a>
	</div>

</div>

<?php
/*
 * Left bare, not wrapped in a panel of their own: an empty .acct__panel is still
 * a flex child of .acct__main and would open a 34px hole under the details card
 * on every store that has no plugin bound here — which is most of them. Unhooked,
 * do_action() emits no element at all; hooked, the plugin's own markup becomes
 * the next block in the column, which is where it belongs.
 */

/**
 * My Account dashboard. Where extensions mount their own overview panels.
 *
 * @since 2.6.0
 */
do_action( 'woocommerce_account_dashboard' );

/**
 * Deprecated in 2.6.0 and still fired by the stock template. Kept because older
 * extensions bind their dashboard output here and have no other mount point.
 *
 * @deprecated 2.6.0
 */
do_action( 'woocommerce_before_my_account' );

/**
 * Deprecated in 2.6.0. Same reasoning as above.
 *
 * @deprecated 2.6.0
 */
do_action( 'woocommerce_after_my_account' );
