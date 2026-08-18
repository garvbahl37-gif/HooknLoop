<?php
/**
 * Address finder — the server-side half, which is now almost nothing.
 *
 * THE FINDER IS FULLY LOCAL AND NEEDS NO SERVER AT ALL.
 *
 * assets/data/au-localities.txt holds all 15,318 Australian localities —
 * suburb, state and postcode — as 289KB of text, ~113KB gzipped. assets/js/
 * address.js fetches it once and matches in memory, so a keystroke costs a
 * string comparison rather than a request. Measured: 5–9ms per lookup with
 * results on the FIRST character, against 700–1150ms for the version this
 * replaced.
 *
 * WHAT WAS REMOVED, AND WHY
 *
 *   THE LOCATIONIQ PROXY. The street line used to autocomplete through a
 *   third-party geocoder. That meant an account, an API key in wp-config, a
 *   5,000/day quota, a 2-per-second rate limit shared across the whole site,
 *   and a licence condition to display their attribution. It also meant the
 *   feature silently stopped working on any install where the key was absent —
 *   which is exactly what happened on the demo.
 *
 *   THE wp_mts_localities TABLE and its REST endpoints. They existed to serve
 *   the suburb lookup from the database. A static file does the same job with
 *   no table to create, no activation hook to fire, no query per keystroke, and
 *   nothing that can fail to install. Dropping it is what makes this work the
 *   moment the theme is activated on any WordPress, with no plugin and no
 *   setup.
 *
 * WHAT IS DELIBERATELY NOT AUTOCOMPLETED
 *
 * The street line. Street-level Australian address data is G-NAF's full address
 * file — 15.8 million records, about 1.5GB — which cannot live in a theme or a
 * browser. It is also the one part of an address only the customer knows. So
 * the street field is an ordinary text input, as it is on most Australian
 * checkouts, and the fields that decide the shipping zone are the ones that
 * complete themselves.
 *
 * WHAT REMAINS HERE
 *
 * The attribution. G-NAF is CC BY, so the Geoscape credit is a condition of
 * using the data at all, not a courtesy.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

/**
 * The credit the G-NAF licence requires.
 *
 * The LocationIQ credit that used to sit beside this is gone with the service.
 */
function mts_address_attribution(): string {
	return '<p class="addr-credit">' . sprintf(
		/* translators: %s: Geoscape Australia link */
		esc_html__( 'Address data incorporates G-NAF © %s.', 'mytapestore' ),
		'<a href="https://geoscape.com.au/legal/data-copyright-and-disclaimer/" rel="noopener nofollow" target="_blank">Geoscape Australia</a>'
	) . '</p>';
}

/**
 * Print the credit wherever the address fields are.
 *
 * Bound to the hooks rather than added to a template, so it cannot be lost the
 * next time one of those templates is overridden — and losing it is a licence
 * breach, not a cosmetic regression.
 *
 * wp_kses rather than echo because the string carries anchors and passes through
 * a translation filter, which is a path a translator or a gettext-filtering
 * plugin could otherwise put arbitrary markup through.
 */
function mts_address_print_attribution(): void {
	echo wp_kses(
		mts_address_attribution(),
		array(
			'p' => array( 'class' => array() ),
			'a' => array( 'href' => array(), 'rel' => array(), 'target' => array() ),
		)
	);
}

add_action( 'woocommerce_after_checkout_billing_form', 'mts_address_print_attribution', 30 );
add_action( 'woocommerce_after_edit_address_form_billing', 'mts_address_print_attribution', 30 );
add_action( 'woocommerce_after_edit_address_form_shipping', 'mts_address_print_attribution', 30 );
