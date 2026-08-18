<?php
/**
 * Brand wall — BrandWall() in src/sections/home.jsx.
 *
 * A marquee of stocked brand marks plus three credibility stats.
 *
 * The logo list is duplicated in the markup because the marquee is a CSS
 * animation translating the track by -50%: the second copy is what makes the
 * loop seamless. It is aria-hidden so assistive tech announces six brands, not
 * twelve.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

$mts_brands = apply_filters( 'mts_brand_logos', array(
	array( 'FrogTape',   'img/brands/logo-6.png' ),
	array( 'T-Rex',      'img/brands/logo-4.png' ),
	array( 'Shurtape',   'img/brands/logo-2.png' ),
	array( 'Husky Tape', 'img/brands/logo-3.png' ),
	array( 'Kikusui',    'img/brands/logo-1.png' ),
	array( 'Acribond',   'img/brands/logo-5.png' ),
) );

$mts_brands = array_values( array_filter(
	$mts_brands,
	static fn( array $b ): bool => '' !== mts_asset( $b[1] )
) );

if ( ! $mts_brands ) {
	return;
}

$mts_product_count = (int) wp_count_posts( 'product' )->publish;
?>
<section class="brandx grain">
	<div class="wrap brandx__inner">
		<span class="eyebrow eyebrow--onink"><?php esc_html_e( 'Trusted brands', 'mytapestore' ); ?></span>
		<h2 class="brandx__title"><?php esc_html_e( 'We partner with the best tape brands', 'mytapestore' ); ?></h2>
		<p class="brandx__sub"><?php esc_html_e( 'Genuine, trade-grade products from the names professionals rely on — plus our own value lines.', 'mytapestore' ); ?></p>
	</div>

	<div class="brandx__slider">
		<div class="brandx__track">
			<?php for ( $mts_pass = 0; $mts_pass < 2; $mts_pass++ ) : ?>
				<?php foreach ( $mts_brands as $mts_brand ) : ?>
					<div class="brandx__plate">
						<img src="<?php echo esc_url( mts_asset( $mts_brand[1] ) ); ?>"
							 alt="<?php echo 0 === $mts_pass ? esc_attr( $mts_brand[0] ) : ''; ?>"
							 <?php echo 0 === $mts_pass ? '' : 'aria-hidden="true"'; ?>
							 class="brandx__logo" loading="lazy">
					</div>
				<?php endforeach; ?>
			<?php endfor; ?>
		</div>
	</div>

	<div class="wrap brandx__stats">
		<div class="brandx__stat">
			<b class="num"><?php echo esc_html( (string) count( $mts_brands ) ); ?></b>
			<span><?php esc_html_e( 'Leading brands', 'mytapestore' ); ?></span>
		</div>
		<div class="brandx__stat">
			<b class="num"><?php echo esc_html( $mts_product_count ? number_format_i18n( $mts_product_count ) . '+' : '130+' ); ?></b>
			<span><?php esc_html_e( 'Genuine lines', 'mytapestore' ); ?></span>
		</div>
		<div class="brandx__stat">
			<b class="num">100%</b>
			<span><?php esc_html_e( 'Trade-grade quality', 'mytapestore' ); ?></span>
		</div>
	</div>
</section>
