<?php
/**
 * Category showcase — CategoryShowcase() in src/sections/home.jsx.
 *
 * Eight tiles for the largest categories that actually have artwork.
 *
 * The React version filtered a bundled TILE_CATS list and excluded a couple of
 * categories by hand. Here the same shape comes from the live taxonomy: real
 * product counts, real thumbnails, and the "Industry" branch excluded because
 * it is a parallel classification with its own section further down the page —
 * showing it here would list a 102-product tile beside eight product types.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

$mts_shop_url = function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'shop' ) : home_url( '/shop/' );

$mts_industry = get_term_by( 'slug', 'industry', 'product_cat' );
$mts_exclude  = array_filter( array( $mts_industry ? (int) $mts_industry->term_id : 0 ) );

if ( $mts_industry ) {
	// Exclude the industry branch entirely, not just its root.
	$mts_exclude = array_merge( $mts_exclude, get_term_children( (int) $mts_industry->term_id, 'product_cat' ) );
}

$mts_terms = get_terms( array(
	'taxonomy'   => 'product_cat',
	'hide_empty' => true,
	'exclude'    => $mts_exclude,
	'orderby'    => 'count',
	'order'      => 'DESC',
	'number'     => 24,
) );

if ( is_wp_error( $mts_terms ) || ! $mts_terms ) {
	return;
}

// Prefer categories with artwork — a tile grid with placeholder gaps in it
// looks broken rather than sparse.
$mts_with_art = array();
$mts_without  = array();
foreach ( $mts_terms as $mts_term ) {
	$mts_thumb_id = (int) get_term_meta( $mts_term->term_id, 'thumbnail_id', true );
	if ( $mts_thumb_id ) {
		$mts_term->mts_thumb = $mts_thumb_id;
		$mts_with_art[]      = $mts_term;
	} else {
		$mts_term->mts_thumb = 0;
		$mts_without[]       = $mts_term;
	}
}

$mts_tiles = array_slice( array_merge( $mts_with_art, $mts_without ), 0, 8 );
?>
<section class="section section--paper">
	<div class="wrap">
		<div class="section-head">
			<span class="eyebrow"><?php esc_html_e( 'Our adhesive tapes collection', 'mytapestore' ); ?></span>
			<h2><?php esc_html_e( 'Discover the ideal tape for your job', 'mytapestore' ); ?></h2>
			<p><?php esc_html_e( 'Browse our most popular categories — from double-sided and foam to hook & loop, safety and packaging.', 'mytapestore' ); ?></p>
		</div>

		<div class="catx">
			<?php foreach ( $mts_tiles as $mts_term ) : ?>
				<a href="<?php echo esc_url( get_term_link( $mts_term ) ); ?>" class="catx__card">
					<div class="catx__imgwrap">
						<?php if ( $mts_term->mts_thumb ) : ?>
							<?php
							echo wp_get_attachment_image( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- core markup.
								$mts_term->mts_thumb,
								'woocommerce_thumbnail',
								false,
								array(
									'alt'     => esc_attr( $mts_term->name ),
									'loading' => 'lazy',
									'width'   => 240,
									'height'  => 240,
								)
							);
							?>
						<?php else : ?>
							<span class="catx__glyph" aria-hidden="true"><?php mts_the_icon( 'spool', 44 ); ?></span>
						<?php endif; ?>
					</div>
					<div class="catx__body">
						<div class="catx__text">
							<b><?php echo esc_html( $mts_term->name ); ?></b>
							<span class="num">
								<?php
								printf(
									/* translators: %s: number of products */
									esc_html( _n( '%s product', '%s products', (int) $mts_term->count, 'mytapestore' ) ),
									esc_html( number_format_i18n( (int) $mts_term->count ) )
								);
								?>
							</span>
						</div>
						<span class="catx__arrow"><?php mts_the_icon( 'arrowRight', 16 ); ?></span>
					</div>
				</a>
			<?php endforeach; ?>
		</div>

		<div class="section-cta">
			<a href="<?php echo esc_url( $mts_shop_url ); ?>" class="btn btn--ghost btn--lg">
				<?php esc_html_e( 'View all categories', 'mytapestore' ); ?> <?php mts_the_icon( 'arrowRight', 18 ); ?>
			</a>
		</div>
	</div>
</section>
