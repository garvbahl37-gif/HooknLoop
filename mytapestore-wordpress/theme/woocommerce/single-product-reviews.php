<?php
/**
 * Product reviews.
 *
 * BUILT TO THE STYLESHEET'S ACTUAL CONTRACT. The previous version used the right
 * class NAMES in the wrong SHAPE, which is why it looked broken rather than
 * unstyled — every rule matched something, just not the element it was drawn for:
 *
 *   · `.pdp-rev__avg` is a COLUMN CONTAINER (flex, centred, with a right-hand
 *     divider) holding the 3.4rem figure, the stars and the count. It was put on
 *     the <b> itself, so the divider and the centring had nothing to lay out and
 *     the number, stars and count fell into a row.
 *   · `.pdp-rev__summary` is a two-column grid — `grid-template-columns: auto 1fr`
 *     — expecting `.pdp-rev__avg` beside `.pdp-rev__bars`. The bars were rendered
 *     OUTSIDE it, so the grid had one child, the second column collapsed, and the
 *     distribution bars sat adrift under the card.
 *   · `.pdp-rev__ava` is the round initial INSIDE `.pdp-rev__who`. It was a
 *     sibling of the text block, so it floated beside the whole review.
 *
 * The form is WooCommerce's comment_form() — it carries the comment nonce, the
 * post ID and the moderation path, and review submission is a write to the
 * database by an anonymous visitor. The rating control is the design's own star
 * picker driving the `rating` field WooCommerce reads.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

global $product;

if ( ! $product instanceof WC_Product ) {
	return;
}

$mts_count = (int) $product->get_review_count();
$mts_avg   = (float) $product->get_average_rating();

$mts_reviews = get_comments( array(
	'post_id' => $product->get_id(),
	'status'  => 'approve',
	'type'    => 'review',
	'number'  => 50,
	'orderby' => 'comment_date_gmt',
	'order'   => 'DESC',
) );

// Distribution: how many reviews at each star level, highest first.
$mts_dist = array( 5 => 0, 4 => 0, 3 => 0, 2 => 0, 1 => 0 );
foreach ( get_comments( array(
	'post_id' => $product->get_id(),
	'status'  => 'approve',
	'type'    => 'review',
	'number'  => 500,
) ) as $mts_c ) {
	$mts_r = (int) get_comment_meta( $mts_c->comment_ID, 'rating', true );
	if ( isset( $mts_dist[ $mts_r ] ) ) {
		++$mts_dist[ $mts_r ];
	}
}
?>
<div id="reviews" class="pdp-rev">

	<div class="pdp-rev__head">

		<?php if ( $mts_count > 0 ) : ?>
			<div class="pdp-rev__summary">
				<div class="pdp-rev__avg">
					<b class="num"><?php echo esc_html( number_format_i18n( $mts_avg, 1 ) ); ?></b>
					<?php
					get_template_part( 'template-parts/stars', null, array(
						'rating' => $mts_avg,
						'count'  => 0,
						'size'   => 18,
					) );
					?>
					<span>
						<?php
						printf(
							/* translators: %s: review count */
							esc_html( _n( '%s review', '%s reviews', $mts_count, 'mytapestore' ) ),
							esc_html( number_format_i18n( $mts_count ) )
						);
						?>
					</span>
				</div>

				<div class="pdp-rev__bars">
					<?php foreach ( $mts_dist as $mts_stars => $mts_n ) : ?>
						<?php $mts_pct = $mts_count > 0 ? round( ( $mts_n / $mts_count ) * 100 ) : 0; ?>
						<div class="pdp-rev__bar">
							<span class="num"><?php echo esc_html( (string) $mts_stars ); ?>★</span>
							<?php
							/*
							 * DIVs, not SPANs. `.pdp-rev__fill` is styled with
							 * `height: 100%` and an inline width — both of which a
							 * browser ignores on an inline box. As spans the bars
							 * rendered as five identical empty grey tracks, so a
							 * product with five 5-star reviews looked like a product
							 * with none.
							 */
							?>
							<div class="pdp-rev__track">
								<div class="pdp-rev__fill" style="width:<?php echo esc_attr( (string) $mts_pct ); ?>%"></div>
							</div>
							<span class="pdp-rev__n num"><?php echo esc_html( number_format_i18n( $mts_n ) ); ?></span>
						</div>
					<?php endforeach; ?>
				</div>
			</div>
		<?php else : ?>
			<div class="pdp-rev__empty">
				<?php mts_the_icon( 'star', 30 ); ?>
				<p><?php esc_html_e( 'No reviews yet — be the first to review this product.', 'mytapestore' ); ?></p>
			</div>
		<?php endif; ?>

		<?php if ( comments_open() ) : ?>
			<button class="pdp-rev__write-btn btn btn--ghost" type="button" data-mts-review-toggle
					aria-expanded="false" aria-controls="mts-review-form">
				<?php esc_html_e( 'Write a review', 'mytapestore' ); ?>
			</button>
		<?php endif; ?>
	</div>

	<?php if ( comments_open() ) : ?>
		<div class="pdp-rev__form" id="mts-review-form" role="group"
			 aria-label="<?php esc_attr_e( 'Write a review', 'mytapestore' ); ?>" hidden>
			<?php
			$mts_commenter = wp_get_current_commenter();

			/*
			 * The star picker writes into this hidden input, which is the field
			 * WooCommerce reads ($_POST['rating']). It ships with a real <select>
			 * fallback inside a <noscript> so a review can still be rated without
			 * JavaScript — a picker that is the only way to set a required field
			 * would otherwise make the form unusable when the script fails.
			 */
			$mts_rating_field = '<div class="pdp-rev__form-row">'
				. '<label id="mts-rating-label">' . esc_html__( 'Your rating', 'mytapestore' ) . '&nbsp;<span class="required">*</span></label>'
				. '<div class="pdp-rev__pick" role="radiogroup" aria-labelledby="mts-rating-label" data-mts-rating-pick>';

			for ( $mts_i = 1; $mts_i <= 5; $mts_i++ ) {
				$mts_rating_field .= sprintf(
					'<button type="button" class="pdp-rev__pickstar" role="radio" aria-checked="false" data-mts-rating="%1$d" aria-label="%2$s">%3$s</button>',
					$mts_i,
					esc_attr( sprintf( /* translators: %d: star rating */ _n( '%d star', '%d stars', $mts_i, 'mytapestore' ), $mts_i ) ),
					mts_icon( 'star', 26 )
				);
			}

			$mts_rating_field .= '</div>'
				. '<input type="hidden" name="rating" id="mts-rating" value="" required>'
				. '<noscript><select name="rating" required>'
				. '<option value="">' . esc_html__( 'Rate…', 'mytapestore' ) . '</option>'
				. '<option value="5">5</option><option value="4">4</option><option value="3">3</option>'
				. '<option value="2">2</option><option value="1">1</option>'
				. '</select></noscript></div>';

			/*
			 * The form title is NOT a heading.
			 *
			 * It was an <h4>, and WordPress appends its "Cancel reply" link into
			 * the same element — so the product page's outline carried
			 * "Write a review Cancel reply" as an H4 hanging off the Reviews H2.
			 * The Shopify product page has no heading at this point at all, and
			 * this was the last structural difference between the two templates.
			 *
			 * It keeps its visual treatment and stops being a landmark. The form
			 * region is named instead — see the aria-label on .pdp-rev__form —
			 * which is what the heading was really doing.
			 */
			comment_form( array(
				'title_reply'          => __( 'Write a review', 'mytapestore' ),
				'title_reply_before'   => '<span class="pdp-rev__formtitle">',
				'title_reply_after'    => '</span>',
				'class_form'           => 'pdp-rev__form-inner',
				'class_submit'         => 'btn btn--brand btn--lg',
				'label_submit'         => __( 'Submit review', 'mytapestore' ),
				'logged_in_as'         => '',
				'comment_notes_before' => $mts_rating_field,
				'comment_notes_after'  => '',
				'comment_field'        => '<p class="pdp-rev__form-row"><label for="comment">' . esc_html__( 'Your review', 'mytapestore' ) . '&nbsp;<span class="required">*</span></label><textarea id="comment" name="comment" cols="45" rows="6" required></textarea></p>',
				'fields'               => array(
					'author' => '<p class="pdp-rev__form-row"><label for="author">' . esc_html__( 'Name', 'mytapestore' ) . '&nbsp;<span class="required">*</span></label><input id="author" name="author" type="text" autocomplete="name" value="' . esc_attr( $mts_commenter['comment_author'] ) . '" required></p>',
					'email'  => '<p class="pdp-rev__form-row"><label for="email">' . esc_html__( 'Email', 'mytapestore' ) . '&nbsp;<span class="required">*</span></label><input id="email" name="email" type="email" autocomplete="email" value="' . esc_attr( $mts_commenter['comment_author_email'] ) . '" required></p>',
				),
				'submit_button'        => '<button name="%1$s" type="submit" id="%2$s" class="%3$s">%4$s</button>',
				'submit_field'         => '<div class="pdp-rev__form-actions">%1$s %2$s</div>',
			) );
			?>
		</div>
	<?php endif; ?>

	<?php if ( $mts_reviews ) : ?>
		<ol class="pdp-rev__list">
			<?php foreach ( $mts_reviews as $mts_review ) : ?>
				<?php
				$mts_rating   = (int) get_comment_meta( $mts_review->comment_ID, 'rating', true );
				$mts_author   = $mts_review->comment_author ? $mts_review->comment_author : __( 'Verified buyer', 'mytapestore' );
				$mts_verified = (bool) get_comment_meta( $mts_review->comment_ID, 'verified', true );
				?>
				<li class="pdp-rev__item">
					<div class="pdp-rev__meta">
						<?php
						/*
						 * The avatar lives INSIDE .pdp-rev__who — that rule is an
						 * inline-flex row of [initial][name], so lifting the circle out
						 * of it leaves the name unaligned and the circle floating.
						 */
						?>
						<b class="pdp-rev__who">
							<span class="pdp-rev__ava" aria-hidden="true"><?php echo esc_html( mb_strtoupper( mb_substr( $mts_author, 0, 1 ) ) ); ?></span>
							<?php echo esc_html( $mts_author ); ?>
						</b>

						<?php
						get_template_part( 'template-parts/stars', null, array(
							'rating' => (float) $mts_rating,
							'count'  => 0,
							'size'   => 14,
						) );
						?>

						<?php if ( $mts_verified ) : ?>
							<span class="pdp-rev__verified"><?php mts_the_icon( 'badgeCheck', 13 ); ?> <?php esc_html_e( 'Verified purchase', 'mytapestore' ); ?></span>
						<?php endif; ?>

						<time class="pdp-rev__date" datetime="<?php echo esc_attr( get_comment_date( 'c', $mts_review ) ); ?>">
							<?php echo esc_html( get_comment_date( '', $mts_review ) ); ?>
						</time>
					</div>

					<p><?php echo esc_html( $mts_review->comment_content ); ?></p>
				</li>
			<?php endforeach; ?>
		</ol>
	<?php endif; ?>

</div>
