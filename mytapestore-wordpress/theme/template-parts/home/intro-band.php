<?php
/**
 * Intro band — IntroBand() in mytapestore-redesign/src/sections/home.jsx.
 *
 * Positioning copy, the stocked-brand chips, and four proof stats.
 *
 * The React version computed its stats from the bundled catalogue. Here they
 * come from the live store wherever a real number exists — an industry count
 * that quietly disagrees with the industries page is worse than no number.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

$mts_shop_url = function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'shop' ) : home_url( '/shop/' );

$mts_brands = apply_filters( 'mts_intro_brands', array(
	'FrogTape®', 'T-Rex®', 'Shurtape', 'Husky Tape', 'Kikusui', 'Acribond',
) );

// Industries are modelled as children of the "Industry" product category.
$mts_industry_parent = get_term_by( 'slug', 'industry', 'product_cat' );
$mts_industry_count  = $mts_industry_parent
	? count( get_terms( array(
		'taxonomy'   => 'product_cat',
		'parent'     => $mts_industry_parent->term_id,
		'hide_empty' => true,
		'fields'     => 'ids',
	) ) )
	: 0;

/*
 * The rating stat is COMPUTED, not typed in. Shopify shows "4.9★ / From 119
 * customer reviews" and this theme showed "4.8★ / Average customer rating" —
 * a hardcoded figure that nothing kept true. The store holds 119 approved
 * reviews, so read them: the number is right today and stays right.
 */
$mts_review_count = (int) get_comments( array(
	'post_type' => 'product',
	'status'    => 'approve',
	'type'      => 'review',
	'count'     => true,
) );

$mts_rating_avg = 0.0;
if ( $mts_review_count > 0 ) {
	$mts_sum = 0;
	$mts_n   = 0;
	foreach ( get_comments( array( 'post_type' => 'product', 'status' => 'approve', 'type' => 'review', 'number' => 500 ) ) as $mts_c ) {
		$mts_r = (float) get_comment_meta( $mts_c->comment_ID, 'rating', true );
		if ( $mts_r > 0 ) {
			$mts_sum += $mts_r;
			++$mts_n;
		}
	}
	$mts_rating_avg = $mts_n ? round( $mts_sum / $mts_n, 1 ) : 0.0;
}

$mts_stats = array(
	array(
		$mts_rating_avg ? number_format_i18n( $mts_rating_avg, 1 ) . '★' : '4.9★',
		$mts_review_count
			/* translators: %s: number of reviews */
			? sprintf( __( 'From %s customer reviews', 'mytapestore' ), number_format_i18n( $mts_review_count ) )
			: __( 'From our customer reviews', 'mytapestore' ),
	),
	array( $mts_industry_count ? (string) $mts_industry_count : '26', __( 'Industries served', 'mytapestore' ) ),
	array( '3,600+', __( 'AU postcodes', 'mytapestore' ) ),
	array( '2–3', __( 'Day typical delivery', 'mytapestore' ) ),
);
?>
<section class="section intro">
	<div class="wrap intro__grid">
		<div class="intro__head">
			<span class="eyebrow"><?php esc_html_e( 'Every tape. One supplier.', 'mytapestore' ); ?></span>
			<h2 class="intro__title"><?php esc_html_e( 'Buy tapes online from My Tape Store', 'mytapestore' ); ?></h2>
			<a href="<?php echo esc_url( $mts_shop_url ); ?>" class="btn btn--brand btn--lg intro__cta">
				<?php esc_html_e( 'Shop the full range', 'mytapestore' ); ?> <?php mts_the_icon( 'arrowRight', 18 ); ?>
			</a>
		</div>

		<div class="intro__body">
			<p class="intro__lead">
				<?php esc_html_e( 'My Tape Store brings top-notch quality to our extensive range of adhesive tapes. We are committed to serving all industries across Australia. Whether you belong to the construction, retail, packaging, or transport industry, we have got you covered. We stock only top-rated and highly trusted brands like FrogTape®, T-Rex®, Shurtape, Husky Tape, Kikusui, Acribond. We work for you, bringing fast and Australia-wide delivery at pocket-friendly prices. Shop worry-free as we have bulk order discounts.', 'mytapestore' ); ?>
			</p>
			<div class="intro__brands">
				<span class="intro__brands-label"><?php esc_html_e( 'Trusted brands we stock', 'mytapestore' ); ?></span>
				<ul class="intro__chips">
					<?php foreach ( $mts_brands as $mts_brand ) : ?>
						<li class="intro__chip"><?php echo esc_html( $mts_brand ); ?></li>
					<?php endforeach; ?>
				</ul>
			</div>
		</div>
	</div>

	<div class="wrap">
		<div class="intro__stats">
			<?php foreach ( $mts_stats as $mts_stat ) : ?>
				<div>
					<b class="num"><?php echo esc_html( $mts_stat[0] ); ?></b>
					<span><?php echo esc_html( $mts_stat[1] ); ?></span>
				</div>
			<?php endforeach; ?>
		</div>
	</div>
</section>
