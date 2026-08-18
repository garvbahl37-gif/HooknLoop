/**
 * Header, drawer, footer accordion and category-rail behaviour.
 *
 * Ported from Header.jsx / Footer.jsx. Everything here is progressive: the nav
 * links, the footer link lists and the category rail are all fully usable if
 * this file never loads. It adds hover/keyboard affordances, it does not
 * provide the content.
 */
(function () {
	'use strict';

	var DESKTOP = window.matchMedia('(min-width: 900px)');

	/* ---------------------------------------------------------- mega nav ---
	   Open on hover for pointers, on click/Enter for keyboards, and close on
	   Escape or on focus leaving the item. Hover alone would strand keyboard
	   and touch users; click alone would feel sluggish with a mouse. */
	Array.prototype.forEach.call(document.querySelectorAll('[data-mts-menu]'), function (item) {
		var trigger = item.querySelector('[data-mts-menu-trigger]');
		var panel = item.querySelector('.hd-mega');
		if (!trigger || !panel) {
			return;
		}

		var closeTimer = null;

		function open() {
			clearTimeout(closeTimer);
			closeAll(item);
			item.classList.add('is-open');
			trigger.setAttribute('aria-expanded', 'true');
		}

		function close() {
			item.classList.remove('is-open');
			trigger.setAttribute('aria-expanded', 'false');
		}

		function closeSoon() {
			clearTimeout(closeTimer);
			// A short grace period: the pointer has to cross a gap between the
			// trigger and the panel, and closing instantly makes that feel broken.
			closeTimer = setTimeout(close, 140);
		}

		item.addEventListener('mouseenter', function () {
			if (DESKTOP.matches) {
				open();
			}
		});
		item.addEventListener('mouseleave', function () {
			if (DESKTOP.matches) {
				closeSoon();
			}
		});

		trigger.addEventListener('click', function (e) {
			e.preventDefault();
			if (item.classList.contains('is-open')) {
				close();
			} else {
				open();
			}
		});

		item.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && item.classList.contains('is-open')) {
				close();
				trigger.focus();
			}
		});

		item.addEventListener('focusout', function (e) {
			if (!item.contains(e.relatedTarget)) {
				close();
			}
		});
	});

	function closeAll(except) {
		Array.prototype.forEach.call(document.querySelectorAll('[data-mts-menu].is-open'), function (el) {
			if (el !== except) {
				el.classList.remove('is-open');
				var t = el.querySelector('[data-mts-menu-trigger]');
				if (t) {
					t.setAttribute('aria-expanded', 'false');
				}
			}
		});
	}

	/* ------------------------------------------------------ mobile drawer ---
	   A modal dialog: focus moves in, is trapped while open, scroll is locked,
	   and focus returns to the burger on close. */
	var drawer = document.querySelector('[data-mts-drawer]');
	if (drawer) {
		var openers = document.querySelectorAll('[data-mts-drawer-open]');
		var closers = drawer.querySelectorAll('[data-mts-drawer-close]');
		var lastFocus = null;

		function focusable() {
			return Array.prototype.filter.call(
				drawer.querySelectorAll('a[href], button:not([disabled]), input, select, [tabindex]:not([tabindex="-1"])'),
				function (el) { return el.offsetParent !== null; }
			);
		}

		function openDrawer() {
			lastFocus = document.activeElement;
			drawer.hidden = false;
			document.body.classList.add('mts-drawer-open');
			Array.prototype.forEach.call(openers, function (b) {
				b.setAttribute('aria-expanded', 'true');
			});
			var first = focusable()[0];
			if (first) {
				first.focus();
			}
		}

		function closeDrawer() {
			drawer.hidden = true;
			document.body.classList.remove('mts-drawer-open');
			Array.prototype.forEach.call(openers, function (b) {
				b.setAttribute('aria-expanded', 'false');
			});
			if (lastFocus) {
				lastFocus.focus();
			}
		}

		Array.prototype.forEach.call(openers, function (b) {
			b.addEventListener('click', openDrawer);
		});
		Array.prototype.forEach.call(closers, function (b) {
			b.addEventListener('click', closeDrawer);
		});

		drawer.addEventListener('keydown', function (e) {
			if (e.key === 'Escape') {
				closeDrawer();
				return;
			}
			if (e.key !== 'Tab') {
				return;
			}
			var items = focusable();
			if (!items.length) {
				return;
			}
			var first = items[0];
			var last = items[items.length - 1];
			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		});

		// Drawer accordions.
		Array.prototype.forEach.call(drawer.querySelectorAll('[data-mts-acc]'), function (btn) {
			btn.addEventListener('click', function () {
				var open = btn.getAttribute('aria-expanded') === 'true';
				var panel = btn.parentNode.querySelector('.hd-drawer__sub');
				btn.setAttribute('aria-expanded', open ? 'false' : 'true');
				if (panel) {
					panel.hidden = open;
				}
				// plus <-> minus, by rewriting the path rather than the markup:
				// setAttribute cannot introduce nodes, so there is no way for this
				// to become an injection point if the icon source ever changes.
				var iconPath = btn.querySelector('[data-mts-acc-icon] svg path');
				if (iconPath) {
					iconPath.setAttribute('d', open ? 'M12 5v14M5 12h14' : 'M5 12h14');
				}
			});
		});
	}

	/* --------------------------------------------------- footer accordion ---
	   Panels ship OPEN so no-JS visitors and crawlers see every link. The
	   toggle is only wired up below the desktop breakpoint, where it is needed;
	   on desktop the heading stays a plain heading. */
	function syncFooter() {
		Array.prototype.forEach.call(document.querySelectorAll('[data-mts-ftacc]'), function (btn) {
			var panel = btn.closest('.ft-col') && btn.closest('.ft-col').querySelector('[data-mts-ftpanel]');
			if (!panel) {
				return;
			}
			if (DESKTOP.matches) {
				panel.hidden = false;
				btn.setAttribute('aria-expanded', 'true');
			}
		});
	}

	Array.prototype.forEach.call(document.querySelectorAll('[data-mts-ftacc]'), function (btn) {
		btn.addEventListener('click', function () {
			if (DESKTOP.matches) {
				return; // headings are not toggles on desktop
			}
			var col = btn.closest('.ft-col');
			var panel = col && col.querySelector('[data-mts-ftpanel]');
			if (!panel) {
				return;
			}
			var open = btn.getAttribute('aria-expanded') === 'true';
			btn.setAttribute('aria-expanded', open ? 'false' : 'true');
			panel.hidden = open;
		});
	});

	if (DESKTOP.addEventListener) {
		DESKTOP.addEventListener('change', syncFooter);
	}
	syncFooter();

	/* --------------------------------------------------- category dropdown ---
	   "Shop by category" is a button + panel standing in for a <select>, because
	   a native select cannot carry group headings, product counts or an active
	   state. Standing in for one means behaving like one, so the full listbox
	   keyboard contract is implemented here: Arrow keys, Home/End, Enter, Escape,
	   type-ahead, and focus returned to the toggle on close.

	   The panel ships in the document with every category in it. This never
	   fetches; the search box filters what is already there. */
	var dd = document.querySelector('[data-mts-dd]');

	if (dd) {
		var ddToggle = dd.querySelector('[data-mts-dd-toggle]');
		var ddPanel = dd.querySelector('[data-mts-dd-panel]');
		var ddInput = dd.querySelector('[data-mts-rail-input]');
		var ddNone = dd.querySelector('[data-mts-rail-none]');
		var typeahead = '';
		var typeaheadTimer = null;

		function options() {
			return Array.prototype.filter.call(
				dd.querySelectorAll('[data-mts-rail-item]'),
				function (a) { return !a.hidden && !(a.offsetParent === null); }
			);
		}

		function openDD() {
			if (!ddPanel) { return; }
			ddPanel.hidden = false;
			dd.classList.add('is-open');
			if (ddToggle) { ddToggle.setAttribute('aria-expanded', 'true'); }
			if (ddInput) { ddInput.focus(); }
		}

		function closeDD(refocus) {
			if (!ddPanel) { return; }
			ddPanel.hidden = true;
			dd.classList.remove('is-open');
			if (ddToggle) {
				ddToggle.setAttribute('aria-expanded', 'false');
				if (refocus) { ddToggle.focus(); }
			}
		}

		function move(from, delta) {
			var all = options();
			if (!all.length) { return; }
			var i = all.indexOf(from);
			var next = i < 0 ? (delta > 0 ? 0 : all.length - 1) : (i + delta + all.length) % all.length;
			all[next].focus();
		}

		function railFilter() {
			if (!ddInput) { return; }
			var q = ddInput.value.trim().toLowerCase();
			var anyVisible = false;

			Array.prototype.forEach.call(dd.querySelectorAll('[data-mts-rail-sect]'), function (section) {
				var sectionHit = false;

				Array.prototype.forEach.call(section.querySelectorAll('[data-mts-rail-item]'), function (opt) {
					var hit = !q || (opt.getAttribute('data-name') || '').indexOf(q) !== -1;
					opt.hidden = !hit;
					if (hit) { sectionHit = true; }
				});

				var label = section.querySelector('.rail-dd__group-label');
				var labelHit = !q || (label && (label.textContent || '').toLowerCase().indexOf(q) !== -1);
				var show = sectionHit || labelHit;

				// A group matched by its own heading shows all of its entries.
				if (labelHit && !sectionHit) {
					Array.prototype.forEach.call(section.querySelectorAll('[data-mts-rail-item]'), function (opt) {
						opt.hidden = false;
					});
				}

				section.hidden = !show;
				if (show) { anyVisible = true; }
			});

			if (ddNone) {
				ddNone.hidden = anyVisible;
				ddNone.textContent = anyVisible ? '' : 'No categories match \u201c' + ddInput.value.trim() + '\u201d.';
			}
		}

		if (ddToggle) {
			ddToggle.addEventListener('click', function () {
				if (ddPanel && ddPanel.hidden) { openDD(); } else { closeDD(false); }
			});
		}

		if (ddInput) {
			ddInput.addEventListener('input', railFilter);
			ddInput.addEventListener('keydown', function (e) {
				if (e.key === 'ArrowDown') {
					e.preventDefault();
					move(null, 1);
				}
			});
		}

		dd.addEventListener('keydown', function (e) {
			if (e.key === 'Escape') {
				e.preventDefault();
				closeDD(true);
				return;
			}

			var item = e.target.closest && e.target.closest('[data-mts-rail-item]');
			if (!item) { return; }

			if (e.key === 'ArrowDown') { e.preventDefault(); move(item, 1); }
			if (e.key === 'ArrowUp') { e.preventDefault(); move(item, -1); }
			if (e.key === 'Home') { e.preventDefault(); var f = options(); if (f.length) { f[0].focus(); } }
			if (e.key === 'End') { e.preventDefault(); var l = options(); if (l.length) { l[l.length - 1].focus(); } }

			// Type-ahead: typing "mask" jumps to Masking Tape, as a select would.
			if (e.key.length === 1 && /\S/.test(e.key)) {
				typeahead += e.key.toLowerCase();
				clearTimeout(typeaheadTimer);
				typeaheadTimer = setTimeout(function () { typeahead = ''; }, 700);

				var match = options().find(function (a) {
					return (a.getAttribute('data-name') || '').indexOf(typeahead) === 0;
				});
				if (match) { match.focus(); }
			}
		});

		document.addEventListener('click', function (e) {
			if (!dd.contains(e.target)) { closeDD(false); }
		});
	}

}());
