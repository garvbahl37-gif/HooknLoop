<?php
/**
 * Comprehensive range — RangeSection() in src/sections/home.jsx.
 *
 * Three positioning blocks beside a product photograph. Static copy by design:
 * this is brand argument, not catalogue data, and pulling it from the database
 * would invite it to drift out of sync with the rest of the page.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

$mts_shop_url = function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'shop' ) : home_url( '/shop/' );
$mts_media    = mts_asset( 'img/site/range.jpg' );

$mts_blocks = array(
	array(
		__( 'General-purpose adhesive tapes', 'mytapestore' ),
		__( 'Cost-effective, versatile tapes for everyday packaging, bundling and assembly — dependable hold across countless jobs.', 'mytapestore' ),
	),
	array(
		__( 'Specialty adhesive tapes', 'mytapestore' ),
		__( "Engineered for specific applications: high-bond, glazing, thermal, fire-retardant and more, where a standard tape won't do.", 'mytapestore' ),
	),
	array(
		__( 'Construction & industrial tapes', 'mytapestore' ),
		__( 'Rugged tapes built for the site — flashing, cloth, foil and duct grades that stand up to demanding conditions.', 'mytapestore' ),
	),
);
?>
<section class="section range">
	<div class="wrap range__grid">
		<div class="range__copy">
			<span class="eyebrow"><?php esc_html_e( 'A more comprehensive range', 'mytapestore' ); ?></span>
			<h2><?php esc_html_e( 'Adhesive tapes for every purpose', 'mytapestore' ); ?></h2>

			<div class="range__blocks">
				<?php foreach ( $mts_blocks as $mts_block ) : ?>
					<div class="range__block">
						<span class="range__ic"><?php mts_the_icon( 'layers', 20 ); ?></span>
						<div>
							<h3><?php echo esc_html( $mts_block[0] ); ?></h3>
							<p><?php echo esc_html( $mts_block[1] ); ?></p>
						</div>
					</div>
				<?php endforeach; ?>
			</div>

			<a href="<?php echo esc_url( $mts_shop_url ); ?>" class="btn btn--brand btn--lg range__cta">
				<?php esc_html_e( 'Explore the full range', 'mytapestore' ); ?> <?php mts_the_icon( 'arrowRight', 18 ); ?>
			</a>
		</div>

		<?php if ( $mts_media ) : ?>
			<div class="range__media">
				<img src="<?php echo esc_url( $mts_media ); ?>"
					 alt="<?php esc_attr_e( 'A range of adhesive tapes — packaging, duct, masking, foil, cloth and electrical', 'mytapestore' ); ?>"
					 loading="lazy">
			</div>
		<?php endif; ?>
	</div>
</section>
