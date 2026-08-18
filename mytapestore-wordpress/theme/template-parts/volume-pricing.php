<?php
/**
 * Volume pricing cards.
 *
 * Sits INSIDE the add-to-cart form, between the options and the quantity row —
 * the order Shopify uses, and the order that reads correctly: choose the
 * variant, see what it costs at each quantity, then pick a quantity.
 *
 * Price cards only. No control that submits anything lives in this loop.
 *
 * The heading text is NOT wrapped in a <span>: `.pdp-vol__head span` is the
 * secondary-note treatment (faint, normal weight, sentence case), so wrapping
 * the heading in one turned the design's brand-red uppercase label into grey
 * body text.
 *
 * @param WC_Product $args['product']
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

$mts_product = $args['product'] ?? null;
if ( ! $mts_product instanceof WC_Product ) {
	return;
}

/*
 * `_mts_hide_tiers` IS NO LONGER HONOURED, deliberately.
 *
 * It was set by scripts/sync-shopify-content.php on the 51 products Shopify
 * showed no price breaks for, so the two stores could not quote different
 * prices for the same quantity. That was the right call while parity with
 * Shopify was the goal.
 *
 * The instruction now is that every product shows its volume pricing, and the
 * data supports it: all 133 published products carry real
 * `_tiered_pricing_fixed_rules`, including all 51 that were hidden. So this is
 * revealing discounts the store genuinely offers, not inventing any.
 *
 * The meta is left in place rather than deleted — it records which products
 * Shopify disagrees with, which is worth keeping if the two ever need
 * reconciling. Re-enable the old behaviour with:
 *
 *     add_filter( 'mts_honour_hide_tiers', '__return_true' );
 */
if ( apply_filters( 'mts_honour_hide_tiers', false )
	&& get_post_meta( $mts_product->get_id(), '_mts_hide_tiers', true ) ) {
	return;
}

$mts_tiers = mts_tier_rules( $mts_product );
if ( count( $mts_tiers ) < 2 ) {
	return;
}
?>
<div class="pdp-buy__section pdp-vol" data-mts-volume>
	<div class="pdp-vol__head">
		<?php mts_the_icon( 'tag', 14 ); ?>
		<?php esc_html_e( 'Get it at a discounted rate', 'mytapestore' ); ?>
	</div>
	<div class="pdp-vol__row" role="group" aria-label="<?php esc_attr_e( 'Quantity price breaks', 'mytapestore' ); ?>">
		<?php foreach ( $mts_tiers as $mts_i => $mts_tier ) : ?>
			<?php
			$mts_label = mts_tier_range_label( $mts_tier );
			$mts_off   = (int) $mts_tier['off'];
			?>
			<button type="button" class="pdp-vtier<?php echo 0 === $mts_i ? ' is-active' : ''; ?>"
					data-mts-tier="<?php echo esc_attr( (string) $mts_tier['min'] ); ?>"
					data-mts-tier-min="<?php echo esc_attr( (string) $mts_tier['min'] ); ?>"
					data-mts-tier-max="<?php echo esc_attr( (string) ( $mts_tier['max'] ?? '' ) ); ?>"
					data-off="<?php echo esc_attr( (string) $mts_off ); ?>"
					aria-label="<?php echo esc_attr( $mts_off > 0 ? sprintf( '%s — %d%% off', $mts_label, $mts_off ) : $mts_label ); ?>">
				<span class="pdp-vtier__top">
					<b class="num" data-mts-tier-price><?php echo esc_html( mts_money( (float) $mts_tier['price'] ) ); ?></b>
					<?php if ( $mts_off > 0 ) : ?>
						<span class="pdp-vtier__off">
							<?php
							printf(
								/* translators: %d: discount percentage */
								esc_html__( '(%d%% off)', 'mytapestore' ),
								$mts_off
							);
							?>
						</span>
					<?php endif; ?>
				</span>
				<span class="pdp-vtier__lbl"><?php echo esc_html( $mts_label ); ?></span>
			</button>
		<?php endforeach; ?>
	</div>
</div>
