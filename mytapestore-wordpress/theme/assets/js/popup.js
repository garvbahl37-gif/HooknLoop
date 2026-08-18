/**
 * Newsletter popup.
 *
 * Shows once, `data-delay` seconds after the page settles, and then leaves the
 * visitor alone for `data-snooze` days. It ships `hidden` and is never revealed
 * without this file, so a visitor with JavaScript off is not shown a dialog they
 * cannot close.
 *
 * The rules it follows are the ones that make a popup tolerable rather than a
 * tax on arriving:
 *   · one appearance per visitor per snooze window, not per page view
 *   · a signup is remembered permanently — never ask twice
 *   · Escape and the backdrop close it, and focus is trapped while open and
 *     returned to wherever it was when it closes
 *   · prefers-reduced-motion suppresses the entrance animation
 */
(function () {
	'use strict';

	var pop = document.querySelector('[data-mts-popup]');
	if (!pop) { return; }

	var SEEN = 'mts:popup:seen';
	var DONE = 'mts:popup:signed-up';

	var delay = (parseInt(pop.getAttribute('data-delay'), 10) || 10) * 1000;
	var snooze = (parseInt(pop.getAttribute('data-snooze'), 10) || 30) * 86400000;

	function get(key) {
		try { return localStorage.getItem(key); } catch (err) { return null; }
	}
	function set(key, value) {
		try { localStorage.setItem(key, value); } catch (err) { /* private mode */ }
	}

	// Already signed up, or dismissed inside the snooze window.
	if (get(DONE)) { return; }
	var seenAt = parseInt(get(SEEN), 10);
	if (seenAt && Date.now() - seenAt < snooze) { return; }

	var lastFocus = null;
	var timer = null;

	function focusable() {
		return Array.prototype.filter.call(
			pop.querySelectorAll('a[href], button, input, [tabindex]:not([tabindex="-1"])'),
			function (el) { return !el.disabled && el.offsetParent !== null; }
		);
	}

	function open() {
		lastFocus = document.activeElement;
		pop.hidden = false;
		document.body.classList.add('mts-pop-open');
		set(SEEN, String(Date.now()));

		var first = pop.querySelector('input[type="email"]') || focusable()[0];
		if (first) { first.focus(); }

		document.addEventListener('keydown', onKey);
	}

	function close() {
		pop.hidden = true;
		document.body.classList.remove('mts-pop-open');
		document.removeEventListener('keydown', onKey);
		if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
	}

	function onKey(e) {
		if (e.key === 'Escape') {
			e.preventDefault();
			close();
			return;
		}

		// Focus trap: a modal the keyboard can walk out of is not modal.
		if (e.key !== 'Tab') { return; }
		var items = focusable();
		if (!items.length) { return; }

		var first = items[0];
		var last = items[items.length - 1];

		if (e.shiftKey && document.activeElement === first) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && document.activeElement === last) {
			e.preventDefault();
			first.focus();
		}
	}

	Array.prototype.forEach.call(pop.querySelectorAll('[data-mts-popup-close]'), function (el) {
		el.addEventListener('click', close);
	});

	var form = pop.querySelector('form');
	if (form) {
		form.addEventListener('submit', function () {
			// Whatever the provider does with it, this visitor has answered.
			set(DONE, '1');
		});
	}

	// A visitor who leaves before the delay elapses should not be counted as
	// having seen it, so the timer starts on load and is cleared on unload.
	timer = setTimeout(open, delay);
	window.addEventListener('pagehide', function () { clearTimeout(timer); });
}());
