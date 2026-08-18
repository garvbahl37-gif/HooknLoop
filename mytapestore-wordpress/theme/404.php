<?php
/**
 * 404.
 *
 * A dead end is a chance to recover the visit, so this offers search and the
 * main category routes rather than an apology and nothing else.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

get_header();

$mts_cats = get_terms( array(
	'taxonomy'   => 'product_cat',
	'parent'     => 0,
	'hide_empty' => true,
	'orderby'    => 'count',
	'order'      => 'DESC',
	'number'     => 6,
) );
?>

<main id="main" class="mts-main">
	<section class="section">
		<div class="wrap">
			<div class="section-head">
				<span class="eyebrow"><?php esc_html_e( 'Error 404', 'mytapestore' ); ?></span>
				<h1><?php esc_html_e( 'We could not find that page', 'mytapestore' ); ?></h1>
				<p><?php esc_html_e( 'It may have moved, or the link may be out of date. Try a search, or pick up from one of these.', 'mytapestore' ); ?></p>
			</div>

			<div class="search__box">
				<?php get_template_part( 'template-parts/search-form' ); ?>
			</div>

			<?php if ( ! is_wp_error( $mts_cats ) && $mts_cats ) : ?>
				<div class="catx">
					<?php foreach ( $mts_cats as $mts_cat ) : ?>
						<a href="<?php echo esc_url( get_term_link( $mts_cat ) ); ?>" class="catx__card">
							<div class="catx__body">
								<div class="catx__text">
									<b><?php echo esc_html( $mts_cat->name ); ?></b>
									<span class="num">
										<?php
										printf(
											/* translators: %s: product count */
											esc_html( _n( '%s product', '%s products', (int) $mts_cat->count, 'mytapestore' ) ),
											esc_html( number_format_i18n( (int) $mts_cat->count ) )
										);
										?>
									</span>
								</div>
								<span class="catx__arrow"><?php mts_the_icon( 'arrowRight', 16 ); ?></span>
							</div>
						</a>
					<?php endforeach; ?>
				</div>
			<?php endif; ?>

			<div class="section-cta">
				<a class="btn btn--brand btn--lg" href="<?php echo esc_url( home_url( '/' ) ); ?>">
					<?php esc_html_e( 'Back to the homepage', 'mytapestore' ); ?> <?php mts_the_icon( 'arrowRight', 18 ); ?>
				</a>
			</div>
		</div>
	</section>
</main>

<?php
get_footer();
