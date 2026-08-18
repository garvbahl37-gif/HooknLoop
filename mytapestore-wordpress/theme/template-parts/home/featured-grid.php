<?php
/**
 * Bestsellers — FeaturedGrid() in src/sections/home.jsx.
 *
 * Shows the same four products, in the same order, as the React build and the
 * Shopify theme: the first four entries of BESTSELLER_HANDLES.
 *
 * post__in + orderby post__in is what preserves the rank. Sorting by
 * total_sales instead would be wrong twice over — it would disagree with the
 * other two storefronts, and this database has no orders in it, so every
 * product's sales count is zero and the "ranking" would be arbitrary.
 *
 * Falls back to featured-then-newest only if none of the named products
 * resolve, so a renamed slug degrades to a populated row rather than a gap.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

$mts_shop_url = function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'shop' ) : home_url( '/shop/' );
$mts_count    = (int) apply_filters( 'mts_featured_count', 4 );
$mts_slugs    = array_slice( mts_bestseller_slugs(), 0, $mts_count );

$mts_ids = array();
foreach ( $mts_slugs as $mts_slug ) {
	$mts_post = get_page_by_path( $mts_slug, OBJECT, 'product' );
	if ( $mts_post ) {
		$mts_ids[] = (int) $mts_post->ID;
	}
}

if ( $mts_ids ) {
	$mts_args = array(
		'post_type'      => 'product',
		'post_status'    => 'publish',
		'post__in'       => $mts_ids,
		'orderby'        => 'post__in',   // preserves the ranked order
		'posts_per_page' => count( $mts_ids ),
		'no_found_rows'  => true,
	);
} else {
	$mts_args = array(
		'post_type'      => 'product',
		'post_status'    => 'publish',
		'posts_per_page' => $mts_count,
		'orderby'        => 'date',
		'order'          => 'DESC',
		'no_found_rows'  => true,
	);
}

$mts_query = new WP_Query( $mts_args );

if ( ! $mts_query->have_posts() ) {
	wp_reset_postdata();
	return;
}
?>
<section class="section">
	<div class="wrap">
		<div class="section-head">
			<span class="eyebrow"><?php esc_html_e( 'Our bestsellers', 'mytapestore' ); ?></span>
			<h2><?php esc_html_e( 'Popular right now', 'mytapestore' ); ?></h2>
		</div>

		<div class="grid-products grid-products--5">
			<?php
			while ( $mts_query->have_posts() ) {
				$mts_query->the_post();
				// content-product.php reads the global $product, which the_post()
				// does not populate for a secondary query.
				$GLOBALS['product'] = wc_get_product( get_the_ID() );
				wc_get_template_part( 'content', 'product' );
			}
			wp_reset_postdata();
			?>
		</div>

		<div class="section-cta">
			<a href="<?php echo esc_url( $mts_shop_url ); ?>" class="btn btn--ghost btn--lg">
				<?php esc_html_e( 'Shop all products', 'mytapestore' ); ?> <?php mts_the_icon( 'arrowRight', 18 ); ?>
			</a>
		</div>
	</div>
</section>
