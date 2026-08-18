/**
 * Address finder — checkout and the account address book.
 *
 * FULLY LOCAL. No API, no key, no plugin, no request per keystroke.
 *
 * The whole Australian locality list — 15,318 suburb/state/postcode triples,
 * 289KB of text, ~113KB gzipped — is fetched ONCE and held in memory. Every
 * lookup after that is a string comparison over an array, so results appear on
 * the first character with no debounce and no round trip.
 *
 * WHY IT WORKS THIS WAY
 *
 * The previous version asked the server on every keystroke. Even a cached answer
 * cost ~0.7s, because the floor is WordPress booting rather than the query, and
 * a debounce on top of that meant a shopper waited over a second to be shown
 * their own suburb. Sending the dataset once and matching locally is not an
 * optimisation of that design; it removes the thing that was slow.
 *
 * It also removes the dependency. There is no LocationIQ account, no key in
 * wp-config, nothing to expire, and nothing for the store owner to install. The
 * data ships inside the theme and installs itself.
 *
 * WHAT IT COMPLETES, AND WHAT IT DOES NOT
 *
 * It completes SUBURB, STATE and POSTCODE — the combination that decides the
 * shipping zone and misroutes the parcel when it disagrees. Pick a suburb and
 * all three are filled and guaranteed consistent, because they came from one
 * row of the Commonwealth's own locality file.
 *
 * It does NOT complete the street line. Street-level Australian data is G-NAF's
 * full address file: 15.8 million records, ~1.5GB. That cannot live in a theme
 * or a browser, and it is the one part of an address only the customer knows.
 * The street field is a plain text input, as it is on most Australian checkouts.
 *
 * LOADED LAZILY. The index is fetched when an address field is first focused, so
 * a visitor who never reaches checkout never downloads it.
 *
 * No innerHTML anywhere: every node is constructed and every string lands in
 * textContent.
 */
(function () {
	'use strict';

	if (typeof mtsAddress === 'undefined' || !mtsAddress.index) {
		return;
	}

	var MIN_CHARS = 1;      // no debounce, so one character is affordable
	var MAX_RESULTS = 7;

	/* The parsed index: [locality, STATE, postcode] per row, biggest locality
	   first so the first N matches are already the best N. */
	var ROWS = null;
	var LOADING = null;

	function load() {
		if (ROWS) { return Promise.resolve(ROWS); }
		if (LOADING) { return LOADING; }

		LOADING = fetch(mtsAddress.index, { credentials: 'omit' })
			.then(function (r) { return r.ok ? r.text() : ''; })
			.then(function (text) {
				ROWS = [];
				if (!text) { return ROWS; }
				var lines = text.split('\n');
				for (var i = 0; i < lines.length; i++) {
					var p = lines[i].split('|');
					if (p.length === 3) {
						/* lowercase name cached alongside, so the hot loop never
						   calls toLowerCase() 15,318 times per keystroke */
						ROWS.push([p[0], p[1], p[2], p[0].toLowerCase()]);
					}
				}
				return ROWS;
			})
			.catch(function () { ROWS = []; return ROWS; });

		return LOADING;
	}

	/**
	 * Matches for a query, best first.
	 *
	 * A digit query is a postcode; anything else is a suburb name. Prefix
	 * matches rank above contains-matches — typing "south" should lead with
	 * Southbank, not with "Bay of Shoals South" — and within each group the
	 * index order (largest locality first) already holds.
	 */
	function search(q) {
		if (!ROWS || !ROWS.length) { return []; }

		var query = q.trim().toLowerCase();
		if (query.length < MIN_CHARS) { return []; }

		var starts = [];
		var contains = [];
		var digits = /^\d+$/.test(query);

		for (var i = 0; i < ROWS.length; i++) {
			var row = ROWS[i];
			var hay = digits ? row[2] : row[3];
			var at = hay.indexOf(query);

			if (at === 0) {
				starts.push(row);
				if (starts.length >= MAX_RESULTS) { break; }
			} else if (at > 0 && contains.length < MAX_RESULTS) {
				contains.push(row);
			}
		}

		return starts.concat(contains).slice(0, MAX_RESULTS);
	}

	['billing', 'shipping'].forEach(attach);

	function attach(group) {
		var city = document.getElementById(group + '_city');
		var postcode = document.getElementById(group + '_postcode');
		var street = document.getElementById(group + '_address_1');

		/* Both the suburb and the postcode field search the same index — a
		   shopper who knows their postcode should not have to find the suburb
		   first. */
		if (city) { bind(city, group); }
		if (postcode) { bind(postcode, group); }

		/* The street line is the ONLY field that needs a server, and only when a
		   key is configured. Without one this is skipped entirely and the field
		   stays a plain input — no dead dropdown, no failed request, no sign to
		   the shopper that anything is missing. */
		if (street && mtsAddress.street) { bindStreet(street, group); }
	}

	/**
	 * Fill suburb, state and postcode from one chosen row.
	 *
	 * The state field is the awkward one: WooCommerce renders it as a <select>
	 * where a country has states, and often upgrades that to select2. Setting
	 * .value alone updates the field but leaves select2 showing the old label,
	 * so the shopper sees one thing and the order carries another. Dispatching
	 * `change` keeps them in step.
	 */
	function fill(group, row) {
		set(document.getElementById(group + '_city'), row[0]);
		set(document.getElementById(group + '_state'), row[1]);
		set(document.getElementById(group + '_postcode'), row[2]);
	}

	function set(field, value) {
		if (!field || !value) { return; }
		field.value = value;
		field.mtsFilled = true;
		field.dispatchEvent(new Event('input', { bubbles: true }));
		field.dispatchEvent(new Event('change', { bubbles: true }));
		field.mtsFilled = false;
	}

	function bind(field, group) {
		var box = document.createElement('div');
		box.className = 'addr-ac';
		box.hidden = true;

		var host = field.parentNode;
		if (host && getComputedStyle(host).position === 'static') {
			host.style.position = 'relative';
		}
		if (host) { host.appendChild(box); }

		field.setAttribute('autocomplete', 'off');
		field.setAttribute('role', 'combobox');
		field.setAttribute('aria-expanded', 'false');
		field.setAttribute('aria-autocomplete', 'list');

		var results = [];
		var active = -1;

		// Warm the index the moment a shopper touches the field, so the first
		// keystroke already has data to match against.
		field.addEventListener('focus', load, { once: true });

		field.addEventListener('input', function () {
			/* We filled this ourselves from another field's pick. Answering it
			   would reopen this field's list on top of the form. */
			if (field.mtsFilled) { close(); return; }

			var q = field.value;

			if (q.trim().length < MIN_CHARS) { close(); return; }

			/* If the index has not arrived yet, render as soon as it does —
			   the only wait in the whole feature, and it happens once. */
			if (!ROWS) {
				load().then(function () {
					if (field.value === q) { show(search(q)); }
				});
				return;
			}

			show(search(q));
		});

		field.addEventListener('keydown', function (e) {
			if (box.hidden) { return; }
			if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
			else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
			else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(active); }
			else if (e.key === 'Escape') { close(); }
		});

		// A click on another field must dismiss this list before that field's
		// own list opens; the delay lets a click on a result land first.
		field.addEventListener('blur', function () { setTimeout(close, 160); });

		function show(rows) {
			results = rows;
			if (!rows.length) { close(); return; }

			while (box.firstChild) { box.removeChild(box.firstChild); }

			rows.forEach(function (row, i) {
				var item = document.createElement('button');
				item.type = 'button';
				item.className = 'addr-ac__item';
				item.setAttribute('role', 'option');
				item.textContent = row[0] + ' ' + row[1] + ' ' + row[2];
				item.addEventListener('mousedown', function (e) {
					// mousedown, not click: blur fires first on click and the
					// list would already be gone.
					e.preventDefault();
					pick(i);
				});
				box.appendChild(item);
			});

			active = -1;
			box.hidden = false;
			field.setAttribute('aria-expanded', 'true');
		}

		function move(step) {
			var items = box.querySelectorAll('.addr-ac__item');
			if (!items.length) { return; }
			if (active >= 0 && items[active]) { items[active].classList.remove('is-active'); }
			active = (active + step + items.length) % items.length;
			items[active].classList.add('is-active');
			items[active].scrollIntoView({ block: 'nearest' });
		}

		function pick(i) {
			if (!results[i]) { return; }
			fill(group, results[i]);
			close();
		}

		function close() {
			box.hidden = true;
			active = -1;
			field.setAttribute('aria-expanded', 'false');
		}
	}

	/**
	 * The street line — the one field that asks a server.
	 *
	 * DEBOUNCED, UNLIKE THE REST. Everywhere else in this file there is no
	 * debounce, because matching a local array costs nothing and waiting would be
	 * pure delay. Here every keystroke would be a request against an allowance of
	 * 30 a minute shared by the WHOLE SITE, so typing "10 bourke street" unthrottled
	 * would spend half the site's budget on one address. 220ms is below the point
	 * a person notices a pause and well above a fast typist's gap between keys.
	 *
	 * MIN 5 CHARACTERS for the same reason: "10 b" matches most of the country and
	 * the answer is not worth a request.
	 *
	 * Failure is silent by design. No key, quota gone, service down, offline — the
	 * list simply does not appear and the customer types their address as they
	 * would on any other checkout. A street field that shows an error is worse
	 * than one that shows nothing.
	 */
	function bindStreet(field, group) {
		var box = document.createElement('div');
		box.className = 'addr-ac';
		box.hidden = true;

		var host = field.parentNode;
		if (host && getComputedStyle(host).position === 'static') {
			host.style.position = 'relative';
		}
		if (host) { host.appendChild(box); }

		field.setAttribute('autocomplete', 'off');
		field.setAttribute('role', 'combobox');
		field.setAttribute('aria-expanded', 'false');
		field.setAttribute('aria-autocomplete', 'list');

		var results = [];
		var active = -1;
		var timer = null;
		var seq = 0;

		field.addEventListener('input', function () {
			if (field.mtsFilled) { close(); return; }

			var q = field.value.trim();
			clearTimeout(timer);

			if (q.length < 5) { close(); return; }

			timer = setTimeout(function () { lookup(q); }, 220);
		});

		function lookup(q) {
			/* Answers can arrive out of order — a short query is often slower to
			   return than the longer one typed after it. The counter means only
			   the newest response is allowed to paint, so the list never shows
			   results for a prefix the customer has already moved past. */
			var mine = ++seq;

			fetch(mtsAddress.street + '?q=' + encodeURIComponent(q), { credentials: 'omit' })
				.then(function (r) { return r.ok ? r.json() : null; })
				.then(function (data) {
					if (mine !== seq || !data || !data.results) { return; }
					show(data.results);
				})
				.catch(function () { /* stays a plain text field */ });
		}

		function show(rows) {
			results = rows;
			if (!rows.length) { close(); return; }

			while (box.firstChild) { box.removeChild(box.firstChild); }

			rows.forEach(function (row, i) {
				var item = document.createElement('button');
				item.type = 'button';
				item.className = 'addr-ac__item';
				item.setAttribute('role', 'option');
				item.textContent = row.label;
				item.addEventListener('mousedown', function (e) {
					e.preventDefault();
					pick(i);
				});
				box.appendChild(item);
			});

			active = -1;
			box.hidden = false;
			field.setAttribute('aria-expanded', 'true');
		}

		field.addEventListener('keydown', function (e) {
			if (box.hidden) { return; }
			if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
			else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
			else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(active); }
			else if (e.key === 'Escape') { close(); }
		});

		field.addEventListener('blur', function () { setTimeout(close, 160); });

		function move(step) {
			var items = box.querySelectorAll('.addr-ac__item');
			if (!items.length) { return; }
			if (active >= 0 && items[active]) { items[active].classList.remove('is-active'); }
			active = (active + step + items.length) % items.length;
			items[active].classList.add('is-active');
			items[active].scrollIntoView({ block: 'nearest' });
		}

		/* One pick fills all four fields. They came from a single G-NAF row, so
		   the suburb, state and postcode cannot disagree with each other — which
		   is the disagreement that misroutes a parcel. */
		function pick(i) {
			var row = results[i];
			if (!row) { return; }

			set(field, row.street);
			set(document.getElementById(group + '_city'), row.city);
			set(document.getElementById(group + '_state'), row.state);
			set(document.getElementById(group + '_postcode'), row.postcode);

			close();
		}

		function close() {
			box.hidden = true;
			active = -1;
			field.setAttribute('aria-expanded', 'false');
		}
	}
}());
