<?php
/**
 * Category editorial content, rendered below the product grid.
 *
 * Blocks are kept generic on purpose — heading / paragraph / list / faq, in the
 * order they were authored. Forcing every category's copy into a fixed set of
 * named fields (benefits, applications, …) silently drops whatever does not fit
 * that shape, and these 38 categories do not share one shape.
 *
 * FAQs use <details>/<summary>: an accordion the platform already implements,
 * so it opens, closes and announces correctly with no JavaScript.
 *
 * @param WP_Term $args['term']
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

$mts_term = $args['term'] ?? null;
if ( ! $mts_term instanceof WP_Term ) {
	return;
}

$mts_blocks = json_decode( (string) get_term_meta( $mts_term->term_id, '_mts_seo_blocks', true ), true );
$mts_intro  = trim( wp_strip_all_tags( (string) $mts_term->description ) );

if ( ! $mts_blocks && ! $mts_intro ) {
	return;
}
?>
<section class="section catseo">
	<div class="wrap catseo__main">
		<div class="catseo__card">

			<?php if ( $mts_intro ) : ?>
				<div class="catseo__intro">
					<span class="catseo__intro-eyebrow"><?php esc_html_e( 'Overview', 'mytapestore' ); ?></span>
					<?php echo wp_kses_post( wpautop( $mts_term->description ) ); ?>
				</div>
			<?php endif; ?>

			<?php
			foreach ( (array) $mts_blocks as $mts_block ) :
				$mts_type = (string) ( $mts_block['type'] ?? '' );

				if ( 'heading' === $mts_type ) :
					/*
					 * H2, not H3 — matching sections/mts-collection.liquid, which
					 * renders these as `<h2 class="catseo__heading">`. As H3 they
					 * sat at the same level as the product card titles above them,
					 * so the SEO copy read as part of the grid rather than as its
					 * own section of the page.
					 *
					 * And a heading that only says "FAQ" is SKIPPED, exactly as
					 * Liquid does:
					 *
					 *     {%- unless htext == 'faq' or htext == 'faqs'
					 *        or htext == 'frequently asked questions' -%}
					 *
					 * The FAQ block below carries its own "Frequently asked"
					 * eyebrow, so printing the heading too gave the section two
					 * labels — and it was the one extra heading this page had over
					 * the Shopify original.
					 */
					$mts_heading = trim( (string) ( $mts_block['text'] ?? '' ) );
					$mts_key     = strtolower( trim( (string) preg_replace( '/[^a-z ]/i', '', $mts_heading ) ) );

					if ( '' !== $mts_heading && ! in_array( $mts_key, array( 'faq', 'faqs', 'frequently asked questions' ), true ) ) :
						?>
						<h2 class="catseo__heading"><?php echo esc_html( $mts_heading ); ?></h2>
						<?php
					endif;

				elseif ( 'p' === $mts_type ) :
					?>
					<p><?php echo esc_html( (string) ( $mts_block['text'] ?? '' ) ); ?></p>
					<?php

				elseif ( in_array( $mts_type, array( 'list', 'items' ), true ) ) :
					?>
					<ul class="catseo__list">
						<?php foreach ( (array) ( $mts_block['items'] ?? array() ) as $mts_li ) : ?>
							<li>
								<?php mts_the_icon( 'check', 14 ); ?>
								<span><?php echo esc_html( is_array( $mts_li ) ? ( $mts_li['text'] ?? '' ) : (string) $mts_li ); ?></span>
							</li>
						<?php endforeach; ?>
					</ul>
					<?php

				elseif ( 'faq' === $mts_type ) :
					$mts_qas = (array) ( $mts_block['qas'] ?? $mts_block['items'] ?? array() );
					if ( ! $mts_qas ) {
						continue;
					}
					?>
					<div class="catseo__faqs">
						<span class="catseo__faqs-eyebrow"><?php esc_html_e( 'Frequently asked', 'mytapestore' ); ?></span>
						<ul class="faq__list">
							<?php foreach ( $mts_qas as $mts_i => $mts_qa ) : ?>
								<li class="faq__item">
									<details<?php echo 0 === $mts_i ? ' open' : ''; ?>>
										<summary class="faq__q">
											<span><?php echo esc_html( (string) ( $mts_qa['q'] ?? '' ) ); ?></span>
											<?php mts_the_icon( 'plus', 18 ); ?>
										</summary>
										<div class="faq__a"><p><?php echo esc_html( (string) ( $mts_qa['a'] ?? '' ) ); ?></p></div>
									</details>
								</li>
							<?php endforeach; ?>
						</ul>
					</div>
					<?php
				endif;
			endforeach;
			?>

			<?php
			/*
			 * The "Still not sure which tape is right for the job? / Talk to our tape
			 * experts" block was removed by request.
			 *
			 * Nothing is lost from the page: the collection already carries the call
			 * button pinned bottom-left on every screen, the chat widget bottom-right,
			 * and the phone number and email in the footer. This was a fourth prompt
			 * to make contact, sitting at the end of the SEO copy where it read as
			 * filler rather than help.
			 */
			?>

		</div>
	</div>
</section>
