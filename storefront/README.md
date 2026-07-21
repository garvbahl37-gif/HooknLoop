# HooknLoop Storefront — React prototype

A premium redesign of hooknloop.com.au (landing page + product page) in your store's
own theme (navy / royal blue / brand orange, rounded). Built with **React + Vite**.

---

## ▶ How to run it

```bash
cd "storefront"
npm run dev
```

Then open the URL it prints (default **http://localhost:5200**).

> **Why the scripts look unusual:** this folder's path contains a `:`
> (`HooknLoop:MyTapeStore`). The shell treats `:` as a PATH separator, which breaks
> the normal `vite` command. So `package.json` calls vite by file path
> (`node ./node_modules/vite/bin/vite.js`) instead. If you ever move this folder
> somewhere without a `:` in the path, you can change the scripts back to `"vite"`.

If dependencies ever break: `npm install` (then `npm run dev`).

---

## 🧭 Navigation (works like the live store)

- **Header nav** — Home · Products ▾ · VELCRO® Brand ▾ · Fire Retardant ▾ · Bulk Order,
  **centred**. The ▾ parents **only open their dropdown — they never navigate**. Opens
  on hover, click, tap or keyboard focus; closes on Escape, outside click, or picking.
- **Nav dropdowns are cloned 1:1 from the live hooknloop.com.au top nav** (see
  `MENU_SPEC` in [Header.jsx](src/components/Header.jsx)). **Products** is the store's
  curated set of **8 flagship products** under short, category-style labels (Self
  Adhesive · Sew On · Dots, Coins · Adjustable Straps · Back to Back / Double Sided ·
  Material Handling Straps · Heavy Duty · For Fabric) — deliberately **not** the full
  12-product list, which read as too long. **VELCRO® Brand** (2) and **Fire Retardant**
  (2) mirror the live store's two-item menus. Each dropdown item links straight to its
  product page, exactly like the real store. Handles resolve against the catalog and a
  typo is surfaced loudly in the console.
- **Clicking any product** (nav dropdown item, category card, best-seller card, or a
  hero "Shop" button) opens the **product page**.
- **Home / logo** returns to the landing page.
- **Header icons** — search (carries the typed query through to `#search/<query>`),
  account (→ contact; there's no auth backend in the prototype), wishlist, cart.
  The cart/wishlist badges only appear once they hold something.
- **Wishlist** — the heart on any product card saves it to `#wishlist`
  (localStorage, same pattern as the cart).
- Routing is hash-based (`#` = landing, `#product/<handle>` = product page,
  `#collection/<slug>`, `#cart`, `#wishlist`, `#search/<query>`) — no build step, no
  server routing needed for the prototype.

## ⚠️ Stylesheet import order matters

`src/main.jsx` imports `tokens.css` and `base.css` **before** `App.jsx`, and it has to
stay that way. App pulls in the per-area stylesheets, and ES imports evaluate in source
order — so with `App` first, `base.css` landed last and its `.wrap { padding: 0 24px }`
beat every equal-specificity `.wrap x` rule, silently zeroing the vertical padding on
`.ft__main`, `.pdp__grid`, `.pdp__crumb` and others.

---

## 📄 What's here

```
src/
  App.jsx                    ← routes between Landing and Product page
  components/
    Header.jsx               ← promo bar + logo/search + nav with dropdowns
    HeroSlides.jsx           ← hero SLIDESHOW (4 full slides, auto-advance every 5s,
                                dots + counter only — prev/next arrows removed)
    FacilitiesMarquee.jsx    ← premium seamless infinite ticker: machined pills that
                                interleave capabilities with the product range (range
                                chips link to their collection), so the strip shows
                                capability + range + variety. Two identical rows shift
                                -50% for a gapless loop; pauses on hover/focus; static
                                scrollable row under prefers-reduced-motion
    FloatingActions.jsx      ← call button (bottom-left) + chat launcher (bottom-right);
                                both retire once the footer is on screen so nothing
                                fixed ever covers it
  sections/                  ← landing-page sections, in CRO order:
    Basic.jsx                ← TrustStats, CategoryGrid, WhyUs, FireRetardant
    HookLoopExplainer.jsx    ← "two halves of one fastener" (the #1 conversion fix)
    TapeFinder.jsx           ← 3-step guided product finder (interactive)
    BestSellers.jsx          ← product cards with "complete set" default
    BulkTrade.jsx            ← B2B band + trade-quote form
    TrustReviews.jsx         ← honest trust pillars + real 4.87 / 15 rating
    Footer.jsx               ← four columns (brand · shop · help · stay-in-touch,
                                which holds the newsletter) + legal bar carrying the
                                payment marks
  pages/
    ProductPage.jsx          ← premium PDP (Self-Adhesive Roll) — see below
  styles/                    ← tokens.css (design system) + one file per area
public/img/                  ← product images (your real store images, local)
```

## 🛒 The product page (`#product`)

Redesign of your original PDP, fixing every issue the audit found:

- **"Which side?" defaults to Both (complete set)** with a plain-English explainer and a
  "switch to Both" nudge if a single side is picked — the original silently defaulted to
  "Hook" (a half that can't fasten).
- **Price-per-metre** shown (`$2.63/m finished fastener`).
- Premium gallery, honest rating, in-stock/dispatch flag.
- Spec table with `[from supplier TDS]` placeholders (never fabricated numbers).
- Trust row, FAQ, "complete the job" cross-sell, and a **floating glass add-to-cart
  dock** — a contained, centred, blurred dock (not full-bleed) with thumb + name +
  variant, a prominent price, an inline quantity stepper, and the CTA. Centred so its
  desktop side-gutters clear the corner call/chat buttons; on mobile it goes
  near-full-width, the price moves under the name, and the corner buttons hide while
  it's up (`body.dock-open`). 44px touch targets, ARIA region/live, reduced-motion safe.

## Design system

All colours, type, spacing and radii live in `src/styles/tokens.css`. Section background
rhythm is white → tint A → tint B → navy accents, so no two adjacent sections share a tone.

## Notes / not yet done

- This is a **visual + interaction prototype**, not wired to Shopify's cart/checkout
  (Add-to-cart shows confirmation but doesn't post to a real cart).
- Next step to go live: port these sections to **Shopify Liquid** for the Suruchi theme.
