<?php
/**
 * Industries — IndustriesShowcase() in src/sections/home.jsx.
 *
 * A hero panel plus a paged strip of industry tiles.
 *
 * Industries are children of the "Industry" product category on this store, so
 * the strip is built from the live taxonomy rather than a bundled list — the
 * counts shown are the counts a visitor will actually find when they click.
 *
 * Paging is done in CSS/JS over a single track; every tile ships in the markup
 * so the section is complete without JavaScript.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

$mts_parent = get_term_by( 'slug', 'industry', 'product_cat' );
if ( ! $mts_parent ) {
	return;
}

$mts_industries = get_terms( array(
	'taxonomy'   => 'product_cat',
	'parent'     => (int) $mts_parent->term_id,
	'hide_empty' => true,
	'orderby'    => 'count',
	'order'      => 'DESC',
) );

if ( is_wp_error( $mts_industries ) || ! $mts_industries ) {
	return;
}

$mts_total = count( $mts_industries );
$mts_hero  = mts_asset( 'img/site/industries.jpg' );
?>
<section class="section section--paper">
	<div class="wrap">

		<div class="indx-hero">
			<?php if ( $mts_hero ) : ?>
				<img class="indx-hero__img" src="<?php echo esc_url( $mts_hero ); ?>"
					 alt="<?php esc_attr_e( 'Adhesive tapes for every trade — hard hat, blueprints, packaging, foil and craft tapes on a workbench', 'mytapestore' ); ?>"
					 loading="lazy">
			<?php endif; ?>
			<div class="indx-hero__panel">
				<span class="eyebrow"><?php esc_html_e( 'Covering diverse industries', 'mytapestore' ); ?></span>
				<h2><?php esc_html_e( 'From construction to crafting', 'mytapestore' ); ?></h2>
				<p>
					<?php
					printf(
						/* translators: %d: number of industries */
						esc_html__( 'The right adhesive for your trade — quality-checked tapes across %d industries.', 'mytapestore' ),
						(int) $mts_total
					);
					?>
				</p>
			</div>
		</div>

		<div class="indx-strip" data-mts-strip>
			<div class="indx-strip__viewport">
				<div class="indx-strip__track" data-mts-strip-track>
					<?php foreach ( $mts_industries as $mts_term ) : ?>
						<?php $mts_thumb = (int) get_term_meta( $mts_term->term_id, 'thumbnail_id', true ); ?>
						<a href="<?php echo esc_url( get_term_link( $mts_term ) ); ?>" class="indx-tile">
							<div class="indx-tile__media">
								<?php if ( $mts_thumb ) : ?>
									<?php
									echo wp_get_attachment_image( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
										$mts_thumb,
										'woocommerce_thumbnail',
										false,
										array( 'alt' => esc_attr( $mts_term->name ), 'loading' => 'lazy' )
									);
									?>
								<?php else : ?>
									<span class="indx-tile__glyph" aria-hidden="true"><?php mts_the_icon( 'factory', 30 ); ?></span>
								<?php endif; ?>
							</div>
							<div class="indx-tile__body">
								<b class="indx-tile__name"><?php echo esc_html( $mts_term->name ); ?></b>
								<span class="indx-tile__num num">
									<?php
									printf(
										/* translators: %s: number of products */
										esc_html( _n( '%s product', '%s products', (int) $mts_term->count, 'mytapestore' ) ),
										esc_html( number_format_i18n( (int) $mts_term->count ) )
									);
									?>
									<?php mts_the_icon( 'arrowRight', 14 ); ?>
								</span>
							</div>
						</a>
					<?php endforeach; ?>
				</div>
			</div>
			<div class="indx-strip__dots" data-mts-strip-dots></div>
		</div>

		<div class="section-cta">
			<a href="<?php echo esc_url( home_url( '/industries/' ) ); ?>" class="btn btn--brand btn--lg">
				<?php
				printf(
					/* translators: %d: number of industries */
					esc_html__( 'Explore all %d industries', 'mytapestore' ),
					(int) $mts_total
				);
				?>
				<?php mts_the_icon( 'arrowRight', 18 ); ?>
			</a>
		</div>

	</div>
</section>
