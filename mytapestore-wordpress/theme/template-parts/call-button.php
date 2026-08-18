<?php
/**
 * Floating "Call us" button — bottom LEFT.
 *
 * A bare circle carrying the phone glyph, with a small pinned teaser beside it
 * saying what it is. The teaser sits OUTSIDE the round target (it is absolutely
 * positioned against the button) so the button stays a circle.
 *
 * It used to nest the teaser inside a `.callbtn__txt` wrapper — and
 * `.callbtn__txt` is `display: none` in the stylesheet, which removes its
 * children from rendering entirely. So the label never appeared at all, and the
 * three-line "Free expert advice / Call us / number" block it was written for
 * had already been replaced by the circle.
 *
 * ALWAYS VISIBLE. The earlier version revealed the button past 220px of scroll,
 * which meant the one control for reaching a human was missing from the first
 * screen of every page — exactly where a visitor who wants to phone rather than
 * browse is standing.
 *
 * The number comes from mts_contact() rather than the design's placeholder, so
 * the site never advertises a phone number the business does not answer.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

$mts_contact = mts_contact();
if ( empty( $mts_contact['phone'] ) ) {
	return;
}
?>
<a class="callbtn is-visible" data-mts-callbtn
   href="tel:<?php echo esc_attr( $mts_contact['phone_href'] ); ?>"
   aria-label="<?php echo esc_attr( sprintf( /* translators: %s: phone number */ __( 'Call us on %s', 'mytapestore' ), $mts_contact['phone'] ) ); ?>">
	<span class="callbtn__ic"><?php mts_the_icon( 'phone', 20 ); ?></span>
	<?php
	/*
	 * aria-hidden because the anchor's own label already reads out the full
	 * number — announcing "Call us" twice adds nothing.
	 */
	?>
	<span class="callbtn__teaser" aria-hidden="true"><?php esc_html_e( 'Call us', 'mytapestore' ); ?></span>
</a>
