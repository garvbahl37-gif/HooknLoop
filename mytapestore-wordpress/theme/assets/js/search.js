/**
 * Header search: the live suggestions panel.
 *
 * Port of the search autocomplete in mytapestore-shopify/theme/assets/mts-theme.js,
 * keeping the same two groups (categories, then products), the same keyboard
 * model and the same markup — so the two storefronts behave identically. The
 * data comes from /wp-json/mts/v1/suggest instead of Shopify's Predictive Search
 * API; see inc/search-suggest.php.
 *
 * It runs for EVERY [data-mts-search] on the page, because the header and the
 * mobile drawer each render one and they must not share state.
 *
 * The form still works with JavaScript off, or if the endpoint is unreachable:
 * it is a real GET form, and every failure path here falls back to closing the
 * panel and letting the visitor submit.
 */
(function () {
	'use strict';

	var MIN = 2;      // shorter than this matches most of the catalogue

	/* WHY THE DEBOUNCE IS LONGER ON TOUCH.
	   Every suggestion costs a full WordPress REST bootstrap. Measured on this
	   install: ~0.72s for the bare /wp-json/ root, against 4ms for a static file
	   — so the endpoint's own work is a small fraction of it and there is no
	   server-side optimisation that changes the number.
	   The only lever is firing fewer requests. On a phone, where typing is slower
	   and the connection is worse, waiting a little longer between keystrokes
	   means one request per word instead of three. */
	var TOUCH = window.matchMedia && window.matchMedia('(hover: none)').matches;
	var DEBOUNCE = TOUCH ? 320 : 180;

	/* Answers already seen. The single biggest win available: backspacing,
	   retyping, or opening the box again on the next page all become instant
	   instead of another second of waiting.

	   sessionStorage rather than memory alone so it survives navigation — a
	   shopper who searches "foam", opens a product and comes back pays once. */
	var CACHE_KEY = 'mts:suggest';
	var memory = {};

	try {
		var stored = sessionStorage.getItem(CACHE_KEY);
		if (stored) { memory = JSON.parse(stored) || {}; }
	} catch (err) { memory = {}; }

	function remember(term, data) {
		memory[term] = data;
		try {
			// Bounded: a long session should not fill the quota. Oldest keys go
			// first, which is also the least likely to be typed again.
			var keys = Object.keys(memory);
			while (keys.length > 60) { delete memory[keys.shift()]; }
			sessionStorage.setItem(CACHE_KEY, JSON.stringify(memory));
		} catch (err) { /* private mode, or full — memory still works */ }
	}

	/* If "foam" matched nothing, "foamx" cannot match either: the server does a
	   LIKE on the title, so a longer string can only ever match fewer titles.
	   Worth checking before spending 0.7s proving it. */
	function knownEmptyPrefix(term) {
		for (var key in memory) {
			if (!Object.prototype.hasOwnProperty.call(memory, key)) { continue; }
			var d = memory[key];
			var empty = d && !(d.categories || []).length && !(d.products || []).length;
			if (empty && term.indexOf(key) === 0) { return true; }
		}
		return false;
	}

	/* NO innerHTML ANYWHERE IN THIS FILE.
	   The panel is built from real DOM nodes and every value from the endpoint
	   goes in through textContent or setAttribute. That is not because the data
	   is untrusted today — it is this site's own catalogue — but because a
	   product title is one apostrophe away from breaking out of an attribute,
	   and "the data is ours" is precisely the assumption that stops being true
	   the first time someone lets a supplier feed write product names. Escaping
	   by hand works right up until one interpolation is missed; there is nothing
	   to miss here. */

	function el(tag, className, text) {
		var node = document.createElement(tag);
		if (className) { node.className = className; }
		if (text != null && text !== '') { node.textContent = String(text); }
		return node;
	}

	/* Only http(s) and root-relative URLs become an href. Without this a
	   `javascript:` value in the data would be a working link. */
	function safeUrl(value) {
		var raw = String(value == null ? '' : value).trim();
		if (/^https?:\/\//i.test(raw)) { return raw; }
		if (raw.charAt(0) === '/') { return raw; }
		return '';
	}

	var SVG_NS = 'http://www.w3.org/2000/svg';

	function icon(size, paths) {
		var svg = document.createElementNS(SVG_NS, 'svg');
		svg.setAttribute('width', size);
		svg.setAttribute('height', size);
		svg.setAttribute('viewBox', '0 0 24 24');
		svg.setAttribute('aria-hidden', 'true');
		svg.setAttribute('fill', 'none');
		svg.setAttribute('stroke', 'currentColor');
		svg.setAttribute('stroke-width', '1.75');
		svg.setAttribute('stroke-linecap', 'round');
		svg.setAttribute('stroke-linejoin', 'round');
		paths.forEach(function (d) {
			var p = document.createElementNS(SVG_NS, 'path');
			p.setAttribute('d', d);
			svg.appendChild(p);
		});
		return svg;
	}

	var CAT_PATHS = ['M12 3l9 5-9 5-9-5z', 'M3 13l9 5 9-5'];
	var ARROW_PATHS = ['M4 12h16', 'M14 6l6 6-6 6'];

	Array.prototype.forEach.call(document.querySelectorAll('[data-mts-search]'), function (root) {
		var input = root.querySelector('[data-mts-search-input]');
		var panel = root.querySelector('[data-mts-search-panel]');
		var form = root.querySelector('form');
		if (!input || !panel || !form) { return; }

		var entries = [];      // hrefs, in the order they appear
		var active = -1;
		var timer = null;
		var lastQuery = '';
		var inflight = null;   // AbortController for the request in the air

		function close() {
			panel.hidden = true;
			input.setAttribute('aria-expanded', 'false');
			input.removeAttribute('aria-activedescendant');
			active = -1;
		}

		function paintActive() {
			var items = panel.querySelectorAll('[data-entry]');
			Array.prototype.forEach.call(items, function (el, i) {
				var on = i === active;
				el.classList.toggle('is-active', on);
				el.setAttribute('aria-selected', on ? 'true' : 'false');
				if (on) {
					input.setAttribute('aria-activedescendant', el.id);
					// Keep the highlighted row in view when arrowing past the fold.
					if (el.scrollIntoView) { el.scrollIntoView({ block: 'nearest' }); }
				}
			});
			if (active < 0) { input.removeAttribute('aria-activedescendant'); }
		}

		function resultsUrl(term) {
			return form.action + '?s=' + encodeURIComponent(term) + '&post_type=product';
		}

		/** One selectable row. Registers its href and gives it an id for ARIA. */
		function option(className, href) {
			var a = el('a', className);
			a.setAttribute('data-entry', '');
			a.setAttribute('role', 'option');
			a.setAttribute('aria-selected', 'false');
			a.id = panel.id + '-e' + entries.length;
			a.href = href;
			entries.push(href);
			return a;
		}

		function group(label) {
			var g = el('div', 'search-ac__group');
			g.appendChild(el('span', 'search-ac__label', label));
			return g;
		}

		function render(data, term) {
			var categories = (data && data.categories) || [];
			var products = (data && data.products) || [];
			var frag = document.createDocumentFragment();

			entries = [];
			panel.replaceChildren();

			if (categories.length) {
				var cg = group('Categories');
				categories.forEach(function (c) {
					var url = safeUrl(c.url);
					if (!url) { return; }
					var a = option('search-ac__cat', url);
					a.appendChild(icon(15, CAT_PATHS));
					a.appendChild(el('span', null, c.title));
					if (c.count) { a.appendChild(el('em', 'num', c.count)); }
					cg.appendChild(a);
				});
				if (cg.querySelector('[data-entry]')) { frag.appendChild(cg); }
			}

			if (products.length) {
				var pg = group('Products');
				products.forEach(function (p) {
					var url = safeUrl(p.url);
					if (!url) { return; }
					var a = option('search-ac__prod', url);

					var img = safeUrl(p.image);
					if (img) {
						var im = el('img');
						im.src = img;
						im.alt = '';
						im.width = 36;
						im.height = 36;
						im.loading = 'lazy';
						a.appendChild(im);
					} else {
						// Holds the column so titles stay aligned with the rows
						// that do have a thumbnail.
						var spacer = el('span');
						spacer.style.width = '36px';
						a.appendChild(spacer);
					}

					var info = el('span', 'search-ac__prod-info');
					info.appendChild(el('b', null, p.title));
					if (p.price) { info.appendChild(el('em', 'num', p.price)); }
					a.appendChild(info);

					pg.appendChild(a);
				});
				if (pg.querySelector('[data-entry]')) { frag.appendChild(pg); }
			}

			if (!entries.length) {
				/* Say so, rather than showing nothing. A panel that silently fails
				   to open is indistinguishable from one that is broken. */
				var eg = group('No matches');
				var none = option('search-ac__cat', resultsUrl(term));
				none.appendChild(el('span', null, 'Search the whole catalogue for “' + term + '”'));
				eg.appendChild(none);
				frag.appendChild(eg);
			} else {
				var all = el('a', 'search-ac__all', 'View all results for “' + term + '”');
				all.href = resultsUrl(term);
				all.appendChild(icon(14, ARROW_PATHS));
				frag.appendChild(all);
			}

			panel.appendChild(frag);
			panel.removeAttribute('aria-busy');
			panel.hidden = false;
			input.setAttribute('aria-expanded', 'true');
			active = -1;
		}

		/* Something on screen while the request is in the air. A second of nothing
		   after a keystroke reads as "the search is broken", not as "the search is
		   working" — and on a phone that second is the whole interaction. */
		function pending(term) {
			if (panel.querySelector('[data-entry]') && panel.hidden === false) {
				// Already showing the previous answer — leave it up and let the
				// new one replace it, rather than flashing to a spinner.
				panel.setAttribute('aria-busy', 'true');
				return;
			}
			panel.replaceChildren();
			var g = group('Searching');
			g.appendChild(el('span', 'search-ac__pending', 'Looking for “' + term + '”…'));
			panel.appendChild(g);
			panel.hidden = false;
			panel.setAttribute('aria-busy', 'true');
			input.setAttribute('aria-expanded', 'true');
		}

		function search(term) {
			/* Abort the previous request. Without this, a slow response for "fo"
			   can land after the fast one for "foam" and repaint the panel with
			   results for something the shopper has already finished typing. */
			if (inflight) { inflight.abort(); }
			inflight = typeof AbortController !== 'undefined' ? new AbortController() : null;

			var root = (window.mtsSearch && window.mtsSearch.endpoint) || '/wp-json/mts/v1/suggest';

			fetch(root + '?q=' + encodeURIComponent(term), {
				credentials: 'same-origin',
				signal: inflight ? inflight.signal : undefined
			})
				.then(function (res) { return res.ok ? res.json() : Promise.reject(new Error('HTTP ' + res.status)); })
				.then(function (data) {
					remember(term, data);
					// Ignore anything that is no longer what is in the box.
					if (term === lastQuery) { render(data, term); }
				})
				.catch(function (err) {
					if (err && err.name === 'AbortError') { return; }
					close();
				});
		}

		input.addEventListener('input', function () {
			var term = input.value.trim();
			lastQuery = term;
			clearTimeout(timer);

			if (term.length < MIN) { close(); return; }

			// Already answered — no request, no wait, no debounce.
			if (Object.prototype.hasOwnProperty.call(memory, term)) {
				render(memory[term], term);
				return;
			}

			// A prefix of this already came back empty, so this will too.
			if (knownEmptyPrefix(term)) {
				render({ categories: [], products: [] }, term);
				return;
			}

			pending(term);
			timer = setTimeout(function () { search(term); }, DEBOUNCE);
		});

		input.addEventListener('keydown', function (e) {
			if (panel.hidden || !entries.length) { return; }

			if (e.key === 'ArrowDown') {
				e.preventDefault();
				active = active + 1 >= entries.length ? 0 : active + 1;
				paintActive();
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				active = active - 1 < 0 ? entries.length - 1 : active - 1;
				paintActive();
			} else if (e.key === 'Enter' && active >= 0) {
				// Only when a suggestion is highlighted — otherwise Enter submits
				// the form, which is what it should do.
				e.preventDefault();
				window.location.href = entries[active];
			} else if (e.key === 'Escape') {
				close();
				input.blur();
			}
		});

		// Re-open on focus if there is still something worth showing.
		input.addEventListener('focus', function () {
			if (input.value.trim().length >= MIN && panel.innerHTML) {
				panel.hidden = false;
				input.setAttribute('aria-expanded', 'true');
			}
		});

		/* Close on an outside click, not on blur: blur fires before the click on
		   a suggestion registers, so closing there makes the panel impossible to
		   click. */
		document.addEventListener('click', function (e) {
			if (!root.contains(e.target)) { close(); }
		});
	});
}());
