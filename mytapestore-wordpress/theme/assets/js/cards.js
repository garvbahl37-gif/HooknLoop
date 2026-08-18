/**
 * Catalogue card behaviour: whole-card navigation and add-to-cart from the grid.
 *
 * Both are enhancements over markup that already works. The card's title is a
 * real <a> and the CTA is a real link to ?add-to-cart=…, so with this file
 * absent every card still navigates and every simple product still adds — it
 * just costs a full page load, which is what the store did before.
 */
(function () {
	'use strict';

	var ajaxBase = (window.wc_add_to_cart_params && window.wc_add_to_cart_params.wc_ajax_url) || '';

	/* ------------------------------------------------------ card clicks ---
	   The React card carried an onClick on the whole <article>. Reproduce it
	   from data-mts-card-href, while leaving every real control inside the card
	   — the wishlist heart, the CTA, the title link — to handle its own click. */
	document.addEventListener('click', function (e) {
		var card = e.target.closest && e.target.closest('[data-mts-card-href]');
		if (!card) { return; }
		if (e.target.closest('a, button, input, select, label')) { return; }
		if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) { return; }

		var href = card.getAttribute('data-mts-card-href');
		if (href) { window.location.href = href; }
	});

	/* ------------------------------------------------------- quick add ---
	   Adds from the grid without leaving the page.

	   Uses the Store API, the same endpoint the product page uses. The older
	   ?wc-ajax=add_to_cart was doing this before and is not dependable: it adds
	   by product id with no variation, so it answers {"error":true} for anything
	   with options — and on failure this code then followed the href, reloading
	   the collection page and losing the shopper's scroll position.

	   Nothing here retries. If the add fails the message is shown and the cart is
	   left exactly as the server reports it; a retry that cannot tell whether the
	   first attempt landed is how one click becomes two items. */
	var store = window.mtsStore || null;
	var storeNonce = store && store.nonce;

	function badge(count) {
		var el = document.querySelector('[data-mts-cart-count]');
		if (!el || typeof count !== 'number') { return; }
		el.textContent = String(count);
		el.hidden = count < 1;
	}

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

	function label(cta, text, restore) {
		var original = Array.prototype.slice.call(cta.childNodes);
		cta.replaceChildren(document.createTextNode(text));
		if (restore) {
			setTimeout(function () {
				cta.replaceChildren.apply(cta, original);
				cta.classList.remove('is-added');
			}, 1900);
		}
	}

	document.addEventListener('click', function (e) {
		var cta = e.target.closest && e.target.closest('[data-mts-quick-add]');
		if (!cta || !store || !store.root) { return; }

		e.preventDefault();
		if (cta.classList.contains('is-busy')) { return; }
		cta.classList.add('is-busy');

		var id = parseInt(cta.getAttribute('data-mts-quick-add'), 10);
		var quantity = parseInt(cta.getAttribute('data-quantity'), 10) || 1;

		storeFetch('cart/add-item', {
			method: 'POST',
			body: JSON.stringify({ id: id, quantity: quantity })
		}).then(function (res) {
			return res.json().then(function (json) { return { ok: res.ok, json: json }; });
		}).then(function (result) {
			cta.classList.remove('is-busy');

			if (!result.ok) {
				// Say what happened where the shopper is looking, rather than
				// navigating them away from the grid they were browsing.
				label(cta, 'Unavailable', true);
				return;
			}

			cta.classList.add('is-added');
			label(cta, 'Added', true);
			badge(result.json.items_count);
			document.dispatchEvent(new CustomEvent('mts:cart-changed', { detail: result.json }));
		}).catch(function () {
			cta.classList.remove('is-busy');
			label(cta, 'Try again', true);
		});
	});
}());
