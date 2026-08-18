/**
 * Wishlist — saved in the browser, no account required.
 *
 * Every product card carries a heart (data-mts-wish="<id>"). Clicking it stores
 * that ID in localStorage. The wishlist page then asks the server to render the
 * real catalogue card for each saved ID.
 *
 * WHY IDs AND NOT A SNAPSHOT.
 *
 * This used to copy a handful of strings off the card at the moment the heart
 * was clicked — name, url, image, price, category — and rebuild an approximation
 * of a card from them later. The result was a wishlist page whose cards had no
 * badges, no rating, no size count, no stock state, a "View product" button
 * where the rest of the store has "Add to cart", and a price frozen at whatever
 * it was on the day the item was saved. A shopper checking their wishlist for a
 * price was reading a number the store no longer charged.
 *
 * The card is server knowledge, so the server renders it (see inc/wishlist.php).
 * The browser holds nothing but IDs, which also means a product that has since
 * been deleted or unpublished simply does not come back — and that is how a dead
 * save gets pruned instead of lingering as a card that 404s.
 */
(function () {
	'use strict';

	var KEY = 'mts:wishlist';
	var cfg = window.mtsWishlist || {};

	/** Saved IDs, newest first.
	 *
	 *  Tolerates the old snapshot format ([{id, name, …}]) so an existing
	 *  shopper's saves survive the change rather than silently emptying. */
	function read() {
		try {
			var raw = JSON.parse(localStorage.getItem(KEY) || '[]');
			if (!Array.isArray(raw)) { return []; }
			return raw
				.map(function (item) {
					return String(item && typeof item === 'object' ? item.id : item);
				})
				.filter(function (id) { return id && id !== 'undefined' && id !== 'null'; });
		} catch (err) {
			return [];
		}
	}

	function write(ids) {
		try {
			localStorage.setItem(KEY, JSON.stringify(ids));
		} catch (err) { /* private mode or quota — saving simply does not persist */ }
	}

	function has(id) {
		return read().indexOf(String(id)) > -1;
	}

	function paintButton(btn, on) {
		btn.classList.toggle('is-on', on);
		btn.setAttribute('aria-pressed', on ? 'true' : 'false');
		btn.setAttribute('aria-label', on ? 'Remove from wishlist' : 'Add to wishlist');
	}

	function syncButtons(root) {
		Array.prototype.forEach.call((root || document).querySelectorAll('[data-mts-wish]'), function (btn) {
			paintButton(btn, has(btn.getAttribute('data-mts-wish')));
		});
	}

	function syncCount() {
		var n = read().length;
		Array.prototype.forEach.call(document.querySelectorAll('[data-mts-wish-count]'), function (el) {
			el.textContent = String(n);

			/* Only the HEADER BADGE disappears at zero — a little red "0" riding
			   the wishlist icon is noise. Everywhere else the number is the
			   content: the account dashboard has an "Items saved" stat tile, and
			   hiding its figure left a bordered card with a label and a blank
			   space where the count should be, on the default state every new
			   customer sees. */
			if (el.classList.contains('hd-cart-badge')) {
				el.hidden = n === 0;
			}
		});
	}

	// Delegated so cards added later (filters, pagination, the wishlist grid
	// itself) work without rebinding.
	document.addEventListener('click', function (e) {
		var btn = e.target.closest && e.target.closest('[data-mts-wish]');
		if (!btn) { return; }

		e.preventDefault();
		e.stopPropagation();

		var id = String(btn.getAttribute('data-mts-wish'));
		var ids = read();
		var idx = ids.indexOf(id);

		if (idx > -1) {
			ids.splice(idx, 1);
		} else {
			ids.unshift(id);
		}

		write(ids);
		paintButton(btn, idx === -1);
		syncCount();

		// On the wishlist page itself, un-hearting an item removes its card.
		var grid = document.querySelector('[data-mts-wish-grid]');
		if (grid && idx > -1) {
			var card = btn.closest('.pc');
			if (card) { card.remove(); }
			paintState(read().length);
		}
	});

	/* ------------------------------------------------------ wishlist page ---*/
	/* Re-queried rather than captured once. The wishlist is now also an account
	   endpoint (/my-account/wishlist/), and assets/js/acct.js swaps .acct__main
	   for freshly fetched markup — so by the time it is on screen, the elements
	   this module found at load no longer exist in the document. Holding stale
	   references meant the panel rendered its shell and then stayed empty
	   forever. */
	var grid, empty, loading, foot, summary;

	function findTargets() {
		grid = document.querySelector('[data-mts-wish-grid]');
		empty = document.querySelector('[data-mts-wish-empty]');
		loading = document.querySelector('[data-mts-wish-loading]');
		foot = document.querySelector('[data-mts-wish-foot]');
		summary = document.querySelector('[data-mts-wish-summary]');
	}
	findTargets();

	function paintState(count) {
		if (loading) { loading.hidden = true; }
		if (grid) { grid.hidden = count === 0; }
		if (empty) { empty.hidden = count > 0; }
		if (foot) { foot.hidden = count === 0; }

		/* The line only speaks when the wishlist is empty. With items on screen
		   it was narrating the page back to the visitor — "1 item saved — tap
		   the heart again to remove" above one visible card that already has a
		   filled heart on it. */
		if (summary) {
			summary.textContent = count === 0 ? 'Nothing saved yet.' : '';
			summary.hidden = count > 0;
		}
	}

	function renderWishlistPage() {
		findTargets();
		if (!grid) { return; }

		var ids = read();

		if (!ids.length) {
			grid.replaceChildren();
			paintState(0);
			return;
		}

		// Shown while the cards are fetched, so the page does not flash the empty
		// state at someone who does have items saved.
		if (loading) { loading.hidden = false; }
		if (empty) { empty.hidden = true; }

		var url = (cfg.endpoint || '/wp-admin/admin-ajax.php?action=mts_wish_cards') +
			'&ids=' + encodeURIComponent(ids.join(','));

		fetch(url, { credentials: 'same-origin' })
			.then(function (res) { return res.ok ? res.json() : Promise.reject(new Error('HTTP ' + res.status)); })
			.then(function (json) {
				var cards = (json && json.cards) || {};
				var alive = Object.keys(cards);

				// Anything the server did not return no longer exists. Drop it,
				// or the header badge keeps counting products that cannot be shown.
				if (alive.length !== ids.length) {
					write(ids.filter(function (id) { return alive.indexOf(id) > -1; }));
					syncCount();
				}

				grid.replaceChildren();

				ids.forEach(function (id) {
					if (!cards[id]) { return; }
					/* The markup is this site's own product card, rendered by this
					   site's own template and fetched same-origin — the same bytes
					   the collection page would have served. */
					var holder = document.createElement('div');
					holder.innerHTML = cards[id];
					var card = holder.firstElementChild;
					if (card) { grid.appendChild(card); }
				});

				syncButtons(grid);
				paintState(grid.children.length);
			})
			.catch(function () {
				// The cards could not be fetched. Say so rather than showing an
				// empty wishlist to someone who has items in it.
				if (loading) { loading.hidden = true; }
				if (summary) { summary.textContent = 'Your saved items could not be loaded. Please refresh the page.'; }
			});
	}

	syncButtons();
	syncCount();
	renderWishlistPage();

	/* The account panel was replaced — re-bind the hearts inside the new markup
	   and, if the panel that arrived is the wishlist, fill it. */
	document.addEventListener('mts:panel-swapped', function (e) {
		var panel = (e.detail && e.detail.panel) || document;
		syncButtons(panel);
		syncCount();
		renderWishlistPage();
	});
}());
