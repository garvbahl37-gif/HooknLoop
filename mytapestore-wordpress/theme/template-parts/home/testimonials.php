<?php
/**
 * Testimonials — Testimonials() in src/sections/home.jsx.
 *
 * A single-row marquee of real customer reviews.
 *
 * These are read from WooCommerce's own review store, not hardcoded into the
 * template. That matters for more than tidiness: a testimonial is a claim made
 * on a real person's behalf, so it should live where it can be moderated,
 * attributed and removed — not baked into theme code where nobody can find it.
 *
 * If the store has no qualifying reviews the section renders nothing. An empty
 * proof band is better than an invented one.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

$mts_reviews = get_comments( array(
	'post_type'   => 'product',
	'status'      => 'approve',
	'type'        => 'review',
	'number'      => 40,
	'meta_key'    => 'rating',
	'meta_value'  => 4,
	'meta_compare' => '>=',
) );

// The design's card is sized for a paragraph: very short reviews leave it
// half-empty and very long ones overflow it, so the pool is filtered to the
// band the layout was drawn for — the same 90–280 character window the React
// version used.
$mts_pool = array();
foreach ( $mts_reviews as $mts_review ) {
	$mts_len = mb_strlen( $mts_review->comment_content );
	if ( $mts_len < 90 || $mts_len > 280 ) {
		continue;
	}
	$mts_pool[] = $mts_review;
	if ( count( $mts_pool ) >= 6 ) {
		break;
	}
}

if ( ! $mts_pool ) {
	return;
}
?>
<section class="tmx grain">
	<div class="wrap">
		<div class="section-head">
			<span class="eyebrow eyebrow--onink"><?php esc_html_e( 'Testimonials', 'mytapestore' ); ?></span>
			<h2 class="tmx__title"><?php esc_html_e( 'Trusted by thousands of happy customers', 'mytapestore' ); ?></h2>
			<p class="tmx__lead"><?php esc_html_e( 'Real reviews from Australian trade & DIY buyers.', 'mytapestore' ); ?></p>
		</div>
	</div>

	<div class="tmx__marquee">
		<div class="tmx__track">
			<?php for ( $mts_pass = 0; $mts_pass < 2; $mts_pass++ ) : ?>
				<?php foreach ( $mts_pool as $mts_review ) : ?>
					<?php
					$mts_rating  = (int) get_comment_meta( $mts_review->comment_ID, 'rating', true );
					$mts_author  = $mts_review->comment_author ?: __( 'Verified buyer', 'mytapestore' );
					$mts_product = get_the_title( $mts_review->comment_post_ID );
					?>
					<figure class="tmx__card"<?php echo 0 === $mts_pass ? '' : ' aria-hidden="true"'; ?>>
						<div class="tmx__stars">
							<span class="tmx__starrow" aria-label="<?php echo esc_attr( sprintf( /* translators: %d: rating */ __( '%d out of 5', 'mytapestore' ), $mts_rating ) ); ?>">
								<?php for ( $mts_s = 1; $mts_s <= 5; $mts_s++ ) : ?>
									<?php mts_the_icon( 'star', 16, $mts_s <= $mts_rating ? 'on' : 'off' ); ?>
								<?php endfor; ?>
							</span>
						</div>
						<blockquote><?php echo esc_html( $mts_review->comment_content ); ?></blockquote>
						<figcaption>
							<span class="tmx__ava"><?php echo esc_html( mb_strtoupper( mb_substr( $mts_author, 0, 1 ) ) ); ?></span>
							<span class="tmx__who">
								<b><?php echo esc_html( $mts_author ); ?></b>
								<em><?php echo esc_html( $mts_product ); ?></em>
							</span>
						</figcaption>
					</figure>
				<?php endforeach; ?>
			<?php endfor; ?>
		</div>
	</div>
</section>
