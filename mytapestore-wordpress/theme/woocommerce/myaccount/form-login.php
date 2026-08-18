<?php
/**
 * Sign in + create account — the Shopify login and register sections, merged.
 *
 * Shopify gives these their own URLs (sections/mts-customers-login.liquid and
 * mts-customers-register.liquid); WooCommerce serves both from /my-account/ in
 * one template. So the two cards are stacked in the same single-column
 * .mts-auth well the Shopify login page already uses to stack its sign-in and
 * password-recovery cards — same 520px measure, same .contact__form card, same
 * 22px rhythm. Woo's own two-column .u-columns/.col2-set layout is dropped: the
 * theme has no styles for it, so it rendered as two unstyled stacked blocks
 * anyway.
 *
 * NOTHING WOOCOMMERCE READS HAS BEEN TOUCHED, AND THE FAILURE MODE IS SILENT.
 * WC_Form_Handler::process_login() runs only when `login`, `username` and
 * `password` are all posted AND `woocommerce-login-nonce` verifies;
 * process_registration() runs only when `register` and `email` are posted AND
 * `woocommerce-register-nonce` verifies. Miss any one of those — drop the
 * button's name= while restyling it, rename a nonce field — and the handler
 * does not error. It returns. The page reloads looking untouched and nobody can
 * sign in.
 *
 * The two registration conditionals are Woo's, not decoration. When the store
 * generates usernames or passwords itself, process_registration() ignores those
 * POST keys entirely, so rendering the fields would collect input that is
 * thrown away and then mail the customer a password they did not choose.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

/*
 * All three are store settings read straight from the options table, exactly as
 * Woo's own template reads them. They are not cosmetic: a store can be set to
 * refuse public registration entirely, and rendering the card anyway gives
 * visitors a form whose submission process_registration() will never look at.
 */
$mts_registration_on = 'yes' === get_option( 'woocommerce_enable_myaccount_registration' );
$mts_ask_username    = 'no' === get_option( 'woocommerce_registration_generate_username' );
$mts_ask_password    = 'no' === get_option( 'woocommerce_registration_generate_password' );

/*
 * Where to land after signing in. Both handlers prefer $_POST['redirect'] and
 * only fall back to the referer — which browsers withhold often enough that
 * "sign in to finish checking out" is exactly the journey that loses it and
 * dumps the customer on the dashboard with their cart still waiting.
 *
 * Woo's Blocks package already prints an identical field on
 * woocommerce_login_form_end, so on a stock install the login form gets two.
 * That is deliberate and harmless — same name, same value, PHP keeps the last —
 * and it is what keeps the redirect working on stores where Blocks is disabled.
 *
 * `redirect_to` is the query arg WordPress core and Woo both already use, so
 * existing links keep working. No open-redirect risk either: the handler runs
 * the value through wp_validate_redirect(), which pins anything off-site back
 * to the account page.
 */
/*
 * is_string() is not defensive padding — without it this line is a 500.
 *
 * wp_unslash() passes an array straight through, and esc_url_raw() → esc_url()
 * calls ltrim() on it, which on PHP 8 is a fatal TypeError. So a request to
 * /my-account/?redirect_to[]=x took the SIGN-IN PAGE down with an uncaught
 * error, for anyone, without logging in. Verified: HTTP 500 before this guard,
 * 200 after.
 */
// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only redirect target, validated by the handler.
$mts_redirect_raw = isset( $_GET['redirect_to'] ) ? wp_unslash( $_GET['redirect_to'] ) : '';
$mts_redirect     = is_string( $mts_redirect_raw ) ? esc_url_raw( $mts_redirect_raw ) : '';

/*
 * Repopulate only the form that was actually submitted. Woo's stock template
 * fills BOTH username inputs from $_POST['username'], so a failed sign-in
 * pre-filled the "choose a username" field on the register card underneath with
 * the address the visitor was trying to log in with.
 */
$mts_login_username = ( isset( $_POST['login'], $_POST['username'] ) && is_string( $_POST['username'] ) ) ? wp_unslash( $_POST['username'] ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Missing,WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
$mts_reg_username   = ( isset( $_POST['register'], $_POST['username'] ) && is_string( $_POST['username'] ) ) ? wp_unslash( $_POST['username'] ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Missing,WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
$mts_reg_email      = ( isset( $_POST['register'], $_POST['email'] ) && is_string( $_POST['email'] ) ) ? wp_unslash( $_POST['email'] ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Missing,WordPress.Security.ValidatedSanitizedInput.InputNotSanitized

/*
 * WHICH PANEL IS OPEN.
 *
 * The page used to render sign-in AND create-account as two stacked cards, both
 * always visible, each with a link to the other. A returning customer had to
 * work out which of two forms was theirs, and the page ran to twice the height
 * it needed. One form is shown at a time now.
 *
 * Decided on the SERVER so it survives a failed submission and works with no
 * JavaScript: a failed registration re-opens the register panel with its errors,
 * and /my-account/?action=register is a real, linkable URL. assets/js/auth.js
 * only makes the switch instant.
 */
$mts_active = 'login';

// phpcs:ignore WordPress.Security.NonceVerification -- choosing which panel to show, not trusting it.
if ( isset( $_POST['register'] ) || ( isset( $_GET['action'] ) && 'register' === $_GET['action'] ) ) {
	$mts_active = 'register';
}

if ( ! $mts_registration_on ) {
	$mts_active = 'login';
}
?>

<?php
/*
 * .mts-authpage exists because page.php puts `acct` on the <main> for every
 * account page, and .acct is a 256px/1fr dashboard grid expecting a sidebar and
 * a panel. Signed out there is no sidebar, so without a single wrapper spanning
 * both tracks the breadcrumbs land in the 256px column, the hero in the 1fr
 * column beside them, and the sign-in card on a second row back in the 256px
 * column. See cssNeeded — this class needs a rule.
 */
?>
<div class="mts-authpage">

	<div class="wrap page__crumbs">
		<?php
		get_template_part( 'template-parts/breadcrumbs', null, array(
			'items' => array(
				array( 'label' => __( 'Home', 'mytapestore' ), 'href' => home_url( '/' ) ),
				array( 'label' => __( 'Sign in', 'mytapestore' ) ),
			),
		) );
		?>
	</div>

	<section class="page-hero">
		<div class="wrap">
			<span class="eyebrow eyebrow--onink"><?php esc_html_e( 'Account', 'mytapestore' ); ?></span>
			<h1><?php esc_html_e( 'Sign in', 'mytapestore' ); ?></h1>
		</div>
	</section>

	<div class="wrap mts-auth" id="customer_login">

		<?php
		/*
		 * woocommerce_output_all_notices hangs off this at priority 10, so it is
		 * what prints "Error: the password you entered is incorrect", "your
		 * password has been reset" and every social-login plugin's buttons.
		 * Stock fires it before all markup, which put those banners above the
		 * breadcrumbs, flush under the header; here they sit at the top of the
		 * auth column, directly above the form they are about. Same as
		 * checkout/form-checkout.php does with .chk__notices.
		 */
		do_action( 'woocommerce_before_customer_login_form' );
		?>

		<?php if ( $mts_registration_on ) : ?>
			<?php
			/*
			 * Two tabs, one card. The links are real URLs, so with JavaScript off
			 * they still switch panels — by loading the page again with the other
			 * one open, which is the whole reason $mts_active is decided on the
			 * server.
			 */
			?>
			<div class="mts-auth__tabs" role="tablist" aria-label="<?php esc_attr_e( 'Sign in or create an account', 'mytapestore' ); ?>">
				<a class="mts-auth__tab<?php echo 'login' === $mts_active ? ' is-active' : ''; ?>"
				   role="tab" aria-selected="<?php echo 'login' === $mts_active ? 'true' : 'false'; ?>"
				   aria-controls="mts-signin" data-mts-auth-tab="login"
				   href="<?php echo esc_url( remove_query_arg( 'action' ) ); ?>">
					<?php esc_html_e( 'Sign in', 'mytapestore' ); ?>
				</a>
				<a class="mts-auth__tab<?php echo 'register' === $mts_active ? ' is-active' : ''; ?>"
				   role="tab" aria-selected="<?php echo 'register' === $mts_active ? 'true' : 'false'; ?>"
				   aria-controls="mts-register" data-mts-auth-tab="register"
				   href="<?php echo esc_url( add_query_arg( 'action', 'register' ) ); ?>">
					<?php esc_html_e( 'Create account', 'mytapestore' ); ?>
				</a>
			</div>
		<?php endif; ?>

		<div class="contact__form mts-auth__panel" id="mts-signin" role="tabpanel"
			 data-mts-auth-panel="login" <?php echo 'login' === $mts_active ? '' : 'hidden'; ?>>
			<h2><?php esc_html_e( 'Sign in', 'mytapestore' ); ?></h2>

			<form class="woocommerce-form woocommerce-form-login login" method="post" novalidate>

				<?php do_action( 'woocommerce_login_form_start' ); ?>

				<?php
				/*
				 * "Email or username", not Shopify's plain "Email": Woo
				 * authenticates on either, and on a store that lets customers
				 * pick their own username the shorter label tells half of them
				 * their credentials are wrong.
				 *
				 * The input is a child of its label, which is the idiom every
				 * .contact__form in this theme uses — the label styling assumes
				 * it. for= is kept as well so #username stays addressable by the
				 * password managers and plugins that look for it.
				 */
				?>
				<label for="username">
					<?php esc_html_e( 'Email or username', 'mytapestore' ); ?>
					<input type="text" name="username" id="username" autocomplete="username"
						   value="<?php echo esc_attr( $mts_login_username ); ?>"
						   required aria-required="true">
				</label>

				<label for="password">
					<?php esc_html_e( 'Password', 'mytapestore' ); ?>
					<input type="password" name="password" id="password" autocomplete="current-password"
						   required aria-required="true">
				</label>

				<?php do_action( 'woocommerce_login_form' ); ?>

				<label class="filt__check" for="rememberme">
					<input type="checkbox" name="rememberme" id="rememberme" value="forever">
					<span><?php esc_html_e( 'Remember me', 'mytapestore' ); ?></span>
				</label>

				<?php wp_nonce_field( 'woocommerce-login', 'woocommerce-login-nonce' ); ?>

				<?php if ( '' !== $mts_redirect ) : ?>
					<input type="hidden" name="redirect" value="<?php echo esc_url( $mts_redirect ); ?>">
				<?php endif; ?>

				<?php
				/*
				 * name="login" is load-bearing — process_login() keys off it.
				 * value= is never read by anything, so it carries the visible
				 * label rather than Woo's "Log in".
				 */
				?>
				<button type="submit" name="login" value="<?php esc_attr_e( 'Sign in', 'mytapestore' ); ?>"
						class="btn btn--brand btn--lg btn--block woocommerce-form-login__submit">
					<?php mts_the_icon( 'lock', 18 ); ?> <?php esc_html_e( 'Sign in', 'mytapestore' ); ?>
				</button>

				<?php do_action( 'woocommerce_login_form_end' ); ?>

			</form>

			<?php
			/*
			 * wp_lostpassword_url(), not a hand-built /my-account/lost-password/
			 * link: WooCommerce filters lostpassword_url to its own endpoint, so
			 * this follows the store's account page wherever it is mounted and
			 * keeps working if that page is renamed.
			 */
			?>
			<p class="mts-auth__note">
				<a href="<?php echo esc_url( wp_lostpassword_url() ); ?>"><?php esc_html_e( 'Forgot your password?', 'mytapestore' ); ?></a>
			</p>

			<?php if ( $mts_registration_on ) : ?>
				<p class="mts-auth__note">
					<?php esc_html_e( 'New here?', 'mytapestore' ); ?>
					<a href="<?php echo esc_url( add_query_arg( 'action', 'register' ) ); ?>"
					   data-mts-auth-tab="register"><?php esc_html_e( 'Create account', 'mytapestore' ); ?></a>
				</p>
			<?php endif; ?>
		</div>

		<?php if ( $mts_registration_on ) : ?>

			<div class="contact__form mts-auth__panel" id="mts-register" role="tabpanel"
				 data-mts-auth-panel="register" <?php echo 'register' === $mts_active ? '' : 'hidden'; ?>>
				<h2><?php esc_html_e( 'Create account', 'mytapestore' ); ?></h2>

				<?php
				/*
				 * woocommerce_register_form_tag is echoed INSIDE the opening tag
				 * — it is where reCAPTCHA and anti-spam plugins add their
				 * attributes. Moving it out of the tag silently disarms them.
				 *
				 * There are deliberately no first/last name fields here even
				 * though Shopify's register page has them:
				 * process_registration() reads only username, email and
				 * password, so a name field would be typed, submitted and
				 * discarded. Adding them properly needs a
				 * woocommerce_created_customer handler, which lives in inc/, not
				 * in a template.
				 */
				?>
				<form method="post" class="woocommerce-form woocommerce-form-register register" <?php do_action( 'woocommerce_register_form_tag' ); ?>>

					<?php do_action( 'woocommerce_register_form_start' ); ?>

					<?php if ( $mts_ask_username ) : ?>
						<label for="reg_username">
							<?php esc_html_e( 'Username', 'mytapestore' ); ?>
							<input type="text" name="username" id="reg_username" autocomplete="username"
								   value="<?php echo esc_attr( $mts_reg_username ); ?>"
								   required aria-required="true">
						</label>
					<?php endif; ?>

					<label for="reg_email">
						<?php esc_html_e( 'Email', 'mytapestore' ); ?>
						<input type="email" name="email" id="reg_email" autocomplete="email"
							   value="<?php echo esc_attr( $mts_reg_email ); ?>"
							   required aria-required="true">
					</label>

					<?php if ( $mts_ask_password ) : ?>
						<label for="reg_password">
							<?php esc_html_e( 'Password', 'mytapestore' ); ?>
							<input type="password" name="password" id="reg_password" autocomplete="new-password"
								   required aria-required="true">
						</label>
					<?php else : ?>
						<p class="mts-auth__note"><?php esc_html_e( 'A link to set a new password will be sent to your email address.', 'mytapestore' ); ?></p>
					<?php endif; ?>

					<?php do_action( 'woocommerce_register_form' ); ?>

					<?php wp_nonce_field( 'woocommerce-register', 'woocommerce-register-nonce' ); ?>

					<?php
					/*
					 * The register handler honours $_POST['redirect'] too, and
					 * nothing in core adds it to this form — only to the login
					 * one. Without it, registering part-way through checkout
					 * drops the customer on the account dashboard.
					 */
					?>
					<?php if ( '' !== $mts_redirect ) : ?>
						<input type="hidden" name="redirect" value="<?php echo esc_url( $mts_redirect ); ?>">
					<?php endif; ?>

					<button type="submit" name="register" value="<?php esc_attr_e( 'Create', 'mytapestore' ); ?>"
							class="btn btn--brand btn--lg btn--block woocommerce-form-register__submit">
						<?php esc_html_e( 'Create', 'mytapestore' ); ?>
					</button>

					<?php do_action( 'woocommerce_register_form_end' ); ?>

				</form>

				<p class="mts-auth__note">
					<?php esc_html_e( 'Already have an account?', 'mytapestore' ); ?>
					<a href="#mts-signin"><?php esc_html_e( 'Sign in', 'mytapestore' ); ?></a>
				</p>
			</div>

		<?php endif; ?>

		<?php
		/*
		 * Fired inside the wrapper, not after it. Anything a plugin echoes here
		 * — a "sign in with Google" block, a privacy notice — would otherwise be
		 * a bare child of the .acct grid on <main> and get dropped into the
		 * empty 256px sidebar track.
		 */
		do_action( 'woocommerce_after_customer_login_form' );
		?>

	</div>

</div>
