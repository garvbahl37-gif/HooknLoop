/**
 * The card panel's typing behaviour.
 *
 * WHAT THIS DOES NOT DO: it never reads a value out of the page, never sends one
 * anywhere, and never stores one. The inputs it works on carry no `name`, so the
 * browser does not submit them either — nothing typed into the card panel leaves
 * the tab. See MTS_Gateway_Stripe::payment_fields() for why that is deliberate.
 *
 * What it DOES is the formatting a shopper expects while typing a card: digits
 * grouped, an expiry that gains its own slash, a security code that knows Amex
 * wants four digits, and the brand mark appearing as soon as the number says
 * which network it is. Stripe Elements does all of this; without it the panel
 * looks finished and feels broken, which is the worst combination to sign off.
 *
 * The brand test is the IIN prefix only — the first few digits are what identify
 * the network. It is not a Luhn check and is not validation; the card is
 * validated by the processor, at cutover, and pretending otherwise here would
 * mean writing a second, worse validator that has to agree with Stripe's.
 *
 * EVERY HANDLER IS DELEGATED FROM document. WooCommerce rebuilds the entire
 * payment box on each fragment refresh — a shipping change, a coupon, switching
 * method — and the panel lives inside it. Listeners bound to the inputs
 * themselves die with the first redraw, and the card field silently stops
 * formatting halfway through a checkout. Delegation has no such lifetime.
 */
(function () {
	'use strict';

	/* Prefix ranges, longest first so 34/37 beats a bare 3. Amex is the reason
	   the CVC length changes: its code is four digits, printed on the front. */
	var BRANDS = [
		{ id: 'amex', test: /^3[47]/, groups: [4, 6, 5], cvc: 4 },
		{ id: 'visa', test: /^4/, groups: [4, 4, 4, 4], cvc: 3 },
		{ id: 'mastercard', test: /^(5[1-5]|2[2-7])/, groups: [4, 4, 4, 4], cvc: 3 }
	];

	function digitsOf(value) { return value.replace(/\D/g, ''); }

	function brandFor(digits) {
		for (var i = 0; i < BRANDS.length; i++) {
			if (BRANDS[i].test.test(digits)) { return BRANDS[i]; }
		}
		return null;
	}

	function group(digits, groups) {
		var out = [];
		var at = 0;
		for (var i = 0; i < groups.length && at < digits.length; i++) {
			out.push(digits.substr(at, groups[i]));
			at += groups[i];
		}
		if (at < digits.length) { out.push(digits.substr(at)); }
		return out.join(' ');
	}

	function onNumber(input) {
		var panel = input.closest('[data-mts-card]');
		var digits = digitsOf(input.value).slice(0, 19);
		var found = brandFor(digits);

		input.value = group(digits, found ? found.groups : [4, 4, 4, 4]);

		var brand = panel && panel.querySelector('[data-mts-card-brand]');
		if (brand) {
			brand.textContent = found ? found.id : '';
			brand.setAttribute('data-brand', found ? found.id : '');
		}

		var cvc = panel && panel.querySelector('[data-mts-card-cvc]');
		if (cvc) {
			var len = found ? found.cvc : 3;
			cvc.maxLength = len;
			var hint = panel.querySelector('.chk-card__hint');
			if (hint) { hint.textContent = len + ' digits'; }
		}
	}

	function onExpiry(input, event) {
		var digits = digitsOf(input.value).slice(0, 4);

		/* A leading 2–9 can only be a single-digit month, so 3 becomes 03 on the
		   spot rather than waiting for a second digit that would make it an
		   impossible 3x. */
		if (digits.length === 1 && digits > '1') { digits = '0' + digits; }

		/* Not while deleting: rewriting "03 /" back to "03 / " on backspace traps
		   the caret and the field can never be cleared. */
		var deleting = event.inputType && event.inputType.indexOf('delete') === 0;

		input.value = (digits.length > 2 || (digits.length === 2 && !deleting))
			? digits.slice(0, 2) + ' / ' + digits.slice(2)
			: digits;
	}

	document.addEventListener('input', function (e) {
		var el = e.target;
		if (!el || !el.matches) { return; }

		if (el.matches('[data-mts-card-number]')) { onNumber(el); return; }
		if (el.matches('[data-mts-card-expiry]')) { onExpiry(el, e); return; }
		if (el.matches('[data-mts-card-cvc]')) {
			el.value = digitsOf(el.value).slice(0, el.maxLength > 0 ? el.maxLength : 4);
		}
	});
}());
