<?php
/**
 * Lost password — request the reset email.
 *
 * Shopify has no page for this; recovery is the #recover card that
 * sections/mts-customers-login.liquid toggles into view over the sign-in card.
 * WooCommerce makes it a real endpoint with its own URL, so the same card is
 * given the login page's shell — breadcrumbs, ink hero, one .contact__form in
 * the 520px .mts-auth well — rather than a bare form dropped onto the page.
 *
 * THREE THINGS MAKE THIS FORM WORK AND ALL THREE ARE INVISIBLE.
 * WC_Form_Handler::process_lost_password() will not even look at the request
 * unless `wc_reset_password` is posted, `user_login` is posted, and
 * `woocommerce-lost-password-nonce` verifies against the 'lost_password'
 * action. Lose any of them and the form posts, the page redraws, and no email
 * is ever sent — with no error to say so.
 *
 * The message stays behind apply_filters( 'woocommerce_lost_password_message' )
 * because that filter is how stores reword it (and how security plugins
 * neutralise the "no account with that email" disclosure).
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

/*
 * This endpoint is reachable while signed in — it is the page the "set your
 * password" link in a new-customer email lands on — so the trail cannot assume
 * the account page says "Sign in".
 */
$mts_signed_in     = is_user_logged_in();
$mts_account_url   = wc_get_page_permalink( 'myaccount' );
$mts_account_label = $mts_signed_in ? __( 'My account', 'mytapestore' ) : __( 'Sign in', 'mytapestore' );
$mts_back_label    = $mts_signed_in ? __( 'Back to my account', 'mytapestore' ) : __( 'Back to sign in', 'mytapestore' );
?>

<?php
/*
 * See form-login.php: page.php puts `acct` on the <main> of every account page,
 * and .acct is the 256px/1fr dashboard grid. Every band below needs to be one
 * grid child spanning both tracks or the layout comes apart. See cssNeeded.
 */
?>
<div class="mts-authpage">

	<div class="wrap page__crumbs">
		<?php
		get_template_part( 'template-parts/breadcrumbs', null, array(
			'items' => array(
				array( 'label' => __( 'Home', 'mytapestore' ), 'href' => home_url( '/' ) ),
				array( 'label' => $mts_account_label, 'href' => $mts_account_url ),
				array( 'label' => __( 'Reset password', 'mytapestore' ) ),
			),
		) );
		?>
	</div>

	<section class="page-hero">
		<div class="wrap">
			<span class="eyebrow eyebrow--onink"><?php esc_html_e( 'Account', 'mytapestore' ); ?></span>
			<h1><?php esc_html_e( 'Reset your password', 'mytapestore' ); ?></h1>
		</div>
	</section>

	<div class="wrap mts-auth">

		<?php
		/*
		 * woocommerce_output_all_notices is bound to this at priority 10, so it
		 * carries the confirmation and the "invalid username or email" error.
		 * Fired here rather than above the breadcrumbs so the banner sits with
		 * the field it refers to.
		 */
		do_action( 'woocommerce_before_lost_password_form' );
		?>

		<?php
		/*
		 * No <h2> in the card. The hero already says "Reset your password", and
		 * the Shopify cards that own their page (register, reset password) drop
		 * the heading for exactly that reason — only the login card keeps one,
		 * because it shares its page with the recovery card.
		 */
		?>
		<div class="contact__form">

			<form method="post" class="woocommerce-ResetPassword lost_reset_password">

				<p class="mts-auth__note"><?php echo wp_kses_post( apply_filters( 'woocommerce_lost_password_message', esc_html__( 'We will send you an email with a link to reset your password.', 'mytapestore' ) ) ); ?></p>

				<?php
				/*
				 * The input is a child of its label — the idiom every
				 * .contact__form in this theme is styled for. for= is kept so
				 * #user_login stays addressable by password managers.
				 */
				?>
				<label for="user_login">
					<?php esc_html_e( 'Email or username', 'mytapestore' ); ?>
					<input type="text" name="user_login" id="user_login" autocomplete="username"
						   required aria-required="true">
				</label>

				<?php do_action( 'woocommerce_lostpassword_form' ); ?>

				<input type="hidden" name="wc_reset_password" value="true">

				<button type="submit" class="btn btn--brand btn--lg btn--block"
						value="<?php esc_attr_e( 'Send reset link', 'mytapestore' ); ?>">
					<?php mts_the_icon( 'mail', 18 ); ?> <?php esc_html_e( 'Send reset link', 'mytapestore' ); ?>
				</button>

				<?php wp_nonce_field( 'lost_password', 'woocommerce-lost-password-nonce' ); ?>

			</form>

			<p class="mts-auth__note">
				<a href="<?php echo esc_url( $mts_account_url ); ?>"><?php echo esc_html( $mts_back_label ); ?></a>
			</p>
		</div>

		<?php
		/*
		 * Inside the wrapper on purpose: markup echoed here by a plugin would
		 * otherwise be a bare child of the .acct grid and land in the unused
		 * 256px sidebar track.
		 */
		do_action( 'woocommerce_after_lost_password_form' );
		?>

	</div>

</div>
