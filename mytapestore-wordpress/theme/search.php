<?php
/**
 * Search results.
 *
 * Products are the primary result type on a store, so they render as product
 * cards; anything else falls back to a simple linked list beneath them.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

get_header();

$mts_query = get_search_query();
$mts_total = (int) ( $GLOBALS['wp_query']->found_posts ?? 0 );
?>

<main id="main" class="mts-main">
	<section class="section">
		<div class="wrap">

			<div class="search__head">
				<h1><?php esc_html_e( 'Search results', 'mytapestore' ); ?></h1>
				<?php if ( $mts_query ) : ?>
					<p class="search__q">
						<?php
						printf(
							/* translators: %s: search term */
							esc_html__( 'for “%s”', 'mytapestore' ),
							esc_html( $mts_query )
						);
						?>
					</p>
				<?php endif; ?>
				<span class="search__count num">
					<?php
					printf(
						/* translators: %s: result count */
						esc_html( _n( '%s result', '%s results', $mts_total, 'mytapestore' ) ),
						esc_html( number_format_i18n( $mts_total ) )
					);
					?>
				</span>
			</div>

			<div class="search__box">
				<?php get_template_part( 'template-parts/search-form' ); ?>
			</div>

			<?php if ( have_posts() ) : ?>

				<?php
				// Split the loop: products get cards, everything else gets a list.
				$mts_products = array();
				$mts_others   = array();
				while ( have_posts() ) {
					the_post();
					if ( 'product' === get_post_type() ) {
						$mts_products[] = get_the_ID();
					} else {
						$mts_others[] = get_the_ID();
					}
				}
				?>

				<?php if ( $mts_products ) : ?>
					<div class="grid-products grid-products--fit">
						<?php
						foreach ( $mts_products as $mts_pid ) {
							$GLOBALS['post']    = get_post( $mts_pid ); // phpcs:ignore WordPress.WP.GlobalVariablesOverride
							$GLOBALS['product'] = wc_get_product( $mts_pid );
							setup_postdata( $GLOBALS['post'] );
							wc_get_template_part( 'content', 'product' );
						}
						wp_reset_postdata();
						?>
					</div>
				<?php endif; ?>

				<?php if ( $mts_others ) : ?>
					<div class="blogx">
						<?php foreach ( $mts_others as $mts_oid ) : ?>
							<article class="blogx__card">
								<div class="blogx__body">
									<span class="blogx__meta"><?php echo esc_html( get_post_type_object( get_post_type( $mts_oid ) )->labels->singular_name ?? '' ); ?></span>
									<h2 class="blogx__title">
										<a href="<?php echo esc_url( get_permalink( $mts_oid ) ); ?>"><?php echo esc_html( get_the_title( $mts_oid ) ); ?></a>
									</h2>
									<p class="blogx__excerpt"><?php echo esc_html( wp_trim_words( wp_strip_all_tags( get_the_excerpt( $mts_oid ) ), 26 ) ); ?></p>
								</div>
							</article>
						<?php endforeach; ?>
					</div>
				<?php endif; ?>

				<?php get_template_part( 'template-parts/pagination', null, array( 'label' => __( 'Search results pagination', 'mytapestore' ) ) ); ?>

			<?php else : ?>
				<div class="col__empty">
					<?php mts_the_icon( 'search', 40 ); ?>
					<p><?php esc_html_e( 'Nothing matched that search. Try a brand, a tape type, or a size.', 'mytapestore' ); ?></p>
					<a class="btn btn--brand" href="<?php echo esc_url( function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'shop' ) : home_url( '/shop/' ) ); ?>">
						<?php esc_html_e( 'Browse all products', 'mytapestore' ); ?> <?php mts_the_icon( 'arrowRight', 16 ); ?>
					</a>
				</div>
			<?php endif; ?>

		</div>
	</section>
</main>

<?php
get_footer();
