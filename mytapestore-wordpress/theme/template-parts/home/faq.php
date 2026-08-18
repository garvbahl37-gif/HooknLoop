<?php
/**
 * FAQ — FAQ() in src/sections/home.jsx.
 *
 * Accordion beside the delivery-coverage map.
 *
 * Built on <details>/<summary> rather than button+div: it is an accordion in
 * the platform, so it opens, closes and announces correctly with no JavaScript
 * at all, and stays keyboard-operable if a script fails to load. The first item
 * ships open, matching the React default of open === 0.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

$mts_faqs = apply_filters( 'mts_home_faqs', array(
	array(
		__( 'How quickly can I receive my tape order in Australia?', 'mytapestore' ),
		__( 'We dispatch Australia-wide to 3,600+ postcodes, and most orders arrive within 2–3 business days once dispatched, with express options available at checkout.', 'mytapestore' ),
	),
	array(
		__( 'Can you deliver adhesive tape all over Australia?', 'mytapestore' ),
		__( 'Yes — we deliver to Melbourne, Sydney, Brisbane, Perth, Adelaide, Darwin and more than 3,600 postcodes right across the country.', 'mytapestore' ),
	),
	array(
		__( 'What industries do you supply adhesive tape to?', 'mytapestore' ),
		__( 'From construction, automotive and marine to signage, packaging, electronics, HVAC and healthcare — browse our industry pages to find the right tape for your sector.', 'mytapestore' ),
	),
	array(
		__( 'Do you offer bulk or wholesale pricing?', 'mytapestore' ),
		__( 'Yes. Volume discounts of up to 30% apply automatically at checkout, and trade accounts unlock further pricing and priority support.', 'mytapestore' ),
	),
	array(
		__( 'Can I track my adhesive tape order online?', 'mytapestore' ),
		__( "Absolutely — you'll receive tracking as soon as your order ships, so you can follow it right to your door.", 'mytapestore' ),
	),
	array(
		__( 'What payment methods do you accept?', 'mytapestore' ),
		__( 'We accept all major cards (Visa, Mastercard, Amex), PayPal and Shop Pay through a secure, encrypted checkout.', 'mytapestore' ),
	),
	array(
		__( 'What types of adhesive tape can I buy online?', 'mytapestore' ),
		__( 'Double-sided, foam, foil, duct, hook & loop, packaging, safety, masking and specialty tapes — plus dispensers — over 130 lines held in stock.', 'mytapestore' ),
	),
) );

$mts_map = mts_asset( 'img/site/australia-map.jpg' );
?>
<section class="section faq">
	<div class="wrap">
		<div class="section-head">
			<span class="eyebrow"><?php esc_html_e( 'Good to know', 'mytapestore' ); ?></span>
			<h2><?php esc_html_e( 'Frequently asked questions', 'mytapestore' ); ?></h2>
		</div>

		<div class="faq__grid">
			<ul class="faq__list">
				<?php foreach ( $mts_faqs as $mts_i => $mts_faq ) : ?>
					<li class="faq__item">
						<details<?php echo 0 === $mts_i ? ' open' : ''; ?> name="mts-faq">
							<summary class="faq__q">
								<span><?php echo esc_html( $mts_faq[0] ); ?></span>
								<?php mts_the_icon( 'plus', 18 ); ?>
							</summary>
							<div class="faq__a"><p><?php echo esc_html( $mts_faq[1] ); ?></p></div>
						</details>
					</li>
				<?php endforeach; ?>
			</ul>

			<?php if ( $mts_map ) : ?>
				<aside class="faq__map">
					<img src="<?php echo esc_url( $mts_map ); ?>"
						 alt="<?php esc_attr_e( 'Map of Australia showing our nationwide delivery coverage', 'mytapestore' ); ?>"
						 loading="lazy">
					<div class="faq__map-copy">
						<span class="faq__map-badge"><?php mts_the_icon( 'pin', 15 ); ?> <?php esc_html_e( 'Australia-wide delivery', 'mytapestore' ); ?></span>
						<b><?php esc_html_e( 'We deliver to 3,600+ postcodes', 'mytapestore' ); ?></b>
						<p><?php esc_html_e( 'Sydney, Melbourne, Brisbane, Perth, Adelaide, Darwin and everywhere in between — most orders arrive in 2–3 business days.', 'mytapestore' ); ?></p>
					</div>
				</aside>
			<?php endif; ?>
		</div>
	</div>
</section>
