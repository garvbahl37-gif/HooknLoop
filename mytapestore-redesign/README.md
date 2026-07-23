# My Tape Store — "Established Trade-Supplier" Redesign

A ground-up visual redesign of **mytapestore.com.au**, kept 100% local. Same brand
colours, **exact** catalogue and pricing — a new, old-school industrial trade-supplier
design language.

## What this is

- **Faithful data.** Every product (132), every variant (674), every price is pulled
  verbatim from the live WooCommerce Store API (`/wp-json/wc/store/v1/…`), in AUD incl.
  GST. Names, SKUs, descriptions, spec tables, ratings, 37 product categories and 26
  industries all mirror the live store. Prices were spot-checked: **132/132 price ranges
  match the API, 0 mismatches.**
- **Redesigned everything visual.** Established Aussie trade-supplier look: dark utility
  bar + white masthead + dark mega-nav, a hazard-tape stripe signature, left "shop by
  category" rail, dense bordered catalogue grids, spec tables, and heavy trust signalling.
- **Real brand palette.** Sampled from the live theme — brand red-orange `#df3c22`
  (not the navy an early summary guessed), charcoal, white and neutral greys. Every text
  pair meets **WCAG 2.1 AA** (verified with axe-core: 0 violations on Home, Collection,
  Product, Cart, Contact, Industry).
- **Fully local & self-contained.** Product images (485) downloaded into `public/img`.
  The Barlow type family (3 widths) is self-hosted in `public/fonts` — no CDN, no external
  requests, no artifacts.

## Run it

```bash
cd "mytapestore-redesign"
npm install
npm run dev        # → http://localhost:5200
```

> The parent folder name contains a `:`, which breaks the `vite` PATH shim, so the npm
> scripts call Vite by file path (`node ./node_modules/vite/bin/vite.js`).

## Stack

React 18 + Vite. Client-side hash router, `localStorage` cart + wishlist, mock checkout
(no backend, no payment). Pages: Home, Shop/Collection (all 39 categories), Product (live
per-variant pricing), Cart, Industries index + 26 industry pages, Search, About, Contact,
Bulk & Trade, and policy pages.

## Structure

```
src/
  data/catalog.js     generated catalogue (products, categories, industries) — do not hand-edit
  lib/cart.js         cart, wishlist, hash router, money/variant helpers
  components/         Header, Footer, ProductCard, CategoryRail, Stars, Breadcrumbs, Icon, TrustStrip
  sections/home.jsx   home hero + sections
  pages/              Collection, Product, Cart, Industry, Search, Content pages
  styles/             tokens.css (design system) + per-area stylesheets
scripts/
  normalize.py        rebuilds src/data/catalog.js from the API dump
  dl_images.py        downloads product images into public/img
  get_fonts.py        self-hosts the Barlow family into public/fonts
```

To refresh the catalogue from the live store, re-run `scripts/normalize.py` (against a
fresh API dump) and `scripts/dl_images.py`.

*This is a design demonstration. Checkout takes no payment and dispatches nothing.*
