/**
 * Hero slider — behaviour port of src/components/HeroSlider.jsx.
 *
 * Every slide is already in the DOM; this only moves the `is-active` class,
 * which is what the CSS crossfades on. The first slide is therefore visible
 * before this file runs (or if it never does).
 *
 * Deliberate behaviours, each of them load-bearing rather than decorative:
 *   - Auto-advance every 6s, matching the React interval.
 *   - Pause on hover AND on keyboard focus, so a keyboard user is not carried
 *     away from the link they just tabbed to.
 *   - Pause when the tab is hidden — an off-screen carousel burning a timer is
 *     wasted battery.
 *   - Honour prefers-reduced-motion: no auto-advance at all. Arrows and dots
 *     keep working, so the content stays reachable.
 *   - Links in inactive slides get tabindex="-1" so focus cannot land on a
 *     control nobody can see.
 */
(function () {
	'use strict';

	var root = document.querySelector('[data-mts-hero]');
	if (!root) {
		return;
	}

	var slides = Array.prototype.slice.call(root.querySelectorAll('[data-mts-hero-slide]'));
	var dots = Array.prototype.slice.call(root.querySelectorAll('[data-mts-hero-dot]'));
	var prev = root.querySelector('[data-mts-hero-prev]');
	var next = root.querySelector('[data-mts-hero-next]');

	if (slides.length < 2) {
		return;
	}

	var INTERVAL = 6000;
	var index = 0;
	var timer = null;
	var paused = false;
	var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

	function show(n) {
		index = (n + slides.length) % slides.length;

		slides.forEach(function (slide, i) {
			var on = i === index;
			slide.classList.toggle('is-active', on);

			if (on) {
				slide.removeAttribute('aria-hidden');
			} else {
				slide.setAttribute('aria-hidden', 'true');
			}

			// Keep focus out of hidden slides.
			slide.querySelectorAll('a, button').forEach(function (el) {
				el.setAttribute('tabindex', on ? '0' : '-1');
			});
		});

		dots.forEach(function (dot, i) {
			dot.classList.toggle('is-active', i === index);
			dot.setAttribute('aria-selected', i === index ? 'true' : 'false');
		});
	}

	function stop() {
		if (timer) {
			clearInterval(timer);
			timer = null;
		}
	}

	function start() {
		stop();
		if (reduced.matches || paused || document.hidden) {
			return;
		}
		timer = setInterval(function () {
			show(index + 1);
		}, INTERVAL);
	}

	function go(n) {
		show(n);
		start(); // restart the clock so a manual move gets a full dwell
	}

	if (prev) {
		prev.addEventListener('click', function () {
			go(index - 1);
		});
	}
	if (next) {
		next.addEventListener('click', function () {
			go(index + 1);
		});
	}

	dots.forEach(function (dot, i) {
		dot.addEventListener('click', function () {
			go(i);
		});
	});

	['mouseenter', 'focusin'].forEach(function (evt) {
		root.addEventListener(evt, function () {
			paused = true;
			stop();
		});
	});
	['mouseleave', 'focusout'].forEach(function (evt) {
		root.addEventListener(evt, function () {
			paused = false;
			start();
		});
	});

	document.addEventListener('visibilitychange', start);

	// Left/right arrows when focus is inside the carousel.
	root.addEventListener('keydown', function (e) {
		if (e.key === 'ArrowLeft') {
			e.preventDefault();
			go(index - 1);
		} else if (e.key === 'ArrowRight') {
			e.preventDefault();
			go(index + 1);
		}
	});

	// React to the user changing their motion preference mid-session.
	if (reduced.addEventListener) {
		reduced.addEventListener('change', start);
	}

	show(0);
	start();
}());
