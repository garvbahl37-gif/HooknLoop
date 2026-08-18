<?php
/**
 * Empty cart — the Shopify empty state, including the bestseller suggestions
 * underneath it.
 *
 * The suggestions are the whole point of this screen: someone who reaches an
 * empty cart has nothing to do next, and the design answers that with four
 * products. They were missing entirely.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

do_action( 'woocommerce_cart_is_empty' );
?>
<div class="wrap cart-empty">
	<span class="cart-empty__icon"><?php mts_the_icon( 'cart', 44 ); ?></span>
	<h1><?php esc_html_e( 'Your cart is empty', 'mytapestore' ); ?></h1>
	<p><?php esc_html_e( 'Once you add tapes, dispensers or accessories they will show up here.', 'mytapestore' ); ?></p>
	<a class="btn btn--brand btn--lg" href="<?php echo esc_url( wc_get_page_permalink( 'shop' ) ); ?>">
		<?php esc_html_e( 'Shop the range', 'mytapestore' ); ?> <?php mts_the_icon( 'arrowRight', 18 ); ?>
	</a>

	<?php
	$mts_upsell = get_posts( array(
		'post_type'           => 'product',
		'post_status'         => 'publish',
		'posts_per_page'      => 4,
		'fields'              => 'ids',
		'ignore_sticky_posts' => true,
		'post_name__in'       => mts_bestseller_slugs(),
	) );

	if ( count( $mts_upsell ) < 4 ) {
		$mts_upsell = get_posts( array(
			'post_type'           => 'product',
			'post_status'         => 'publish',
			'posts_per_page'      => 4,
			'fields'              => 'ids',
			'orderby'             => 'total_sales',
			'order'               => 'DESC',
			'ignore_sticky_posts' => true,
		) );
	}

	if ( $mts_upsell ) :
		?>
		<section class="cart-upsell">
			<h2><?php esc_html_e( 'Bestsellers to get you started', 'mytapestore' ); ?></h2>
			<div class="grid-products grid-products--fit">
				<?php
				foreach ( $mts_upsell as $mts_upsell_id ) {
					$GLOBALS['post']    = get_post( $mts_upsell_id ); // phpcs:ignore WordPress.WP.GlobalVariablesOverride
					$GLOBALS['product'] = wc_get_product( $mts_upsell_id );
					setup_postdata( $GLOBALS['post'] );
					wc_get_template_part( 'content', 'product' );
				}
				wp_reset_postdata();
				?>
			</div>
		</section>
	<?php endif; ?>
</div>
