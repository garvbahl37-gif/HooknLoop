<?php
/**
 * Account shell — the Shopify account page (sections/mts-account-page.liquid),
 * signed-in branch, plus the position its sidebar snippet occupies.
 *
 * Stock WooCommerce emits a bare <nav> followed by a bare
 * <div class="woocommerce-MyAccount-content"> and nothing around either of them.
 * The design is a two-column grid — sticky sidebar on the left, content pane on
 * the right — and `.acct` is the only class that makes one. There is nowhere
 * else in the account area that has both columns in scope, so the grid has to be
 * introduced here or every account URL renders as two stacked unstyled blocks.
 *
 * THE TWO HOOKS ARE THE PAGE. NEITHER IS DECORATION.
 *   woocommerce_account_navigation -> myaccount/navigation.php, the sidebar.
 *   woocommerce_account_content    -> the endpoint dispatcher. It is the single
 *     thing that decides whether this page shows the dashboard, the order list,
 *     one order, the address book, downloads, payment methods or the
 *     edit-account form. Without it every account URL renders an empty pane and
 *     the site looks like it lost the customer's data.
 *     woocommerce_output_all_notices is bound to it at priority 5, so dropping
 *     it ALSO swallows every wc_add_notice() — "Address changed successfully",
 *     "Invalid order", login errors — with no error and no blank space to
 *     suggest anything was meant to be there.
 *
 * A SIGNED-OUT VISITOR NEVER GETS HERE. WC_Shortcode_My_Account::output()
 * renders myaccount/form-login.php and returns before this template is reached,
 * so there is no logged-out branch to write; the login page carries its own
 * page-hero and .wrap.
 *
 * FOR WHOEVER WRITES THE ENDPOINT TEMPLATES: the breadcrumb, the .acct grid and
 * the sidebar are emitted HERE, exactly once. orders.php, view-order.php,
 * form-edit-address.php and friends render inside .acct__main and must start at
 * .acct__panel — a second .wrap or a second sidebar puts a 256px column inside a
 * 256px column.
 *
 * .woocommerce-MyAccount-content is kept on the content pane. Nothing in this
 * theme styles it (every vendor stylesheet is dequeued) but plugins query for it
 * to inject panels, and it costs one class to keep them working.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

/*
 * The trail names the endpoint, not just "My account".
 *
 * Every account URL is the same WordPress page with a query var on it, so
 * get_the_title() says "My account" on the order list, on one order and on the
 * address form alike — a breadcrumb that never changes is a breadcrumb nobody
 * reads. wc_get_account_menu_items() is the authority for the label because the
 * same array is what the sidebar renders, so the crumb and the highlighted nav
 * item can never disagree, and plugin-added endpoints get named too.
 *
 * 'dashboard' is skipped deliberately: wc_is_current_account_menu_item() reports
 * it as current on the dashboard AND on any page with no recognised endpoint, so
 * matching it first would stop the loop before it reached the real one.
 */
$mts_account_label = __( 'My account', 'mytapestore' );
$mts_current       = $mts_account_label;

foreach ( wc_get_account_menu_items() as $mts_endpoint => $mts_label ) {
	if ( 'dashboard' !== $mts_endpoint && wc_is_current_account_menu_item( $mts_endpoint ) ) {
		$mts_current = $mts_label;
		break;
	}
}

$mts_crumbs = array(
	array(
		'label' => __( 'Home', 'mytapestore' ),
		'href'  => home_url( '/' ),
	),
);

if ( $mts_current !== $mts_account_label ) {
	$mts_crumbs[] = array(
		'label' => $mts_account_label,
		'href'  => mts_account_url(),
	);
}

$mts_crumbs[] = array( 'label' => $mts_current );
?>

<div class="wrap page__crumbs">
	<?php get_template_part( 'template-parts/breadcrumbs', null, array( 'items' => $mts_crumbs ) ); ?>
</div>

<?php
/*
 * A VISUALLY HIDDEN h1.
 *
 * The Shopify account page has no visible page title either — the endpoint's own
 * <h2> is the first thing you read — so adding one would be a visual departure.
 * But every signed-in account URL was shipping with NO h1 at all and a heading
 * outline that started at level 2 or 3, which is a WCAG 1.3.1 / 2.4.6 failure and
 * leaves a screen-reader user with no statement of what the page is.
 *
 * .screen-reader-text keeps the design byte-identical and gives the document the
 * heading it was missing. The text is the current endpoint, so it says "Orders"
 * on the orders page rather than "My account" on all six.
 */
?>
<h1 class="screen-reader-text"><?php echo esc_html( $mts_current ); ?></h1>

<?php
/*
 * THE MASTHEAD.
 *
 * The account area used to open straight into a sidebar and a bare content
 * column: no statement of whose account it is, no sense of arrival, and three
 * red-outlined stat tiles floating in the content that read as alerts rather
 * than as figures.
 *
 * This is the one deliberately bold element on the page, and it is grounded
 * rather than arbitrary — the site already carries an ink navigation bar, so a
 * dark band here belongs to the same family. It states the account, and it puts
 * the three numbers a trade buyer actually returns for (orders, spend, saved
 * items) in the display face where they can be read at a glance.
 *
 * Everything below it is deliberately quiet. One flare per screen.
 */
$mts_user     = wp_get_current_user();
$mts_first    = trim( (string) $mts_user->first_name );
$mts_display  = $mts_first ? trim( $mts_first . ' ' . $mts_user->last_name ) : $mts_user->display_name;
$mts_orders_n = function_exists( 'wc_get_customer_order_count' ) ? (int) wc_get_customer_order_count( $mts_user->ID ) : 0;
$mts_spent    = function_exists( 'wc_get_customer_total_spent' ) ? (float) wc_get_customer_total_spent( $mts_user->ID ) : 0.0;
$mts_since    = $mts_user->user_registered ? date_i18n( 'F Y', strtotime( $mts_user->user_registered ) ) : '';
?>
<section class="wrap acct-head" aria-label="<?php esc_attr_e( 'Account summary', 'mytapestore' ); ?>">
	<div class="acct-head__id">
		<span class="acct-head__eyebrow"><?php esc_html_e( 'Trade account', 'mytapestore' ); ?></span>
		<p class="acct-head__name"><?php echo esc_html( $mts_display ); ?></p>
		<p class="acct-head__meta">
			<span><?php echo esc_html( $mts_user->user_email ); ?></span>
			<?php if ( $mts_since ) : ?>
				<span class="acct-head__dot" aria-hidden="true"></span>
				<span>
					<?php
					printf(
						/* translators: %s: month and year the account was opened */
						esc_html__( 'Customer since %s', 'mytapestore' ),
						esc_html( $mts_since )
					);
					?>
				</span>
			<?php endif; ?>
		</p>
	</div>

	<?php
	/*
	 * The figures. `.num` is the store's tabular-numeral treatment, so the
	 * digits line up across the three regardless of width — the thing that makes
	 * a row of numbers read as data rather than as three separate headings.
	 *
	 * Total spent is the only one in brand red: it is the figure a returning
	 * trade customer looks for, and it is the single flare on this screen.
	 */
	?>
	<dl class="acct-head__figures">
		<div>
			<dt><?php esc_html_e( 'Orders', 'mytapestore' ); ?></dt>
			<dd class="num"><?php echo esc_html( number_format_i18n( $mts_orders_n ) ); ?></dd>
		</div>
		<div class="acct-head__figure--flare">
			<dt><?php esc_html_e( 'Total spent', 'mytapestore' ); ?></dt>
			<dd class="num"><?php echo esc_html( mts_money( $mts_spent ) ); ?></dd>
		</div>
		<div>
			<dt><?php esc_html_e( 'Saved items', 'mytapestore' ); ?></dt>
			<dd class="num" data-mts-wish-count>0</dd>
		</div>
	</dl>
</section>

<div class="wrap acct">

	<?php
	/**
	 * The sidebar. Fired rather than included so that anything bound to
	 * woocommerce_before_account_navigation / _after_account_navigation still
	 * runs — those are inside navigation.php, and calling wc_get_template()
	 * directly here would skip whatever else a plugin has added to this hook.
	 *
	 * @since 2.6.0
	 */
	do_action( 'woocommerce_account_navigation' );
	?>

	<?php
	/*
	 * .acct__panel is doubled up on the content column on purpose. .acct__main is
	 * the design's name for this cell but carries no rules of its own yet, and a
	 * grid item defaults to min-width:auto — one wide child (the order table, a
	 * long email address) and the 256px/1fr tracks blow out, pushing the sidebar
	 * off-screen. .acct__panel is exactly `min-width: 0`, so it holds the column
	 * to its track today regardless of what .acct__main grows into.
	 */
	?>
	<div class="acct__main acct__panel woocommerce-MyAccount-content">
		<?php
		/**
		 * Endpoint content, and the notices that ride along with it at priority 5.
		 *
		 * @since 2.6.0
		 */
		do_action( 'woocommerce_account_content' );
		?>
	</div>

</div>
