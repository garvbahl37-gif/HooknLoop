/**
 * Product page: gallery, lightbox, tabs, quantity, swatches, add to cart.
 *
 * THE IMPORTANT PART — swatches.
 *
 * The design shows colour swatches; WooCommerce renders <select> elements and
 * its own variation script listens to those selects for `change`. So a swatch
 * here is a VIEW over the real select: clicking one sets select.value and
 * dispatches a native change event, which is exactly what
 * wc-add-to-cart-variation.js is waiting for. The select is hidden, never
 * removed — if this file fails to parse, the page still has working dropdowns
 * and the product is still purchasable.
 *
 * TWO BUGS THIS FILE USED TO HAVE, both invisible in the served HTML and both
 * obvious the moment the page ran:
 *
 *   1. The server-rendered swatches (template-parts/product-options.php) had NO
 *      handler at all. Nothing in the theme listened for their data attribute,
 *      so clicking a colour did nothing — not a wrong variation, no variation.
 *
 *   2. This file then built a SECOND set of swatches for every
 *      select[name^="attribute_"] it found and inserted them in front of the
 *      select. So a variable product rendered each option row twice: the real
 *      swatches (inert) and a duplicate text-chip row (live).
 *
 * Both are gone. The markup owns the swatches; this file only wires them.
 */
(function () {
	'use strict';

	var pdp = document.querySelector('[data-mts-product]');
	if (!pdp) { return; }

	var form = pdp.querySelector('[data-mts-product-form]');

	function $(sel, root) { return (root || pdp).querySelector(sel); }
	function $$(sel, root) { return Array.prototype.slice.call((root || pdp).querySelectorAll(sel)); }

	/* Money formatting. Prices come out of WooCommerce already formatted; the
	   only numbers this file has to build itself are the line total and the
	   tier prices, so it reuses the currency shape of a price already on the
	   page rather than inventing one. */
	var priceEl = $('[data-mts-price]');
	var moneyShape = (function () {
		var sample = priceEl ? priceEl.textContent.trim() : '$0.00';
		var m = sample.match(/^([^\d]*)[\d.,]+([^\d]*)$/);
		return { prefix: m ? m[1] : '$', suffix: m ? m[2] : '' };
	}());

	function money(value) {
		return moneyShape.prefix + value.toFixed(2) + moneyShape.suffix;
	}

	function amount(text) {
		// "$1,234.50" → 1234.5. Strip the thousands separator, keep the decimal.
		var cleaned = String(text).replace(/[^0-9.,]/g, '').replace(/,(?=\d{3}\b)/g, '');
		return parseFloat(cleaned.replace(/,/g, '.'));
	}

	/* ------------------------------------------------------------ gallery ---
	   Thumbnails swap the main image. Nothing is fetched that the page did not
	   already reference. */
	var gallery = $('[data-mts-gallery]');
	var mainImg = gallery && gallery.querySelector('[data-mts-gallery-img]');
	var thumbs = gallery ? $$('[data-mts-thumb]', gallery) : [];

	function showImage(index) {
		if (!mainImg || !thumbs.length) { return; }
		var thumb = thumbs[index];
		if (!thumb) { return; }
		var full = thumb.getAttribute('data-full');
		if (full) {
			mainImg.setAttribute('src', full);
			mainImg.removeAttribute('srcset'); // or the browser keeps the old candidate
			mainImg.removeAttribute('sizes');
		}
		thumbs.forEach(function (t, i) { t.classList.toggle('is-active', i === index); });
	}

	thumbs.forEach(function (thumb, i) {
		thumb.addEventListener('click', function () { showImage(i); });
	});

	/* ------------------------------------------- the rail follows the colour ---
	   On a tape sold in six colours the rail showed all six shots at once, so
	   picking "Blue" left five photos of other colours sitting beside it. Now the
	   rail shows the colour you chose, and the shots no colour claims — the
	   lifestyle photo, a dimension diagram — stay put.

	   The map comes from the server: each thumbnail carries data-mts-colours,
	   built from the variations in woocommerce/single-product.php. An empty value
	   means "shared", which is why it is checked before anything else.

	   Bound to the SELECT's change event, not to `show_variation`. WooCommerce
	   only fires show_variation once EVERY attribute is chosen, so on a product
	   with colour and size the rail would not react until the size was picked
	   too — which is exactly the moment the shopper has stopped looking at it. */
	var colourField = gallery && gallery.getAttribute('data-mts-colour-field');
	var colourSelect = colourField && form
		? form.querySelector('select[name="' + colourField + '"]')
		: null;

	function filterThumbsByColour() {
		if (!colourSelect || !thumbs.length) { return; }

		var chosen = colourSelect.value;
		var firstVisible = -1;

		thumbs.forEach(function (t, i) {
			var owners = (t.getAttribute('data-mts-colours') || '')
				.split(',')
				.filter(Boolean);

			/* Shared shots always show. With nothing chosen, everything shows —
			   the shopper has not narrowed anything yet, so neither do we. */
			var show = !chosen || owners.length === 0 || owners.indexOf(chosen) > -1;

			t.hidden = !show;
			if (show && firstVisible < 0) { firstVisible = i; }
		});

		/* If the main frame is now showing a colour that is no longer in the rail,
		   move it to the first shot that is. Leaving a hidden thumbnail's image in
		   the frame is how the gallery ends up disagreeing with the swatch. */
		var active = thumbs.findIndex(function (t) { return t.classList.contains('is-active'); });
		if (firstVisible >= 0 && (active < 0 || thumbs[active].hidden)) {
			showImage(firstVisible);
		}
	}

	if (colourSelect) {
		colourSelect.addEventListener('change', filterThumbsByColour);

		/* The swatches write to the select and dispatch `change`, so they come
		   through the same path. `reset_data` is WooCommerce clearing the form —
		   the rail has to open back up with it. */
		if (window.jQuery && form) {
			window.jQuery(form).on('reset_data', function () {
				setTimeout(filterThumbsByColour, 0);
			});
		}

		// A pre-selected colour (default attributes, or ?attribute_pa_color=…).
		filterThumbsByColour();
	}

	/* --------------------------------------------------------- lightbox ---
	   The markup ships the dialog (see woocommerce/single-product.php); this
	   only drives it. It used to be assembled here from scratch with text
	   glyphs for the controls and no image counter, so it looked nothing like
	   the design's. */
	var lightbox = $('[data-mts-lightbox]');
	if (lightbox && mainImg) {
		var lbImg = $('[data-mts-lightbox-img]', lightbox);
		var lbCount = $('[data-mts-lightbox-count]', lightbox);
		var lbIndex = 0;
		var lastFocus = null;

		var sources = thumbs.length
			? thumbs.map(function (t) { return t.getAttribute('data-large') || t.getAttribute('data-full'); })
			: [mainImg.getAttribute('src')];

		function paint() {
			if (lbImg) { lbImg.src = sources[lbIndex]; }
			if (lbCount) {
				lbCount.textContent = sources.length > 1
					? (lbIndex + 1) + ' / ' + sources.length
					: '';
			}
		}

		function openLightbox() {
			lbIndex = Math.max(0, thumbs.findIndex(function (t) {
				return t.classList.contains('is-active');
			}));
			lastFocus = document.activeElement;
			paint();
			lightbox.hidden = false;
			document.body.classList.add('mts-lightbox-open');
			var close = $('[data-mts-lightbox-close]', lightbox);
			if (close) { close.focus(); }
			document.addEventListener('keydown', onKey);
		}

		function closeLightbox() {
			lightbox.hidden = true;
			document.body.classList.remove('mts-lightbox-open');
			document.removeEventListener('keydown', onKey);
			if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
		}

		function step(delta) {
			lbIndex = (lbIndex + delta + sources.length) % sources.length;
			paint();
		}

		function onKey(e) {
			if (e.key === 'Escape') { closeLightbox(); }
			if (sources.length < 2) { return; }
			if (e.key === 'ArrowLeft') { step(-1); }
			if (e.key === 'ArrowRight') { step(1); }
		}

		var main = $('[data-mts-gallery-main]');
		if (main) { main.addEventListener('click', openLightbox); }

		var closeBtn = $('[data-mts-lightbox-close]', lightbox);
		if (closeBtn) { closeBtn.addEventListener('click', closeLightbox); }

		var prev = $('[data-mts-lightbox-prev]', lightbox);
		var next = $('[data-mts-lightbox-next]', lightbox);
		if (prev) { prev.addEventListener('click', function () { step(-1); }); }
		if (next) { next.addEventListener('click', function () { step(1); }); }
		if (sources.length < 2) {
			[prev, next].forEach(function (b) { if (b) { b.hidden = true; } });
		}

		lightbox.addEventListener('click', function (e) {
			if (e.target === lightbox) { closeLightbox(); }
		});
	}

	/* --------------------------------------------------------------- tabs ---*/
	var tabButtons = $$('[data-mts-tab]');
	var panels = $$('[data-mts-panel]');

	function openTab(key) {
		tabButtons.forEach(function (b) {
			var on = b.getAttribute('data-mts-tab') === key;
			b.classList.toggle('is-active', on);
			b.setAttribute('aria-selected', on ? 'true' : 'false');
		});
		panels.forEach(function (p) {
			p.hidden = p.getAttribute('data-mts-panel') !== key;
		});
	}

	tabButtons.forEach(function (btn) {
		btn.addEventListener('click', function () {
			openTab(btn.getAttribute('data-mts-tab'));
		});
	});

	// The rating row and any #reviews link open the reviews TAB — scrolling to a
	// hidden panel would land the visitor on nothing.
	function gotoReviews() {
		openTab('reviews');
		var tabs = $('[data-mts-tabs]');
		if (tabs) { tabs.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
	}

	$$('[data-mts-goto-reviews]').forEach(function (el) {
		el.addEventListener('click', gotoReviews);
	});

	document.addEventListener('click', function (e) {
		var link = e.target.closest && e.target.closest('a[href="#reviews"]');
		if (link) {
			e.preventDefault();
			gotoReviews();
		}
	});

	if (window.location.hash === '#reviews') { gotoReviews(); }

	/* ------------------------------------------------------ review form ---
	   The reviews panel ships a "Write a review" button with aria-expanded and
	   aria-controls, and the form it names ships `hidden`. NOTHING bound the
	   button — so the control announced itself as a disclosure, did nothing when
	   pressed, and the form stayed hidden permanently. A customer could not
	   leave a review on this store at all. */
	var reviewToggle = document.querySelector('[data-mts-review-toggle]');
	var reviewForm = document.getElementById('mts-review-form');

	if (reviewToggle && reviewForm) {
		function setReviewForm(open) {
			reviewForm.hidden = !open;
			reviewToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
			if (open) {
				var first = reviewForm.querySelector('textarea, input[type="text"], input[type="email"]');
				if (first) { first.focus(); }
			}
		}

		reviewToggle.addEventListener('click', function () {
			setReviewForm(reviewForm.hidden);
		});

		/* Come back from a failed submission (or a #respond link) with the form
		   already open — otherwise WordPress returns the visitor to a page whose
		   form, and whose error, are both hidden. */
		if (window.location.hash === '#respond' || window.location.hash === '#mts-review-form') {
			openTab('reviews');
			setReviewForm(true);
		}
	}

	/* The star picker. It drives the hidden `rating` field WooCommerce reads —
	   the buttons are the control, the input is the value. Without this the
	   required field can never be filled and the review form cannot submit. */
	var pick = $('[data-mts-rating-pick]');
	var ratingInput = document.getElementById('mts-rating');

	if (pick && ratingInput) {
		var stars = $$('[data-mts-rating]', pick);

		function paintStars(value) {
			stars.forEach(function (star) {
				var on = Number(star.getAttribute('data-mts-rating')) <= value;
				star.classList.toggle('is-on', on);
				star.setAttribute('aria-checked', Number(star.getAttribute('data-mts-rating')) === value ? 'true' : 'false');
			});
		}

		stars.forEach(function (star) {
			var value = Number(star.getAttribute('data-mts-rating'));
			star.addEventListener('click', function () {
				ratingInput.value = String(value);
				paintStars(value);
			});
			// Preview on hover, without committing — the committed value comes back
			// when the pointer leaves.
			star.addEventListener('mouseenter', function () { paintStars(value); });
		});

		pick.addEventListener('mouseleave', function () {
			paintStars(Number(ratingInput.value) || 0);
		});
	}

	/* ----------------------------------------------------------- swatches ---
	   Bind the swatches the SERVER rendered to the select they stand for. */
	$$('.pdp-opt__swatches').forEach(function (group) {
		var chips = $$('.pdp-swatch', group);
		var selectId = chips.length ? chips[0].getAttribute('data-mts-select') : null;
		var select = selectId ? document.getElementById(selectId) : null;
		if (!select) { return; }

		var opt = group.closest('.pdp-opt');
		var readout = opt && opt.querySelector('[data-mts-opt-selected]');

		function sync() {
			chips.forEach(function (chip) {
				var on = chip.getAttribute('data-value') === select.value;
				chip.classList.toggle('is-active', on);
				chip.setAttribute('aria-pressed', on ? 'true' : 'false');
				if (on && readout) {
					readout.textContent = chip.getAttribute('data-label') || chip.getAttribute('data-value');
				}
			});
		}

		chips.forEach(function (chip) {
			chip.addEventListener('click', function () {
				select.value = chip.getAttribute('data-value');
				// The native event is what WooCommerce's variation script listens
				// for. Setting .value alone changes nothing on screen.
				select.dispatchEvent(new Event('change', { bubbles: true }));
			});
		});

		select.addEventListener('change', sync);
		sync();
	});

	/* ------------------------------------------------- variation mirroring ---
	   WooCommerce writes the chosen variation's price, SKU and stock into its
	   own .woocommerce-variation block, which this design hides. Mirror what it
	   writes into the elements the design actually shows, so choosing a
	   variation updates the big price, the SKU chip, the stock line and the
	   out-of-stock badge — none of which moved before. */
	var unitPrice = priceEl ? amount(priceEl.textContent) : NaN;

	function setStock(inStock) {
		var yes = $('[data-mts-instock]');
		var no = $('[data-mts-oos]');
		var badge = $('[data-mts-oos-badge]');
		if (yes) { yes.hidden = !inStock; }
		if (no) { no.hidden = inStock; }
		if (badge) { badge.hidden = inStock; }

		var add = $('[data-mts-add]');
		var buy = $('[data-mts-buynow]');
		[add, buy].forEach(function (b) { if (b) { b.disabled = !inStock; } });
	}

	/* `show_variation` is a jQuery custom event: WooCommerce fires it with
	   $(form).trigger('show_variation', [variation, purchasable]). jQuery's
	   trigger() does not dispatch a native event, so addEventListener would
	   never hear it — this has to bind through jQuery, which WooCommerce
	   already loads on every product page. */
	if (form && window.jQuery) {
		window.jQuery(form).on('show_variation', function (e, v) {
			if (!v) { return; }

			if (priceEl && v.display_price != null) {
				unitPrice = parseFloat(v.display_price);
				priceEl.textContent = money(unitPrice);
			}

			var skuWrap = $('[data-mts-sku-wrap]');
			var skuEl = $('[data-mts-sku]');
			if (skuEl) {
				skuEl.textContent = v.sku || '';
				if (skuWrap) { skuWrap.hidden = !v.sku; }
			}

			setStock(!!v.is_in_stock);

			if (v.image && v.image.src && mainImg) {
				// Point the gallery at the variation's own photo, and light up its
				// thumbnail so the rail agrees with the frame.
				var id = String(v.image_id);
				var match = thumbs.findIndex(function (t) { return t.getAttribute('data-image-id') === id; });
				if (match >= 0) {
					showImage(match);
				} else {
					mainImg.setAttribute('src', v.image.src);
					mainImg.removeAttribute('srcset');
				}
			}

			syncQty();

	/* ------------------------------------------------- volume price breaks ---
	   The tier cards are <button>s and nothing listened to them, so the price
	   breaks were a read-only table: a shopper could see "$35.02 — 6+ pieces"
	   and had no way to take it except by working out the number and typing it
	   into the quantity box themselves.

	   Clicking a tier now sets the quantity to that band's minimum, which runs
	   the same syncQty() the − / + buttons do — so the card highlights, the unit
	   price switches, the struck-through original appears and the line total
	   updates, all from one click. The link works in both directions: typing a
	   quantity still selects the band it falls into. */
	$$('[data-mts-tier-min]').forEach(function (tier) {
		tier.addEventListener('click', function () {
			var min = parseInt(tier.getAttribute('data-mts-tier-min'), 10);
			if (isNaN(min) || !qtyInput) { return; }

			/* Jump to the band's minimum — but only when the current quantity is
			   outside it. Someone who has typed 8 and then clicks the 6-9 band
			   means "yes, that one", not "change my 8 to a 6". */
			var maxRaw = tier.getAttribute('data-mts-tier-max');
			var max = maxRaw === '' || maxRaw === null ? Infinity : parseInt(maxRaw, 10);
			var qty = currentQty();

			if (qty < min || qty > max) {
				setQty(min);
			} else {
				syncQty();
			}

			qtyInput.focus({ preventScroll: true });
		});
	});

		});

		/* No variation resolved — WooCommerce's own state for "options not chosen
		   yet", and it will refuse the add. Reflect that on the button instead of
		   leaving an enabled control that answers "please select some product
		   options" when pressed. */
		window.jQuery(form).on('hide_variation', function () {
			var add = $('[data-mts-add]');
			var buy = $('[data-mts-buynow]');
			[add, buy].forEach(function (b) { if (b) { b.disabled = true; } });
		});

		/* PRESELECT THE FIRST VARIATION.

		   Shopify opens on `selected_or_first_available_variant`, so its product
		   page is purchasable the moment it loads. WooCommerce opens on "Choose
		   an option" unless a default is set in the admin, and on this catalogue
		   almost nothing has one — so the add-to-cart button loaded disabled, and
		   with the swatches inert (see above) there was no way to enable it. That
		   is what "add to cart doesn't work" was.

		   Only fires when NOTHING is chosen, so a customer arriving on a
		   ?attribute_… URL, or coming back to a variation, keeps their choice. */
		var selects = $$('select[name^="attribute_"]', form);
		if (selects.length && selects.every(function (s) { return !s.value; })) {
			selects.forEach(function (select) {
				var first = Array.prototype.find.call(select.options, function (o) { return o.value; });
				if (first) {
					select.value = first.value;
					select.dispatchEvent(new Event('change', { bubbles: true }));
				}
			});
			window.jQuery(form).trigger('check_variations');
		}
	}

	/* ---------------------------------------------------------- quantity ---
	   The markup ships its own − / + buttons (data-mts-qty-down / -up) around
	   input.num[name=quantity]. */
	var qtyInput = $('[data-mts-qty]');

	function bounds() {
		if (!qtyInput) { return { min: 1, max: Infinity }; }
		var min = parseInt(qtyInput.getAttribute('data-min'), 10);
		var max = parseInt(qtyInput.getAttribute('data-max'), 10);
		return {
			min: isNaN(min) ? 1 : min,
			max: isNaN(max) ? Infinity : max
		};
	}

	function currentQty() {
		return Math.max(1, parseInt(qtyInput && qtyInput.value, 10) || 1);
	}

	function setQty(next) {
		if (!qtyInput) { return; }
		var b = bounds();
		qtyInput.value = String(Math.max(b.min, Math.min(b.max, next)));
		qtyInput.dispatchEvent(new Event('change', { bubbles: true }));
	}

	if (qtyInput) {
		var down = $('[data-mts-qty-down]');
		var up = $('[data-mts-qty-up]');
		if (down) { down.addEventListener('click', function () { setQty(currentQty() - 1); }); }
		if (up) { up.addEventListener('click', function () { setQty(currentQty() + 1); }); }

		qtyInput.addEventListener('input', function () {
			qtyInput.value = qtyInput.value.replace(/[^0-9]/g, '');
		});
		qtyInput.addEventListener('change', syncQty);
	}

	/* Highlight the tier band the quantity falls into, and keep the line total
	   honest — it is the number the customer will be charged. */
	function syncQty() {
		var qty = currentQty();
		var tiers = $$('[data-mts-tier-min]');
		var active = null;

		tiers.forEach(function (tier) {
			var min = parseInt(tier.getAttribute('data-mts-tier-min'), 10) || 1;
			var maxRaw = tier.getAttribute('data-mts-tier-max');
			var max = maxRaw === '' || maxRaw === null ? Infinity : parseInt(maxRaw, 10);
			var on = qty >= min && qty <= max;
			tier.classList.toggle('is-active', on);
			if (on) { active = tier; }
		});

		var unit = unitPrice;
		var was = $('[data-mts-was]');

		if (active) {
			var tierPrice = active.querySelector('[data-mts-tier-price]');
			var tierUnit = tierPrice ? amount(tierPrice.textContent) : NaN;
			var off = parseInt(active.getAttribute('data-off'), 10) || 0;
			if (!isNaN(tierUnit)) { unit = tierUnit; }

			// A discounted headline needs the original beside it, or the price
			// silently drops with nothing to say why.
			if (was && priceEl && off > 0 && !isNaN(unitPrice)) {
				was.textContent = money(unitPrice);
				was.hidden = false;
				priceEl.textContent = money(unit);
			} else if (was) {
				was.hidden = true;
				if (priceEl && !isNaN(unitPrice)) { priceEl.textContent = money(unitPrice); }
			}
		} else if (was) {
			was.hidden = true;
		}

		var totalEl = $('[data-mts-linetotal]');
		if (totalEl && !isNaN(unit)) {
			totalEl.textContent = money(unit * qty);
		}
	}

	syncQty();

	/* ------------------------------------------------------- add to cart ---
	   NO PAGE RELOAD, and no double-add.

	   Two things had to be true at once here, and getting one without the other
	   is what broke this twice already:

	   1. It must work for VARIABLE products. WooCommerce's ?wc-ajax=add_to_cart
	      cannot — its handler adds by product id with no variation, so it answers
	      {"error":true} on anything with options. The Store API
	      (/wp-json/wc/store/v1/cart/add-item) takes the variation and is what
	      this uses.

	   2. It must never retry a request that may already have landed. The earlier
	      version fell back to a native form submit whenever the response looked
	      wrong — and the add had usually succeeded, so one click put two items in
	      the cart. There is no resubmit here. A failure is reported and the cart
	      is left exactly as the server says it is.

	   Buy it now is deliberately NOT intercepted: it depends on the server-side
	   redirect to checkout, so it posts normally. */
	var addBtn = $('[data-mts-add]');
	var addedBox = $('[data-mts-added]');
	var addIdle = $('[data-mts-add-idle]');
	var addDone = $('[data-mts-add-done]');
	var store = window.mtsStore || null;
	var storeNonce = store && store.nonce;

	/* The button ships green when the SERVER rendered an add (the no-JS path).
	   Take it back to idle after a moment. */
	if (addBtn && addBtn.classList.contains('is-added')) {
		setTimeout(resetAddButton, 2600);
	}

	function resetAddButton() {
		if (!addBtn) { return; }
		addBtn.classList.remove('is-added');
		if (addIdle) { addIdle.hidden = false; }
		if (addDone) { addDone.hidden = true; }
	}

	function flashAdded(quantity) {
		if (addBtn) { addBtn.classList.add('is-added'); }
		if (addIdle) { addIdle.hidden = true; }
		if (addDone) { addDone.hidden = false; }

		if (addedBox) {
			var text = addedBox.querySelector('[data-mts-added-text]');
			if (text) {
				text.textContent = quantity > 1
					? 'Added ' + quantity + ' to your cart.'
					: 'Added to your cart.';
			}
			addedBox.classList.remove('pdp-buy__added--error');
			addedBox.hidden = false;
		}

		clearTimeout(flashAdded.timer);
		flashAdded.timer = setTimeout(resetAddButton, 2600);
	}

	function showAddError(message) {
		if (!addedBox) { window.alert(message); return; }
		var text = addedBox.querySelector('[data-mts-added-text]');
		if (text) { text.textContent = message; }
		addedBox.classList.add('pdp-buy__added--error');
		addedBox.hidden = false;
	}

	function setCartCount(count) {
		var badge = document.querySelector('[data-mts-cart-count]');
		if (!badge || typeof count !== 'number') { return; }
		badge.textContent = String(count);
		badge.hidden = count < 1;
	}

	/* What the Store API needs: the variation's own id when there is one, and the
	   chosen attributes alongside it. */
	function addPayload() {
		if (!form) { return null; }

		var variationField = form.querySelector('input.variation_id');
		var variationId = variationField ? parseInt(variationField.value, 10) : 0;
		var productId = parseInt(form.getAttribute('data-product_id'), 10) ||
			parseInt((form.querySelector('input[name="add-to-cart"]') || {}).value, 10) ||
			parseInt((addBtn && addBtn.value) || '', 10);

		var id = variationId > 0 ? variationId : productId;
		if (!id) { return null; }

		var payload = { id: id, quantity: currentQty() };

		if (variationId > 0) {
			payload.variation = $$('select[name^="attribute_"]', form).map(function (select) {
				return { attribute: select.name, value: select.value };
			});
		}

		return payload;
	}

	function storeFetch(path, options, retried) {
		var opts = options || {};
		opts.credentials = 'same-origin';
		opts.headers = Object.assign(
			{ 'Content-Type': 'application/json' },
			storeNonce ? { Nonce: storeNonce } : {},
			opts.headers || {}
		);

		return fetch(store.root + path, opts).then(function (res) {
			/* A rejected nonce is the one failure worth retrying: it means the
			   page was served from a cache and the token has aged out. Fetch a
			   fresh one and try once more — never more than once. */
			if ((res.status === 401 || res.status === 403) && !retried) {
				return fetch(store.root + 'cart', { credentials: 'same-origin' }).then(function (probe) {
					storeNonce = probe.headers.get('Nonce') || probe.headers.get('nonce') || storeNonce;
					return storeFetch(path, options, true);
				});
			}
			return res;
		});
	}

	if (form && addBtn && store && store.root) {
		form.addEventListener('submit', function (e) {
			var submitter = e.submitter || document.activeElement;

			// Buy it now posts normally — it needs the redirect to checkout.
			if (submitter && submitter.hasAttribute && submitter.hasAttribute('data-mts-buynow')) { return; }
			if (addBtn.disabled) { return; }

			var payload = addPayload();
			if (!payload) { return; } // could not resolve the product — let the form post

			e.preventDefault();
			addBtn.disabled = true;

			storeFetch('cart/add-item', { method: 'POST', body: JSON.stringify(payload) })
				.then(function (res) {
					return res.json().then(function (json) { return { ok: res.ok, json: json }; });
				})
				.then(function (result) {
					addBtn.disabled = false;

					if (!result.ok) {
						showAddError(result.json && result.json.message
							? result.json.message
							: 'Sorry, this could not be added to your cart.');
						return;
					}

					flashAdded(payload.quantity);
					setCartCount(result.json.items_count);
					document.dispatchEvent(new CustomEvent('mts:cart-changed', { detail: result.json }));
				})
				.catch(function () {
					addBtn.disabled = false;
					showAddError('Your connection dropped before we could add that. Please try again.');
				});
		});
	}
}());
