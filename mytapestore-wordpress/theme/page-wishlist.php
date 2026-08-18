<?php
/**
 * Template Name: Wishlist
 *
 * The wishlist lives in the browser, not the database — a shopper can save
 * items without an account, which is how the React and Shopify builds behave.
 * assets/js/wishlist.js reads the saved IDs and asks inc/wishlist.php to render
 * the real catalogue card for each one.
 *
 * The server-side state is the EMPTY one, which is also the honest state for a
 * visitor with JavaScript off: the list only ever existed in their browser.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>

<main id="main">

	<div class="wrap page__crumbs">
		<?php
		get_template_part( 'template-parts/breadcrumbs', null, array(
			'items' => array(
				array( 'label' => __( 'Home', 'mytapestore' ), 'href' => home_url( '/' ) ),
				array( 'label' => __( 'Wishlist', 'mytapestore' ) ),
			),
		) );
		?>
	</div>

	<div class="wrap page-hero page-hero--plain">
		<span class="eyebrow"><?php esc_html_e( 'Saved for later', 'mytapestore' ); ?></span>
		<h1><?php esc_html_e( 'Your wishlist', 'mytapestore' ); ?></h1>
		<p class="wishlist__count" data-mts-wish-summary><?php esc_html_e( 'Nothing saved yet.', 'mytapestore' ); ?></p>
	</div>

	<div class="wrap section--tight">
		<?php
		/*
		 * Shown while the cards are being fetched, so the page doesn't flash the
		 * empty state at someone who does have items saved.
		 */
		?>
		<div class="wishlist__loading" data-mts-wish-loading hidden>
			<span class="wishlist__spinner" aria-hidden="true"></span>
			<p><?php esc_html_e( 'Loading your saved items…', 'mytapestore' ); ?></p>
		</div>

		<div class="grid-products grid-products--5" data-mts-wish-grid hidden></div>

		<div class="col__empty" data-mts-wish-empty>
			<span class="wishlist__empty-ic"><?php mts_the_icon( 'heart', 34 ); ?></span>
			<p><?php esc_html_e( 'Your wishlist is empty. Tap the heart on any product to save it here for later.', 'mytapestore' ); ?></p>
			<a class="btn btn--brand btn--lg" href="<?php echo esc_url( wc_get_page_permalink( 'shop' ) ); ?>">
				<?php esc_html_e( 'Browse products', 'mytapestore' ); ?> <?php mts_the_icon( 'arrowRight', 18 ); ?>
			</a>
		</div>

		<div class="wishlist__foot" data-mts-wish-foot hidden>
			<a class="btn btn--ghost" href="<?php echo esc_url( wc_get_page_permalink( 'shop' ) ); ?>">
				<?php mts_the_icon( 'chevronRight', 15, 'wishlist__back' ); ?> <?php esc_html_e( 'Continue shopping', 'mytapestore' ); ?>
			</a>
		</div>
	</div>

</main>

<?php
get_footer();
