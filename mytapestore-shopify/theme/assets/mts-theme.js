/* ===========================================================================
   My Tape Store — theme behaviour.

   Ports the interactive parts of the React redesign (mytapestore-redesign) to
   plain DOM code: mega-nav, drawer, search autocomplete, hero slider, industry
   strip, FAQ, category rail, filters, product page, cart and the chat assistant.

   House rules:
   · Every module bails out quietly if its markup isn't on the page, so this one
     file is safe to load everywhere.
   · Anything that animates checks prefers-reduced-motion, as the React version did.
   · Nothing here invents state the server doesn't have. The cart is Shopify's;
     only the wishlist is local, and it is labelled as such.
   ======================================================================== */
(function () {
  'use strict';

  var MTS = (window.MTS = window.MTS || {});
  var routes = MTS.routes || {};
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var reduceMotion = function () {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  };

  /* --- money ---------------------------------------------------------------
     Mirrors Shopify's money_format so JS-rendered prices match Liquid-rendered
     ones exactly. Falls back to a plain dollar amount if the format string is
     something this doesn't understand, rather than printing "undefined". */
  function formatMoney(cents) {
    var value = (Number(cents) || 0) / 100;
    var fmt = MTS.moneyFormat || '${{amount}}';
    function withCommas(n, decimals) {
      var parts = n.toFixed(decimals).split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return parts.join('.');
    }
    return fmt.replace(/\{\{\s*(\w+)\s*\}\}/g, function (_, name) {
      switch (name) {
        case 'amount': return withCommas(value, 2);
        case 'amount_no_decimals': return withCommas(value, 0);
        case 'amount_with_comma_separator': return withCommas(value, 2).replace(/,/g, ' ').replace('.', ',');
        case 'amount_no_decimals_with_comma_separator': return withCommas(value, 0).replace(/,/g, ' ');
        default: return withCommas(value, 2);
      }
    });
  }

  function fetchJSON(url, options) {
    return fetch(url, options).then(function (r) {
      if (!r.ok) throw new Error(r.status + ' ' + r.statusText);
      return r.json();
    });
  }

  /* =======================================================================
     WISHLIST — browser-local, exactly as in the React app (lib/cart.js).
     It does NOT sync to a customer account; the UI never claims it does.
     ==================================================================== */
  var WISH_KEY = 'mts_wish_v1';

  function getWish() {
    var raw;
    try { raw = JSON.parse(localStorage.getItem(WISH_KEY)); } catch (e) { raw = null; }
    if (!Array.isArray(raw)) return [];
    /* Read through a filter rather than trusting what is on disk. A handle that
       appeared twice — or a null left by an old build — used to be counted by
       the header badge while the wishlist page had nothing to show for it, so
       the badge read higher than the number of cards. */
    var out = [];
    for (var i = 0; i < raw.length; i++) {
      var h = raw[i];
      if (typeof h === 'string' && h !== '' && out.indexOf(h) === -1) out.push(h);
    }
    return out;
  }
  function setWish(list) {
    try { localStorage.setItem(WISH_KEY, JSON.stringify(list)); } catch (e) { /* private mode */ }
    paintWish();
  }
  /* Forget handles whose product no longer exists. Only ever called with
     handles the server answered 404 for — a failed request must not delete
     someone's saved items. */
  function dropWish(handles) {
    if (!handles.length) return;
    setWish(getWish().filter(function (h) { return handles.indexOf(h) === -1; }));
  }
  function paintWish() {
    var list = getWish();
    $$('[data-mts-wish]').forEach(function (btn) {
      var on = list.indexOf(btn.getAttribute('data-mts-wish')) !== -1;
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.setAttribute('aria-label', on ? 'Remove from wishlist' : 'Add to wishlist');
    });
    var total = $('[data-mts-wish-total]');
    if (total) total.textContent = list.length;
    var badge = $('[data-mts-wish-count]');
    if (badge) {
      badge.textContent = list.length;
      badge.hidden = list.length === 0;
    }
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-mts-wish]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    var handle = btn.getAttribute('data-mts-wish');
    var list = getWish();
    var i = list.indexOf(handle);
    if (i === -1) list.push(handle); else list.splice(i, 1);
    setWish(list);
  });

  /* =======================================================================
     CART COUNT
     ==================================================================== */
  function paintCartCount(count) {
    var badge = $('[data-mts-cart-count]');
    if (!badge) return;
    badge.textContent = count;
    badge.hidden = count === 0;
  }

  function cartCount() {
    var badge = $('[data-mts-cart-count]');
    return badge ? (parseInt(badge.textContent, 10) || 0) : 0;
  }

  /* Optimistic update. Adding to a cart succeeds virtually always, so the count
     moves the instant you click rather than a network round-trip later; the
     real count from the server replaces it a moment after, and bumpCartCount(-n)
     rolls it back if the request actually failed. */
  function bumpCartCount(delta) {
    paintCartCount(Math.max(0, cartCount() + delta));
  }

  function refreshCart() {
    return fetchJSON(routes.cart + '.js').then(function (cart) {
      paintCartCount(cart.item_count);
      return cart;
    });
  }

  function addToCart(id, quantity) {
    return fetchJSON(routes.cartAdd + '.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ items: [{ id: id, quantity: quantity || 1 }] })
    });
  }

  /* =======================================================================
     PASSWORD VISIBILITY
     ==================================================================== */
  /* Applied to every password field in the theme rather than per template —
     login, register, activate, reset, the storefront gate and the two in the
     account panel. A shopper who cannot see what they typed retypes it, and on
     a phone keyboard that is where sign-ups are abandoned. */
  function initPasswordToggles() {
    $$('input[type="password"]').forEach(function (input) {
      if (input.getAttribute('data-mts-pw')) return;
      input.setAttribute('data-mts-pw', '');

      var wrap = document.createElement('span');
      wrap.className = 'pw-wrap';
      input.parentNode.insertBefore(wrap, input);
      wrap.appendChild(input);

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pw-toggle';
      btn.setAttribute('aria-pressed', 'false');
      btn.setAttribute('aria-label', 'Show password');
      btn.textContent = 'Show';
      wrap.appendChild(btn);

      btn.addEventListener('click', function () {
        var showing = input.type === 'text';
        input.type = showing ? 'password' : 'text';
        btn.textContent = showing ? 'Show' : 'Hide';
        btn.setAttribute('aria-pressed', showing ? 'false' : 'true');
        btn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
        /* Keep the caret where it was: switching type moves it to the end in
           some browsers, which feels like the field reset itself. */
        var pos = input.value.length;
        try { input.setSelectionRange(pos, pos); } catch (e) { /* number-ish inputs */ }
        input.focus();
      });
    });
  }

  /* =======================================================================
     HEADER — mega nav, drawer
     ==================================================================== */
  function initNav() {
    var nav = $('[data-mts-nav]');
    if (!nav) return;
    var items = $$('[data-mts-menu]', nav);

    function closeAll(except) {
      if (!except && MTS._navLock) MTS._navLock(false);
      items.forEach(function (li) {
        if (li === except) return;
        li.classList.remove('is-open');
        var trigger = $('[data-mts-menu-trigger]', li);
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
      });
    }
    function open(li) {
      if (MTS._navLock) MTS._navLock(true);
      closeAll(li);
      li.classList.add('is-open');
      var trigger = $('[data-mts-menu-trigger]', li);
      if (trigger) trigger.setAttribute('aria-expanded', 'true');
    }

    items.forEach(function (li) {
      var trigger = $('[data-mts-menu-trigger]', li);
      li.addEventListener('mouseenter', function () { open(li); });
      li.addEventListener('focusin', function () { open(li); });
      if (trigger) {
        // The trigger is an <a> whenever the parent menu item has its own page.
        // Pointer devices already opened the panel on mouseenter, so a click
        // should just follow the link. Touch devices get no hover, so the first
        // tap has to reveal the children (otherwise they are unreachable) and
        // the second tap navigates.
        var isLink = trigger.tagName === 'A' && trigger.getAttribute('href');
        trigger.addEventListener('click', function (e) {
          if (isLink && !window.matchMedia('(hover: none)').matches) return;
          if (li.classList.contains('is-open')) {
            if (isLink) return;
            closeAll();
          } else {
            if (isLink) e.preventDefault();
            open(li);
          }
        });
      }
    });

    nav.addEventListener('mouseleave', function () { closeAll(); });
    nav.addEventListener('focusout', function (e) {
      if (!nav.contains(e.relatedTarget)) closeAll();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAll();
    });
  }

  function initDrawer() {
    var drawer = $('[data-mts-drawer]');
    if (!drawer) return;
    var openBtn = $('[data-mts-drawer-open]');

    function setOpen(open) {
      drawer.hidden = !open;
      document.body.style.overflow = open ? 'hidden' : '';
      if (openBtn) openBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
        var first = drawer.querySelector('button, a, input');
        if (first) first.focus();
      } else if (openBtn) {
        openBtn.focus();
      }
    }

    if (openBtn) openBtn.addEventListener('click', function () { setOpen(true); });
    $$('[data-mts-drawer-close]', drawer).forEach(function (b) {
      b.addEventListener('click', function () { setOpen(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !drawer.hidden) setOpen(false);
    });

    // accordions
    $$('[data-mts-acc]', drawer).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') === 'true';
        var sub = btn.nextElementSibling;
        btn.setAttribute('aria-expanded', open ? 'false' : 'true');
        if (sub) sub.hidden = open;
        var icon = $('[data-mts-acc-icon]', btn);
        if (icon) {
          icon.innerHTML = open
            ? '<svg width="18" height="18" viewBox="0 0 24 24" role="presentation" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>'
            : '<svg width="18" height="18" viewBox="0 0 24 24" role="presentation" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg>';
        }
      });
    });
  }

  /* =======================================================================
     SMART STICKY HEADER
     Hides the masthead/nav while scrolling down, brings it straight back on
     scroll up. Written against rAF rather than the raw scroll event so it
     costs nothing on long pages.
     ==================================================================== */
  function initStickyHeader() {
    var bar = $('.hd-nav');
    if (!bar) return;

    // A spacer takes the bar's place in flow while it is fixed, so promoting it
    // never shifts the page. It is painted the same colour as the bar in CSS —
    // left transparent it showed as a pale seam at the top of the viewport
    // during the swap, which read as "a white layer appearing".
    var spacer = document.createElement('div');
    spacer.className = 'mts-stick-spacer';
    spacer.hidden = true;
    bar.parentNode.insertBefore(spacer, bar.nextSibling);

    var barHeight = 0;
    var fixedFrom = 0;      // where the bar sits in the document
    var promoteAt = 0;      // where it is fully out of sight
    var isFixed = false;
    var lastY = window.scrollY || 0;
    var ticking = false;
    // Trackpads and momentum scrolling emit a lot of 1-2px noise; reacting to it
    // makes the bar flicker.
    var DELTA = 6;

    // Heights are measured here, never inside the scroll handler — reading
    // offsetHeight per frame forces a reflow and is what makes a sticky header
    // feel heavy on a long page.
    function measure() {
      barHeight = bar.offsetHeight;
      spacer.style.height = barHeight + 'px';
      // While the bar is out of flow its own rect is useless (top is always 0),
      // so the spacer standing in its place is what gets measured.
      var ref = isFixed ? spacer : bar;
      fixedFrom = ref.getBoundingClientRect().top + (window.scrollY || 0);

      // The bar now stays put in both directions, so it is promoted at the
      // exact point its natural position reaches the viewport top. Swapping
      // there means the fixed bar appears precisely where the in-flow one was
      // — no gap, no jump, and nothing to animate.
      promoteAt = fixedFrom;
    }

    // Panel state is tracked by flag rather than queried per frame — the old
    // version ran four querySelectorAll calls on every scroll tick.
    var locks = 0;
    function setLock(on) {
      locks = on ? locks + 1 : Math.max(0, locks - 1);
      bar.classList.toggle('is-locked', locks > 0);
      if (locks > 0) bar.classList.remove('is-hidden');
    }
    MTS._navLock = setLock;

    function setFixed(on, instant) {
      if (on === isFixed) return;
      isFixed = on;
      // `is-instant` kills the transition for exactly one frame, so parking the
      // bar in its hidden position can never be animated into view.
      if (instant) bar.classList.add('is-instant');
      spacer.hidden = !on;
      bar.classList.toggle('is-fixed', on);
      if (!on) bar.classList.remove('is-hidden', 'is-pinned');
      if (instant) {
        void bar.offsetWidth;                 // flush the style change before re-enabling
        window.requestAnimationFrame(function () { bar.classList.remove('is-instant'); });
      }
    }

    function update() {
      ticking = false;
      var y = window.scrollY || 0;
      if (y < 0) y = 0;                       // iOS rubber-banding
      var diff = y - lastY;

      // The bar is display:none below 900px — nothing to promote.
      if (!barHeight) { lastY = y; return; }

      // Stays put in both directions: once the page has scrolled to where the
      // bar would leave, it is pinned and stays pinned. It used to slide away
      // on downward scroll and return on upward, which meant the primary nav
      // was missing for most of a downward read.
      setFixed(y >= promoteAt);
      bar.classList.remove('is-hidden');
      bar.classList.toggle('is-pinned', isFixed);
      lastY = y;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        setFixed(false);
        measure();
        update();
      }, 150);
    }, { passive: true });

    // The logo and the utility strip settle after their images decode, which
    // moves the bar down the page. Measured only at DOMContentLoaded the
    // threshold ends up tens of pixels too high and the bar pins late.
    window.addEventListener('load', function () {
      if (!isFixed) { measure(); update(); }
    });

    measure();
    update();
  }

  /* =======================================================================
     OFF-SCREEN ANIMATION PAUSING
     The brand and testimonial marquees loop forever, and the hero and industry
     carousels tick on timers. Left alone they keep the compositor busy while
     the visitor is reading something else entirely, which is exactly what makes
     a long page feel sticky to scroll. Each one is paused while off-screen.
     ==================================================================== */
  function initVisibilityPausing() {
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        e.target.classList.toggle('mts-offscreen', !e.isIntersecting);
        // let the carousels know so their timers can idle too
        if (e.target._mtsVisible !== undefined) e.target._mtsVisible = e.isIntersecting;
      });
    }, { rootMargin: '150px 0px' });

    $$('.brandx, .tmx, .hslide, .indx-strip').forEach(function (el) {
      el._mtsVisible = true;
      io.observe(el);
    });
  }

  /* =======================================================================
     SEARCH AUTOCOMPLETE
     Ported from the SearchBox component. The React version searched a local
     catalogue; this asks Shopify's predictive-search endpoint for the same two
     groups (collections, then products) and keeps the keyboard model identical.
     ==================================================================== */
  function initSearch() {
    $$('[data-mts-search]').forEach(function (root) {
      var input = $('[data-mts-search-input]', root);
      var panel = $('[data-mts-search-panel]', root);
      var form = $('form', root);
      if (!input || !panel) return;

      var active = -1;
      var entries = [];
      var timer = null;
      var lastQuery = '';

      function close() {
        panel.hidden = true;
        input.setAttribute('aria-expanded', 'false');
        active = -1;
      }
      function paintActive() {
        $$('[data-entry]', panel).forEach(function (el, i) {
          el.classList.toggle('is-active', i === active);
        });
      }

      function render(data, term) {
        var res = (data && data.resources && data.resources.results) || {};
        var collections = res.collections || [];
        var products = res.products || [];
        entries = [];
        var html = '';

        // Everything interpolated below is escaped — including the URLs. They
        // come from Shopify's own API rather than a visitor, but an unescaped
        // value in an href/src is one product title away from being a hole.
        if (collections.length) {
          html += '<div class="search-ac__group"><span class="search-ac__label">Categories</span>';
          collections.forEach(function (c) {
            entries.push(c.url);
            html += '<a data-entry class="search-ac__cat" href="' + escapeHtml(safeUrl(c.url)) + '">' +
              '<svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/></svg>' +
              '<span>' + escapeHtml(c.title) + '</span></a>';
          });
          html += '</div>';
        }

        if (products.length) {
          html += '<div class="search-ac__group"><span class="search-ac__label">Products</span>';
          products.forEach(function (p) {
            entries.push(p.url);
            var img = p.featured_image && p.featured_image.url ? p.featured_image.url : (p.image || '');
            html += '<a data-entry class="search-ac__prod" href="' + escapeHtml(safeUrl(p.url)) + '">' +
              (img ? '<img src="' + escapeHtml(safeUrl(img)) + '" alt="" width="36" height="36">' : '<span style="width:36px"></span>') +
              '<span class="search-ac__prod-info"><b>' + escapeHtml(p.title) + '</b>' +
              '<em class="num">' + escapeHtml(priceOf(p)) + '</em></span></a>';
          });
          html += '</div>';
        }

        if (!html) { close(); return; }

        html += '<a class="search-ac__all" href="' + routes.search + '?q=' + encodeURIComponent(term) + '">' +
          'View all results for &ldquo;' + escapeHtml(term) + '&rdquo;' +
          '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16"/><path d="M14 6l6 6-6 6"/></svg></a>';

        panel.innerHTML = html;
        panel.hidden = false;
        input.setAttribute('aria-expanded', 'true');
        active = -1;
      }

      function priceOf(p) {
        // Predictive search returns a decimal string; Liquid-rendered cards use
        // money_format. Normalise to cents so both read identically.
        var raw = p.price;
        if (raw == null && p.variants && p.variants[0]) raw = p.variants[0].price;
        if (raw == null) return '';
        var cents = typeof raw === 'string' && raw.indexOf('.') !== -1
          ? Math.round(parseFloat(raw) * 100)
          : Number(raw);
        return formatMoney(cents);
      }

      function search(term) {
        if (!routes.predictiveSearch) return;
        var url = routes.predictiveSearch + '.json?q=' + encodeURIComponent(term) +
          '&resources[type]=product,collection&resources[limit]=6';
        fetchJSON(url)
          .then(function (data) { if (term === lastQuery) render(data, term); })
          .catch(function () { close(); });
      }

      input.addEventListener('input', function () {
        var term = input.value.trim();
        lastQuery = term;
        clearTimeout(timer);
        if (term.length < 2) { close(); return; }
        timer = setTimeout(function () { search(term); }, 180);
      });

      input.addEventListener('keydown', function (e) {
        if (panel.hidden || !entries.length) return;
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          active = Math.min(entries.length - 1, active + 1);
          paintActive();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          active = Math.max(-1, active - 1);
          paintActive();
        } else if (e.key === 'Enter' && active >= 0) {
          e.preventDefault();
          window.location.href = entries[active];
        } else if (e.key === 'Escape') {
          close();
        }
      });

      document.addEventListener('mousedown', function (e) {
        if (!root.contains(e.target)) close();
      });
      if (form) form.addEventListener('submit', close);
    });
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* Only same-origin or protocol-relative URLs are allowed through into an
     href/src. Blocks javascript: and data: from ever reaching the DOM. */
  function safeUrl(u) {
    var s = String(u == null ? '' : u).trim();
    if (/^(\/|https?:\/\/)/i.test(s)) return s;
    return '';
  }

  /* =======================================================================
     HERO SLIDER
     ==================================================================== */
  function initHero() {
    var hero = $('[data-mts-hero]');
    if (!hero) return;
    var slides = $$('[data-mts-hero-slide]', hero);
    var dots = $$('[data-mts-hero-dot]', hero);
    if (slides.length < 2) return;

    var i = 0;
    var paused = false;
    var interval = parseInt(hero.getAttribute('data-interval'), 10) || 6000;
    var timer = null;

    function show(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, x) {
        var on = x === i;
        s.classList.toggle('is-active', on);
        if (on) s.removeAttribute('aria-hidden'); else s.setAttribute('aria-hidden', 'true');
        // keep offscreen CTAs out of the tab order, as the React version did
        $$('a', s).forEach(function (a) { a.tabIndex = on ? 0 : -1; });
      });
      dots.forEach(function (d, x) {
        d.classList.toggle('is-active', x === i);
        d.setAttribute('aria-selected', x === i ? 'true' : 'false');
      });
    }

    function start() {
      if (reduceMotion()) return;
      stop();
      timer = setInterval(function () {
        if (paused) return;
        // don't advance a carousel nobody can see
        if (hero._mtsVisible === false) return;
        show(i + 1);
      }, interval);
    }
    function stop() { if (timer) clearInterval(timer); timer = null; }

    hero.addEventListener('mouseenter', function () { paused = true; });
    hero.addEventListener('mouseleave', function () { paused = false; });
    var prev = $('[data-mts-hero-prev]', hero);
    var next = $('[data-mts-hero-next]', hero);
    if (prev) prev.addEventListener('click', function () { show(i - 1); });
    if (next) next.addEventListener('click', function () { show(i + 1); });
    dots.forEach(function (d, x) { d.addEventListener('click', function () { show(x); }); });

    show(0);
    start();
  }

  /* =======================================================================
     INDUSTRIES STRIP
     The React strip re-paginated on resize (2/3/4/5 per page by width). Liquid
     renders every tile once into a flat track; this chunks them into pages with
     the same breakpoints and re-chunks on resize.
     ==================================================================== */
  function initIndustries() {
    var strip = $('[data-mts-industries]');
    if (!strip) return;
    var track = $('[data-mts-industries-track]', strip);
    var dotsWrap = $('[data-mts-industries-dots]', strip);
    if (!track) return;

    var tiles = $$('[data-mts-industry-tile]', track);
    if (!tiles.length) return;

    var page = 0;
    var paused = false;
    var timer = null;
    var interval = parseInt(strip.getAttribute('data-interval'), 10) || 2800;
    var pages = 1;

    function perPageFor(w) {
      if (w < 560) return 2;
      if (w < 900) return 3;
      if (w < 1220) return 4;
      return 5;
    }

    function build() {
      var per = perPageFor(window.innerWidth);
      pages = Math.max(1, Math.ceil(tiles.length / per));
      track.innerHTML = '';
      for (var p = 0; p < pages; p++) {
        var pageEl = document.createElement('div');
        pageEl.className = 'indx-strip__page';
        pageEl.style.gridTemplateColumns = 'repeat(' + per + ', 1fr)';
        tiles.slice(p * per, p * per + per).forEach(function (t) { pageEl.appendChild(t); });
        track.appendChild(pageEl);
      }
      if (page >= pages) page = 0;
      if (dotsWrap) {
        dotsWrap.innerHTML = '';
        if (pages > 1) {
          for (var d = 0; d < pages; d++) {
            (function (idx) {
              var b = document.createElement('button');
              b.className = 'indx-strip__dot' + (idx === page ? ' is-on' : '');
              b.setAttribute('aria-label', 'Show industries, set ' + (idx + 1) + ' of ' + pages);
              b.addEventListener('click', function () { go(idx); });
              dotsWrap.appendChild(b);
            })(d);
          }
        }
      }
      go(page);
    }

    function go(n) {
      page = (n + pages) % pages;
      track.style.transform = 'translateX(-' + page * 100 + '%)';
      if (dotsWrap) {
        $$('button', dotsWrap).forEach(function (b, x) { b.classList.toggle('is-on', x === page); });
      }
    }

    strip.addEventListener('mouseenter', function () { paused = true; });
    strip.addEventListener('mouseleave', function () { paused = false; });

    build();
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(build, 150);
    });

    if (pages > 1 && !reduceMotion()) {
      timer = setInterval(function () {
        if (paused || strip._mtsVisible === false) return;
        go(page + 1);
      }, interval);
    }
  }

  /* =======================================================================
     FAQ ACCORDION
     ==================================================================== */
  var ICON_PLUS = '<svg width="18" height="18" viewBox="0 0 24 24" role="presentation" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>';
  var ICON_MINUS = '<svg width="18" height="18" viewBox="0 0 24 24" role="presentation" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg>';

  function initFaq() {
    $$('[data-mts-faq]').forEach(function (list) {
      var items = $$('.faq__item', list);
      items.forEach(function (item) {
        var q = $('[data-mts-faq-q]', item);
        if (!q) return;
        q.addEventListener('click', function () {
          var isOpen = item.classList.contains('is-open');
          // single-open, matching the React `open === i ? -1 : i` behaviour
          items.forEach(function (other) {
            other.classList.remove('is-open');
            var ob = $('[data-mts-faq-q]', other);
            var oa = $('[data-mts-faq-a]', other);
            var oi = $('[data-mts-faq-icon]', other);
            if (ob) ob.setAttribute('aria-expanded', 'false');
            if (oa) oa.hidden = true;
            if (oi) oi.innerHTML = ICON_PLUS;
          });
          if (!isOpen) {
            item.classList.add('is-open');
            q.setAttribute('aria-expanded', 'true');
            var a = $('[data-mts-faq-a]', item);
            var ic = $('[data-mts-faq-icon]', item);
            if (a) a.hidden = false;
            if (ic) ic.innerHTML = ICON_MINUS;
          }
        });
      });
    });
  }

  /* =======================================================================
     CATEGORY RAIL — client-side filter, as in CategoryRail.jsx
     ==================================================================== */
  function initRail() {
    var rail = $('[data-mts-rail]');
    if (!rail) return;
    var dd = $('[data-mts-dd]', rail);
    var toggle = $('[data-mts-dd-toggle]', rail);
    var panel = $('[data-mts-dd-panel]', rail);
    var input = $('[data-mts-rail-input]', rail);
    var none = $('[data-mts-rail-none]', rail);
    if (!dd || !toggle || !panel) return;

    var opts = function () {
      return $$('[data-mts-rail-item]', panel).filter(function (o) { return !o.hidden; });
    };
    var focusIndex = -1;

    function open() {
      panel.hidden = false;
      dd.setAttribute('data-open', '');
      toggle.setAttribute('aria-expanded', 'true');
      if (input) { input.value = ''; apply(); input.focus(); }
      focusIndex = -1;
      document.addEventListener('mousedown', onDocDown);
    }
    function close(returnFocus) {
      panel.hidden = true;
      dd.removeAttribute('data-open');
      toggle.setAttribute('aria-expanded', 'false');
      setFocus(-1);
      document.removeEventListener('mousedown', onDocDown);
      if (returnFocus) toggle.focus();
    }
    function onDocDown(e) { if (!dd.contains(e.target)) close(false); }

    function setFocus(i) {
      var list = opts();
      list.forEach(function (o) { o.classList.remove('is-focus'); });
      focusIndex = i;
      if (i >= 0 && list[i]) {
        list[i].classList.add('is-focus');
        // keep the highlighted option in view without scrolling the page
        list[i].scrollIntoView({ block: 'nearest' });
      }
    }

    function apply() {
      var q = input ? input.value.trim().toLowerCase() : '';
      var shown = 0;
      $$('[data-mts-rail-item]', panel).forEach(function (o) {
        var match = !q || (o.getAttribute('data-name') || '').indexOf(q) !== -1;
        o.hidden = !match;
        if (match) shown++;
      });
      // hide a group heading whose options are all filtered out
      $$('[data-mts-rail-sect]', panel).forEach(function (sect) {
        var any = $$('[data-mts-rail-item]', sect).some(function (o) { return !o.hidden; });
        sect.hidden = !any;
      });
      if (none) {
        none.hidden = shown !== 0;
        none.textContent = 'No categories match \u201c' + (input ? input.value.trim() : '') + '\u201d.';
      }
      setFocus(-1);
    }

    toggle.addEventListener('click', function () {
      if (panel.hidden) open(); else close(false);
    });
    if (input) input.addEventListener('input', apply);

    dd.addEventListener('keydown', function (e) {
      var list = opts();
      if (e.key === 'Escape') { e.preventDefault(); close(true); return; }
      if (panel.hidden) {
        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
        return;
      }
      if (e.key === 'ArrowDown')      { e.preventDefault(); setFocus(Math.min(list.length - 1, focusIndex + 1)); }
      else if (e.key === 'ArrowUp')   { e.preventDefault(); setFocus(Math.max(0, focusIndex - 1)); }
      else if (e.key === 'Home')      { e.preventDefault(); setFocus(0); }
      else if (e.key === 'End')       { e.preventDefault(); setFocus(list.length - 1); }
      else if (e.key === 'Enter' && focusIndex >= 0 && list[focusIndex]) {
        e.preventDefault(); window.location.href = list[focusIndex].href;
      }
    });

    apply();
  }

  /* =======================================================================
     FILTERS + SORT — auto-submit, so the panel behaves like the React one
     ==================================================================== */
  function initFilters() {
    // collapsible groups, matching the original sidebar
    $$('[data-mts-filt-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') === 'true';
        var body = btn.parentNode.querySelector('[data-mts-filt-body]');
        btn.setAttribute('aria-expanded', open ? 'false' : 'true');
        if (body) body.hidden = open;
      });
    });

    var form = $('[data-mts-filters]');
    if (form) {
      // price buckets write into the two hidden gte/lte inputs (in dollars)
      var bucketWrap = $('[data-mts-price-buckets]', form);
      if (bucketWrap) {
        var minInput = $('[data-mts-price-min]', bucketWrap);
        var maxInput = $('[data-mts-price-max]', bucketWrap);
        $$('input[name="mts-price"]', bucketWrap).forEach(function (radio) {
          radio.addEventListener('change', function () {
            if (minInput) minInput.value = radio.getAttribute('data-gte') || '';
            if (maxInput) maxInput.value = radio.getAttribute('data-lte') || '';
            form.submit();
          });
        });
      }
      form.addEventListener('change', function (e) {
        if (e.target.name === 'mts-price') return;            // handled above
        // Derived colour/size boxes filter in the browser and carry no name —
        // submitting would reload the page and drop the selection.
        if (e.target.hasAttribute('data-mts-cfilter')) return;
        form.submit();
      });
    }

    var sortForm = $('[data-mts-sort]');
    if (sortForm) {
      var select = $('select[name="sort_by"]', sortForm);
      if (select) select.addEventListener('change', function () { sortForm.submit(); });
    }
  }

  /* =======================================================================
     PRODUCT CARDS — whole-card click + quick add
     ==================================================================== */
  function initCards() {
    document.addEventListener('click', function (e) {
      // quick add (simple products) — same optimistic treatment
      var quick = e.target.closest('[data-mts-quick-add]');
      if (quick) {
        e.preventDefault();
        e.stopPropagation();
        var id = quick.getAttribute('data-mts-quick-add');
        // the product's minimum order quantity, not a blind 1
        var n = Math.max(1, parseInt(quick.getAttribute('data-mts-quick-qty'), 10) || 1);
        var label = quick.innerHTML;
        quick.disabled = true;
        quick.textContent = 'Added';
        bumpCartCount(n);
        addToCart(id, n)
          .then(function () { window.location.href = routes.cart; })
          .catch(function () {
            bumpCartCount(-n);
            quick.innerHTML = label;
            quick.disabled = false;
          });
        return;
      }

      // clicking anywhere on the card opens the product, as in ProductCard.jsx
      var card = e.target.closest('[data-mts-card]');
      if (!card) return;
      if (e.target.closest('a, button')) return;
      var href = card.getAttribute('data-mts-card-href');
      if (href) window.location.href = href;
    });
  }

  /* =======================================================================
     PRODUCT PAGE
     ==================================================================== */
  function initProduct() {
    var root = $('[data-mts-product]');
    if (!root) return;

    var variants = [];
    try {
      variants = JSON.parse($('[data-mts-product-json]', root).textContent) || [];
    } catch (e) { variants = []; }

    var form = $('[data-mts-product-form]', root) || $('form[action*="/cart/add"]', root);
    var idInput = $('[data-mts-variant-id]', root);
    var priceEl = $('[data-mts-price]', root);
    var wasEl = $('[data-mts-was]', root);
    var skuEl = $('[data-mts-sku]', root);
    var skuWrap = $('[data-mts-sku-wrap]', root);
    var inStock = $('[data-mts-instock]', root);
    var oos = $('[data-mts-oos]', root);
    var oosBadge = $('[data-mts-oos-badge]', root);
    var addBtn = $('[data-mts-add]', root);
    var buyBtn = $('[data-mts-buynow]', root);
    var qtyInput = $('[data-mts-qty]', root);
    var lineTotal = $('[data-mts-linetotal]', root);

    var current = variants.length ? variants[0] : null;
    var discount = 0; // fraction off from the volume tier, when tiers are enabled

    function selectedOptions() {
      var vals = [];
      $$('[data-mts-opt]', root).forEach(function (el) {
        var idx = parseInt(el.getAttribute('data-mts-opt'), 10);
        if (el.tagName === 'SELECT') {
          vals[idx] = el.value;
        } else if (el.classList.contains('is-active')) {
          vals[idx] = el.getAttribute('data-value');
        }
      });
      return vals;
    }

    // which option the shopper touched last, so an impossible combination can
    // be resolved in favour of their most recent intent
    var lastChanged = -1;

    function findVariant() {
      var wanted = selectedOptions();
      if (!wanted.length) return variants[0] || null;
      for (var i = 0; i < variants.length; i++) {
        var v = variants[i];
        var match = true;
        for (var j = 0; j < wanted.length; j++) {
          if (wanted[j] != null && v.options[j] !== wanted[j]) { match = false; break; }
        }
        if (match) return v;
      }
      return null;
    }

    /* Not every option combination exists — this store sells 96mm carpet tape in
       brown but not white. Previously choosing white there matched nothing, so
       the picker went dead: no price change, no image change, nothing. Silence
       reads as a broken control.

       Instead, honour the option just clicked and move the OTHER options to the
       nearest combination that exists, preferring one in stock. */
    function resolveVariant() {
      var exact = findVariant();
      if (exact) return exact;
      if (lastChanged < 0) return null;

      var wanted = selectedOptions();
      var pool = variants.filter(function (v) { return v.options[lastChanged] === wanted[lastChanged]; });
      if (!pool.length) return null;

      // closest = agrees with the most of what was already chosen
      var best = null, bestScore = -1;
      pool.forEach(function (v) {
        var score = 0;
        for (var j = 0; j < wanted.length; j++) {
          if (j !== lastChanged && wanted[j] != null && v.options[j] === wanted[j]) score++;
        }
        if (v.available) score += 0.5;          // break ties toward buyable
        if (score > bestScore) { best = v; bestScore = score; }
      });
      if (best) syncControls(best);
      return best;
    }

    // Push a variant's option values back onto the selects and swatch buttons,
    // so the controls never disagree with what is actually in the cart form.
    function optValue(el, idx) {
      return el.getAttribute('data-value') ||
             (el.getAttribute('title') || '') ||
             el.textContent.trim();
    }

    /* MARK COMBINATIONS THAT DO NOT EXIST.

       Not every option pair is a real product. Felt tape runs 24/36/48/72mm in
       both colours but 96mm only in Black — so a shopper could pick 96mm, then
       White, and land on a variant that was never made. The picker previously
       let that happen and quietly resolved to the closest match, which is how
       someone ends up ordering the wrong thing.

       For each option value we ask: does ANY variant exist that has this value
       together with what is already chosen in the other options? If not it is
       marked unavailable — dimmed and struck through, not removed, because
       hiding it makes the range look smaller than it is and the shopper cannot
       tell whether 96mm White is out of stock or simply not made. */
    function markUnavailable(v) {
      if (!v || !variants.length) return;
      var sel = v.options.slice();
      $$('[data-mts-opt]', root).forEach(function (el) {
        var idx = parseInt(el.getAttribute('data-mts-opt'), 10);
        if (el.tagName === 'SELECT') {
          $$('option', el).forEach(function (o) {
            var exists = variants.some(function (cand) {
              if (cand.options[idx] !== o.value) return false;
              for (var i = 0; i < sel.length; i++) {
                if (i !== idx && sel[i] != null && cand.options[i] !== sel[i]) return false;
              }
              return true;
            });
            o.disabled = !exists;
            o.classList.toggle('is-unavailable', !exists);
          });
          return;
        }
        var val = optValue(el, idx);
        var exists = variants.some(function (cand) {
          if (cand.options[idx] !== val) return false;
          for (var i = 0; i < sel.length; i++) {
            if (i !== idx && sel[i] != null && cand.options[i] !== sel[i]) return false;
          }
          return true;
        });
        el.classList.toggle('is-unavailable', !exists);
        el.setAttribute('aria-disabled', exists ? 'false' : 'true');
        if (!exists && !el.getAttribute('data-unavail-title')) {
          el.setAttribute('data-unavail-title', '');
          el.title = val + ' is not made in this size';
        } else if (exists && el.hasAttribute('data-unavail-title')) {
          el.removeAttribute('data-unavail-title');
          el.title = el.getAttribute('data-value') || '';
        }
      });
    }

    function syncControls(v) {
      if (!v) return;
      $$('select[data-mts-opt]', root).forEach(function (sel) {
        var idx = parseInt(sel.getAttribute('data-mts-opt'), 10);
        if (v.options[idx] != null && sel.value !== v.options[idx]) sel.value = v.options[idx];
      });
      $$('button[data-mts-opt]', root).forEach(function (btn) {
        var idx = parseInt(btn.getAttribute('data-mts-opt'), 10);
        var on = btn.getAttribute('data-value') === v.options[idx] ||
                 btn.textContent.trim() === v.options[idx] ||
                 (btn.getAttribute('title') || '') === v.options[idx];
        btn.classList.toggle('is-active', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      markUnavailable(v);
    }

    /* Mirror the chosen variant into the URL as ?variant=<id>, the same shape
       Shopify itself uses. Without it every size and colour of a product shares
       one address: a shopper cannot send "this one in 24mm", and a paste into
       chat or an email reopens on whatever variant happens to be first.

       replaceState, never pushState — picking through six widths should not
       load the back button with six entries the shopper has to press past to
       leave the page. */
    /* Set the moment the shopper actually changes an option. Until then the
       address stays exactly as they arrived on it: landing on a product must
       NOT stamp ?variant= onto a clean URL, because that turns every plain
       product link into a variant-specific one the moment it is opened, and
       shoppers copy the address out of the bar. A link that already names a
       variant keeps it — preselectFromUrl honours it and nothing rewrites it. */
    var userPicked = false;

    function syncUrl(v) {
      if (!v || !userPicked || !window.history || !history.replaceState) return;
      try {
        var u = new URL(window.location.href);
        if (u.searchParams.get('variant') === String(v.id)) return;
        u.searchParams.set('variant', v.id);
        history.replaceState(history.state, '', u.pathname + u.search + u.hash);
      } catch (e) { /* older browsers: the page still works, just without the id */ }
    }

    /* The reverse trip: open a shared link on the variant it names. Runs before
       the first paint so the controls, price, image and cart form all agree
       from the first frame rather than flicking from the default variant. */
    function preselectFromUrl() {
      try {
        var want = new URL(window.location.href).searchParams.get('variant');
        if (!want) return;
        for (var i = 0; i < variants.length; i++) {
          if (String(variants[i].id) === String(want)) { syncControls(variants[i]); return; }
        }
      } catch (e) { /* ignore — fall through to the default variant */ }
    }

    function paint() {
      current = resolveVariant();
      var available = !!(current && current.available);

      syncUrl(current);
      if (idInput && current) idInput.value = current.id;
      if (priceEl && current) {
        priceEl.textContent = formatMoney(Math.round(current.price * (1 - discount)));
        if (wasEl) {
          // show the undiscounted price only when there is a saving to show
          wasEl.textContent = formatMoney(current.price);
          wasEl.hidden = discount <= 0;
        }
      }
      if (skuEl && current) skuEl.textContent = current.sku || '';
      if (skuWrap) skuWrap.hidden = !(current && current.sku);

      if (inStock) inStock.hidden = !available;
      if (oos) oos.hidden = available;
      if (oosBadge) oosBadge.hidden = available;
      if (addBtn) addBtn.disabled = !available;
      if (buyBtn) buyBtn.disabled = !available;

      paintLineTotal();
      paintTierPrices();
      paintImage();
    }

    /* Show the chosen variant's own image.

       Colour is the option shoppers pick by eye, so leaving the gallery on the
       first image while the swatch says "Black" is the single most confusing
       thing the picker could do. Shopify exposes the variant's image on the
       variant JSON, so no extra request is needed.

       Clicking the matching thumb rather than assigning src directly keeps the
       thumb highlight, the lightbox index and the gallery's own state in sync —
       setting src straight onto the <img> would desync all three. */
    function paintImage() {
      if (!current) return;
      var media = current.featured_media;
      var img = current.featured_image;
      if (!media && !img) return;                    // variant has no image of its own

      var gal = $('[data-mts-gallery]', root);
      if (!gal) return;

      if (media && media.id != null) {
        var thumb = $('[data-mts-thumb][data-media-id="' + media.id + '"]', gal);
        if (thumb) {
          if (!thumb.classList.contains('is-active')) thumb.click();
          return;
        }
      }

      // Single-image products render no thumbs, so there is nothing to click.
      var mainImg = $('[data-mts-gallery-img]', gal);
      var src = (img && img.src) || (media && media.preview_image && media.preview_image.src);
      if (mainImg && src && mainImg.getAttribute('src') !== src) {
        mainImg.setAttribute('src', src);
        if (img && img.alt) mainImg.setAttribute('alt', img.alt);
      }
    }

    /* The floor is the product's minimum order quantity, rendered onto the
       input by the section. It is NOT always 1: 20 products came across from
       the original store with a per-product minimum (2, 4 or 6), because the
       shop cannot break those cartons — a 6-roll minimum masking tape has no
       valid order of 1. The stepper stops there rather than letting someone
       build an order the store would have to phone them about. */
    var minQty = Math.max(1, parseInt(qtyInput && qtyInput.getAttribute('data-mts-qty-min'), 10) || 1);

    function qty() {
      return Math.max(minQty, parseInt(qtyInput && qtyInput.value, 10) || minQty);
    }

    function paintLineTotal() {
      if (!lineTotal || !current) return;
      lineTotal.textContent = formatMoney(Math.round(current.price * (1 - discount) * qty()));
    }

    function paintTierPrices() {
      if (!current) return;
      $$('[data-mts-tier]', root).forEach(function (btn) {
        var off = (parseInt(btn.getAttribute('data-off'), 10) || 0) / 100;
        var el = $('[data-mts-tier-price]', btn);
        if (el) el.textContent = formatMoney(Math.round(current.price * (1 - off)));
      });
    }

    // option inputs
    $$('select[data-mts-opt]', root).forEach(function (sel) {
      sel.addEventListener('change', function () {
        userPicked = true;
        lastChanged = parseInt(sel.getAttribute('data-mts-opt'), 10);
        paint();
      });
    });
    $$('button[data-mts-opt]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = btn.getAttribute('data-mts-opt');
        $$('button[data-mts-opt="' + idx + '"]', root).forEach(function (b) {
          b.classList.remove('is-active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('is-active');
        btn.setAttribute('aria-pressed', 'true');
        var label = $('[data-mts-opt-selected="' + idx + '"]', root);
        if (label) label.textContent = btn.getAttribute('data-value');
        userPicked = true;
        lastChanged = parseInt(idx, 10);
        paint();
      });
    });

    // quantity
    var qtyUp = $('[data-mts-qty-up]', root);
    var qtyDown = $('[data-mts-qty-down]', root);
    function setQty(n) {
      if (!qtyInput) return;
      qtyInput.value = Math.max(minQty, n || minQty);
      if (qtyDown) {
        var atFloor = qty() <= minQty;
        qtyDown.disabled = atFloor;
        qtyDown.setAttribute('aria-disabled', atFloor ? 'true' : 'false');
      }
      syncTier();
      paintLineTotal();
    }

    if (qtyUp) qtyUp.addEventListener('click', function () { setQty(qty() + 1); });
    if (qtyDown) qtyDown.addEventListener('click', function () { setQty(qty() - 1); });
    if (qtyInput) {
      // While typing, only reprice — do not rewrite the field. Clamping on
      // every keystroke means clearing it to retype snaps back to the floor
      // and fights the person doing it. The correction happens on the way out.
      qtyInput.addEventListener('input', function () { syncTier(); paintLineTotal(); });
      qtyInput.addEventListener('change', function () { setQty(parseInt(qtyInput.value, 10)); });
      qtyInput.addEventListener('blur', function () { setQty(parseInt(qtyInput.value, 10)); });
    }

    // volume tiers (only present when the merchant enabled them)
    function syncTier() {
      var tiers = $$('[data-mts-tier]', root);
      if (!tiers.length) return;
      var q = qty();
      var best = tiers[0];
      tiers.forEach(function (t) {
        if (q >= parseInt(t.getAttribute('data-mts-tier'), 10)) best = t;
      });
      tiers.forEach(function (t) { t.classList.toggle('is-active', t === best); });
      discount = (parseInt(best.getAttribute('data-off'), 10) || 0) / 100;
      if (priceEl && current) {
        priceEl.textContent = formatMoney(Math.round(current.price * (1 - discount)));
        if (wasEl) {
          // show the undiscounted price only when there is a saving to show
          wasEl.textContent = formatMoney(current.price);
          wasEl.hidden = discount <= 0;
        }
      }
    }
    $$('[data-mts-tier]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (qtyInput) qtyInput.value = btn.getAttribute('data-mts-tier');
        syncTier();
        paintLineTotal();
      });
    });

    // add to cart — optimistic: the UI confirms on click, not on response
    if (form) {
      var addTimer = null;
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!current || !current.available) return;

        var n = qty();
        var idle = $('[data-mts-add-idle]', root);
        var done = $('[data-mts-add-done]', root);
        var added = $('[data-mts-added]', root);
        var addedText = $('[data-mts-added-text]', root);

        function showAdded() {
          if (idle) idle.hidden = true;
          if (done) done.hidden = false;
          if (addBtn) addBtn.classList.add('is-added');
          if (added) added.hidden = false;
          if (addedText) addedText.textContent = 'Added ' + n + ' to your cart.';
        }
        function reset() {
          if (idle) idle.hidden = false;
          if (done) done.hidden = true;
          if (addBtn) { addBtn.classList.remove('is-added'); addBtn.disabled = false; }
          if (added) added.hidden = true;
        }

        // 1. confirm immediately — no waiting on the network
        addBtn.disabled = true;
        showAdded();
        bumpCartCount(n);
        clearTimeout(addTimer);
        addTimer = setTimeout(reset, 2200);

        // 2. do the work, then reconcile with the server's real count
        addToCart(current.id, n)
          .then(function () { refreshCart(); })
          .catch(function () {
            // 3. it genuinely failed — undo the optimistic state and say so
            clearTimeout(addTimer);
            bumpCartCount(-n);
            reset();
            refreshCart();
            if (added && addedText) {
              added.hidden = false;
              addedText.textContent = "That didn't add — please try again.";
              setTimeout(function () { added.hidden = true; }, 3000);
            }
          });
      });
    }

    if (buyBtn) {
      buyBtn.addEventListener('click', function () {
        if (!current || !current.available) return;
        buyBtn.disabled = true;
        /* Straight to checkout, not to the cart. "Buy it now" promises one
           step; landing on the cart page makes it two and is the point where
           single-item buyers drop out. The cart route stays the destination
           for "Add to cart", which is the deliberate keep-shopping action. */
        addToCart(current.id, qty())
          .then(function () { window.location.href = '/checkout'; })
          .catch(function () { buyBtn.disabled = false; });
      });
    }

    // gallery + lightbox
    initGallery(root);
    initTabs(root);
    preselectFromUrl();
    paint();
  }

  function initGallery(root) {
    var gallery = $('[data-mts-gallery]', root);
    if (!gallery) return;
    var mainImg = $('[data-mts-gallery-img]', gallery);
    var thumbs = $$('[data-mts-thumb]', gallery);
    var index = 0;

    var sources = thumbs.length
      ? thumbs.map(function (t) { return t.getAttribute('data-full'); })
      : (mainImg ? [mainImg.src] : []);

    /* Rebuild the responsive candidates for the NEW file.

       This is the whole reason variant switching stopped working. The main
       image carries a srcset (added so a phone does not download a 1200px
       file), and when a srcset is present the browser CHOOSES FROM IT and
       ignores `src` completely. So assigning src alone changed nothing —
       picking a different size left the previous photo on screen.

       Clearing srcset before assigning src would fix it but throw away the
       responsive sizing. Shopify's image urls carry their width as a query
       param, so the candidates can simply be re-derived for the new file and
       both properties stay in step. */
    var WIDTHS = [400, 600, 800, 1000, 1360];

    function srcsetFor(url) {
      if (!/[?&]width=\d+/.test(url)) return '';
      return WIDTHS.map(function (w) {
        return url.replace(/([?&])width=\d+/, '$1width=' + w) + ' ' + w + 'w';
      }).join(', ');
    }

    function show(n) {
      if (!sources.length) return;
      index = (n + sources.length) % sources.length;
      var url = sources[index];
      if (mainImg) {
        var ss = srcsetFor(url);
        if (ss) {
          mainImg.setAttribute('srcset', ss);
        } else {
          mainImg.removeAttribute('srcset');   // no width param — src must win
        }
        mainImg.src = url;
      }
      thumbs.forEach(function (t, i) { t.classList.toggle('is-active', i === index); });
      paintLightbox();
    }

    thumbs.forEach(function (t, i) {
      t.addEventListener('click', function (e) { e.preventDefault(); show(i); });
    });

    // lightbox
    var box = $('[data-mts-lightbox]', root);
    if (!box) return;
    var boxImg = $('[data-mts-lightbox-img]', box);
    var boxCount = $('[data-mts-lightbox-count]', box);

    function paintLightbox() {
      if (boxImg) boxImg.src = sources[index] || '';
      if (boxCount) {
        boxCount.textContent = sources.length > 1 ? (index + 1) + ' / ' + sources.length : '';
      }
    }
    function open() {
      paintLightbox();
      box.hidden = false;
      document.body.style.overflow = 'hidden';
    }
    function close() {
      box.hidden = true;
      document.body.style.overflow = '';
    }

    var mainBtn = $('[data-mts-gallery-main]', gallery);
    if (mainBtn) mainBtn.addEventListener('click', function (e) { e.preventDefault(); open(); });
    var closeBtn = $('[data-mts-lightbox-close]', box);
    if (closeBtn) closeBtn.addEventListener('click', close);
    var prevBtn = $('[data-mts-lightbox-prev]', box);
    var nextBtn = $('[data-mts-lightbox-next]', box);
    if (prevBtn) prevBtn.addEventListener('click', function (e) { e.stopPropagation(); show(index - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function (e) { e.stopPropagation(); show(index + 1); });
    box.addEventListener('click', function (e) { if (e.target === box) close(); });

    document.addEventListener('keydown', function (e) {
      if (box.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') show(index + 1);
      if (e.key === 'ArrowLeft') show(index - 1);
    });

    if (sources.length < 2) {
      if (prevBtn) prevBtn.hidden = true;
      if (nextBtn) nextBtn.hidden = true;
    }
  }

  function initTabs(root) {
    var tabs = $('[data-mts-tabs]', root);
    if (!tabs) return;
    var buttons = $$('[data-mts-tab]', tabs);
    var panels = $$('[data-mts-panel]', tabs);

    function select(name) {
      buttons.forEach(function (b) {
        var on = b.getAttribute('data-mts-tab') === name;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      panels.forEach(function (p) {
        p.hidden = p.getAttribute('data-mts-panel') !== name;
      });
    }

    buttons.forEach(function (b) {
      b.addEventListener('click', function () { select(b.getAttribute('data-mts-tab')); });
    });

    $$('[data-mts-goto-reviews]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        select('reviews');
        tabs.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
      });
    });
  }

  /* =======================================================================
     CART PAGE — quantity steppers hit the cart API
     ==================================================================== */

  /* =======================================================================
     FOOTER ACCORDION (phones only)

     The three link groups rendered as full lists stacked 746px tall on a
     390px phone — a footer nearly two screens long that a shopper had to
     scroll past to reach the legal line. Collapsing them is the standard
     mobile pattern and costs one tap.

     Panels ship OPEN in the HTML and are closed here, so no-JS and crawlers
     still get every link; and if the viewport grows past the breakpoint the
     panels are restored rather than left hidden on a desktop layout.
     ======================================================================= */
  function initFooterAccordion() {
    var mq = window.matchMedia('(max-width: 900px)');
    var groups = $$('[data-mts-ftacc]').map(function (btn) {
      return { btn: btn, panel: btn.closest('.ft-col') && $('[data-mts-ftpanel]', btn.closest('.ft-col')) };
    }).filter(function (g) { return g.panel; });
    if (!groups.length) return;

    function setOpen(g, open) {
      g.btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      g.panel.hidden = !open;
    }

    function apply() {
      groups.forEach(function (g) { setOpen(g, !mq.matches); });
    }

    groups.forEach(function (g) {
      g.btn.addEventListener('click', function () {
        if (!mq.matches) return;                 // desktop headings are not toggles
        setOpen(g, g.btn.getAttribute('aria-expanded') !== 'true');
      });
    });

    apply();
    if (mq.addEventListener) mq.addEventListener('change', apply);
    else if (mq.addListener) mq.addListener(apply);
  }


  /* =======================================================================
     DERIVED COLOUR / SIZE FILTERS

     These exist only while Shopify's own option filters are switched off (see
     mts-filter-panel). They filter the rendered grid in the browser, which is
     sound here because every category fits on a single page — the script can
     see the whole collection, so a count or an empty state is never a partial
     truth.

     Counts are computed from the cards themselves and update as other groups
     are ticked, so a value that would return nothing is shown as 0 and
     disabled rather than leading to a dead end.
     ======================================================================= */
  function initDerivedFilters() {
    var boxes = $$('[data-mts-cfilter]');
    if (!boxes.length) return;
    // Scope to the collection grid specifically. `[data-mts-card]` also matches
    // cards in the related-products rail, which carry no option attributes and
    // would count as non-matching for every value.
    var grid = $('.col__grid') || $('.grid-products');
    if (!grid) return;
    var cards = $$('[data-mts-card]', grid).filter(function (c) {
      return c.hasAttribute('data-opt-colour') || c.hasAttribute('data-opt-size');
    });
    if (!cards.length) return;

    var empty = document.createElement('p');
    empty.className = 'filt__none';
    empty.hidden = true;
    empty.textContent = 'No products match those filters.';
    grid.parentNode.insertBefore(empty, grid.nextSibling);

    function selected(group) {
      return boxes.filter(function (b) {
        return b.getAttribute('data-mts-cfilter') === group && b.checked;
      }).map(function (b) { return b.value; });
    }

    function matches(card, colours, sizes) {
      var c = (card.getAttribute('data-opt-colour') || '').toLowerCase();
      var z = (card.getAttribute('data-opt-size') || '').toLowerCase();
      var okC = !colours.length || colours.some(function (v) { return c.indexOf('|' + v + '|') > -1; });
      var okZ = !sizes.length || sizes.some(function (v) { return z.indexOf('|' + v + '|') > -1; });
      return okC && okZ;
    }

    function apply() {
      var colours = selected('colour');
      var sizes = selected('size');
      var shown = 0;

      cards.forEach(function (card) {
        var on = matches(card, colours, sizes);
        card.hidden = !on;
        if (on) shown++;
      });
      empty.hidden = shown > 0;

      // Recount each value against the OTHER group's current selection, so the
      // number beside a colour reflects the sizes already chosen.
      boxes.forEach(function (b) {
        var group = b.getAttribute('data-mts-cfilter');
        var probeC = group === 'colour' ? [b.value] : colours;
        var probeZ = group === 'size' ? [b.value] : sizes;
        var n = cards.filter(function (card) { return matches(card, probeC, probeZ); }).length;
        var out = $('[data-mts-cfilter-count]', b.parentNode);
        if (out) out.textContent = n;
        if (!b.checked) b.disabled = n === 0;
      });

      var counter = $('.col__count');
      if (counter) {
        var any = colours.length || sizes.length;
        counter.textContent = any
          ? shown + (shown === 1 ? ' product' : ' products')
          : counter.getAttribute('data-mts-total') || counter.textContent;
      }
    }

    var counter = $('.col__count');
    if (counter && !counter.getAttribute('data-mts-total')) {
      counter.setAttribute('data-mts-total', counter.textContent);
    }

    boxes.forEach(function (b) { b.addEventListener('change', apply); });
    apply();
  }


  /* =======================================================================
     RELOAD STARTS AT THE TOP

     Browsers restore the previous scroll position on refresh, so reloading
     halfway down a category dropped you back into the middle of the grid with
     no visible header — it reads as a broken jump rather than a fresh load.

     Only a RELOAD is forced to the top. Back and forward still restore their
     position, which is the behaviour a shopper wants: returning from a product
     should land where the grid was left, not at the top of the page. That is
     why `scrollRestoration` is not simply switched off — doing so would break
     the back button to fix the refresh button.

     A URL with a #hash is left alone; the visitor asked for a specific spot.
     ======================================================================= */
  function initReloadToTop() {
    if (!('scrollRestoration' in history)) return;
    if (window.location.hash) return;

    var nav = null;
    try {
      nav = (performance.getEntriesByType('navigation') || [])[0];
    } catch (e) { nav = null; }

    var isReload = nav
      ? nav.type === 'reload'
      // older Safari/iOS: the legacy API is the only signal available
      : (performance.navigation && performance.navigation.type === 1);

    if (!isReload) return;

    history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    // Some browsers restore the offset after load fires, so reassert once.
    window.addEventListener('load', function () { window.scrollTo(0, 0); }, { once: true });
    // and hand restoration back, so the next back/forward behaves normally
    setTimeout(function () { history.scrollRestoration = 'auto'; }, 400);
  }

  function initCartPage() {
    var form = $('[data-mts-cart-form]');
    if (!form) return;

    /* Every mutation used to end in window.location.reload(), so changing a
       quantity threw the whole page away and rebuilt it — and removing an item
       wasn't even wired up: it was a plain link to item.url_to_remove, which is
       a full navigation. Either way you watched the page blink before anything
       happened.

       Now the row goes immediately and the totals are rewritten from the JSON
       the cart already returns. The href stays on the remove link as the no-JS
       fallback. */

    // Address lines by their item key, never by index. Shopify renumbers lines
    // when one is removed, so a cached index silently removes the WRONG row on
    // the second delete.
    //
    // Requests are also queued rather than fired in parallel: /cart/change.js
    // is not safe to overlap — two in flight at once can return a stale cart,
    // so a quick second click could be answered with a body that still lists
    // the row you just deleted, putting it back on screen.
    var queue = Promise.resolve();
    function change(key, quantity) {
      var run = queue.then(function () {
        return fetchJSON(routes.cartChange + '.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ id: key, quantity: quantity })
        });
      });
      // keep the chain alive even if one link rejects
      queue = run.catch(function () {});
      return run;
    }

    function money(cents) {
      return typeof formatMoney === 'function' ? formatMoney(cents) : (cents / 100).toFixed(2);
    }

    /* Match a row to its cart item.
       The line key is variantId:hash, and the hash covers the discount
       allocations applied to that line — so stepping a quantity across a
       volume band REHASHES the key. Matching on the full key alone therefore
       failed on exactly the click that earned a discount, and paintCart then
       deleted every row as "no longer in the cart". Fall back to the variant
       id, which is stable, and adopt the fresh key afterwards. */
    function findItem(cart, li) {
      var key = li.getAttribute('data-key') || '';
      var vid = key.split(':')[0];
      var byVariant = null;
      for (var i = 0; i < cart.items.length; i++) {
        var it = cart.items[i];
        if (it.key === key) return it;
        if (!byVariant && String(it.variant_id) === vid) byVariant = it;
      }
      return byVariant;
    }

    function paintCart(cart) {
      // per-line totals for whatever survived
      $$('[data-mts-line]', form).forEach(function (li) {
        var item = findItem(cart, li);
        if (!item) { li.remove(); return; }
        // keep the row addressable: the next /cart/change.js must use this key
        if (item.key !== li.getAttribute('data-key')) li.setAttribute('data-key', item.key);
        var t = $('[data-mts-line-total]', li);
        if (t) t.textContent = money(item.final_line_price);
        var q = $('[data-mts-line-qty]', li);
        // A response that is already stale must not fight the shopper: if a
        // newer press is still queued for this line, leave their number alone.
        if (q && document.activeElement !== q && !li._mtsPending) q.value = item.quantity;
      });

      $$('[data-mts-cart-subtotal]').forEach(function (el) { el.textContent = money(cart.items_subtotal_price); });
      $$('[data-mts-cart-total]').forEach(function (el) { el.textContent = money(cart.total_price); });
      // Bulk savings change with every quantity edit, so the saved row has to be
      // repainted here rather than only on page load.
      $$('[data-mts-cart-saved]').forEach(function (el) { el.textContent = '\u2212' + money(cart.total_discount || 0); });
      $$('[data-mts-saved-row]').forEach(function (el) { el.hidden = !(cart.total_discount > 0); });
      $$('[data-mts-cart-items]').forEach(function (el) {
        el.textContent = cart.item_count + (cart.item_count === 1 ? ' item' : ' items');
      });
      MTS._cartCount = cart.item_count;
      paintCartCount(cart.item_count);

      var threshold = MTS.freeShipThreshold || 0;
      if (threshold > 0) {
        var pct = Math.min(100, Math.round((cart.total_price * 100) / threshold));
        var fill = $('[data-mts-ship-fill]');
        if (fill) fill.style.width = pct + '%';
        var wrap = $('.cart-ship');
        if (wrap) wrap.classList.toggle('is-done', cart.total_price >= threshold);
      }

      /* The designed empty state lives in a different Liquid branch, so this
         used to reload. A reload right after a click is the one thing that
         makes a fast cart feel slow, so the empty state is written in place
         instead and the page is never thrown away. */
      if (cart.item_count === 0) {
        var layout = $('.cart__layout') || $('[data-mts-cart-form]');
        var host = layout && layout.closest('main') ? layout.closest('main') : null;
        if (host && !host.getAttribute('data-mts-emptied')) {
          host.setAttribute('data-mts-emptied', '');
          host.className = 'wrap cart-empty';
          host.innerHTML =
            '<h1>Your cart is empty</h1>' +
            '<p>Nothing here yet — browse the range and add what you need.</p>' +
            '<a class="btn btn--brand btn--lg" href="' + (routes.allProducts || '/collections/all') + '">Shop the range</a>';
        }
      }
    }

    /* Collapse the row out of the layout on a timer the network cannot delay.
       Fading it alone was not enough: the row kept its height until the
       response arrived, so the list held an empty gap and the delete felt slow
       even though it had already been accepted. Height has to be pinned in
       pixels first — you cannot transition from `auto`. */
    function collapse(li, done) {
      var h = li.offsetHeight;
      li.style.maxHeight = h + 'px';
      li.style.overflow = 'hidden';
      li.classList.add('is-removing');
      requestAnimationFrame(function () {
        li.style.maxHeight = '0px';
        li.style.paddingTop = '0px';
        li.style.paddingBottom = '0px';
        li.style.marginBottom = '0px';
        li.style.borderWidth = '0px';
      });
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setTimeout(done, reduce ? 0 : 190);
    }
    function restore(li) {
      li.classList.remove('is-removing');
      li.style.maxHeight = ''; li.style.overflow = '';
      li.style.paddingTop = ''; li.style.paddingBottom = '';
      li.style.marginBottom = ''; li.style.borderWidth = '';
    }

    function mutate(li, key, quantity, optimisticRemove) {
      // Only removal is guarded. Quantity used to bail out here whenever a
      // request was in flight, so a fast second press on + was thrown away and
      // the counter felt stuck. Quantity presses are debounced instead, so at
      // most one request per line is ever outstanding.
      if (optimisticRemove && li.hasAttribute('data-busy')) return;
      li.setAttribute('data-busy', '');

      var parent = li.parentNode, next = li.nextSibling, detached = false;
      if (optimisticRemove) {
        // drop the count straight away so the header badge tracks the click
        var qtyNow = 0;
        var qi = $('[data-mts-line-qty]', li);
        if (qi) qtyNow = parseInt(qi.value, 10) || 0;
        if (qtyNow) paintCartCount(Math.max(0, (MTS._cartCount || 0) - qtyNow));
        collapse(li, function () { if (li.parentNode) { li.remove(); detached = true; } });
      }

      change(key, quantity)
        .then(function (cart) {
          if (optimisticRemove && li.parentNode) { li.remove(); detached = true; }
          paintCart(cart);
        })
        .catch(function () {
          // the delete did not stick — put the row back exactly where it was
          if (optimisticRemove) {
            if (detached && parent) parent.insertBefore(li, next);
            restore(li);
          }
        })
        .then(function () { li.removeAttribute('data-busy'); });
    }

    $$('[data-mts-line]', form).forEach(function (li) {
      var key = li.getAttribute('data-key');
      var input = $('[data-mts-line-qty]', li);
      var up = $('[data-mts-line-up]', li);
      var down = $('[data-mts-line-down]', li);
      function current() { return Math.max(0, parseInt(input && input.value, 10) || 0); }

      // this line's minimum order quantity — 1 for most of the catalogue
      var lineMin = Math.max(1, parseInt(input && input.getAttribute('data-mts-line-min'), 10) || 1);

      function paintFloor(n) {
        if (!down || lineMin <= 1) return;
        var atFloor = n <= lineMin;
        down.disabled = atFloor;
        down.setAttribute('aria-disabled', atFloor ? 'true' : 'false');
      }

      /* Stepping below the minimum is not a smaller order, it is an invalid
         one. Where the minimum is 1 the old behaviour is kept exactly —
         stepping down off 1 removes the line, which is what that button has
         always done. Above 1 the floor holds and removal stays the × button's
         job, because dropping a 6-roll line to nothing on one click of minus
         is a destructive surprise, not a shortcut. */
      /* The number on screen updates on the press itself; the server hears
         about it once the shopper stops. Holding + through 1..8 used to fire
         eight serialised round trips and the counter crawled behind the
         finger — now it is eight instant repaints and a single request. */
      function step(n, removeIfZero) {
        if (input) input.value = n;
        paintFloor(n);
        li._mtsPending = true;
        li.classList.add('is-syncing');
        if (li._mtsTimer) clearTimeout(li._mtsTimer);
        li._mtsTimer = setTimeout(function () {
          li._mtsPending = false;
          li.classList.remove('is-syncing');
          var q = Math.max(0, parseInt(input && input.value, 10) || 0);
          mutate(li, li.getAttribute('data-key'), q, removeIfZero && q === 0);
        }, 260);
      }

      /* Stepping below the minimum is not a smaller order, it is an invalid
         one. Where the minimum is 1 the old behaviour is kept exactly —
         stepping down off 1 removes the line, which is what that button has
         always done. Above 1 the floor holds and removal stays the × button's
         job, because dropping a 6-roll line to nothing on one click of minus
         is a destructive surprise, not a shortcut. */
      if (up) up.addEventListener('click', function () { step(current() + 1, false); });
      if (down) down.addEventListener('click', function () {
        var n = current() - 1;
        if (n < lineMin) {
          if (lineMin > 1) { paintFloor(current()); return; }
          n = 0;
        }
        step(n, true);
      });
      if (input) input.addEventListener('change', function () {
        // 0 still means "remove", but anything between 1 and the floor is a
        // typo the store cannot fulfil — round it up to the smallest real order
        var n = current();
        if (n > 0 && n < lineMin) n = lineMin;
        step(n, true);
      });
    });

    // remove — intercept the link so it never navigates
    form.addEventListener('click', function (e) {
      var rm = e.target.closest('[data-mts-line-remove]');
      if (!rm) return;
      e.preventDefault();
      var li = rm.closest('[data-mts-line]');
      if (!li) return;
      mutate(li, li.getAttribute('data-key'), 0, true);
    });
  }

  /* =======================================================================
     FLOATING CALL BUTTON
     ==================================================================== */
  /* =======================================================================
     BRANDING STRIP — rotate the promises on phones

     Below 560px the strip only had room for one of the four, and the CSS chose
     the first and hid the rest. Cycling shows all four instead. Desktop is
     untouched: they all fit there, so nothing rotates.
     ==================================================================== */
  /* =======================================================================
     BRANDING STRIP — continuous ticker on phones

     Desktop shows all four promises side by side. There is no room for that on
     a phone, and the previous behaviour swapped one item in every 3.6s: three
     quarters of the message was invisible at any moment, and a shopper glancing
     once saw one claim chosen at random.

     A marquee shows all of them in one pass instead. The list is duplicated and
     the track slides exactly -50%, so the second copy is under the cursor at
     the moment the animation restarts and the loop is seamless. Duplicated
     items are aria-hidden — a screen reader should hear each promise once.

     Duration is computed from the measured track width rather than hard-coded,
     so the text always moves at the same reading speed regardless of how many
     promises the merchant adds or how long they are.
     ======================================================================= */
  function initUtilTicker() {
    var list = $('.hd-util__feats');
    if (!list) return;

    var mq = window.matchMedia('(max-width: 900px)');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    var PX_PER_SEC = 46;                    // comfortable reading pace
    var originals = $$('li', list).filter(function (li) {
      return !li.hasAttribute('data-mts-ticker-clone');
    });
    if (originals.length < 2) return;

    function clear() {
      $$('[data-mts-ticker-clone]', list).forEach(function (el) { el.remove(); });
      list.classList.remove('is-ticker');
      // hand every inline override back to the stylesheet
      ['display', 'flexWrap', 'width', 'position', 'justifyContent', 'animationDuration']
        .forEach(function (k) { list.style[k] = ''; });
      $$('li', list).forEach(function (li) {
        ['position', 'opacity', 'flex', 'whiteSpace'].forEach(function (k) { li.style[k] = ''; });
      });
      // the old rotator left this behind on some paths
      originals.forEach(function (el) { el.classList.remove('is-shown'); });
    }

    function build() {
      clear();
      if (reduce.matches) {
        // No motion: leave a single static row the user can swipe through.
        list.classList.add('is-static');
        return;
      }
      list.classList.remove('is-static');
      originals.forEach(function (li) {
        var c = li.cloneNode(true);
        c.setAttribute('aria-hidden', 'true');
        c.setAttribute('data-mts-ticker-clone', '');
        list.appendChild(c);
      });
      list.classList.add('is-ticker');

      /* Set the track's layout inline rather than trusting the stylesheet.
         An older phone rule stacked these items absolutely inside a
         display:block list; while any cached copy of that CSS is still in
         circulation the track measures zero and nothing scrolls. Inline styles
         outrank every stylesheet, so the ticker is correct on first paint no
         matter which CSS version a visitor happens to have. */
      list.style.display = 'flex';
      list.style.flexWrap = 'nowrap';
      list.style.width = 'max-content';
      list.style.position = 'static';
      list.style.justifyContent = 'flex-start';
      $$('li', list).forEach(function (li) {
        li.style.position = 'static';
        li.style.opacity = '1';
        li.style.flex = '0 0 auto';
        li.style.whiteSpace = 'nowrap';
      });

      // width of ONE copy — the distance the track travels per loop
      var half = list.scrollWidth / 2;
      if (half > 0) list.style.animationDuration = (half / PX_PER_SEC).toFixed(2) + 's';
    }

    function sync() {
      if (mq.matches) build();
      else { clear(); list.classList.remove('is-static'); }
    }

    sync();
    ['change'].forEach(function (ev) {
      if (mq.addEventListener) mq.addEventListener(ev, sync);
      else if (mq.addListener) mq.addListener(sync);
      if (reduce.addEventListener) reduce.addEventListener(ev, sync);
    });
    // re-measure when the viewport changes width (rotation, resize)
    var t = null;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(function () { if (mq.matches) build(); }, 200);
    });
  }


  /* The full placeholder is 35 characters and the field is 214px on a phone,
     so it was cut mid-word ("Search 130+ tapes, bra"). */
  function initSearchPlaceholder() {
    var input = $('[data-mts-search] input, .hd-search input');
    if (!input) return;
    var full = input.getAttribute('placeholder') || '';
    var short = 'Search tapes & brands…';
    var mq = window.matchMedia('(max-width: 560px)');
    function sync() { input.setAttribute('placeholder', mq.matches ? short : full); }
    sync();
    if (mq.addEventListener) mq.addEventListener('change', sync);
    else if (mq.addListener) mq.addListener(sync);
  }

  /* =======================================================================
     COLLECTION MOBILE BAR
     Category and filters live in one closed box on a phone so the grid starts
     in the first fold. Opening one closes the other — two long panels stacked
     would put the products right back where they were.
     ==================================================================== */
  function initCollectionBar() {
    var bar = $('[data-mts-colbar]');
    var side = $('[data-mts-colside]');
    if (!bar || !side) return;

    var buttons = $$('[data-mts-colbar-toggle]', bar);

    function close() {
      side.classList.remove('is-open');
      side.removeAttribute('data-show');
      buttons.forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    }

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var which = btn.getAttribute('data-mts-colbar-toggle');
        var alreadyOpen = side.classList.contains('is-open') && side.getAttribute('data-show') === which;
        close();
        if (alreadyOpen) return;
        side.classList.add('is-open');
        side.setAttribute('data-show', which);
        btn.setAttribute('aria-expanded', 'true');
      });
    });

    // back on desktop the aside is a column again — drop any leftover state
    var mq = window.matchMedia('(min-width: 901px)');
    function sync() { if (mq.matches) close(); }
    if (mq.addEventListener) mq.addEventListener('change', sync);
    else if (mq.addListener) mq.addListener(sync);
  }

  /* =======================================================================
     BRAND RAIL — step and hold

     The rail advances ONE logo at a time and holds long enough for it to be
     read, rather than scrolling continuously.

     SEAMLESS LOOP. The track renders the logo set THREE times and this only
     ever centres plates in the MIDDLE copy. That is what fixes the visible
     restart: with two copies the loop had to reset to the first plate, which
     has nothing to its left, so the rail showed a gap and obviously started
     over after the last brand. Centring inside the middle copy means every
     plate has real logos on both sides, so when the index runs off the end it
     is snapped back one copy-width with transitions off — the pixels either
     side of the jump are identical and the rewind cannot be seen.
     ==================================================================== */
  function initBrandRail() {
    var rail = $('.brandx__slider');
    var track = rail && $('.brandx__track', rail);
    if (!rail || !track) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var plates = $$('.brandx__plate', track);
    if (plates.length < 3) return;

    var band = rail.closest('.brandx');
    var set = Math.floor(plates.length / 3);      // one logo set
    if (set < 1) return;
    var FIRST = set, LAST = set * 2;              // the middle copy: [FIRST, LAST)
    var HOLD = 2600;                              // dwell per logo
    var i = FIRST, timer = null, paused = false;

    function offsetFor(n) {
      var p = plates[n];
      return (rail.clientWidth / 2) - (p.offsetLeft + p.offsetWidth / 2);
    }

    function paint(animate) {
      track.style.transition = animate ? '' : 'none';
      track.style.transform = 'translateX(' + offsetFor(i) + 'px)';
      for (var k = 0; k < plates.length; k++) {
        // light the matching plate in EVERY copy, so the lead-in and run-out
        // copies never show a differently-styled version of the same logo
        plates[k].classList.toggle('is-focus', (k % set) === (i % set));
      }
      if (!animate) { void track.offsetWidth; track.style.transition = ''; }
    }

    function step() {
      i += 1;
      if (i >= LAST) {
        // finish the move onto the run-out copy, then rewind one copy-width
        paint(true);
        setTimeout(function () { i -= set; paint(false); }, 900);
        return;
      }
      paint(true);
    }

    function tick() {
      timer = setTimeout(function () {
        if (!paused && !(band && band.classList.contains('mts-offscreen'))) step();
        tick();
      }, HOLD);
    }

    rail.addEventListener('mouseenter', function () { paused = true; });
    rail.addEventListener('mouseleave', function () { paused = false; });

    plates.forEach(function (p, n) {
      p.addEventListener('click', function () { i = FIRST + (n % set); paint(true); });
    });

    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { paint(false); }, 120);
    });

    paint(false);
    tick();
  }

  function initCallButton() {
    var btn = $('[data-mts-callbtn]');
    if (!btn) return;
    /* It used to appear only past 220px of scroll, which is why it seemed to
       come and go: near the top of any page — and on any page short enough not
       to scroll — it simply wasn't there. A persistent contact action that is
       missing exactly when someone lands is worse than no action at all, and it
       left the bottom-left empty while the chat launcher sat opposite it.

       It is now always present, like the chat launcher. Nothing else about it
       changes, so the entrance animation still plays once on load. */
    btn.classList.add('is-visible');
    btn.tabIndex = 0;
    btn.removeAttribute('aria-hidden');
  }

  /* =======================================================================
     CHAT ASSISTANT — ported from ChatWidget.jsx.
     Canned answers only, clearly labelled as automated. No backend.
     ==================================================================== */
  /* =======================================================================
     SMARTBOT BRIDGE
     SmartBot renders into #smart-bot-container as a Vue app inside an OPEN
     shadow root — no iframe — so its launcher can be clicked from out here.
     That is the only reason this works; a cross-origin iframe widget would
     need the vendor's own JS API.

     Fail-safe by construction: SmartBot's bubble is hidden only once its
     launcher has actually been found, and if it never appears the button falls
     back to the built-in assistant. There is always exactly one working chat
     and never a dead button.
     ==================================================================== */
  /* =======================================================================
     THEMING SMARTBOT
     SmartBot is the engine; the panel it renders should still look like this
     store. It draws inside a shadow root, so a rule in the page stylesheet
     cannot reach it — but a <style> appended INSIDE that root can, and CSS
     custom properties inherit straight through the shadow boundary. That is
     what makes this durable: the colours below are the store's own tokens,
     read live, not a second copy of the palette that could drift.

     Two layers, deliberately:

     1. Their own variables. SmartBot writes `--sb-theme-color` onto :host from
        its app setting, and derives buttons, links and focus rings from it.
        Overriding the variable re-colours all of that in one move and keeps
        working when they ship a new build.

     2. Geometry, by class prefix. Their class names carry a per-build hash
        (_chat-box-header_a1b2c_3), so every selector matches on the stable
        prefix only. If a prefix is ever renamed the rule stops applying —
        it does not break the widget, it just stops restyling that part.

     The app's own theme colour setting is still the right permanent home for
     the brand colour; this guarantees it regardless of what is set there.
     ==================================================================== */
  function themeSmartBot(shadow) {
    if (!shadow || shadow.querySelector('[data-mts-sb-theme]')) return;
    var s = document.createElement('style');
    s.setAttribute('data-mts-sb-theme', '');
    s.textContent = [
      /* 1. their variables, pointed at our tokens */
      ':host{',
      '  --sb-theme-color: var(--brand-cta, #df3c22) !important;',
      '  --sb-font-color-white: #ffffff !important;',
      '  --sb-font-color-black: var(--ink, #1f1f1f) !important;',
      '  --sb-selection-color: var(--brand-cta, #df3c22) !important;',
      '  --sb-input-focus-border-color: var(--brand-cta, #df3c22) !important;',
      '  --sb-light-button-border-color: var(--brand-cta, #df3c22) !important;',
      '  --sb-light-input-border-color: var(--line-2, #cfc7bd) !important;',
      '  --sb-light-checkbox-color: var(--brand-cta, #df3c22) !important;',
      '}',
      /* 2. NO TYPOGRAPHY RULES. This is deliberate — read before adding any.
            SmartBot draws its send arrow, close cross and every toolbar control
            from an ICON FONT: the glyphs are private-use codepoints that exist
            in that font and nowhere else. Any font-family rule that reaches one
            of those elements — even a narrowly scoped one, since their classes
            overlap (_icon-text, _bubble-text) — replaces the glyph with a
            missing-character box.

            `font-family: revert` does NOT undo it either: revert rolls back to
            the USER-AGENT value, not to SmartBot's own author rule, so it hands
            the icon Times instead of their font. There is no safe way to force
            a face here and put their icons back.

            The typographic gain was small and the failure mode was every
            control in the widget turning into a box, so the faces are left
            alone. Colour and geometry below do the theming; SmartBot's own
            font stays exactly as it ships. */
      /* 3. the panel: machined corners, not the default soft ones */
      '[class*="_chat-box-container"], [class*="_chat-box-wrap"]{',
      '  border-radius: var(--r-lg, 12px) !important;',
      '  box-shadow: 0 24px 64px -12px rgba(20,15,10,.34), 0 2px 8px rgba(20,15,10,.08) !important;',
      '  border: 1px solid var(--line-2, #cfc7bd) !important;',
      '  overflow: hidden !important;',
      '}',
      /* 4. masthead in ink with the brand rule, matching the emails + footer */
      '[class*="_chat-box-header"]{',
      '  background: var(--ink, #1f1f1f) !important;',
      '  border-bottom: 3px solid var(--brand-cta, #df3c22) !important;',
      '}',
      '[class*="_chat-box-header"] [class*="_bot-name"],',
      '[class*="_chat-box-header"] [class*="_header-title"],',
      '[class*="_chat-box-header"] [class*="_operator-name"]{ color: #fff !important; }',
      '[class*="_chat-box-header"] [class*="_icon"]{ color: rgba(255,255,255,.8) !important; }',
      '[class*="_avatar-wrap"]{ border-radius: 9px !important; }',
      /* 5. conversation surface + bubbles */
      '[class*="_chat-box-body"], [class*="_chat-box-background"]{',
      '  background: var(--paper, #f6f4f1) !important;',
      '}',
      '[class*="_bubble-text"], [class*="_e-bubble"]{',
      '  border-radius: 12px 12px 12px 3px !important;',
      '  box-shadow: 0 1px 2px rgba(20,15,10,.04) !important;',
      '}',
      '[class*="_visitor"] [class*="_bubble-text"], [class*="_visitor"] [class*="_e-bubble"]{',
      '  border-radius: 12px 12px 3px 12px !important;',
      '  background: var(--ink, #1f1f1f) !important;',
      '  color: #fff !important;',
      '}',
      /* 6. controls */
      '[class*="_button-box"], [class*="_quick-toolbar-item"], [class*="_bubble-faq-item"]{',
      '  border-radius: var(--r, 7px) !important;',
      '}',
      '[class*="_form-input"], [class*="_input-box"]{',
      '  border-radius: var(--r, 7px) !important;',
      '}',
      '[class*="_send-btn"]{',
      '  border-radius: var(--r, 7px) !important;',
      '  background: var(--brand-cta, #df3c22) !important;',
      '  color: #fff !important;',
      '}',
      '[class*="_product-card"], [class*="_product-item"], [class*="_bubble-order"]{',
      '  border-radius: var(--r-lg, 12px) !important;',
      '}',
      '[class*="_product-image"], [class*="_product-card-image"]{ border-radius: 8px !important; }',
      /* 7. their footer credit is not our brand — keep it quiet */
      /* 8. the empty-frame gate lives on the HOST, not here — see holdSmartBot */
      '[class*="_power-by"]{ opacity: .5 !important; }'
    ].join('\n');
    shadow.appendChild(s);
  }

  /* SUPPRESS SMARTBOT'S SLIDE-IN, SHOW A SETTLED PANEL.

     Diagnosed in a real browser rather than guessed at. On open SmartBot puts
     its panel at transform: translateY(628px) with class
     `box-slide-fade-enter-from`, then animates it up over ~400ms. The wrap is
     pure white, so what a shopper sees is a large WHITE BOX travelling up the
     screen while its footer toolbar and message list are still settling — read
     as "a white frame appears, then the chat drops into it".

     Two earlier attempts failed for reasons the browser made obvious:
       · gating an inner element missed it — the white box is `_chat-box-wrap`,
         and the flash is its MOVEMENT, not an empty shell;
       · gating the host but skipping when content already exists never armed
         at all, because SmartBot keeps the conversation mounted between opens,
         so content was present before the click every time.

     So the host is now hidden UNCONDITIONALLY on open and revealed only once
     their enter transition has finished AND the layout has stopped changing.
     Their slide happens behind a hidden host; we fade in the finished panel. */
  function holdSmartBot(host, shadow) {
    if (!host || host.__mtsHeld) return;
    host.__mtsHeld = true;

    var safety = null, poll = null, stableFor = 0, lastH = -1;

    function reveal() {
      clearTimeout(safety); clearInterval(poll);
      poll = null;
      host.removeAttribute('data-mts-hold');
    }

    function wrap() {
      return shadow.querySelector('[class*="_chat-box-wrap"]');
    }

    function settled() {
      var w = wrap();
      if (!w) return false;
      // still mid-transition — Vue leaves these on for the duration
      var cls = (w.className || '').toString();
      if (cls.indexOf('enter-from') !== -1 || cls.indexOf('enter-active') !== -1) return false;
      // height must stop changing: the footer gains an emoji toolbar a beat
      // after the panel lands, and revealing before that shows it jump
      var h = Math.round(w.getBoundingClientRect().height);
      if (h !== lastH) { lastH = h; stableFor = 0; return false; }
      stableFor += 1;
      return stableFor >= 2;
    }

    host.hold = function () {
      host.setAttribute('data-mts-hold', '');
      clearTimeout(safety); clearInterval(poll);
      stableFor = 0; lastH = -1;
      poll = setInterval(function () { if (settled()) reveal(); }, 50);
      /* Safety net. A gate that can leave the chat invisible is a worse bug
         than the flash it replaces, so it always reveals. */
      safety = setTimeout(reveal, 2200);
    };
  }

  function initSmartBot(root, onFail) {
    // ARIA first — SmartBot's class names are build-hashed and change per release
    var LAUNCHER = '[aria-label="Open chat window"], [role="button"][aria-haspopup="dialog"], [role="button"]';
    var DEADLINE = 15000, POLL = 400, waited = 0;
    var ours = $('[data-mts-chat-launch]', root);
    var teaser = $('[data-mts-chat-teaser]', root);

    // Our own "Need help?" nudge stays — it is the familiar one, and SmartBot's
    // proactive card is suppressed below.
    if (ours) ours.style.visibility = 'hidden'; // nothing to click until wired

    var poll = setInterval(function () {
      var host = document.getElementById('smart-bot-container');
      var shadow = host && host.shadowRoot;
      var launcher = shadow && shadow.querySelector(LAUNCHER);

      if (launcher) {
        clearInterval(poll);

        /* Hide SmartBot's own bubble with a STYLESHEET, not an inline style.
           Verified failure: setting launcher.style.display='none' works until
           the shopper closes the panel, at which point SmartBot re-renders the
           node, the inline style is discarded and their bubble reappears beside
           ours — which reads as "the icon changed after I closed the chat".
           A rule in the shadow root survives every re-render.

           The class hash (_chat-icon-container_tt440_1) changes between their
           releases, so the selector matches on the stable prefix. */
        var oneLauncher = document.createElement('style');
        oneLauncher.textContent = '[class*="_chat-icon-container"]{display:none!important}';
        shadow.appendChild(oneLauncher);

        themeSmartBot(shadow);
        holdSmartBot(host, shadow);

        function openSmartBot() {
          /* Hide the host BEFORE their open runs, so the empty shell never
             gets a frame on screen; it is revealed once content exists. */
          if (host.hold) host.hold();
          /* Re-query on every click. SmartBot re-renders this node when the
             panel closes, so a reference captured once goes stale and the
             button stops working after the first close. */
          var live = (shadow.querySelector(LAUNCHER)) || launcher;
          if (live) live.click();
        }

        if (ours) {
          ours.style.visibility = '';
          ours.addEventListener('click', function (e) {
            e.preventDefault();
            openSmartBot();
          });
        }

        /* The teaser and its close button live in OUR markup, but the handlers
           that drive them were only ever registered in initBuiltinChat — which
           never runs in app mode, because initChat returns after handing off to
           SmartBot. So the "Need help?" card rendered with a dismiss button
           that had no listener on it at all: clicking the cross did nothing,
           on every page, for as long as the app has been the chat engine.
           Wired here so the teaser behaves the same in both modes. */
        if (teaser) {
          teaser.hidden = false;
          teaser.addEventListener('click', openSmartBot);
          teaser.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSmartBot(); }
          });
          /* The cross itself is handled by the delegated listener in initChat,
             which is registered before this runs and does not depend on
             SmartBot loading at all. Only the "already dismissed" check is
             repeated here, because this branch un-hides the teaser above. */
          try {
            if (sessionStorage.getItem('mts-chat-teaser') === 'off') {
              teaser.hidden = true;
              teaser.style.display = 'none';
            }
          } catch (err) {}
        }

        if (root.getAttribute('data-chat-nudge') !== 'true') {
          /* SmartBot's proactive card — the unprompted "Is there a specific
             product you'd like to compare?" and the "share your contact details"
             lead-capture panel. It opens itself, follows the shopper between
             pages and covers the content. Suppressed here so the only nudge is
             our own "Need help?" teaser and the chat opens when it is asked to.

             Class names carry a build hash (_notification-card_pux9c_1), so the
             selector matches on the stable prefix — it survives SmartBot's next
             release, where the hash will differ. Their own app settings are the
             permanent home for this; the stylesheet is the front-end equivalent
             and it survives their re-renders, which a one-time DOM removal
             would not. */
          var hide = document.createElement('style');
          hide.textContent =
            '[class*="_notification-card"],' +
            '[class*="_bubble-message"],' +
            '[class*="_greeting"]{display:none!important}';
          shadow.appendChild(hide);
        }
        return;
      }

      waited += POLL;
      if (waited >= DEADLINE) {
        clearInterval(poll);
        if (ours) ours.style.visibility = '';
        if (teaser) teaser.hidden = false;
        onFail();   // SmartBot never arrived — run our own assistant
      }
    }, POLL);
  }

  function initChat() {
    var root = $('[data-mts-chat]');
    if (!root) return;

    /* CLOSING THE TEASER MUST NEVER DEPEND ON THE CHAT ENGINE.

       The dismiss handler used to be registered inside initBuiltinChat, which
       does not run in app mode — so the cross had no listener at all. Wiring it
       inside initSmartBot fixed that only for the path where SmartBot's
       launcher is found in time; if the app is slow, blocked by an ad blocker,
       or its markup changes, the cross goes dead again.

       So it is delegated from the document and registered before either engine
       starts. It cannot be missed by a timing failure, and it survives the
       teaser being re-rendered. */
    document.addEventListener('click', function (e) {
      var x = e.target.closest('[data-mts-chat-teaser-dismiss]');
      if (!x) return;
      e.preventDefault();
      e.stopPropagation();      // else the teaser's own click reopens the chat
      var t = x.closest('[data-mts-chat-teaser]') || $('[data-mts-chat-teaser]', root);
      if (t) { t.hidden = true; t.style.display = 'none'; }
      var ping = $('[data-mts-chat-ping]', root);
      if (ping) ping.hidden = true;
      try { sessionStorage.setItem('mts-chat-teaser', 'off'); } catch (err) {}
    }, true);                   // capture phase: runs before the teaser's own handler

    try {
      if (sessionStorage.getItem('mts-chat-teaser') === 'off') {
        var t0 = $('[data-mts-chat-teaser]', root);
        if (t0) { t0.hidden = true; t0.style.display = 'none'; }
      }
    } catch (err) {}

    if (root.getAttribute('data-chat-mode') === 'app') {
      initSmartBot(root, function () { initBuiltinChat(root); });
      return;
    }
    initBuiltinChat(root);
  }

  function initBuiltinChat(root) {

    var config;
    try {
      config = JSON.parse($('[data-mts-chat-config]', root).textContent);
    } catch (e) { return; }
    if (root._mtsChatReady) return;
    root._mtsChatReady = true;

    var teaser = $('[data-mts-chat-teaser]', root);
    var launch = $('[data-mts-chat-launch]', root);
    var panel = $('[data-mts-chat-panel]', root);
    var list = $('[data-mts-chat-list]', root);
    var quickWrap = $('[data-mts-chat-quick]', root);
    var form = $('[data-mts-chat-form]', root);
    var input = $('[data-mts-chat-input]', root);
    var ping = $('[data-mts-chat-ping]', root);
    var closeBtn = $('[data-mts-chat-close]', root);

    var greeted = false;
    var count = 0;

    function matchKeyword(text) {
      var t = text.toLowerCase();
      if (/ship|deliver|dispatch|postcode/.test(t)) return 'shipping';
      if (/return|refund|exchange|faulty|damage/.test(t)) return 'returns';
      if (/bulk|trade|wholesale|volume/.test(t)) return 'bulk';
      if (/track|order status|where.*order|my order/.test(t)) return 'track';
      if (/human|agent|person|call|phone|speak|real/.test(t)) return 'human';
      if (/price match|cheaper|lowest price|beat.*price|guarantee/.test(t)) return 'price';
      if (/hour|open|closed|when.*(open|available)/.test(t)) return 'hours';
      return 'default';
    }

    function scroll() { if (list) list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' }); }

    function push(from, text, cta) {
      var row = document.createElement('div');
      row.className = 'chatw__row chatw__row--' + from;
      var msg = document.createElement('div');
      msg.className = 'chatw__msg';
      var p = document.createElement('p');
      p.textContent = text;
      msg.appendChild(p);
      if (cta && cta.path) {
        var a = document.createElement('a');
        a.className = 'chatw__cta';
        a.href = cta.path;
        a.innerHTML = escapeHtml(cta.label) +
          ' <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16"/><path d="M14 6l6 6-6 6"/></svg>';
        msg.appendChild(a);
      }
      row.appendChild(msg);
      list.appendChild(row);
      count++;
      scroll();
      paintQuick();
    }

    function typing(then) {
      var row = document.createElement('div');
      row.className = 'chatw__row chatw__row--bot';
      row.innerHTML = '<div class="chatw__msg chatw__typing"><span></span><span></span><span></span></div>';
      list.appendChild(row);
      scroll();
      setTimeout(function () { row.remove(); then(); }, 550);
    }

    function respond(key) {
      var r = config.responses[key] || config.responses['default'];
      typing(function () { push('bot', r.text, r.cta); });
    }

    function paintQuick() {
      if (!quickWrap) return;
      quickWrap.hidden = count >= 6;
    }

    function open() {
      panel.hidden = false;
      if (teaser) teaser.hidden = true;
      if (launch) launch.hidden = true;
      if (ping) ping.hidden = true;
      if (!greeted) {
        greeted = true;
        typing(function () { push('bot', config.greeting); });
      }
      if (input) input.focus();
    }
    function close() {
      panel.hidden = true;
      if (launch) launch.hidden = false;
    }

    if (quickWrap) {
      config.quick.forEach(function (q) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = q.label;
        b.addEventListener('click', function () { push('user', q.label); respond(q.id); });
        quickWrap.appendChild(b);
      });
    }

    if (launch) launch.addEventListener('click', open);
    if (teaser) {
      teaser.addEventListener('click', open);
      teaser.addEventListener('keydown', function (e) { if (e.key === 'Enter') open(); });
    }
    var dismiss = $('[data-mts-chat-teaser-dismiss]', root);
    if (dismiss) {
      dismiss.addEventListener('click', function (e) {
        e.stopPropagation();
        if (teaser) teaser.hidden = true;
        if (ping) ping.hidden = true;
      });
    }
    if (closeBtn) closeBtn.addEventListener('click', close);

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var t = input.value.trim();
        if (!t) return;
        push('user', t);
        input.value = '';
        $('button[type="submit"]', form).disabled = true;
        respond(matchKeyword(t));
      });
      input.addEventListener('input', function () {
        $('button[type="submit"]', form).disabled = !input.value.trim();
      });
    }
  }

  /* =======================================================================
     CUSTOMER ADDRESSES
     ==================================================================== */
  function initAddresses() {
    var root = $('[data-mts-addresses]');
    if (!root) return;

    $$('[data-mts-address-toggle]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-mts-address-toggle');
        var box = document.getElementById('address-' + id);
        if (box) box.hidden = !box.hidden;
      });
    });

    $$('[data-mts-address-delete]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!window.confirm(btn.getAttribute('data-confirm'))) return;
        var f = btn.closest('form');
        if (!f) return;
        f.action = btn.getAttribute('data-url');
        var m = document.createElement('input');
        m.type = 'hidden'; m.name = '_method'; m.value = 'delete';
        f.appendChild(m);
        f.submit();
      });
    });

    // Shopify ships the country/province data with the storefront
    if (window.Shopify && window.Shopify.CountryProvinceSelector) {
      $$('[data-mts-address-country]', root).forEach(function (sel, i) {
        sel.id = sel.id || 'mts-country-' + i;
        var prov = sel.closest('.contact__row').querySelector('[data-mts-address-province]');
        var wrap = sel.closest('.contact__row').querySelector('[data-mts-address-province-wrap]');
        if (!prov) return;
        prov.id = prov.id || 'mts-province-' + i;
        if (wrap) wrap.id = wrap.id || 'mts-province-wrap-' + i;
        new window.Shopify.CountryProvinceSelector(sel.id, prov.id, { hideElement: wrap ? wrap.id : undefined });
      });
    }
  }

  /* =======================================================================
     LOGIN <-> RECOVER TOGGLE
     ==================================================================== */
  function initAuthToggle() {
    var login = document.getElementById('login');
    var recover = document.getElementById('recover');
    if (!login || !recover) return;
    // land straight on the recover form when Shopify redirects back to it
    if (window.location.hash === '#recover') { login.hidden = true; recover.hidden = false; }
    $$('[data-mts-auth-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var showRecover = recover.hidden;
        recover.hidden = !showRecover;
        login.hidden = showRecover;
      });
    });
  }

  /* =======================================================================
     NEWSLETTER POPUP
     Fires once, after a delay, on the visitor's first look around. Deliberately
     restrained about when it appears: never on cart or checkout, never again
     once dismissed (for the snooze window) or signed up (permanently).
     ==================================================================== */
  var POP_KEY = 'mts_popup_v1';

  function popState() {
    try { return JSON.parse(localStorage.getItem(POP_KEY)) || {}; } catch (e) { return {}; }
  }
  function setPopState(s) {
    try { localStorage.setItem(POP_KEY, JSON.stringify(s)); } catch (e) { /* private mode */ }
  }

  function initPopup() {
    var pop = $('[data-mts-popup]');
    if (!pop) return;

    // Interrupting someone mid-purchase to ask for their email is a bad trade.
    var path = window.location.pathname;
    if (/\/(cart|checkout)/.test(path)) return;

    var state = popState();
    if (state.subscribed) return;
    if (state.dismissedUntil && Date.now() < state.dismissedUntil) return;

    // A successful submit re-renders the page with the success message inside
    // the dialog, so show it immediately and remember the signup.
    if ($('[data-mts-popup-success]', pop)) {
      setPopState({ subscribed: true });
      open();
      return;
    }

    var delay = (parseInt(pop.getAttribute('data-delay'), 10) || 10) * 1000;
    var snooze = (parseInt(pop.getAttribute('data-snooze'), 10) || 30) * 86400000;
    var timer = setTimeout(open, delay);
    var lastFocus = null;

    function open() {
      clearTimeout(timer);
      lastFocus = document.activeElement;
      pop.hidden = false;
      document.body.style.overflow = 'hidden';
      var field = $('input[type="email"]', pop);
      if (field) field.focus();
      document.addEventListener('keydown', onKey);
    }

    function close(remember) {
      pop.hidden = true;
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
      if (remember !== false) {
        var s = popState();
        s.dismissedUntil = Date.now() + snooze;
        setPopState(s);
      }
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function onKey(e) {
      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Tab') return;
      // keep focus inside the dialog while it is open
      var f = $$('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])', pop)
        .filter(function (el) { return el.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    $$('[data-mts-popup-close]', pop).forEach(function (b) {
      b.addEventListener('click', function () { close(); });
    });

    // Submitting is a signup, not a dismissal — don't re-arm the snooze.
    var form = $('form', pop);
    if (form) form.addEventListener('submit', function () { setPopState({ subscribed: true }); });
  }

  /* =======================================================================
     BOOT
     ==================================================================== */
  /* =======================================================================
     WISHLIST PAGE — reveal the cards for saved handles
     ==================================================================== */
  function initWishlistPage() {
    var grid = $('[data-mts-wish-grid]');
    if (!grid) return;
    var empty = $('[data-mts-wish-empty]');
    var foot = $('[data-mts-wish-foot]');
    var summary = $('[data-mts-wish-summary]');
    var loading = $('[data-mts-wish-loading]');
    var inflight = {};

    /* On a preview theme the section request has to carry the theme id too,
       or the card comes back rendered by the published theme. */
    var previewId = (location.search.match(/[?&]preview_theme_id=(\d+)/) || [])[1];

    function cardUrl(handle) {
      var u = (routes.root || '/') + 'products/' + encodeURIComponent(handle) + '?section_id=mts-wish-card';
      return previewId ? u + '&preview_theme_id=' + previewId : u;
    }

    function cardFor(handle) {
      return grid.querySelector('[data-mts-wish-card="' + handle.replace(/["\\]/g, '') + '"]');
    }

    function paintState() {
      var shown = $$('[data-mts-wish-card]', grid).length;
      grid.hidden = shown === 0;
      if (empty) empty.hidden = shown > 0;
      if (foot) foot.hidden = shown === 0;
      if (summary) {
        summary.textContent = shown
          ? shown + ' item' + (shown === 1 ? '' : 's') + ' saved — tap the heart again to remove.'
          : 'Nothing saved yet.';
      }
    }

    /* A handle whose product is gone does NOT come back 404 — Shopify answers
       200 and renders the section against an empty product. So "dead" is
       decided by the card the server sends: no card, or a card for a different
       handle, means the save is stale. A request that never completed (offline,
       5xx) returns nothing and leaves the save alone to try again later. */
    function fetchCard(handle) {
      return fetch(cardUrl(handle), { credentials: 'same-origin' })
        .then(function (r) {
          if (r.status === 404 || r.status === 410) return { handle: handle, dead: true };
          if (!r.ok) return { handle: handle };
          return r.text().then(function (html) {
            var card = new DOMParser().parseFromString(html, 'text/html')
              .querySelector('[data-mts-wish-card]');
            if (!card || card.getAttribute('data-mts-wish-card') !== handle) {
              return { handle: handle, dead: true };
            }
            return { handle: handle, card: card };
          });
        })
        .catch(function () { return { handle: handle }; });
    }

    function mount(res) {
      if (!res.card) return false;
      grid.appendChild(document.importNode(res.card, true));
      return true;
    }

    function sync() {
      var saved = getWish();

      // drop cards for anything un-hearted since the last pass
      $$('[data-mts-wish-card]', grid).forEach(function (c) {
        if (saved.indexOf(c.getAttribute('data-mts-wish-card')) === -1) c.remove();
      });

      var missing = saved.filter(function (h) { return !cardFor(h) && !inflight[h]; });
      if (!missing.length) { paintState(); return; }

      missing.forEach(function (h) { inflight[h] = true; });
      if (loading && !$$('[data-mts-wish-card]', grid).length) loading.hidden = false;

      Promise.all(missing.map(fetchCard)).then(function (results) {
        var dead = [];
        results.forEach(function (res) {
          delete inflight[res.handle];
          if (res.dead) { dead.push(res.handle); return; }
          mount(res);
        });
        if (loading) loading.hidden = true;
        paintState();
        paintWish();          // hearts on the freshly mounted cards
        dropWish(dead);       // self-heal the badge
      });
    }

    sync();
    // hearting or un-hearting anywhere on this page updates it immediately
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-mts-wish]')) setTimeout(sync, 0);
    });
  }

    /* =======================================================================
     POLICY CONTENTS
     Shop policies come out of Settings → Policies as one long blob of merchant
     HTML. There is no way to author a contents list alongside it that will not
     drift, so it is derived from the headings that are actually there.

     Headings from the admin editor rarely carry ids, so we mint stable ones
     from the text (needed for both the anchor and for deep links to survive).
     Fewer than three sections is not a document that needs navigation, so the
     whole block is dropped rather than shown nearly empty.
     ==================================================================== */
  /* =======================================================================
     PRODUCT REVIEWS
     The list renders server-side from the reviews.items metafield, so this
     only handles the two interactive bits: revealing the write form, and
     expanding past the first four reviews. Everything stays readable and
     complete with JavaScript off — the extra reviews are hidden by a class,
     not removed, and the form markup is a real Shopify contact form.
     ==================================================================== */
  function initReviews() {
    var panel = $('.pdp-rev');
    if (!panel) return;

    var form = $('[data-mts-rev-form]', panel);
    var openBtns = $$('[data-mts-rev-open]', panel);
    var cancel = $('[data-mts-rev-cancel]', panel);

    function openForm() {
      if (!form) return;
      form.hidden = false;
      panel.classList.add('is-writing');
      var first = $('input[type="text"], textarea', form);
      if (first) first.focus({ preventScroll: true });
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    openBtns.forEach(function (b) { b.addEventListener('click', openForm); });
    if (cancel) cancel.addEventListener('click', function () {
      form.hidden = true;
      panel.classList.remove('is-writing');
      var back = $('[data-mts-rev-open]', panel);
      if (back) back.focus();
    });

    // a failed or successful post re-renders the page — keep the form open so
    // the message (or the errors) is not hidden behind a button
    if (form && ($('.pdp-rev__sent', form) || $('.errors', form) || $('[role="alert"]', form))) {
      form.hidden = false;
      panel.classList.add('is-writing');
    }

    var more = $('[data-mts-rev-more]', panel);
    if (more) {
      more.addEventListener('click', function () {
        var extra = $$('[data-mts-rev-extra]', panel);
        var opening = extra.length && extra[0].classList.contains('is-hidden');
        extra.forEach(function (li) { li.classList.toggle('is-hidden', !opening); });
        more.textContent = more.getAttribute(opening ? 'data-label-less' : 'data-label-more');
        if (!opening) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  function initPolicyToc() {
    var body = document.querySelector('[data-mts-policy-body]');
    var nav = document.querySelector('[data-mts-policy-toc]');
    var list = document.querySelector('[data-mts-policy-toc-list]');

    /* Shopify ignores templates/policy.liquid on this store and renders
       /policies/* through its own `shopify-policy__*` markup, so the theme
       section never runs there. Rather than keep a second copy of the legal
       text in a Page (two sources that WILL drift, while checkout keeps
       linking to /policies/* anyway), adopt Shopify's markup: tag it for the
       stylesheet and build the same sidebar around it. */
    if (!body) {
      var shim = document.querySelector('.shopify-policy__container');
      var shimBody = document.querySelector('.shopify-policy__body');
      if (!shim || !shimBody) return;
      shim.classList.add('mts-policy-shim');
      body = shimBody;

      nav = document.createElement('nav');
      nav.className = 'mts-policy__toc';
      nav.setAttribute('aria-labelledby', 'policy-toc-h');
      var h = document.createElement('h2');
      h.className = 'mts-policy__toc-h';
      h.id = 'policy-toc-h';
      h.textContent = 'On this page';
      list = document.createElement('ol');
      list.className = 'mts-policy__toc-list';
      nav.appendChild(h);
      nav.appendChild(list);

      var side = document.createElement('div');
      side.className = 'mts-policy__side';
      side.appendChild(nav);
      shim.appendChild(side);
    }
    if (!body || !nav || !list) return;

    var heads = [].slice.call(body.querySelectorAll('h2, h3'))
      .filter(function (h) { return h.textContent.trim().length > 1; });

    if (heads.length < 3) { nav.remove(); return; }

    list.innerHTML = '';
    var used = {};
    var items = heads.map(function (h) {
      if (!h.id) {
        var base = h.textContent.trim().toLowerCase()
          .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'section';
        used[base] = (used[base] || 0) + 1;
        h.id = used[base] > 1 ? base + '-' + used[base] : base;
      }
      var li = document.createElement('li');
      li.className = 'mts-policy__toc-item' + (h.tagName === 'H3' ? ' is-sub' : '');
      var a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = h.textContent.trim();
      li.appendChild(a);
      list.appendChild(li);
      return { h: h, a: a };
    });

    nav.hidden = false;

    /* Scroll-spy. rootMargin pins the "active" line to the top third of the
       viewport, so the highlighted item is the section you are READING, not
       whichever one happens to touch the bottom edge. */
    if (!('IntersectionObserver' in window)) return;
    var active = null;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var hit = items.filter(function (it) { return it.h === e.target; })[0];
        if (!hit || hit === active) return;
        if (active) active.a.removeAttribute('aria-current');
        hit.a.setAttribute('aria-current', 'true');
        active = hit;
      });
    }, { rootMargin: '0px 0px -66% 0px', threshold: 0 });
    items.forEach(function (it) { io.observe(it.h); });
  }

    /* =======================================================================
     THEMED SIGN-IN (Storefront API)

     Verified against this store before being written: customerAccessTokenCreate
     is present, and a probe created a customer with a password, signed in as
     them and read them back. So this is a real login, not a facade.

     TOKEN HANDLING
     The customer access token is kept in localStorage. There is no server here
     to hold an httpOnly cookie, so this is the only option a Liquid theme has —
     and it means any XSS on the storefront could read it. That is why the token
     is the ONLY thing stored: no email, no name, no order data is cached, so a
     stolen token expires on its own and leaks nothing else. Shopify issues them
     with roughly a six-week life; we store the expiry and treat anything past
     it as signed out without trusting the server to tell us.

     The Storefront token in data-sf-token is PUBLIC by design — it grants
     unauthenticated storefront access only. It is not the Admin token.
     ==================================================================== */
  var MTS_AUTH_KEY = 'mts.customer.v1';

  function authRead() {
    try {
      var raw = localStorage.getItem(MTS_AUTH_KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || !o.token) return null;
      if (o.expiresAt && new Date(o.expiresAt) <= new Date()) {
        localStorage.removeItem(MTS_AUTH_KEY);
        return null;
      }
      return o;
    } catch (e) { return null; }
  }

  function authWrite(token, expiresAt, name) {
    try {
      var prev = authRead() || {};
      localStorage.setItem(MTS_AUTH_KEY, JSON.stringify({
        token: token,
        expiresAt: expiresAt,
        /* A display name is kept so the header can paint the initials disc on
           the FIRST frame of every page. The alternative is a Storefront query
           per page load, which means the header visibly flips from a generic
           glyph to a disc after the round trip. This is the only personal field
           stored — no email, no orders — and it is cleared on sign-out. */
        name: name !== undefined ? name : prev.name
      }));
    } catch (e) { /* private mode — session simply won't persist */ }
  }

  function initials(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'A';
    var s = parts[0].charAt(0) + (parts.length > 1 ? parts[parts.length - 1].charAt(0) : '');
    return s.toUpperCase();
  }

  /* Runs on EVERY page — the account page is the only place initCustomAuth
     exists, but the header is everywhere. */
  function initHeaderAccount() {
    var a = document.querySelector('[data-mts-hd-account]');
    if (!a) return;                       // Liquid already rendered a real session

    /* Keep the signed-out markup so sign-out can restore it without a reload. */
    if (!a.getAttribute('data-orig')) a.setAttribute('data-orig', a.innerHTML);

    var s = authRead();
    if (!s) {
      a.classList.remove('is-in');
      a.innerHTML = a.getAttribute('data-orig');
      a.setAttribute('aria-label', 'Sign in');
      return;
    }
    var name = s.name || '';
    a.classList.add('is-in');
    a.innerHTML = '<span class="hd-avatar" aria-hidden="true">' + initials(name) + '</span>'
                + '<span></span>';
    a.querySelector('span:last-child').textContent = name.split(/\s+/)[0] || 'Account';
    a.setAttribute('aria-label', name ? 'Your account — ' + name : 'Your account');
  }

  function initCustomAuth() {
    var root = document.querySelector('[data-mts-auth]');
    if (!root) return;

    var shop = root.getAttribute('data-shop');
    var sfToken = root.getAttribute('data-sf-token');
    var version = root.getAttribute('data-sf-version') || '2024-10';
    var endpoint = 'https://' + shop + '/api/' + version + '/graphql.json';

    var msg = root.querySelector('[data-mts-auth-msg]');
    var forms = {
      signin: root.querySelector('[data-mts-auth-form="signin"]'),
      register: root.querySelector('[data-mts-auth-form="register"]')
    };

    function say(text, kind) {
      if (!msg) return;
      msg.textContent = text;
      msg.hidden = !text;
      msg.className = 'mts-auth__msg' + (kind ? ' is-' + kind : '');
    }

    function gql(query, variables) {
      return fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': sfToken
        },
        body: JSON.stringify({ query: query, variables: variables })
      }).then(function (r) { return r.json(); });
    }

    /* Shopify's customerUserErrors are terse and sometimes blank. Map the codes
       we can actually act on; fall back to the server text, then to something
       that at least says what to do next. */
    function readError(errs) {
      if (!errs || !errs.length) return 'Something went wrong. Please try again.';
      var e = errs[0];
      if (e.code === 'UNIDENTIFIED_CUSTOMER') return 'That email and password do not match an account.';
      if (e.code === 'TAKEN') return 'An account with that email already exists — try signing in.';
      if (e.code === 'TOO_SHORT') return 'That password is too short (5 characters minimum).';
      if (e.code === 'CUSTOMER_DISABLED') return 'That account is not activated yet. Check your email for the activation link.';
      return e.message || 'Something went wrong. Please try again.';
    }

    function busy(form, on) {
      var b = form.querySelector('button[type="submit"]');
      if (b) { b.disabled = on; b.classList.toggle('is-busy', on); }
    }

    /* ------------------------------------------------------------------
       SIGNED-IN VIEW

       Reloading after sign-in is what broke the first version: Liquid cannot
       see a Storefront token, so the reloaded page always rendered the form
       again. Nothing is reloaded now — the card is swapped in place.
       ------------------------------------------------------------------ */
    /* Hide the WRAPPER, not just the card. `.auth` is a
       grid-template-columns: minmax(0,440px) 1fr; max-width: 940px container
       built for the login card beside its perks list. Leaving it in place while
       showing the dashboard squeezed the whole dashboard into that 440px
       column, which is why every panel stacked. The dashboard is now a sibling
       of this wrapper and the wrapper is hidden outright. */
    var card = document.querySelector('[data-mts-auth-wrap]') || root;
    var acct = document.querySelector('[data-mts-acct]');

    /* The signed-in customer, cached from the last ME query. The invoice
       builder and the address/profile editors all read from this rather than
       re-fetching, so the document a customer downloads is the same data the
       dashboard just showed them. Refreshed by showAccount() after any write. */
    var me = null;

    /* Everything the dashboard needs in one round trip, including the fields an
       invoice requires: per-line SKU and price, the tax and shipping split, and
       both addresses. Shopify has no customer-facing invoice PDF, so the
       invoice is built from this data — which means the numbers on it are the
       order's real numbers, not a re-computation that could drift. */
    var ME = 'query($t: String!) {'
      + ' customer(customerAccessToken: $t) {'
      + '   id firstName lastName displayName email phone'
      + '   defaultAddress { id }'
      + '   addresses(first: 20) { edges { node {'
      + '     id firstName lastName company address1 address2'
      + '     city province zip country phone formatted } } }'
      + '   orders(first: 50, reverse: true) { edges { node {'
      + '     id orderNumber name processedAt financialStatus fulfillmentStatus'
      + '     currentTotalPrice { amount currencyCode }'
      + '     subtotalPrice { amount currencyCode }'
      + '     totalTax { amount currencyCode }'
      + '     totalShippingPrice { amount currencyCode }'
      + '     shippingAddress { formatted }'
      + '     billingAddress { formatted }'
      + '     lineItems(first: 50) { edges { node {'
      + '       title quantity'
      + '       variant { sku title price { amount currencyCode } }'
      + '       originalTotalPrice { amount currencyCode } } } }'
      + '     statusUrl } } } } }';

    function money(p) {
      if (!p) return '';
      try {
        return new Intl.NumberFormat(undefined, {
          style: 'currency', currency: p.currencyCode
        }).format(parseFloat(p.amount));
      } catch (e) { return p.amount + ' ' + p.currencyCode; }
    }

    function esc(s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }

    /* An order date is a MELBOURNE date. `new Date(iso)` parses the instant
       correctly, but formatting it without a timeZone renders it in whichever
       zone the customer's device happens to be set to — so an order placed at
       9am AEST reads as the previous day to anyone west of UTC+10, contradicting
       both the confirmation email and Shopify admin. Liquid `date:` filters are
       already rendered in shop time by Shopify; this is the JS equivalent.

       Locale and zone live here, once, because the order list and the invoice
       previously formatted the same date with different locales and drifted. */
    var SHOP_LOCALE = 'en-AU', SHOP_TZ = 'Australia/Melbourne';

    function orderDate(iso, monthStyle) {
      if (!iso) return '';
      try {
        return new Date(iso).toLocaleDateString(SHOP_LOCALE, {
          day: 'numeric', month: monthStyle, year: 'numeric', timeZone: SHOP_TZ
        });
      } catch (e) { return ''; }
    }

    /* The page around the card is server-rendered for a SIGNED-OUT visitor —
       an "Sign in to…" headline and a list of reasons to make an account. Both
       are wrong once someone is signed in, and Liquid cannot know that, so the
       chrome is switched here too. */
    function chrome(signedIn) {
      var heroH = document.querySelector('[data-mts-auth-hero-h]');
      var perks = document.querySelector('[data-mts-auth-perks]');
      if (heroH) {
        if (signedIn) {
          if (!heroH.getAttribute('data-orig')) heroH.setAttribute('data-orig', heroH.textContent);
          heroH.textContent = 'Your account';
        } else if (heroH.getAttribute('data-orig')) {
          heroH.textContent = heroH.getAttribute('data-orig');
        }
      }
      if (perks) perks.hidden = !!signedIn;
    }

    function signOut() {
      try { localStorage.removeItem(MTS_AUTH_KEY); } catch (e) {}
      if (acct) acct.hidden = true;
      if (card) card.hidden = false;
      chrome(false);
      initHeaderAccount();               // back to the outline glyph
      say('You have been signed out.', 'ok');
    }

    function toForm(message) {
      try { localStorage.removeItem(MTS_AUTH_KEY); } catch (e) {}
      if (acct) acct.hidden = true;
      if (card) card.hidden = false;
      chrome(false);
      say(message, 'bad');
    }

    function statusTag(o) {
      /* Map Shopify's statuses onto the design's existing tag colours, the same
         way mts-account-orders.liquid does — so a JS-rendered order and a
         Liquid-rendered one never disagree about what "Delivered" looks like. */
      var f = (o.fulfillmentStatus || '').toUpperCase();
      var p = (o.financialStatus || '').toUpperCase();
      if (p === 'REFUNDED' || p === 'VOIDED') return ['tag--out', 'Cancelled'];
      if (f === 'FULFILLED') return ['tag--best', 'Delivered'];
      if (f === 'PARTIALLY_FULFILLED') return ['tag--sale', 'Part shipped'];
      if (p === 'PAID') return ['tag--sale', 'Processing'];
      return ['tag--sale', (p || 'Pending').toLowerCase()];
    }

    function renderOrders(c) {
      var box = acct.querySelector('[data-mts-acct-orders]');
      if (!box) return 0;
      var edges = (c.orders && c.orders.edges) || [];

      if (!edges.length) {
        box.innerHTML = '<div class="col__empty">'
          + '<p>No orders yet — once you place one, it\'ll show up here.</p>'
          + '<a class="btn btn--brand btn--lg" href="/collections/all">Start shopping</a>'
          + '</div>';
        return 0;
      }

      box.innerHTML = '<div class="acct-orders">' + edges.map(function (e) {
        var o = e.node || {};
        var tag = statusTag(o);
        var when = orderDate(o.processedAt, 'short');
        var items = ((o.lineItems && o.lineItems.edges) || []).map(function (li) {
          var n = li.node || {};
          return esc(n.title) + (n.quantity > 1 ? ' &times;' + n.quantity : '');
        }).join(', ');

        return '<div class="acct-order" data-mts-order="' + esc(o.id) + '">'
          + '<div class="acct-order__top">'
          +   '<div><b class="num">#' + esc(o.orderNumber) + '</b>'
          +     '<span class="acct-order__date">' + esc(when) + '</span></div>'
          +   '<span class="tag ' + tag[0] + '">' + esc(tag[1]) + '</span>'
          +   '<b class="num">' + esc(money(o.currentTotalPrice)) + '</b>'
          + '</div>'
          + (items ? '<p class="acct-order__items">' + items + '</p>' : '')
          + '<div class="acct-order__acts">'
          +   '<button type="button" class="acct-order__btn" data-mts-invoice="' + esc(o.id) + '">'
          +     'Download invoice</button>'
          +   (o.statusUrl
                ? '<a class="acct-order__link" href="' + esc(o.statusUrl) + '" rel="nofollow">Track this order</a>'
                : '')
          + '</div>'
          + '</div>';
      }).join('') + '</div>';

      return edges.length;
    }

    /* ------------------------------------------------------------------
       INVOICE
       Shopify gives customers an order-status page but no invoice document,
       and the Storefront API has no PDF endpoint — so the invoice is built
       here from the order's own figures and handed to the browser's print
       dialogue, where every platform offers "Save as PDF".

       Deliberately a new window rather than a blob download: a generated
       blob download is silently blocked in several mobile browsers, and a
       customer who taps "Download invoice" and gets nothing has no way to
       tell that it was the browser and not the shop.
       ------------------------------------------------------------------ */
    function invoiceHTML(o, c) {
      var when = orderDate(o.processedAt, 'long');
      var rows = ((o.lineItems && o.lineItems.edges) || []).map(function (e) {
        var li = e.node || {}, v = li.variant || {};
        return '<tr>'
          + '<td><b>' + esc(li.title) + '</b>'
          + (v.title && v.title !== 'Default Title' ? '<br><span class="sub">' + esc(v.title) + '</span>' : '')
          + (v.sku ? '<br><span class="sub">SKU ' + esc(v.sku) + '</span>' : '')
          + '</td>'
          + '<td class="r">' + esc(li.quantity) + '</td>'
          + '<td class="r">' + esc(money(v.price)) + '</td>'
          + '<td class="r">' + esc(money(li.originalTotalPrice)) + '</td>'
          + '</tr>';
      }).join('');

      function row(label, val, strong) {
        if (!val) return '';
        return '<tr class="' + (strong ? 'tot' : '') + '"><td colspan="3" class="r">' + esc(label)
             + '</td><td class="r">' + esc(money(val)) + '</td></tr>';
      }
      var name = [c.firstName, c.lastName].filter(Boolean).join(' ');

      return '<!doctype html><html lang="en"><head><meta charset="utf-8">'
        + '<title>Invoice ' + esc(o.name || ('#' + o.orderNumber)) + '</title><style>'
        + '*{box-sizing:border-box}'
        + 'body{margin:0;padding:40px;font:14px/1.6 -apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#1f1f1f;background:#fff}'
        + '.sheet{max-width:760px;margin:0 auto}'
        + 'header{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;'
        +   'padding-bottom:20px;border-bottom:3px solid #df3c22;margin-bottom:28px}'
        + 'header img{width:190px;height:auto;display:block}'
        + 'h1{font-size:22px;margin:0 0 4px;letter-spacing:-.4px}'
        + '.meta{text-align:right;font-size:13px;color:#5d5651}'
        + '.meta b{color:#1f1f1f;font-size:15px}'
        + '.cols{display:flex;gap:34px;margin-bottom:26px}'
        + '.col{flex:1}'
        + '.lbl{font-size:10.5px;letter-spacing:1.3px;text-transform:uppercase;color:#8a8078;font-weight:700;margin-bottom:6px}'
        + 'table{width:100%;border-collapse:collapse;font-size:13.5px}'
        + 'th{text-align:left;font-size:10.5px;letter-spacing:1.2px;text-transform:uppercase;color:#8a8078;'
        +   'padding:0 8px 8px 0;border-bottom:1px solid #e3ded7}'
        + 'td{padding:11px 8px 11px 0;border-bottom:1px solid #efebe6;vertical-align:top}'
        + '.r{text-align:right;white-space:nowrap}'
        + '.sub{color:#6d6660;font-size:12px}'
        + 'tr.tot td{border-bottom:0;border-top:2px solid #1f1f1f;font-weight:700;font-size:15.5px;padding-top:13px}'
        + 'footer{margin-top:34px;padding-top:16px;border-top:1px solid #e3ded7;font-size:12px;color:#8a8078}'
        + '@media print{body{padding:0}.noprint{display:none}}'
        + '.noprint{margin-bottom:22px}'
        + '.noprint button{font:inherit;font-weight:600;background:#df3c22;color:#fff;border:0;'
        +   'border-radius:7px;padding:11px 22px;cursor:pointer}'
        + '</style></head><body><div class="sheet">'
        + '<div class="noprint"><button onclick="window.print()">Print / Save as PDF</button></div>'
        + '<header><div>'
        +   '<img src="https://cdn.shopify.com/s/files/1/0783/2017/3161/files/mytapestore-checkout-logo-420.png?v=1786910098" alt="My Tape Store">'
        + '</div><div class="meta"><h1>Tax Invoice</h1>'
        +   '<b>' + esc(o.name || ('#' + o.orderNumber)) + '</b><br>' + esc(when) + '</div></header>'
        + '<div class="cols">'
        +   '<div class="col"><div class="lbl">Billed to</div>' + esc(name) + '<br>'
        +     ((o.billingAddress && o.billingAddress.formatted) || []).map(esc).join('<br>')
        +     '<br>' + esc(c.email || '') + '</div>'
        +   '<div class="col"><div class="lbl">Delivered to</div>'
        +     (((o.shippingAddress && o.shippingAddress.formatted) || []).map(esc).join('<br>') || '&mdash;')
        +   '</div>'
        + '</div>'
        + '<table><thead><tr><th>Item</th><th class="r">Qty</th><th class="r">Unit</th><th class="r">Total</th></tr></thead>'
        + '<tbody>' + rows
        + row('Subtotal', o.subtotalPrice)
        + row('Shipping', o.totalShippingPrice)
        + row('GST included', o.totalTax)
        + row('Total', o.currentTotalPrice, true)
        + '</tbody></table>'
        + '<footer>My Tape Store &middot; info@mytapestore.com.au'
        +   '<br>All prices in ' + esc((o.currentTotalPrice || {}).currencyCode || 'AUD') + ' and inclusive of GST.'
        + '</footer></div></body></html>';
    }

    function openInvoice(orderId) {
      var c = me;
      if (!c) return;
      var found = null;
      ((c.orders && c.orders.edges) || []).forEach(function (e) {
        if (e.node && e.node.id === orderId) found = e.node;
      });
      if (!found) return;
      var w = window.open('', '_blank');
      if (!w) { alert('Your browser blocked the invoice window. Allow pop-ups for this site and try again.'); return; }
      w.document.write(invoiceHTML(found, c));
      w.document.close();
    }

    function renderAddresses(c) {
      var box = acct.querySelector('[data-mts-acct-addresses]');
      if (!box) return;
      var edges = (c.addresses && c.addresses.edges) || [];
      var defId = c.defaultAddress && c.defaultAddress.id;

      if (!edges.length) {
        box.innerHTML = '<div class="col__empty">'
          + '<p>No addresses saved yet. Add one at checkout and it\'ll be offered next time.</p>'
          + '</div>';
        return;
      }

      box.innerHTML = '<div class="mts-address-grid">' + edges.map(function (e) {
        var a = e.node || {};
        /* `formatted` is Shopify's own locale-correct rendering — safer than
           assembling the lines ourselves and getting AU ordering wrong. */
        var lines = (a.formatted || []).map(esc).join('<br>');
        var isDef = defId && a.id === defId;
        return '<div class="mts-address' + (isDef ? ' is-default' : '') + '">'
          + (isDef ? '<span class="tag tag--best">Default</span>' : '')
          + '<div class="mts-address__lines">' + lines + '</div>'
          + '<div class="mts-address__acts">'
          +   '<button type="button" class="acct-order__btn" data-mts-addr-edit="' + esc(a.id) + '">Edit</button>'
          +   (isDef ? '' : '<button type="button" class="acct-order__btn" data-mts-addr-default="' + esc(a.id) + '">Make default</button>')
          +   (isDef ? '' : '<button type="button" class="acct-order__btn is-danger" data-mts-addr-del="' + esc(a.id) + '">Delete</button>')
          + '</div>'
          + '</div>';
      }).join('') + '</div>'
      + '<button type="button" class="btn btn--ghost mts-address__add" data-mts-addr-new>Add a new address</button>';
    }

    /* ------------------------------------------------------------------
       ADDRESS BOOK
       customerAddressCreate / Update / Delete / DefaultAddressUpdate are all
       available to a Storefront customer token — verified against this store
       before this was written. The form is built here rather than in Liquid
       because it is used for both "add" and "edit" and has to be prefilled
       from data that only exists after sign-in.
       ------------------------------------------------------------------ */
    var ADDR_FIELDS = [
      ['firstName', 'First name', 'given-name', true],
      ['lastName', 'Last name', 'family-name', true],
      ['company', 'Company (optional)', 'organization', false],
      ['address1', 'Address', 'address-line1', true],
      ['address2', 'Apartment, suite (optional)', 'address-line2', false],
      ['city', 'Suburb / city', 'address-level2', true],
      ['province', 'State', 'address-level1', true],
      ['zip', 'Postcode', 'postal-code', true],
      ['country', 'Country', 'country-name', true],
      ['phone', 'Phone (optional)', 'tel', false]
    ];

    function addrDialog(existing) {
      var a = existing || { country: 'Australia' };
      var host = acct.querySelector('[data-mts-acct-addresses]');
      if (!host) return;
      var wrap = document.createElement('form');
      wrap.className = 'mts-addr-form';
      wrap.innerHTML = '<h3>' + (existing ? 'Edit address' : 'Add an address') + '</h3>'
        + '<div class="mts-addr-form__grid">'
        + ADDR_FIELDS.map(function (f) {
            return '<label class="mts-addr-form__f' + (f[0] === 'address1' || f[0] === 'address2' ? ' is-wide' : '') + '">'
              + esc(f[1])
              + '<input name="' + f[0] + '" autocomplete="' + f[2] + '"'
              + (f[3] ? ' required' : '')
              + ' value="' + esc(a[f[0]] || '') + '"></label>';
          }).join('')
        + '</div>'
        + '<p class="mts-addr-form__msg" data-msg hidden></p>'
        + '<div class="mts-addr-form__acts">'
        +   '<button type="submit" class="btn btn--brand">' + (existing ? 'Save changes' : 'Add address') + '</button>'
        +   '<button type="button" class="btn btn--ghost" data-cancel>Cancel</button>'
        + '</div>';

      var old = acct.querySelector('.mts-addr-form');
      if (old) old.remove();
      host.appendChild(wrap);
      wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
      var first = wrap.querySelector('input');
      if (first) first.focus({ preventScroll: true });

      wrap.querySelector('[data-cancel]').addEventListener('click', function () { wrap.remove(); });
      wrap.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var msg = wrap.querySelector('[data-msg]');
        var address = {};
        ADDR_FIELDS.forEach(function (f) {
          var v = (wrap.querySelector('[name="' + f[0] + '"]').value || '').trim();
          if (v) address[f[0]] = v;
        });
        var s = authRead();
        if (!s) return;
        var q = existing
          ? 'mutation($t:String!,$id:ID!,$a:MailingAddressInput!){ customerAddressUpdate(customerAccessToken:$t,id:$id,address:$a){ customerAddress{id} customerUserErrors{code message} } }'
          : 'mutation($t:String!,$a:MailingAddressInput!){ customerAddressCreate(customerAccessToken:$t,address:$a){ customerAddress{id} customerUserErrors{code message} } }';
        var vars = existing ? { t: s.token, id: existing.id, a: address } : { t: s.token, a: address };
        busy(wrap, true);
        gql(q, vars).then(function (r) {
          var n = r && r.data && (r.data.customerAddressUpdate || r.data.customerAddressCreate);
          var errs = (n && n.customerUserErrors) || (r && r.errors);
          if (errs && errs.length) {
            msg.hidden = false;
            msg.textContent = readError(errs);
            busy(wrap, false);
            return;
          }
          wrap.remove();
          showAccount();
        }).catch(function () {
          msg.hidden = false;
          msg.textContent = 'Could not save that address. Please try again.';
          busy(wrap, false);
        });
      });
    }

    function addrById(id) {
      var hit = null;
      (((me || {}).addresses || {}).edges || []).forEach(function (e) {
        if (e.node && e.node.id === id) hit = e.node;
      });
      return hit;
    }

    function addrMutate(query, vars, confirmText) {
      if (confirmText && !window.confirm(confirmText)) return;
      var s = authRead();
      if (!s) return;
      vars.t = s.token;
      gql(query, vars).then(function () { showAccount(); });
    }

    /* ------------------------------------------------------------------
       PROFILE
       customerUpdate covers name, email, phone and password on the same
       token. Password is optional — sending an empty string would try to set
       a blank one, so it is only included when actually filled in.
       ------------------------------------------------------------------ */
    function profileDialog() {
      var c = me || {};
      var host = acct.querySelector('[data-mts-acct-details]')
              || acct.querySelector('[data-mts-acct-addresses]');
      if (!host) return;
      var old = acct.querySelector('.mts-prof-form');
      if (old) { old.remove(); return; }

      var f = document.createElement('form');
      f.className = 'mts-addr-form mts-prof-form';
      f.innerHTML = '<h3>Edit your details</h3>'
        + '<div class="mts-addr-form__grid">'
        + '<label class="mts-addr-form__f">First name<input name="firstName" autocomplete="given-name" value="' + esc(c.firstName || '') + '"></label>'
        + '<label class="mts-addr-form__f">Last name<input name="lastName" autocomplete="family-name" value="' + esc(c.lastName || '') + '"></label>'
        + '<label class="mts-addr-form__f is-wide">Email<input name="email" type="email" autocomplete="email" value="' + esc(c.email || '') + '"></label>'
        + '<label class="mts-addr-form__f is-wide">Phone<input name="phone" type="tel" autocomplete="tel" value="' + esc(c.phone || '') + '"></label>'
        + '<label class="mts-addr-form__f is-wide">New password <span class="mts-addr-form__hint">Leave blank to keep your current one</span>'
        +   '<input name="password" type="password" autocomplete="new-password" minlength="5"></label>'
        + '</div>'
        + '<p class="mts-addr-form__msg" data-msg hidden></p>'
        + '<div class="mts-addr-form__acts">'
        +   '<button type="submit" class="btn btn--brand">Save changes</button>'
        +   '<button type="button" class="btn btn--ghost" data-cancel>Cancel</button>'
        + '</div>';
      host.appendChild(f);
      f.scrollIntoView({ behavior: 'smooth', block: 'center' });
      f.querySelector('[data-cancel]').addEventListener('click', function () { f.remove(); });

      f.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var msg = f.querySelector('[data-msg]');
        var cust = {};
        ['firstName', 'lastName', 'email', 'phone', 'password'].forEach(function (k) {
          var v = (f.querySelector('[name="' + k + '"]').value || '').trim();
          if (v) cust[k] = v;
        });
        var s = authRead();
        if (!s) return;
        busy(f, true);
        gql('mutation($t:String!,$c:CustomerUpdateInput!){ customerUpdate(customerAccessToken:$t,customer:$c){'
          + ' customer{id} customerAccessToken{accessToken expiresAt} customerUserErrors{code message} } }',
          { t: s.token, c: cust }).then(function (r) {
          var n = r && r.data && r.data.customerUpdate;
          var errs = (n && n.customerUserErrors) || (r && r.errors);
          if (errs && errs.length) {
            msg.hidden = false; msg.textContent = readError(errs); busy(f, false); return;
          }
          /* Changing the email or password issues a NEW token and invalidates
             the old one. Persisting it is what stops a details edit from
             silently signing the customer out on their next click. */
          if (n.customerAccessToken && n.customerAccessToken.accessToken) {
            authWrite(n.customerAccessToken.accessToken, n.customerAccessToken.expiresAt);
          }
          f.remove();
          showAccount();
        }).catch(function () {
          msg.hidden = false; msg.textContent = 'Could not save those changes.'; busy(f, false);
        });
      });
    }

    /* One delegated listener for every dashboard action — the panels are
       re-rendered on each refresh, so per-element handlers would be lost. */
    document.addEventListener('click', function (ev) {
      var t = ev.target.closest('[data-mts-invoice],[data-mts-addr-edit],[data-mts-addr-new],'
                              + '[data-mts-addr-del],[data-mts-addr-default],[data-mts-profile-edit]');
      if (!t) return;
      ev.preventDefault();
      if (t.hasAttribute('data-mts-invoice')) return openInvoice(t.getAttribute('data-mts-invoice'));
      if (t.hasAttribute('data-mts-addr-new')) return addrDialog(null);
      if (t.hasAttribute('data-mts-profile-edit')) return profileDialog();
      if (t.hasAttribute('data-mts-addr-edit')) return addrDialog(addrById(t.getAttribute('data-mts-addr-edit')));
      if (t.hasAttribute('data-mts-addr-default')) {
        return addrMutate('mutation($t:String!,$id:ID!){ customerDefaultAddressUpdate(customerAccessToken:$t,addressId:$id){'
          + ' customer{id} customerUserErrors{message} } }', { id: t.getAttribute('data-mts-addr-default') });
      }
      if (t.hasAttribute('data-mts-addr-del')) {
        return addrMutate('mutation($t:String!,$id:ID!){ customerAddressDelete(customerAccessToken:$t,id:$id){'
          + ' deletedCustomerAddressId customerUserErrors{message} } }',
          { id: t.getAttribute('data-mts-addr-del') }, 'Delete this address?');
      }
    });

    function renderTotals(c, _ignored) {
      /* Count from the DATA, never from renderOrders' return value: the orders
         panel now lives on its own page, so on the dashboard it does not exist
         and the old signature reported 0 orders to a customer who has some. */
      var edges = (c.orders && c.orders.edges) || [];
      var orderCount = edges.length;
      var cur = null, sum = 0;
      edges.forEach(function (e) {
        var p = e.node && e.node.currentTotalPrice;
        if (!p) return;
        var st = (e.node.financialStatus || '').toUpperCase();
        if (st === 'REFUNDED' || st === 'VOIDED') return;   // don't count money returned
        sum += parseFloat(p.amount) || 0;
        cur = cur || p.currencyCode;
      });

      var n = acct.querySelector('[data-mts-acct-ordercount]');
      var s = acct.querySelector('[data-mts-acct-spent]');
      if (n) n.textContent = orderCount;
      if (s) s.textContent = cur ? money({ amount: sum, currencyCode: cur }) : '—';

      /* Wishlist lives in localStorage under the key the wishlist feature owns;
         read it rather than duplicating the store. */
      var w = acct.querySelector('[data-mts-wish-total]');
      if (w) {
        var count = 0;
        try {
          var raw = JSON.parse(localStorage.getItem('mts_wish_v1') || '[]');
          count = Array.isArray(raw) ? raw.length : 0;
        } catch (e) { count = 0; }
        w.textContent = count;
      }
    }

    function renderIdentity(c) {
      var name = c.displayName || [c.firstName, c.lastName].filter(Boolean).join(' ') || '';
      var set = function (sel, val) {
        var el = acct.querySelector(sel);
        if (el) el.textContent = val;
      };
      /* Refresh the cached display name so the header disc stays correct if
         the customer changes their name elsewhere. */
      var s = authRead();
      if (s && s.name !== name) authWrite(s.token, s.expiresAt, name);
      initHeaderAccount();               // paint the header disc straight away

      set('[data-mts-acct-name]', name || 'Your account');
      set('[data-mts-acct-email]', c.email || '');
      set('[data-mts-acct-greet]', name ? 'Welcome back, ' + name : 'Welcome back');
      set('[data-mts-acct-dname]', name || '—');
      set('[data-mts-acct-demail]', c.email || '—');

      var initial = acct.querySelector('[data-mts-acct-initial]');
      if (initial) initial.textContent = (name || c.email || 'A').trim().charAt(0).toUpperCase();

      var row = acct.querySelector('[data-mts-acct-phone-row]');
      if (row) {
        if (c.phone) {
          row.hidden = false;
          set('[data-mts-acct-dphone]', c.phone);
        } else {
          row.hidden = true;
        }
      }
    }

    function showAccount() {
      var s = authRead();
      if (!s || !acct) return false;

      card.hidden = true;
      acct.hidden = false;
      chrome(true);

      gql(ME, { t: s.token }).then(function (r) {
        /* A GraphQL error arrives as HTTP 200 with an `errors` array, so it
           never reaches .catch(). Handled first, and surfaced verbatim — a
           silent panel is what made the last bug so hard to read. */
        if (r && r.errors && r.errors.length) {
          throw new Error(r.errors[0].message || 'The store rejected that request.');
        }
        var c = r && r.data && r.data.customer;
        if (!c) {
          toForm('Your session has expired. Please sign in again.');
          return;
        }
        me = c;

        /* Identity first, and independently of the orders. Previously one
           exception anywhere in here left the panel showing a placeholder
           name with no email — signed in, but looking broken. */
        renderIdentity(c);

        /* Each panel renders independently: one bad field must not blank the
           whole dashboard, which is exactly how the previous version failed. */
        var count = 0;
        try { count = renderOrders(c); } catch (e) {
          var ob = acct.querySelector('[data-mts-acct-orders]');
          if (ob) ob.innerHTML = '<p class="mts-acct__muted">Your orders could not be displayed.</p>';
        }
        try { renderAddresses(c); } catch (e) {
          var ab = acct.querySelector('[data-mts-acct-addresses]');
          if (ab) ab.innerHTML = '<p class="mts-acct__muted">Your addresses could not be displayed.</p>';
        }
        try { renderTotals(c, count); } catch (e) {}
      }).catch(function (err) {
        /* Network/transport failure — the session is probably fine, so keep the
           shopper signed in and say what actually went wrong. */
        var box = acct.querySelector('[data-mts-acct-orders]');
        if (box) {
          box.innerHTML = '<p class="mts-acct__muted">'
            + esc(err && err.message ? err.message : 'Could not reach the store.')
            + '</p>';
        }
      });
      return true;
    }

    document.querySelectorAll('[data-mts-acct-signout]').forEach(function (b) {
      b.addEventListener('click', signOut);
    });

    /* Restore an existing session on load — otherwise a signed-in shopper who
       simply revisits the page is shown the login form. */
    showAccount();

    /* Tabs */
    root.querySelectorAll('[data-mts-auth-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var want = btn.getAttribute('data-mts-auth-tab');
        root.querySelectorAll('[data-mts-auth-tab]').forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('is-on', on);
          b.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        Object.keys(forms).forEach(function (k) {
          if (forms[k]) forms[k].hidden = (k !== want);
        });
        say('');
      });
    });

    var LOGIN = 'mutation($i: CustomerAccessTokenCreateInput!) {'
      + ' customerAccessTokenCreate(input: $i) {'
      + '   customerAccessToken { accessToken expiresAt }'
      + '   customerUserErrors { code field message } } }';

    var CREATE = 'mutation($i: CustomerCreateInput!) {'
      + ' customerCreate(input: $i) { customer { id }'
      + '   customerUserErrors { code field message } } }';

    var RECOVER = 'mutation($email: String!) {'
      + ' customerRecover(email: $email) {'
      + '   customerUserErrors { code field message } } }';

    function signIn(email, password) {
      return gql(LOGIN, { i: { email: email, password: password } }).then(function (r) {
        var n = r && r.data && r.data.customerAccessTokenCreate;
        if (!n) throw new Error('No response from the store. Check your connection.');
        if (n.customerUserErrors && n.customerUserErrors.length) {
          throw new Error(readError(n.customerUserErrors));
        }
        authWrite(n.customerAccessToken.accessToken, n.customerAccessToken.expiresAt);
        return true;
      });
    }

    if (forms.signin) {
      forms.signin.addEventListener('submit', function (e) {
        e.preventDefault();
        var f = e.target;
        if (!f.checkValidity()) { f.reportValidity(); return; }
        busy(f, true); say('Signing you in…');
        signIn(f.email.value.trim(), f.password.value)
          .then(function () {
            say('');
            showAccount();
          })
          .catch(function (err) { say(err.message, 'bad'); })
          .then(function () { busy(f, false); });
      });
    }

    if (forms.register) {
      forms.register.addEventListener('submit', function (e) {
        e.preventDefault();
        var f = e.target;
        if (!f.checkValidity()) { f.reportValidity(); return; }
        busy(f, true); say('Creating your account…');
        gql(CREATE, { i: {
          email: f.email.value.trim(),
          password: f.password.value,
          firstName: f.firstName.value.trim(),
          lastName: f.lastName.value.trim()
        } }).then(function (r) {
          var n = r && r.data && r.data.customerCreate;
          if (!n) throw new Error('No response from the store.');
          if (n.customerUserErrors && n.customerUserErrors.length) {
            throw new Error(readError(n.customerUserErrors));
          }
          /* Straight into a session — making someone type the same details
             again immediately is the most common way this flow annoys people. */
          return signIn(f.email.value.trim(), f.password.value);
        }).then(function () {
          say('');
          showAccount();
        }).catch(function (err) {
          say(err.message, 'bad');
        }).then(function () { busy(f, false); });
      });
    }

    var rec = root.querySelector('[data-mts-auth-recover]');
    if (rec) {
      rec.addEventListener('click', function () {
        var email = (forms.signin && forms.signin.email.value.trim()) || '';
        if (!email) { say('Enter your email above first, then press this again.', 'bad'); return; }
        say('Sending a reset link…');
        gql(RECOVER, { email: email }).then(function () {
          /* Deliberately unconditional: reporting whether the address exists
             would turn this into an account-enumeration oracle. */
          say('If that email has an account, a reset link is on its way.', 'ok');
        }).catch(function () {
          say('Could not send the reset link. Please try again.', 'bad');
        });
      });
    }
  }

    /* The splash removes itself via keyframes; this only clears the dead node
     so it cannot sit in the DOM catching stray clicks or focus. */
  function initSplash() {
    var el = document.querySelector('[data-mts-splash]');
    if (!el) return;
    el.setAttribute('inert', '');
    var kill = function () { if (el && el.parentNode) el.parentNode.removeChild(el); };
    el.addEventListener('animationend', kill);
    setTimeout(kill, 2200);           // belt and braces if animationend never fires
  }

    /* =======================================================================
     PRODUCT DESCRIPTION — move spec pairs into the Specifications tab

     Migrated copy ends most products with a run of lines like

         Material-Closed Cell PVC Foam
         Width- 6mm to 24mm
         Temperature Range- -30°C to 80°C

     They are data, not prose, and the page already HAS a home for them: the
     Specifications tab. Rendering them a second time inside the description
     was duplication — so they are lifted out of the description and appended
     to the spec table instead. Nothing is deleted that is not re-homed.

     A row whose label already exists in the table is dropped rather than
     appended, so a product whose specs were previously lifted into the
     `custom.specs` metafield does not end up listing Width twice.

     DETECTION GUARDS (a false positive would eat real copy):
       · <= 120 chars, value <= 90;
       · label carries no comma — a real sentence almost always does;
       · at least THREE consecutive lines;
       · NOT a hyphenated word. "A cost-effective alternative" has no space
         before the dash and continues in lower case; a spec pair either has a
         space ("Width - 6mm") or a capitalised value ("Material-Closed Cell").
         That one rule is what stopped "A cost" / "effective and reliable…"
         being promoted as a specification.
     ==================================================================== */



  function initSplash() {
    var el = document.querySelector('[data-mts-splash]');
    if (!el) return;
    el.setAttribute('inert', '');
    var kill = function () { if (el && el.parentNode) el.parentNode.removeChild(el); };
    el.addEventListener('animationend', kill);
    setTimeout(kill, 2200);           // belt and braces if animationend never fires
  }

    /* =======================================================================
     PRODUCT DESCRIPTION — promote spec pairs out of prose

     The migrated copy ends every product with a run of paragraphs like

         Material-Closed Cell PVC Foam
         Adhesive- High-performance acrylic adhesive
         Width- 6mm to 24mm
         Temperature Range- -30°C to 80°C

     Those are DATA set as body text, which is what makes the page read like a
     blog entry rather than a product sheet. They are lifted into a definition
     list so they can be scanned in a column instead of read as sentences.

     Done in the DOM, not by rewriting 132 product descriptions: the copy stays
     the merchant's, editing it in Shopify keeps working, and if the detection
     is ever wrong the page still shows the original paragraphs.

     DETECTION IS DELIBERATELY STRICT — three guards against eating real prose:
       · the line must be short (<= 120 chars);
       · it must split on a dash/colon into a label with NO commas (a real
         sentence almost always has one) and a value under 90 chars;
       · at least THREE must appear in a row. One "Note - see below" in the
         middle of a paragraph is not a spec table.
     ==================================================================== */



  function boot() {
    initReloadToTop();
    initPopup();
    initWishlistPage();
    paintWish();
    initPasswordToggles();
    initNav();
    initStickyHeader();
    initVisibilityPausing();
    initDrawer();
    initSearch();
    initHero();
    initIndustries();
    initFaq();
    initRail();
    initFilters();
    initDerivedFilters();
    initCards();
    initProduct();
    initCartPage();
    initFooterAccordion();
    initCallButton();
    initBrandRail();
    initCollectionBar();
    initUtilTicker();
    initSearchPlaceholder();
    initChat();
    initAddresses();
    initAuthToggle();
    initPolicyToc();
    initReviews();
    initCustomAuth();
    initHeaderAccount();
    initSplash();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Theme editor re-renders sections without a page load.
  document.addEventListener('shopify:section:load', boot);
})();
