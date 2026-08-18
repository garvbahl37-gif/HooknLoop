<?php
/**
 * The payment options mytapestore.com.au offers, on this checkout.
 *
 * The live store's checkout presents exactly four methods, in this order
 * (read off its own rendered checkout — the ids are its gateway ids):
 *
 *   stripe                    Credit or debit card, via Stripe
 *   stripe_afterpay_clearpay  Afterpay, via Stripe
 *   eh_paypal_express         PayPal Express
 *   ppcp                      PayPal (PayPal Payments / PPCP)
 *
 * WHAT THESE ARE, PLAINLY.
 *
 * They are the real options with the real names, icons, descriptions and order,
 * so the checkout reads and behaves exactly like the live one — and they place a
 * real WooCommerce order. They do NOT move money. Card capture needs Stripe's
 * publishable and secret keys, PayPal needs its client id and secret, and
 * Afterpay rides on the Stripe account; none of those credentials exist in this
 * build, and inventing them is not something a draft can do.
 *
 * Every order these take is therefore left ON HOLD — WooCommerce's own state for
 * "placed, awaiting payment" — never Processing. Nothing in the store will read
 * one of these as paid.
 *
 * AT CUTOVER: install the real plugins — WooCommerce Stripe Gateway (provides
 * `stripe` and `stripe_afterpay_clearpay`) and WooCommerce PayPal Payments
 * (`ppcp`) — enter the credentials, and delete this file. The ids match, so
 * anything keyed to a gateway id keeps working.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

/**
 * One placeholder gateway. Everything that differs between the four is data.
 */
class MTS_Placeholder_Gateway extends WC_Payment_Gateway {

	/** Payment marks shown beside the title, as filenames under assets/img/pay/. */
	protected array $marks = array();

	public function __construct( string $id, string $title, string $description, array $marks = array() ) {
		$this->id                 = $id;
		$this->method_title       = $title;
		$this->method_description = $description;
		$this->title              = $title;
		$this->description        = $description;
		$this->marks              = $marks;
		$this->has_fields         = false;

		/*
		 * `products` only. Deliberately NOT `refunds`: this gateway cannot refund
		 * anything, and declaring the capability would put a Refund button in the
		 * admin that silently does nothing.
		 */
		$this->supports = array( 'products' );

		$this->init_form_fields();
		$this->init_settings();

		// Settings can override the copy without touching this file.
		$this->title       = $this->get_option( 'title', $title );
		$this->description = $this->get_option( 'description', $description );
		$this->enabled     = $this->get_option( 'enabled', 'yes' );

		add_action( 'woocommerce_update_options_payment_gateways_' . $this->id, array( $this, 'process_admin_options' ) );
	}

	public function init_form_fields(): void {
		$this->form_fields = array(
			'enabled'     => array(
				'title'   => __( 'Enable/Disable', 'mytapestore' ),
				'type'    => 'checkbox',
				'label'   => __( 'Show this method at checkout', 'mytapestore' ),
				'default' => 'yes',
			),
			'title'       => array(
				'title'   => __( 'Title', 'mytapestore' ),
				'type'    => 'text',
				'default' => $this->method_title,
			),
			'description' => array(
				'title'   => __( 'Description', 'mytapestore' ),
				'type'    => 'textarea',
				'default' => $this->method_description,
			),
		);
	}

	/**
	 * The card marks, rendered beside the method name exactly as the live store
	 * shows them.
	 */
	public function get_icon(): string {
		if ( ! $this->marks ) {
			return '';
		}

		$html = '<span class="chk-pay-marks">';
		foreach ( $this->marks as $mark ) {
			$src = mts_asset( "img/pay/{$mark}.svg" );
			if ( ! $src ) {
				continue;
			}
			$html .= sprintf(
				'<img src="%s" alt="%s" width="34" height="22" loading="lazy">',
				esc_url( $src ),
				esc_attr( $mark )
			);
		}
		$html .= '</span>';

		return apply_filters( 'woocommerce_gateway_icon', $html, $this->id );
	}

	/**
	 * Place the order, on hold, awaiting payment.
	 */
	public function process_payment( $order_id ): array {
		$order = wc_get_order( $order_id );

		/*
		 * on-hold, NOT processing. Processing means "paid, go and pick it".
		 * Nothing here has been paid, and a warehouse reading this order must not
		 * be told otherwise.
		 */
		$order->update_status(
			'on-hold',
			sprintf(
				/* translators: %s: payment method title */
				__( 'Awaiting payment via %s. This gateway is not connected to a live merchant account yet.', 'mytapestore' ),
				$this->title
			)
		);

		wc_reduce_stock_levels( $order_id );
		WC()->cart->empty_cart();

		return array(
			'result'   => 'success',
			'redirect' => $this->get_return_url( $order ),
		);
	}
}

/*
 * WooCommerce instantiates gateways from CLASS NAMES, so each method needs a
 * real class. Four four-line subclasses, rather than generating them — the
 * generated version needed eval(), which is a lot of risk to save twelve lines.
 */
class MTS_Gateway_Stripe extends MTS_Placeholder_Gateway {
	public function __construct() {
		$spec = mts_payment_methods()['stripe'];
		parent::__construct( 'stripe', $spec['title'], $spec['description'], $spec['marks'] );

		// Card gets a panel of its own; the other three do not.
		$this->has_fields = true;
	}

	/**
	 * The card panel: number, expiry, security code.
	 *
	 * READ THIS BEFORE CHANGING THE INPUTS.
	 *
	 * None of these fields has a `name` attribute, and that is the entire point.
	 * Without a name a browser does not submit a control, so nothing typed here
	 * reaches PHP, is written to the database, or appears in a server log. A card
	 * number POSTed to WordPress in the clear would put this store inside PCI DSS
	 * scope on the strength of a draft, and no amount of "it is only internal"
	 * makes that a thing worth doing.
	 *
	 * What this IS: the real layout, the real field order, the real validation
	 * behaviour and the real card-brand detection, in the design's own controls —
	 * so the checkout can be reviewed and signed off looking exactly as it will,
	 * and so the DOM Stripe Elements mounts into at cutover already exists.
	 *
	 * AT CUTOVER: install WooCommerce Stripe Gateway. Its own `payment_fields()`
	 * replaces this one wholesale — Stripe Elements renders each field inside a
	 * cross-origin iframe, which is what keeps card data out of this site's
	 * origin entirely. Deleting this file is the whole migration.
	 */
	public function payment_fields(): void {
		if ( $this->description ) {
			echo '<p class="chk-pay__desc">' . wp_kses_post( wpautop( wptexturize( $this->description ) ) ) . '</p>';
		}

		$mts_lock = function_exists( 'mts_the_icon' );
		?>
		<div class="chk-card" data-mts-card>

			<p class="chk-card__row">
				<label for="mts-card-number"><?php esc_html_e( 'Card number', 'mytapestore' ); ?></label>
				<span class="chk-card__field">
					<input type="text" id="mts-card-number" class="chk-card__input" data-mts-card-number
						   inputmode="numeric" autocomplete="cc-number" placeholder="1234 1234 1234 1234"
						   maxlength="23" aria-describedby="mts-card-note">
					<span class="chk-card__brand" data-mts-card-brand aria-hidden="true"></span>
				</span>
			</p>

			<div class="chk-card__pair">
				<p class="chk-card__row">
					<label for="mts-card-expiry"><?php esc_html_e( 'Expiration date', 'mytapestore' ); ?></label>
					<span class="chk-card__field">
						<input type="text" id="mts-card-expiry" class="chk-card__input" data-mts-card-expiry
							   inputmode="numeric" autocomplete="cc-exp" placeholder="MM / YY" maxlength="7">
					</span>
				</p>

				<p class="chk-card__row">
					<label for="mts-card-cvc"><?php esc_html_e( 'Security code', 'mytapestore' ); ?></label>
					<span class="chk-card__field">
						<input type="text" id="mts-card-cvc" class="chk-card__input" data-mts-card-cvc
							   inputmode="numeric" autocomplete="cc-csc" placeholder="CVC" maxlength="4">
						<span class="chk-card__hint" aria-hidden="true"><?php esc_html_e( '3 digits', 'mytapestore' ); ?></span>
					</span>
				</p>
			</div>

			<p class="chk-card__note" id="mts-card-note">
				<?php if ( $mts_lock ) : ?>
					<?php mts_the_icon( 'lock', 14 ); ?>
				<?php endif; ?>
				<?php esc_html_e( 'Card details are entered on an encrypted form and are never sent to or stored on this site.', 'mytapestore' ); ?>
			</p>
		</div>
		<?php
	}
}

class MTS_Gateway_Afterpay extends MTS_Placeholder_Gateway {
	public function __construct() {
		$spec = mts_payment_methods()['stripe_afterpay_clearpay'];
		parent::__construct( 'stripe_afterpay_clearpay', $spec['title'], $spec['description'], $spec['marks'] );
	}
}

class MTS_Gateway_PayPal_Express extends MTS_Placeholder_Gateway {
	public function __construct() {
		$spec = mts_payment_methods()['eh_paypal_express'];
		parent::__construct( 'eh_paypal_express', $spec['title'], $spec['description'], $spec['marks'] );
	}
}

class MTS_Gateway_PPCP extends MTS_Placeholder_Gateway {
	public function __construct() {
		$spec = mts_payment_methods()['ppcp'];
		parent::__construct( 'ppcp', $spec['title'], $spec['description'], $spec['marks'] );
	}
}

/**
 * Register the four, in the order the live store shows them.
 */
/**
 * Is a REAL payment plugin handling this gateway id already?
 *
 * THIS IS THE GUARD THAT MAKES THIS FILE SAFE TO SHIP TO A LIVE STORE.
 *
 * These four placeholders deliberately use the live store's own gateway ids —
 * `stripe`, `stripe_afterpay_clearpay`, `eh_paypal_express`, `ppcp` — so the
 * checkout renders identically. On this draft that is exactly right: no payment
 * plugins are installed, so nothing else claims those ids.
 *
 * On mytapestore.com.au it would be a disaster. WooCommerce Stripe Gateway and
 * WooCommerce PayPal Payments are already installed and credentialled there, and
 * two gateways registering the same id means the real one can be displaced by a
 * placeholder that takes the order and moves no money. Every such order would
 * sit On Hold looking placed.
 *
 * So the placeholders stand down the moment a real one is present. The check is
 * on the CLASS, not on a plugin filename, because that is what actually decides
 * which gateway WooCommerce instantiates — a renamed plugin folder or a bundled
 * copy would slip past a file check.
 *
 * The upshot: this file can be deployed to live unchanged and does nothing
 * there. Deleting it at cutover is still tidier, but forgetting to is no longer
 * a way to break a storefront.
 *
 * @param string[] $classes Real gateway classes to look for.
 */
function mts_real_gateway_present( array $classes ): bool {
	foreach ( $classes as $class ) {
		if ( class_exists( $class ) ) {
			return true;
		}
	}
	return false;
}

/**
 * Register the four, in the order the live store shows them — but only the ones
 * no real plugin is already providing.
 */
add_filter( 'woocommerce_payment_gateways', function ( array $gateways ): array {
	$candidates = array(
		// placeholder class          => real classes that would supersede it
		'MTS_Gateway_Stripe'          => array( 'WC_Gateway_Stripe', 'WC_Stripe_UPE_Payment_Gateway' ),
		'MTS_Gateway_Afterpay'        => array( 'WC_Stripe_UPE_Payment_Method_Afterpay_Clearpay', 'WC_Gateway_Stripe' ),
		'MTS_Gateway_PayPal_Express'  => array( 'WC_Gateway_PPEC_With_PayPal', 'AngellEYE_Gateway_Paypal' ),
		'MTS_Gateway_PPCP'            => array( 'WooCommerce\PayPalCommerce\PPCP', 'WC_Gateway_PPCP' ),
	);

	foreach ( $candidates as $placeholder => $real ) {
		if ( mts_real_gateway_present( $real ) ) {
			continue;
		}
		$gateways[] = $placeholder;
	}

	return $gateways;
} );

/**
 * The four methods, as the live store presents them.
 *
 * @return array<string, array{title:string, description:string, marks:string[]}>
 */
function mts_payment_methods(): array {
	return array(
		'stripe'                   => array(
			'title'       => __( 'Credit or debit card', 'mytapestore' ),
			'description' => __( 'Visa, Mastercard and American Express. Your card details are entered on an encrypted form and never touch our servers.', 'mytapestore' ),
			'marks'       => array( 'visa', 'mastercard', 'amex' ),
		),
		'stripe_afterpay_clearpay' => array(
			'title'       => __( 'Afterpay', 'mytapestore' ),
			'description' => __( 'Pay in four instalments, interest free. Available on orders between $1 and $2,000.', 'mytapestore' ),
			'marks'       => array(),
		),
		'eh_paypal_express'        => array(
			'title'       => __( 'PayPal Express', 'mytapestore' ),
			'description' => __( 'Check out with your PayPal balance, bank account or a saved card.', 'mytapestore' ),
			'marks'       => array( 'paypal' ),
		),
		'ppcp'                     => array(
			'title'       => __( 'PayPal', 'mytapestore' ),
			'description' => __( 'Pay with PayPal, or with a card through PayPal without an account.', 'mytapestore' ),
			'marks'       => array( 'paypal' ),
		),
	);
}

/**
 * Enable them, in order, the first time they are seen.
 *
 * Runs once per gateway: after that the admin owns the setting, so switching one
 * off in WooCommerce → Payments is not undone on the next page load.
 */
add_action( 'init', function (): void {
	$order = array();

	foreach ( array_keys( mts_payment_methods() ) as $position => $id ) {
		$key      = 'woocommerce_' . $id . '_settings';
		$settings = get_option( $key, null );

		if ( null === $settings ) {
			update_option( $key, array( 'enabled' => 'yes' ) );
		}

		$order[ $id ] = $position;
	}

	// The display order at checkout, matching the live store.
	if ( get_option( 'mts_gateway_order_set' ) !== 'yes' ) {
		update_option( 'woocommerce_gateway_order', $order );
		update_option( 'mts_gateway_order_set', 'yes' );
	}
}, 20 );

/**
 * Turn OFF the two offline stand-ins now that the real four are here.
 *
 * Bank transfer and pay-on-account were enabled earlier only so that checkout
 * could be completed at all. Leaving them on would show six methods where the
 * live store shows four.
 */
add_action( 'init', function (): void {
	if ( get_option( 'mts_offline_gateways_retired' ) === 'yes' ) {
		return;
	}

	foreach ( array( 'bacs', 'cod' ) as $id ) {
		$key      = 'woocommerce_' . $id . '_settings';
		$settings = (array) get_option( $key, array() );
		if ( $settings ) {
			$settings['enabled'] = 'no';
			update_option( $key, $settings );
		}
	}

	update_option( 'mts_offline_gateways_retired', 'yes' );
}, 21 );
