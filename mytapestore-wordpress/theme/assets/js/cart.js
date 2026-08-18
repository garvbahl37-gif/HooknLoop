/**
 * Cart page: remove and quantity, instantly.
 *
 * WHAT THIS REPLACED, AND WHY IT WAS SLOW.
 *
 * The first version did the honest-but-expensive thing: it followed
 * WooCommerce's own remove URL, then re-fetched /cart/ and swapped the whole
 * .cart__layout out of the response. That is TWO full page renders — roughly
 * 270KB of HTML — before a single pixel changed, and nothing at all happened on
 * screen while they were in flight. Clicking the × felt broken.
 *
 * Now: the row goes immediately, and one Store API call confirms it. The API
 * answers with the whole cart — totals, item count, every line — so the numbers
 * are the server's, never arithmetic done here.
 *
 * If the call fails the row comes BACK. An optimistic UI that cannot undo itself
 * is just a lie told quickly: the shopper would see the item vanish, the server
 * would still have it, and the next page load would resurrect it.
 *
 * The markup stays a real WooCommerce form, so with JavaScript off the quantity
 * inputs and remove links work exactly as they always did.
 */
(function () {
	'use strict';

	var layout = document.querySelector('.cart__layout');
	var store = window.mtsStore || null;

	if (!layout || !store || !store.root) { return; }

	var storeNonce = store.nonce;
	var busy = false;

	function storeFetch(path, options, retried) {
		var opts = options || {};
		opts.credentials = 'same-origin';
		opts.headers = Object.assign(
			{ 'Content-Type': 'application/json' },
			storeNonce ? { Nonce: storeNonce } : {},
			opts.headers || {}
		);

		return fetch(store.root + path, opts).then(function (res) {
			if ((res.status === 401 || res.status === 403) && !retried) {
				return fetch(store.root + 'cart', { credentials: 'same-origin' }).then(function (probe) {
					storeNonce = probe.headers.get('Nonce') || probe.headers.get('nonce') || storeNonce;
					return storeFetch(path, options, true);
				});
			}
			return res;
		});
	}

	/* Money comes back from the API in MINOR UNITS with a separate precision —
	   1234 and 2 means $12.34. Formatting it here rather than trusting a
	   pre-formatted string keeps the currency symbol and separators the store's
	   own. */
	function money(amount, totals) {
		var minor = parseInt(amount, 10);
		if (isNaN(minor)) { return null; }

		var precision = typeof totals.currency_minor_unit === 'number' ? totals.currency_minor_unit : 2;
		var value = minor / Math.pow(10, precision);

		var body = value.toFixed(precision);
		if (totals.currency_thousand_separator) {
			var parts = body.split('.');
			parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, totals.currency_thousand_separator);
			body = parts.join(totals.currency_decimal_separator || '.');
		}

		return (totals.currency_prefix || '') + body + (totals.currency_suffix || '');
	}

	function paint(cart) {
		var totals = cart.totals || {};

		var subtotal = document.querySelector('[data-mts-cart-subtotal]');
		if (subtotal) {
			var sub = money(totals.total_items, totals);
			if (sub) { subtotal.textContent = sub; }
		}

		var total = document.querySelector('[data-mts-cart-total]');
		if (total) {
			var grand = money(totals.total_price, totals);
			if (grand) { total.textContent = grand; }
		}

		var count = cart.items_count;
		Array.prototype.forEach.call(document.querySelectorAll('[data-mts-cart-items]'), function (el) {
			el.textContent = count === 1 ? '1 item' : count + ' items';
		});

		var badge = document.querySelector('[data-mts-cart-count]');
		if (badge && typeof count === 'number') {
			badge.textContent = String(count);
			badge.hidden = count < 1;
		}

		// Per-line totals, matched on the cart item key the markup carries.
		(cart.items || []).forEach(function (item) {
			var line = document.querySelector('.cart-line[data-key="' + item.key + '"]');
			if (!line) { return; }

			var lineTotal = line.querySelector('[data-mts-line-total]');
			if (lineTotal && item.totals) {
				var value = money(item.totals.line_subtotal, item.totals);
				if (value) { lineTotal.textContent = value; }
			}

			var qtyInput = line.querySelector('[data-mts-line-qty]');
			if (qtyInput && String(item.quantity) !== qtyInput.value) {
				qtyInput.value = String(item.quantity);
			}
		});

		// An emptied cart has a different page entirely — let the server draw it.
		if (typeof count === 'number' && count < 1) { window.location.reload(); }

		document.dispatchEvent(new CustomEvent('mts:cart-changed', { detail: cart }));
	}

	function bind() {
		Array.prototype.forEach.call(document.querySelectorAll('.cart-line'), function (line) {
			if (line.dataset.mtsBound) { return; }
			line.dataset.mtsBound = '1';

			var key = line.getAttribute('data-key');
			var input = line.querySelector('[data-mts-line-qty]');
			var down = line.querySelector('[data-mts-line-down]');
			var up = line.querySelector('[data-mts-line-up]');
			var remove = line.querySelector('[data-mts-line-remove]');

			function setQuantity(next) {
				if (busy || !key) { return; }

				var max = parseInt(input && input.getAttribute('data-max'), 10);
				if (next < 1) { doRemove(); return; }
				if (!isNaN(max) && next > max) { return; }

				busy = true;
				if (input) { input.value = String(next); }
				line.setAttribute('aria-busy', 'true');

				storeFetch('cart/update-item', {
					method: 'POST',
					body: JSON.stringify({ key: key, quantity: next })
				}).then(function (res) { return res.json().then(function (j) { return { ok: res.ok, json: j }; }); })
					.then(function (r) {
						if (r.ok) { paint(r.json); }
					})
					.catch(function () { /* leave the server's number in place on the next load */ })
					.then(function () {
						busy = false;
						line.removeAttribute('aria-busy');
					});
			}

			function doRemove() {
				if (busy || !key) { return; }
				busy = true;

				/* Gone from the page before the request leaves. The row is kept in
				   memory so it can be put back if the server disagrees. */
				var anchor = line.nextSibling;
				var parent = line.parentNode;
				line.remove();

				storeFetch('cart/remove-item', {
					method: 'POST',
					body: JSON.stringify({ key: key })
				}).then(function (res) { return res.json().then(function (j) { return { ok: res.ok, json: j }; }); })
					.then(function (r) {
						if (r.ok) { paint(r.json); return; }
						parent.insertBefore(line, anchor);
					})
					.catch(function () { parent.insertBefore(line, anchor); })
					.then(function () { busy = false; });
			}

			function current() { return Math.max(1, parseInt(input && input.value, 10) || 1); }

			if (down) { down.addEventListener('click', function () { setQuantity(current() - 1); }); }
			if (up) { up.addEventListener('click', function () { setQuantity(current() + 1); }); }

			if (input) {
				input.addEventListener('input', function () {
					input.value = input.value.replace(/[^0-9]/g, '');
				});
				input.addEventListener('change', function () {
					setQuantity(parseInt(input.value, 10) || 1);
				});
			}

			if (remove) {
				remove.addEventListener('click', function (e) {
					e.preventDefault();
					doRemove();
				});
			}
		});
	}

	bind();
}());
