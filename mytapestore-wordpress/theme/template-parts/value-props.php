<?php
/**
 * "Buy with confidence" trust band.
 *
 * Four reassurance cards above the footer. Rendered on EVERY page, not just the
 * homepage — it is the last thing a hesitating buyer reads before the footer,
 * so it belongs wherever a decision might be made, which is everywhere.
 *
 * It is included from footer.php rather than composed into each template, so a
 * new page type cannot accidentally ship without it.
 *
 * The artwork is full-colour illustration, not line icons: these four are
 * deliberately warmer than the rest of the icon set because they are selling
 * reassurance rather than labelling a control. They are <img> for that reason —
 * inlining them as currentColor glyphs would flatten the flag and the
 * best-price badge into silhouettes.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

$mts_props = apply_filters( 'mts_value_props', array(
	array(
		'icon'  => 'img/icons/fast-delivery.svg',
		'title' => __( 'Fast delivery Australia-wide', 'mytapestore' ),
		'body'  => __( 'Dispatched in 1–2 business days to 3,600+ postcodes.', 'mytapestore' ),
	),
	array(
		'icon'  => 'img/icons/secure-payment.svg',
		'title' => __( 'Secure payment', 'mytapestore' ),
		'body'  => __( 'Checkout safely with major cards, PayPal and Shop Pay.', 'mytapestore' ),
	),
	array(
		'icon'  => 'img/icons/price.svg',
		'title' => __( 'Lowest-price guarantee', 'mytapestore' ),
		'body'  => __( 'Find a stocked line cheaper and we’ll match it.', 'mytapestore' ),
	),
	array(
		'icon'  => 'img/icons/flag-australia.svg',
		'title' => __( 'Australian owned', 'mytapestore' ),
		'body'  => __( 'Local stock, local support and honest advice.', 'mytapestore' ),
	),
) );

// Drop any card whose artwork is missing rather than render an empty frame.
$mts_props = array_values( array_filter(
	$mts_props,
	static fn( array $p ): bool => '' !== mts_asset( $p['icon'] )
) );

if ( ! $mts_props ) {
	return;
}
?>
<section class="section vprops-sec">
	<div class="wrap">
		<div class="section-head">
			<span class="eyebrow"><?php esc_html_e( 'Why My Tape Store', 'mytapestore' ); ?></span>
			<h2><?php esc_html_e( 'Buy with confidence', 'mytapestore' ); ?></h2>
		</div>

		<div class="vprops">
			<?php foreach ( $mts_props as $mts_prop ) : ?>
				<div class="vprop">
					<span class="vprop__icon">
						<img src="<?php echo esc_url( mts_asset( $mts_prop['icon'] ) ); ?>" alt=""
							 width="44" height="44" loading="lazy" decoding="async">
					</span>
					<h3><?php echo esc_html( $mts_prop['title'] ); ?></h3>
					<p><?php echo esc_html( $mts_prop['body'] ); ?></p>
				</div>
			<?php endforeach; ?>
		</div>
	</div>
</section>
