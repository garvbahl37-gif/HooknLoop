/**
 * Collection filter panel behaviour.
 *
 * Two jobs, both enhancements over a form that already works without them:
 *   1. Auto-submit on change, so a filter applies without hunting for a button.
 *   2. Collapse/expand each group, remembering the state for the session.
 *
 * The panel is a real <form method="get">. If this file never loads, the
 * noscript submit button is there and every filter still works.
 */
(function () {
	'use strict';

	/* ------------------------------------------------------- mobile bar ---
	   Below 900px the stylesheet hides .col__side outright and reveals a two-
	   button bar above the grid; the column comes back as .col__side.is-open
	   with data-show naming which of the two panels to show. The theme shipped
	   the CSS but not the bar, so on a phone the collection page had no
	   category navigation and no filters at all.

	   Sits above the early return below: the bar exists whether or not this
	   category has any filterable attributes. */
	var bar = document.querySelector('[data-mts-colbar]');
	var side = document.querySelector('[data-mts-colside]');

	if (bar && side) {
		var buttons = Array.prototype.slice.call(bar.querySelectorAll('[data-mts-colbar-toggle]'));

		buttons.forEach(function (btn) {
			btn.addEventListener('click', function () {
				var want = btn.getAttribute('data-mts-colbar-toggle');
				var alreadyOpen = side.classList.contains('is-open') && side.getAttribute('data-show') === want;

				buttons.forEach(function (b) {
					b.setAttribute('aria-expanded', !alreadyOpen && b === btn ? 'true' : 'false');
				});

				if (alreadyOpen) {
					side.classList.remove('is-open');
					side.removeAttribute('data-show');
				} else {
					side.classList.add('is-open');
					side.setAttribute('data-show', want);
				}
			});
		});
	}

	var form = document.querySelector('[data-mts-filters]');
	if (!form) {
		return;
	}

	/* ------------------------------------------------------- auto-submit ---
	   Debounced: ticking three colours in quick succession should produce one
	   navigation, not three. */
	var submitTimer = null;

	form.addEventListener('change', function (e) {
		if (!e.target.matches('input[type="checkbox"], input[type="radio"]')) {
			return;
		}
		clearTimeout(submitTimer);
		form.setAttribute('aria-busy', 'true');
		submitTimer = setTimeout(function () {
			// Drop empty controls so the URL carries only real filters.
			Array.prototype.forEach.call(form.elements, function (el) {
				if (el.type === 'radio' && el.checked && el.value === '') {
					el.disabled = true; // an unset radio should not appear in the query
				}
			});
			form.submit();
		}, 250);
	});

	/* ---------------------------------------------------------- collapse ---
	   Group open/closed state persists for the session, so a customer who
	   collapses "Filter by size" does not have to do it again on every category
	   they visit. */
	var STORE_KEY = 'mts:filters:collapsed';
	var collapsed = {};

	try {
		collapsed = JSON.parse(sessionStorage.getItem(STORE_KEY) || '{}') || {};
	} catch (err) {
		collapsed = {};
	}

	function persist() {
		try {
			sessionStorage.setItem(STORE_KEY, JSON.stringify(collapsed));
		} catch (err) {
			/* storage unavailable (private mode, quota) — collapsing still works,
			   it just will not be remembered. Not worth surfacing. */
		}
	}

	Array.prototype.forEach.call(form.querySelectorAll('[data-mts-filt-group]'), function (group, i) {
		var toggle = group.querySelector('[data-mts-filt-toggle]');
		var body = group.querySelector('[data-mts-filt-body]');
		if (!toggle || !body) {
			return;
		}

		var label = toggle.textContent.trim() || String(i);

		function apply(open) {
			toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
			group.classList.toggle('is-collapsed', !open);
			body.hidden = !open;
		}

		if (collapsed[label]) {
			apply(false);
		}

		toggle.addEventListener('click', function () {
			var open = toggle.getAttribute('aria-expanded') === 'true';
			apply(!open);
			collapsed[label] = open; // it was open, so it is now collapsed
			persist();
		});
	});
}());
