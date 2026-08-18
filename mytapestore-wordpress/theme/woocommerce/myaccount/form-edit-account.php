<?php
/**
 * Account details — the "Account details" panel from the Shopify dashboard
 * (sections/mts-customers-account.liquid), turned back into an editable form.
 *
 * Shopify's dashboard can only DISPLAY name, email and phone: classic customer
 * accounts give the storefront no way to edit them, so that panel is a read-only
 * <dl class="cart__sum-rows acct__form">. WooCommerce does let a customer edit
 * them, and the password with them, so the panel here is the same heading and
 * lede over a real form. .contact__form is the theme's existing treatment for a
 * bare form — its `label` and `input` rules are descendant selectors, so they
 * reach these fields without a single WooCommerce class being renamed.
 *
 * NOT ONE FIELD IS TOUCHED. Every name, id, autocomplete token and aria-* below
 * is byte-for-byte WooCommerce's:
 *   account_first_name, account_last_name, account_display_name, account_email,
 *   password_current, password_1, password_2.
 * WC_Form_Handler::save_account_details() reads these keys directly out of
 * $_POST. It also reads the password fields even when they are blank — that is
 * how "leave blank to leave unchanged" works — so removing the password fieldset
 * does not simply hide password changing, it removes the only place a customer
 * can change a password without going through the lost-password email.
 *
 * THE NONCE PAIR IS ASYMMETRIC AND THAT IS NOT A TYPO. The action is underscored
 * ('save_account_details'); the field name is HYPHENATED
 * ('save-account-details-nonce'). Transpose them, or drop the hidden
 * input[name="action"], and the handler `return`s with no notice at all: the page
 * reloads, the old values come back, and nothing says why.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hook - woocommerce_before_edit_account_form.
 *
 * @since 2.6.0
 */
do_action( 'woocommerce_before_edit_account_form' );
?>

<div class="acct__panel">

	<h2><?php esc_html_e( 'Account details', 'mytapestore' ); ?></h2>
	<p class="acct__lede"><?php esc_html_e( 'Your contact details and how you sign in.', 'mytapestore' ); ?></p>

	<?php
	/*
	 * woocommerce_edit_account_form_tag is echoed INSIDE the opening tag, not
	 * around it — it is how plugins add enctype="multipart/form-data" (avatar
	 * uploads) or a data-* attribute their script binds to. Move it outside the
	 * tag and the attribute lands in the page as loose text.
	 *
	 * The two Woo classes stay: password-strength-meter and several account
	 * plugins select `form.edit-account` / `.woocommerce-EditAccountForm`.
	 */
	?>
	<form class="woocommerce-EditAccountForm edit-account contact__form" action="" method="post" <?php do_action( 'woocommerce_edit_account_form_tag' ); ?>>

		<?php do_action( 'woocommerce_edit_account_form_start' ); ?>

		<?php
		/*
		 * Woo pairs first/last name with float classes (form-row-first /
		 * form-row-last) that this theme has no floats for. .contact__row is the
		 * design's own two-up grid and is what the Shopify address snippet uses
		 * for exactly this pair. Woo's classes are kept on the <p>s anyway, so a
		 * plugin that targets them still finds them.
		 *
		 * The stock <div class="clear"> spacers are gone with the floats they
		 * existed to clear. They are not a hook and nothing reads them; left in,
		 * one of them would have become a phantom cell in this grid.
		 */
		?>
		<div class="contact__row">
			<p class="woocommerce-form-row woocommerce-form-row--first form-row form-row-first">
				<label for="account_first_name">
					<?php esc_html_e( 'First name', 'mytapestore' ); ?>&nbsp;<span class="required" aria-hidden="true">*</span>
				</label>
				<input type="text" class="woocommerce-Input woocommerce-Input--text input-text"
					   name="account_first_name" id="account_first_name" autocomplete="given-name"
					   value="<?php echo esc_attr( $user->first_name ); ?>" aria-required="true" />
			</p>
			<p class="woocommerce-form-row woocommerce-form-row--last form-row form-row-last">
				<label for="account_last_name">
					<?php esc_html_e( 'Last name', 'mytapestore' ); ?>&nbsp;<span class="required" aria-hidden="true">*</span>
				</label>
				<input type="text" class="woocommerce-Input woocommerce-Input--text input-text"
					   name="account_last_name" id="account_last_name" autocomplete="family-name"
					   value="<?php echo esc_attr( $user->last_name ); ?>" aria-required="true" />
			</p>
		</div>

		<p class="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">
			<label for="account_display_name">
				<?php esc_html_e( 'Display name', 'mytapestore' ); ?>&nbsp;<span class="required" aria-hidden="true">*</span>
			</label>
			<input type="text" class="woocommerce-Input woocommerce-Input--text input-text"
				   name="account_display_name" id="account_display_name"
				   aria-describedby="account_display_name_description"
				   value="<?php echo esc_attr( $user->display_name ); ?>" aria-required="true" />
			<?php
			/*
			 * The id is referenced by aria-describedby above and must survive.
			 * .acct__lede is borrowed here only for its muted colour — it is the
			 * theme's one existing "supporting text" class, and the alternative
			 * was an unstyled <em> sitting at full body contrast, competing with
			 * the label it is meant to sit under.
			 *
			 * wc_reviews_enabled() changes the sentence because with reviews off
			 * the display name is never shown publicly, and telling a customer it
			 * appears "in reviews" on a store with no reviews is just wrong.
			 */
			?>
			<span id="account_display_name_description" class="acct__lede">
				<em>
					<?php
					echo wc_reviews_enabled()
						? esc_html__( 'This is how your name appears in your account and on reviews.', 'mytapestore' )
						: esc_html__( 'This is how your name appears in your account.', 'mytapestore' );
					?>
				</em>
			</span>
		</p>

		<p class="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">
			<label for="account_email">
				<?php esc_html_e( 'Email address', 'mytapestore' ); ?>&nbsp;<span class="required" aria-hidden="true">*</span>
			</label>
			<input type="email" class="woocommerce-Input woocommerce-Input--email input-text"
				   name="account_email" id="account_email" autocomplete="email"
				   value="<?php echo esc_attr( $user->user_email ); ?>" aria-required="true" />
		</p>

		<?php
		/**
		 * Hook where additional fields should be rendered.
		 *
		 * @since 8.7.0
		 */
		do_action( 'woocommerce_edit_account_form_fields' );
		?>

		<?php
		/*
		 * <fieldset> and <legend>, kept from stock. The three password inputs are
		 * one control — a screen reader that reads "Current password" with no
		 * group around it gives no clue that leaving all three blank is allowed.
		 * Woo's password-strength meter also injects its readout as the last child
		 * of the password_1 row, so the grouping is where the feedback lands.
		 */
		?>
		<fieldset>
			<legend><?php esc_html_e( 'Password change', 'mytapestore' ); ?></legend>

			<p class="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">
				<label for="password_current"><?php esc_html_e( 'Current password (leave blank to leave unchanged)', 'mytapestore' ); ?></label>
				<input type="password" class="woocommerce-Input woocommerce-Input--password input-text"
					   name="password_current" id="password_current" autocomplete="current-password" />
			</p>
			<p class="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">
				<label for="password_1"><?php esc_html_e( 'New password (leave blank to leave unchanged)', 'mytapestore' ); ?></label>
				<input type="password" class="woocommerce-Input woocommerce-Input--password input-text"
					   name="password_1" id="password_1" autocomplete="new-password" />
			</p>
			<p class="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">
				<label for="password_2"><?php esc_html_e( 'Confirm new password', 'mytapestore' ); ?></label>
				<input type="password" class="woocommerce-Input woocommerce-Input--password input-text"
					   name="password_2" id="password_2" autocomplete="new-password" />
			</p>
		</fieldset>

		<?php
		/**
		 * My Account edit account form.
		 *
		 * @since 2.6.0
		 */
		do_action( 'woocommerce_edit_account_form' );
		?>

		<p class="acct__form-actions">
			<?php
			/*
			 * Nonce, submit and hidden action, in one place so they cannot drift
			 * apart. See the file header: losing either the nonce or the hidden
			 * action makes saving a no-op that reports success by saying nothing.
			 */
			wp_nonce_field( 'save_account_details', 'save-account-details-nonce' );
			?>
			<button type="submit" class="btn btn--brand btn--lg woocommerce-Button" name="save_account_details"
					value="<?php esc_attr_e( 'Save changes', 'mytapestore' ); ?>">
				<?php mts_the_icon( 'check', 16 ); ?>
				<?php esc_html_e( 'Save changes', 'mytapestore' ); ?>
			</button>
			<input type="hidden" name="action" value="save_account_details" />
		</p>

		<?php do_action( 'woocommerce_edit_account_form_end' ); ?>

	</form>

</div>

<?php
/**
 * Hook - woocommerce_after_edit_account_form.
 */
do_action( 'woocommerce_after_edit_account_form' );
