<?php
/**
 * Seal the deal — SealTheDeal() in src/sections/home.jsx.
 *
 * Full-bleed promo band. The background image is decorative and carries no
 * information the copy does not already state, so it is aria-hidden with an
 * empty alt rather than described.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

$mts_shop_url = function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'shop' ) : home_url( '/shop/' );
$mts_media    = mts_asset( 'img/site/seal-deal.jpg' );
?>
<section class="seal grain">
	<?php if ( $mts_media ) : ?>
		<div class="seal__media">
			<img src="<?php echo esc_url( $mts_media ); ?>" alt="" aria-hidden="true" loading="lazy">
		</div>
	<?php endif; ?>

	<div class="wrap seal__inner">
		<span class="eyebrow eyebrow--onink"><?php esc_html_e( 'Ready when you are', 'mytapestore' ); ?></span>
		<h2 class="seal__title"><?php esc_html_e( 'Seal the deal today', 'mytapestore' ); ?></h2>
		<p class="seal__lead"><?php esc_html_e( 'Shop our wide range of tapes and elevate your projects — fast dispatch Australia-wide, with volume discounts up to 30%.', 'mytapestore' ); ?></p>
		<div class="seal__cta">
			<a href="<?php echo esc_url( $mts_shop_url ); ?>" class="btn btn--brand btn--lg">
				<?php esc_html_e( 'Shop now', 'mytapestore' ); ?> <?php mts_the_icon( 'arrowRight', 18 ); ?>
			</a>
			<a href="<?php echo esc_url( home_url( '/bulk-trade/' ) ); ?>" class="btn btn--onink-ghost btn--lg">
				<?php esc_html_e( 'Bulk & trade pricing', 'mytapestore' ); ?>
			</a>
		</div>
	</div>
</section>
