/**
 * Account navigation without a full page reload.
 *
 * Every item in the account sidebar is a real link to a real URL, and stays
 * one — this only intercepts the click, fetches that same URL, and swaps the
 * content panel. With JavaScript off, or if anything here throws, the links
 * navigate exactly as before.
 *
 * Why it is safe to swap this particular region: the forms inside it are plain
 * POSTs, and the one piece of WooCommerce behaviour they depend on —
 * country-select.js rebuilding the State field — is bound with
 * $(document.body).on('change', 'select.country_to_state', …), a delegated
 * handler on the body. Delegated handlers keep working on markup inserted after
 * they were registered, which is exactly why this is a swap and not a rebuild.
 *
 * TWO BUGS THIS VERSION FIXES.
 *
 * 1. IT STILL RELOADED. Only links inside `.acct__side` were intercepted, so the
 *    buttons in the panel itself — the dashboard's "Edit address", for one —
 *    were ordinary navigations. And the sidebar's Wishlist row pointed at the
 *    standalone /wishlist/ page, which has no `.acct__main` in it at all, so the
 *    fallback below fired and reloaded the site. The wishlist is now a real
 *    account endpoint (inc/account-wishlist.php) and every account link on the
 *    page is intercepted, wherever it sits.
 *
 * 2. IT JERKED. Every swap ended in `scrollIntoView({ behavior: 'smooth' })`,
 *    which animates the window even when the panel is already in full view —
 *    switching from Addresses to Account details nudged the page upward for no
 *    reason. Now the scroll happens only when the top of the panel is actually
 *    off-screen, and it lands below the sticky header instead of under it.
 */
(function () {
	'use strict';

	var shell = document.querySelector('.acct');
	var side = document.querySelector('.acct__side');
	var main = document.querySelector('.acct__main');

	if (!shell || !side || !main || !window.history || !window.history.pushState) { return; }

	var busy = false;

	/* So the FIRST press of Back is handled here too. Without this the entry the
	   browser already had carries no state, popstate ignores it, and the panel
	   stays on whatever was last loaded while the URL says otherwise. */
	window.history.replaceState({ mtsAccount: true }, '', window.location.href);

	function sameOrigin(href) {
		try { return new URL(href, window.location.origin).origin === window.location.origin; }
		catch (err) { return false; }
	}

	/* An account URL is one under the account page. Comparing against the account
	   root rather than listing endpoint slugs: those slugs are store settings and
	   are translated on non-English stores. */
	function accountRoot() {
		var home = side.querySelector('a[href]');
		return home ? new URL(home.href, window.location.origin).pathname.replace(/\/[^/]*\/?$/, '/') : null;
	}

	function isAccountUrl(href) {
		try {
			var path = new URL(href, window.location.origin).pathname;
			var root = accountRoot();
			return !!root && path.indexOf(root) === 0;
		} catch (err) { return false; }
	}

	function setActive(href) {
		var target = new URL(href, window.location.origin).pathname.replace(/\/+$/, '');

		Array.prototype.forEach.call(side.querySelectorAll('a'), function (a) {
			var path;
			try { path = new URL(a.href, window.location.origin).pathname.replace(/\/+$/, ''); }
			catch (err) { return; }

			var on = path === target;
			var li = a.closest('li') || a;
			li.classList.toggle('is-active', on);
			a.classList.toggle('is-active', on);
			if (on) { a.setAttribute('aria-current', 'page'); } else { a.removeAttribute('aria-current'); }
		});
	}

	/**
	 * Move the viewport only if the panel's top is off-screen.
	 *
	 * The sticky header would otherwise cover the first 130-odd pixels of
	 * whatever we scroll to, so the offset is read from the header itself rather
	 * than hardcoded — it is two bars on desktop and one on a phone.
	 */
	function revealIfNeeded(panel) {
		var header = document.querySelector('.hd, header.hd, #masthead, header');
		var offset = header ? Math.min(header.getBoundingClientRect().height, 200) + 12 : 12;
		var top = panel.getBoundingClientRect().top;

		// Already visible below the header — leave the page exactly where it is.
		if (top >= offset && top < window.innerHeight) { return; }

		window.scrollTo({
			top: Math.max(0, window.scrollY + top - offset),
			behavior: 'auto'
		});
	}

	function load(href, push) {
		if (busy) { return; }
		busy = true;
		main.setAttribute('aria-busy', 'true');

		fetch(href, { credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' } })
			.then(function (res) {
				if (!res.ok) { throw new Error('HTTP ' + res.status); }
				return res.text();
			})
			.then(function (html) {
				var doc = new DOMParser().parseFromString(html, 'text/html');
				var fresh = doc.querySelector('.acct__main');
				var current = document.querySelector('.acct__main');

				// No panel in the response means this is not an account page —
				// the logout redirect, say. Let the browser go there properly.
				if (!fresh || !current) { window.location.href = href; return; }

				current.replaceWith(fresh);
				main = fresh;

				/* The sidebar is rendered per-request too: the active row, and the
				   greeting if the visitor just changed their name. Its CHILDREN are
				   replaced rather than the element, so this module's reference to
				   `side` — and the click handler bound through it — stays alive.
				   Nodes are adopted from the parsed document rather than piped back
				   through innerHTML: no HTML string is re-parsed, so there is no
				   markup sink here at all. */
				var freshSide = doc.querySelector('.acct__side');
				if (freshSide) {
					side.replaceChildren.apply(
						side,
						Array.prototype.map.call(freshSide.childNodes, function (node) {
							return document.importNode(node, true);
						})
					);
				}

				var title = doc.querySelector('title');
				if (title) { document.title = title.textContent; }

				if (push) { window.history.pushState({ mtsAccount: true }, '', href); }
				setActive(href);

				/* Anything that renders itself into the panel — the wishlist grid,
				   for one — needs to know the panel it was holding is gone. */
				document.dispatchEvent(new CustomEvent('mts:panel-swapped', {
					detail: { panel: fresh, href: href }
				}));

				// The heading is what a screen reader should land on. preventScroll
				// because where the page goes is decided by revealIfNeeded(), not
				// by where focus happens to fall.
				var heading = fresh.querySelector('h2, h3');
				if (heading) {
					heading.setAttribute('tabindex', '-1');
					heading.focus({ preventScroll: true });
				}

				revealIfNeeded(fresh);
			})
			.catch(function () {
				// Never leave the visitor on a half-swapped page.
				window.location.href = href;
			})
			.then(function () {
				busy = false;
				if (main) { main.removeAttribute('aria-busy'); }
			});
	}

	/* Delegated from the account shell, so it covers the sidebar AND the panel —
	   and keeps working after the panel inside it has been replaced. */
	shell.addEventListener('click', function (e) {
		var link = e.target.closest && e.target.closest('a');
		if (!link || !shell.contains(link)) { return; }

		var href = link.getAttribute('href');
		if (!href || !sameOrigin(href) || !isAccountUrl(href)) { return; }
		if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) { return; }
		if (link.target && '_self' !== link.target) { return; }
		if (link.hasAttribute('download')) { return; }

		/* Sign out ENDS the session and redirects — swapping a panel would leave
		   a signed-out page inside a signed-in shell. Let it navigate. */
		if (href.indexOf('customer-logout') !== -1) { return; }

		/* Order downloads are file responses, not pages. Fetching one and looking
		   for `.acct__main` in a PDF is how a download turns into a reload. */
		if (href.indexOf('download_file') !== -1) { return; }

		e.preventDefault();

		// Already here — do not refetch the panel the visitor is looking at.
		var here = window.location.pathname.replace(/\/+$/, '');
		var there = new URL(href, window.location.origin).pathname.replace(/\/+$/, '');
		if (here === there) { return; }

		load(href, true);
	});

	window.addEventListener('popstate', function (e) {
		if (e.state && e.state.mtsAccount) { load(window.location.href, false); }
	});
}());
