/**
 * Sign in / Create account tab switch.
 *
 * The tabs are real links to ?action=register and back, and the server decides
 * which panel is open — so with this file absent the page still works, it just
 * costs a reload to switch. All this does is skip the reload.
 *
 * It also keeps the URL in step via replaceState, so a customer who switches to
 * "Create account" and then reloads, bookmarks, or hits back gets the panel they
 * were looking at rather than being bounced to sign-in.
 */
(function () {
	'use strict';

	var tabs = Array.prototype.slice.call(document.querySelectorAll('[data-mts-auth-tab]'));
	var panels = Array.prototype.slice.call(document.querySelectorAll('[data-mts-auth-panel]'));

	if (!tabs.length || !panels.length) { return; }

	function show(which, push) {
		panels.forEach(function (panel) {
			panel.hidden = panel.getAttribute('data-mts-auth-panel') !== which;
		});

		tabs.forEach(function (tab) {
			var on = tab.getAttribute('data-mts-auth-tab') === which;
			// The cross-link under the sign-in form is a tab too, but it is not IN
			// the tablist — only style the real tabs.
			if (tab.classList.contains('mts-auth__tab')) {
				tab.classList.toggle('is-active', on);
				tab.setAttribute('aria-selected', on ? 'true' : 'false');
			}
		});

		if (push && window.history && window.history.replaceState) {
			var url = new URL(window.location.href);
			if (which === 'register') { url.searchParams.set('action', 'register'); }
			else { url.searchParams.delete('action'); }
			window.history.replaceState({}, '', url.toString());
		}

		var open = panels.filter(function (p) { return !p.hidden; })[0];
		var first = open && open.querySelector('input:not([type="hidden"])');
		if (first) { first.focus({ preventScroll: true }); }
	}

	tabs.forEach(function (tab) {
		tab.addEventListener('click', function (e) {
			e.preventDefault();
			show(tab.getAttribute('data-mts-auth-tab'), true);
		});
	});
}());
