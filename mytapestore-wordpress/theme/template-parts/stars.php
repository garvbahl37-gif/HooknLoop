<?php
/**
 * Star rating — port of mytapestore-redesign/src/components/Stars.jsx.
 *
 * Half stars use the `starHalf` glyph, which carries its own gradient fill, so
 * a 4.5 reads as four-and-a-half rather than rounding up and overstating the
 * product. The numeric count sits beside it because a rating without a sample
 * size is not evidence.
 *
 * @param float  $args['rating'] 0–5.
 * @param int    $args['count']  Number of reviews; 0 hides the counter.
 * @param int    $args['size']   Glyph size in px.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

$mts_rating = (float) ( $args['rating'] ?? 0 );
$mts_count  = (int) ( $args['count'] ?? 0 );
$mts_size   = (int) ( $args['size'] ?? 14 );

if ( $mts_rating <= 0 && $mts_count <= 0 ) {
	return;
}
?>
<?php
/*
 * THE CLASS NAMES ARE `stars__on` AND `stars__off`, not `on` and `off`.
 *
 * The stylesheet colours a star with `.stars__on { color: var(--star) }` and
 * `.stars__off { color: var(--line-2) }` — and this file was emitting bare `on`
 * and `off`, which match no rule at all. So every star in the store — product
 * cards, the reviews summary, the testimonial marquee, the rating row on the
 * product page — inherited body ink and rendered as flat dark glyphs, with
 * filled and empty stars indistinguishable from each other.
 *
 * The row is wrapped in `.stars__row` and hidden from assistive tech: the
 * accessible name on the wrapper already says "4.5 out of 5", and without this
 * a screen reader reads five anonymous icons after it.
 */
?>
<span class="stars" aria-label="<?php echo esc_attr( sprintf( /* translators: %s: rating out of 5 */ __( 'Rated %s out of 5', 'mytapestore' ), number_format_i18n( $mts_rating, 1 ) ) ); ?>">
	<span class="stars__row" aria-hidden="true">
		<?php
		// Round to the nearest half, as the design does, so 4.4 shows four stars
		// and 4.3 does not quietly become four and a half.
		$mts_r = round( $mts_rating * 2 ) / 2;

		for ( $mts_i = 1; $mts_i <= 5; $mts_i++ ) {
			if ( $mts_r >= $mts_i ) {
				mts_the_icon( 'star', $mts_size, 'stars__on' );
			} elseif ( $mts_r >= $mts_i - 0.5 ) {
				mts_the_icon( 'starHalf', $mts_size, 'stars__on' );
			} else {
				mts_the_icon( 'star', $mts_size, 'stars__off' );
			}
		}
		?>
	</span>
	<?php if ( $mts_count > 0 ) : ?>
		<span class="stars__count num">(<?php echo esc_html( number_format_i18n( $mts_count ) ); ?>)</span>
	<?php endif; ?>
</span>
