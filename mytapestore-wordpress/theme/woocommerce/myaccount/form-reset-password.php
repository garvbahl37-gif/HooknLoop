<?php
/**
 * Set a new password — the page the emailed reset link lands on.
 *
 * Port of sections/mts-customers-reset-password.liquid: ink hero carrying the
 * eyebrow, the heading and the instruction, then a single .contact__form card
 * in the 520px .mts-auth well. No breadcrumbs — Shopify has none here, and
 * rightly: the visitor arrived from an email, so there is no trail behind them.
 *
 * THE FOUR HIDDEN FIELDS ARE THE WHOLE FEATURE.
 * WC_Form_Handler::process_reset_password() bails unless `wc_reset_password` is
 * posted and `woocommerce-reset-password-nonce` verifies against the
 * 'reset_password' action; WC_Shortcode_My_Account::reset_password() then
 * checks `reset_key` against `reset_login` and refuses anything it cannot
 * match. reset_key/reset_login are the only proof that this browser opened the
 * emailed link — drop them while tidying the markup and every reset silently
 * fails as "invalid key", including for the customer whose link is perfectly
 * good.
 *
 * $args['key'] and $args['login'] are read exactly as Woo passes them, not
 * re-derived from the query string: WC_Shortcode_My_Account moves the key out
 * of the URL into a cookie on first view so it cannot leak through a referer
 * header, and by the time this template renders the URL no longer has it.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;
?>

<?php
/*
 * See form-login.php: page.php puts `acct` on the <main> of every account page,
 * and .acct is the 256px/1fr dashboard grid. One wrapper spanning both tracks
 * keeps the hero and the card in normal flow. See cssNeeded.
 */
?>
<div class="mts-authpage">

	<section class="page-hero">
		<div class="wrap">
			<span class="eyebrow eyebrow--onink"><?php esc_html_e( 'Account', 'mytapestore' ); ?></span>
			<h1><?php esc_html_e( 'Reset account password', 'mytapestore' ); ?></h1>
			<?php
			/*
			 * Kept behind woocommerce_reset_password_message so a store or a
			 * password-policy plugin can state its own rules here — that filter
			 * is the only place they get to say "at least 12 characters" before
			 * the customer types one.
			 */
			?>
			<p><?php echo wp_kses_post( apply_filters( 'woocommerce_reset_password_message', esc_html__( 'Enter a new password below.', 'mytapestore' ) ) ); ?></p>
		</div>
	</section>

	<div class="wrap mts-auth">

		<?php
		/*
		 * woocommerce_output_all_notices is bound here at priority 10 — this is
		 * where "the passwords do not match" and "this key is no longer valid"
		 * appear. Fired inside the auth column so the message sits above the
		 * fields rather than under the site header.
		 */
		do_action( 'woocommerce_before_reset_password_form' );
		?>

		<?php
		/*
		 * No <h2>: the hero already carries the heading, matching the Shopify
		 * card, which has none either.
		 */
		?>
		<div class="contact__form">

			<form method="post" class="woocommerce-ResetPassword lost_reset_password">

				<?php
				/*
				 * Inputs are children of their labels — the idiom every
				 * .contact__form in this theme is styled for. for= is kept so
				 * #password_1 / #password_2 stay addressable by the password
				 * managers and strength-meter plugins that look for them.
				 */
				?>
				<label for="password_1">
					<?php esc_html_e( 'New password', 'mytapestore' ); ?>
					<input type="password" name="password_1" id="password_1" autocomplete="new-password"
						   required aria-required="true">
				</label>

				<label for="password_2">
					<?php esc_html_e( 'Confirm new password', 'mytapestore' ); ?>
					<input type="password" name="password_2" id="password_2" autocomplete="new-password"
						   required aria-required="true">
				</label>

				<input type="hidden" name="reset_key" value="<?php echo esc_attr( $args['key'] ); ?>">
				<input type="hidden" name="reset_login" value="<?php echo esc_attr( $args['login'] ); ?>">

				<?php do_action( 'woocommerce_resetpassword_form' ); ?>

				<input type="hidden" name="wc_reset_password" value="true">

				<button type="submit" class="btn btn--brand btn--lg btn--block"
						value="<?php esc_attr_e( 'Reset password', 'mytapestore' ); ?>">
					<?php mts_the_icon( 'lock', 18 ); ?> <?php esc_html_e( 'Reset password', 'mytapestore' ); ?>
				</button>

				<?php wp_nonce_field( 'reset_password', 'woocommerce-reset-password-nonce' ); ?>

			</form>
		</div>

		<?php
		/*
		 * Inside the wrapper on purpose: markup echoed here by a plugin would
		 * otherwise be a bare child of the .acct grid and land in the unused
		 * 256px sidebar track.
		 */
		do_action( 'woocommerce_after_reset_password_form' );
		?>

	</div>

</div>
