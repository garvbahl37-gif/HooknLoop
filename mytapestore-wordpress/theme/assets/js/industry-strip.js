/**
 * Industries strip — behaviour port of IndustriesStrip in src/sections/home.jsx.
 *
 * The React version sliced its list into pages in render. Here every tile is
 * already in the DOM as one long track; this file groups them into pages,
 * builds the dots, and translates the track. That way the section is complete
 * and crawlable without JavaScript — it simply becomes a horizontally
 * scrollable row instead of a paged one.
 *
 * Page size is breakpoint-dependent (2/3/4/5), matching perPageFor().
 */
(function () {
	'use strict';

	var strip = document.querySelector('[data-mts-strip]');
	if (!strip) {
		return;
	}

	var track = strip.querySelector('[data-mts-strip-track]');
	var dotsBox = strip.querySelector('[data-mts-strip-dots]');
	if (!track) {
		return;
	}

	var tiles = Array.prototype.slice.call(track.children);
	if (tiles.length < 2) {
		return;
	}

	var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
	var page = 0;
	var perPage = 5;
	var pages = 1;
	var timer = null;
	var paused = false;

	function perPageFor(w) {
		if (w < 560) { return 2; }
		if (w < 900) { return 3; }
		if (w < 1220) { return 4; }
		return 5;
	}

	function layout() {
		perPage = perPageFor(window.innerWidth);
		pages = Math.max(1, Math.ceil(tiles.length / perPage));
		if (page >= pages) {
			page = 0;
		}

		// Each tile takes an equal share of one page's width, so a page always
		// holds exactly perPage tiles and the track is pages * 100% wide.
		tiles.forEach(function (tile) {
			tile.style.flex = '0 0 ' + (100 / perPage) + '%';
			tile.style.maxWidth = (100 / perPage) + '%';
		});

		buildDots();
		move();
	}

	function buildDots() {
		if (!dotsBox) {
			return;
		}
		dotsBox.textContent = '';
		if (pages < 2) {
			return;
		}
		for (var i = 0; i < pages; i++) {
			var dot = document.createElement('button');
			dot.type = 'button';
			dot.className = 'indx-strip__dot' + (i === page ? ' is-on' : '');
			dot.setAttribute('aria-label', 'Show industries, set ' + (i + 1) + ' of ' + pages);
			dot.dataset.page = String(i);
			dot.addEventListener('click', function (e) {
				page = parseInt(e.currentTarget.dataset.page, 10) || 0;
				move();
				restart();
			});
			dotsBox.appendChild(dot);
		}
	}

	function move() {
		track.style.transform = 'translateX(-' + (page * 100) + '%)';
		if (!dotsBox) {
			return;
		}
		Array.prototype.forEach.call(dotsBox.children, function (dot, i) {
			dot.classList.toggle('is-on', i === page);
		});
	}

	function stop() {
		if (timer) {
			clearInterval(timer);
			timer = null;
		}
	}

	function restart() {
		stop();
		if (reduced.matches || paused || pages < 2 || document.hidden) {
			return;
		}
		timer = setInterval(function () {
			page = (page + 1) % pages;
			move();
		}, 2800);
	}

	strip.addEventListener('mouseenter', function () { paused = true; stop(); });
	strip.addEventListener('mouseleave', function () { paused = false; restart(); });
	strip.addEventListener('focusin', function () { paused = true; stop(); });
	strip.addEventListener('focusout', function (e) {
		if (!strip.contains(e.relatedTarget)) {
			paused = false;
			restart();
		}
	});
	document.addEventListener('visibilitychange', restart);

	var resizeTimer = null;
	window.addEventListener('resize', function () {
		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(layout, 150);
	});

	layout();
	restart();
}());
