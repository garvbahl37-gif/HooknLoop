# My Tape Store — Shopify theme

The `mytapestore-redesign` React storefront, migrated to a Shopify Online Store 2.0
theme for **`my-tape-store-2.myshopify.com`** (a fresh store).

> This directory has nothing to do with the HooknLoop store. That theme lives in
> `../shopify/` and is not touched by anything here.

```
mytapestore-shopify/
  theme/            the Shopify theme (push this)
  build-css.sh      rebuilds the CSS bundle from the React stylesheets
  scripts/
    build_catalogue.py   catalog.js -> Shopify import files
  import/           generated: products.csv, collections.csv, menus.md
```

## Exact-parity contract

The brief was that font sizes, colours and styling match the React design exactly.
That is enforced, not asserted:

| Property        | React source | Theme bundle | Result |
|-----------------|--------------|--------------|--------|
| Design tokens   | 59           | 59           | identical |
| `font-size`     | 274 decls    | 274          | identical |
| `color`         | 503 decls    | 503          | identical |
| `border-radius` | 153 decls    | 153          | identical |
| `line-height`   | 49 decls     | 49           | identical |
| `letter-spacing`| 100 decls    | 100          | identical |
| `@font-face`    | Inter, Sora, Space Grotesk | same | 10/10 files self-hosted |

Two things make that hold:

1. **This theme loads no vendor stylesheet.** `mts-theme.css.liquid` is the only
   CSS on the page, so nothing overrides the ported rules.
2. **No unit conversion.** Because nothing sets a root font-size, `1rem` is the
   browser default 16px — exactly what the React app was authored against. The
   build **fails** if any rule sets a root font-size, or if the rem count or the
   brand tokens change. (The HooknLoop theme had to convert every rem to px
   because its vendor theme set `html{font-size:62.5%}`; that hazard does not
   exist here, and converting anyway would risk rounding drift.)

Rebuild after editing any file in `mytapestore-redesign/src/styles/`:

```bash
./mytapestore-shopify/build-css.sh
```

## Deploying

Requires a **Theme Access** token for this store (Shopify Admin → Apps → Theme
Access → *Create password*), exported as `SHOPIFY_CLI_THEME_TOKEN`.

```bash
export SHOPIFY_CLI_THEME_TOKEN='shptka_...'          # MyTapeStore's token
STORE=my-tape-store-2.myshopify.com

shopify theme check                                   # must be clean
shopify theme push --store "$STORE" --unpublished --path mytapestore-shopify/theme
```

`--unpublished` creates a **draft** theme. It never touches the live theme;
preview it from Online Store → Themes → *Preview*. To update that same draft
later, add `--theme <id>` (get the id from `shopify theme list --store "$STORE"`).

**Never** run `shopify theme publish` here without being asked.

## Setting up the fresh store

The theme renders from real Shopify data, so a brand-new store needs its content
before it looks like the design.

### 1. Taxes — do this first

Settings → Taxes and duties → **"All prices include tax"**. Every price in
`products.csv` is the live store's GST-inclusive price. Skip this and the whole
catalogue is 10% wrong.

### 2. Products

Admin → Products → Import → `import/products.csv`.

- 132 products, 697 variant rows, 391 image rows.
- Images are pulled by Shopify from the **live mytapestore.com.au URLs**, so no
  upload step — but the live site must still be serving them at import time.
- Prices were verified against the source catalogue: **131/132 match exactly**.
  The exception is `general-purpose-adhesive-transfer-tape`, which has no price
  in the source; it imports as a **draft** so it cannot sell for $0.00. Set a
  price before publishing it.
- One WooCommerce placeholder variation (`silicone-kraft-paper-tapes`, sku
  `Husky-101-…`) had a $0 price and no options. It is dropped rather than
  imported, because it would have been checkout-able for free.

### 3. Collections

`import/collections.csv` defines 66 collections (39 categories, 26 industries,
plus `bestsellers`) as **automatic** collections keyed on product tags. Since the
importer wrote those tags onto every product, membership fills in by itself.

Shopify has no native collection importer — use Matrixify/Excelify, or create
them by hand from the CSV as the checklist. Each row's `Rule: Condition` is the
tag to match.

### 4. Navigation

`import/menus.md` (also `python3 scripts/build_catalogue.py --menus`) lists the
exact tree with real handles. Build under Online Store → Navigation:

- **`main-menu`** — drives the header and its mega-menus. Child counts decide the
  layout: ≤10 children renders one column, more renders three. See
  `sections-header-note.md`.
- **`industries`** — drives the home-page industry carousel.
- **`footer-shop`**, **`footer-information`**, **`footer`** — the three footer columns.

### 5. Pages

Create these (the theme's links assume the handles):
`about-us`, `contact` (uses the `page.contact` template), `bulk-trade`,
`industries`, `shipping-delivery`, `return-policy`.

Copy for each is in `mytapestore-redesign/src/pages/ContentPages.jsx`.

### 6. Filters

Install **Search & Discovery** (free, Shopify) and enable filters for
Availability, Price, and the Colour / Size options. The filter panel renders
whatever is configured there, in the design's own markup; with none configured it
renders nothing rather than empty chrome.

## Known gaps — deliberate, not oversights

**Reviews are display-only.** The React page let a visitor "write a review" into
`localStorage`. On a real storefront that shows a review no one else can ever
see — a feature that looks real and isn't. The theme instead *displays* ratings
from the standard `reviews.rating` / `reviews.rating_count` metafields, which is
what review apps write to. Install a reviews app to collect them for real. The
seeded reviews in `mytapestore-redesign/src/data/reviews.js` can be loaded into
whichever app you choose.

**Volume price breaks are off by default.** A theme cannot apply a discount —
only Shopify Discounts can. Showing a "save 15%" table that checkout does not
honour is a promise the store would break. Enable
`show_volume_tiers` in theme settings *only* after creating matching automatic
discounts, and set the percentages to match.

**Wishlist is browser-local.** Same as the React app. It does not sync to a
customer account, and nothing in the UI claims it does.

**Checkout is Shopify's.** The React mock checkout (`CheckoutPage.jsx`) has no
counterpart and was not ported.

## Theme structure

- `layout/theme.liquid` — head, font preloads, the single stylesheet, header/footer groups
- `sections/mts-*.liquid` — one per ported React section or page
- `snippets/mts-*.liquid` — icon set, product card, stars, breadcrumbs, swatches,
  category rail, filter panel, search form, pagination
- `assets/mts-theme.css.liquid` — generated bundle, **do not edit by hand**
- `assets/mts-shopify-overrides.css` — hand-written, for Shopify-only markup
  (pagination, admin rich text, account forms). Appended after the port so it can
  override it; if a rule here fights the port, the port is right.
- `assets/mts-theme.js` — all interactive behaviour, ported from the React components
