<?php
/**
 * Wholesale / bulk — Wholesale() in src/sections/home.jsx.
 *
 * Five perks beside a warehouse photograph. Relevant to this store in
 * particular: the live site runs a tiered pricing plugin, so bulk buyers are a
 * real segment rather than an aspiration, and this block is their entry point.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

$mts_media = mts_asset( 'img/site/bulk-wholesale.jpg' );

$mts_perks = array(
	array( 'tag',     __( 'Significant discounts', 'mytapestore' ),                __( 'Save more when you order in bulk — contact us for substantial reductions on large quantities.', 'mytapestore' ) ),
	array( 'truck',   __( 'Quick delivery across Australia', 'mytapestore' ),      __( 'Fast, reliable shipping so your bulk tape orders arrive exactly when you need them.', 'mytapestore' ) ),
	array( 'layers',  __( 'Cost-effective stock management', 'mytapestore' ),      __( 'Keep a well-stocked inventory without breaking the bank, even with high tape usage.', 'mytapestore' ) ),
	array( 'factory', __( 'Tailored wholesale services', 'mytapestore' ),          __( "Customised wholesale solutions built around your business's specific needs.", 'mytapestore' ) ),
	array( 'shield',  __( 'Trusted tape suppliers', 'mytapestore' ),               __( 'Consistent quality and after-sales service — all your adhesive needs, always covered.', 'mytapestore' ) ),
);
?>
<section class="section wholesale">
	<div class="wrap wholesale__grid">
		<?php if ( $mts_media ) : ?>
			<div class="wholesale__media">
				<img src="<?php echo esc_url( $mts_media ); ?>"
					 alt="<?php esc_attr_e( 'Warehouse pallets stacked with adhesive tape stock', 'mytapestore' ); ?>"
					 loading="lazy">
			</div>
		<?php endif; ?>

		<div class="wholesale__copy">
			<span class="eyebrow"><?php esc_html_e( 'Wholesale & bulk', 'mytapestore' ); ?></span>
			<h2 class="wholesale__title"><?php esc_html_e( 'Buy adhesive tape in bulk — wholesale pricing for Australia', 'mytapestore' ); ?></h2>
			<p class="wholesale__intro"><?php esc_html_e( "Australia's trusted tape experts. We're proud to supply thousands of individuals and businesses with tailored solutions and quality products.", 'mytapestore' ); ?></p>

			<ul class="wholesale__perks">
				<?php foreach ( $mts_perks as $mts_perk ) : ?>
					<li>
						<span class="wholesale__ic"><?php mts_the_icon( $mts_perk[0], 18 ); ?></span>
						<div>
							<b><?php echo esc_html( $mts_perk[1] ); ?></b>
							<span><?php echo esc_html( $mts_perk[2] ); ?></span>
						</div>
					</li>
				<?php endforeach; ?>
			</ul>

			<a href="<?php echo esc_url( home_url( '/bulk-trade/' ) ); ?>" class="btn btn--brand btn--lg">
				<?php esc_html_e( 'Bulk & trade pricing', 'mytapestore' ); ?> <?php mts_the_icon( 'arrowRight', 18 ); ?>
			</a>
		</div>
	</div>
</section>
