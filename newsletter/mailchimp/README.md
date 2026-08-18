# HooknLoop — Mailchimp email templates

Four paste-ready **"Code your own"** Mailchimp templates, all sharing the same
brand banner masthead and mobile-optimised layout. Navy `#0b2447` / orange
`#e8590c`, 600px, table-based, with `mc:edit` editable regions and
`mc:repeatable` product/use-case blocks.

## Everything is real, from the live store
All product **titles, prices, descriptions, images and links** are pulled verbatim
from **hooknloop.com.au** (`products.json` + product JSON). Product photos load
from the store's own **Shopify CDN**. Social + page links are the store's real
accounts/pages. The two application photos (`img/applications/`) are real
in-use photography supplied by the owner. **No fabricated products, prices, or
claims.** Verified: every product link, image and page returns HTTP 200
(LinkedIn returns `999` to automated checks but opens fine for people).

| File | Use for | Real store data | Owner writes (mc:edit) |
|------|---------|-----------------|------------------------|
| `hooknloop-newsletter.html` | Weekly / product showcase | 4 real products, real application photo gallery, shop-by-type links | intro line, trade tip, gallery |
| `hooknloop-product-spec.html` | One product, full spec sheet | Heavy Duty Adhesive — real title/desc/image/price + real sizes/colours; 2 real "pairs with" products | — |
| `hooknloop-industry.html` | A trade / use cases in focus | 2 real recommended products | industry name, intro, use-case list |
| `hooknloop-offer.html` | Discount / promo campaign | 2 real featured products (image/price/link) | offer headline, code, end-date, urgency |

Real products used: Self Adhesive Hook and Loop Roll ($32.90), Heavy Duty Adhesive
Hook and Loop Fastener ($55.43), Hook and Loop Reusable Cable Strap & Ties ($25.00),
Sew On Hook and Loop ($24.46), VELCRO® Brand Self-Adhesive Roll ($84.99).

## Brand banner masthead
All four templates open with the HooknLoop brand banner (`img/hooknloop-banner.jpg`),
linked to the homepage, above an orange accent rule.

## Mobile-optimised
Every template ships a `max-width:600px` media query that, on phones:
- shrinks horizontal product-card thumbnails so text never gets squeezed (`.cardimg`)
- stacks the application-photo gallery to full width for bigger, tappable images (`.gcell`)
- makes primary CTA buttons full-width, thumb-sized tap targets (`.btnw`)
- stacks the offer hero's promo-code chip and "Shop" button on separate full-width rows
- tightens side padding so copy isn't cramped on narrow screens

## Load into Mailchimp
1. Mailchimp → **Content → Templates → Create Template → Code your own → "Paste in code."**
2. Paste a file's contents → **Save** (or use directly in a campaign via *Code your own*).
3. Edit only the grey `mc:edit` blocks; click **+** on repeatable blocks to add products / use cases.

## Merge tags wired
`*|MC_PREVIEW_TEXT|*` (preheader) · `*|ARCHIVE|*` (view in browser) · `*|UNSUB|*` ·
`*|UPDATE_PROFILE|*` · `*|CURRENT_YEAR|*`.

**Postal address:** by design the footer does **not** hardcode a street address or
ABN. AU spam law and Mailchimp both require a physical postal address on every
campaign — set yours once in **Mailchimp → Audience → Settings → Required email
footer content**, and Mailchimp appends it automatically on send.

## Footer (wired)
Real socials — Facebook, Instagram (`@hooknloopshop`), LinkedIn, Pinterest — plus
Shop all, Bulk quotes, Contact, and Privacy, all pointing to live pages. Phone
+61 340 616 287 and info@hooknloop.com.au.

## Hosted assets (not store-owned)
Three images are re-hosted on `hooknloop-newsletter.vercel.app/img/…` for
convenience: the logo, the brand banner, and the two application photos. For
permanence, upload these to Mailchimp's Content Studio and swap the `src`
attributes. Everything else (product photos) is the store's own Shopify-hosted
media.
