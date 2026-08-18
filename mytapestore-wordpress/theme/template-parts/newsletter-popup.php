<?php
/**
 * Newsletter modal, shown once after a delay on the visitor's first look around.
 *
 * The Shopify store has this and WordPress did not — one of the store's two
 * signup paths was simply missing. Ported from snippets/mts-newsletter-popup.liquid.
 *
 * Design note: the store's signature device is the hazard-tape stripe, so the
 * dialog is edged with it rather than given a gradient or a stock photo. One
 * brand button, charcoal type, nothing else competing — the CTA is the only
 * flare on screen while it is open.
 *
 * Behaviour (assets/js/popup.js):
 *   · fires after `delay` seconds, first visit only
 *   · dismissal remembered for `snooze` days; a successful signup is permanent
 *   · never appears on the cart or checkout, where it would interrupt a purchase
 *   · Esc and backdrop close it; focus is trapped and returned
 *   · honours prefers-reduced-motion
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

/** Off on the pages where an interruption costs an order. */
if ( function_exists( 'is_cart' ) && ( is_cart() || is_checkout() ) ) {
	return;
}

/**
 * Seconds before the popup appears, and days a dismissal is remembered.
 * Matches the Shopify theme settings (popup_delay 10, popup_snooze 30).
 */
$mts_delay  = (int) apply_filters( 'mts_popup_delay', 10 );
$mts_snooze = (int) apply_filters( 'mts_popup_snooze', 30 );

if ( ! apply_filters( 'mts_popup_enabled', true ) ) {
	return;
}

$mts_logo = mts_asset( 'img/site/logo.png' );
?>
<div class="mts-pop" data-mts-popup
	 data-delay="<?php echo esc_attr( (string) $mts_delay ); ?>"
	 data-snooze="<?php echo esc_attr( (string) $mts_snooze ); ?>"
	 role="dialog" aria-modal="true" aria-labelledby="mts-pop-title" hidden>
	<div class="mts-pop__scrim" data-mts-popup-close></div>

	<div class="mts-pop__card">
		<button type="button" class="mts-pop__close" data-mts-popup-close
				aria-label="<?php esc_attr_e( 'Close', 'mytapestore' ); ?>">
			<?php mts_the_icon( 'close', 18 ); ?>
		</button>

		<div class="mts-pop__body">
			<?php
			/*
			 * The brand mark does the job a "TRADE LIST" eyebrow would — saying who
			 * this is from — faster and with more authority than a small-caps label.
			 */
			?>
			<a class="mts-pop__logo" href="<?php echo esc_url( home_url( '/' ) ); ?>"
			   aria-label="<?php echo esc_attr( get_bloginfo( 'name' ) ); ?>">
				<?php if ( $mts_logo ) : ?>
					<img src="<?php echo esc_url( $mts_logo ); ?>" alt="<?php echo esc_attr( get_bloginfo( 'name' ) ); ?>"
						 width="168" height="29">
				<?php else : ?>
					<span><?php echo esc_html( get_bloginfo( 'name' ) ); ?></span>
				<?php endif; ?>
			</a>

			<?php
			/*
			 * Deliberately NOT an <h2>. This popup renders on every page of the
			 * store, so as a real heading it would inject the same H2 into the
			 * outline of every URL on the site, competing with each page's actual
			 * H2s. role="heading" keeps it a heading for assistive tech and still
			 * labels the dialog, without joining the crawlable heading structure.
			 */
			?>
			<p class="mts-pop__title" id="mts-pop-title" role="heading" aria-level="2">
				<?php esc_html_e( 'Join our newsletter', 'mytapestore' ); ?>
			</p>

			<p class="mts-pop__text">
				<?php esc_html_e( 'New stock, bulk pricing and the occasional job-site tip. Unsubscribe anytime.', 'mytapestore' ); ?>
			</p>

			<?php
			/*
			 * The same extension point the footer signup uses: a mailing-list
			 * plugin swaps in its own markup through `mts_newsletter_form` and this
			 * fallback steps aside.
			 *
			 * The fallback is a REAL form — inc/newsletter.php stores the address
			 * and fires `mts_newsletter_subscribed` for whichever provider is
			 * chosen. It used to post to the homepage with nothing reading the
			 * field, so every address typed into this popup was discarded while
			 * the visitor watched the page reload and assumed they had subscribed.
			 */
			$mts_form = apply_filters( 'mts_newsletter_form', '', 'popup' );
			?>
			<?php if ( $mts_form ) : ?>
				<div class="mts-pop__formwrap"><?php echo wp_kses_post( $mts_form ); ?></div>
			<?php else : ?>
				<form class="mts-pop__formwrap" method="post" action="<?php echo esc_url( home_url( '/' ) ); ?>">
					<div class="mts-pop__form">
						<label class="screen-reader-text" for="mts-pop-email"><?php esc_html_e( 'Email address', 'mytapestore' ); ?></label>
						<input id="mts-pop-email" type="email" name="mts_newsletter_email" required
							   placeholder="you@company.com.au" autocomplete="email">
						<input type="hidden" name="mts_newsletter_source" value="popup">
						<?php wp_nonce_field( 'mts_newsletter', 'mts_newsletter_nonce' ); ?>
						<button class="btn btn--brand btn--lg" type="submit"><?php esc_html_e( 'Subscribe', 'mytapestore' ); ?></button>
					</div>
				</form>
			<?php endif; ?>

			<p class="mts-pop__fine">
				<?php mts_the_icon( 'lock', 12 ); ?>
				<?php esc_html_e( 'We never share your address.', 'mytapestore' ); ?>
			</p>
		</div>
	</div>
</div>
