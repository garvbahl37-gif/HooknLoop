# Email header banners

Drop-in replacements for the Shopify Email header block, so the default serif
"My Tape Store" wordmark never appears.

## Why these are composited, not AI-generated

The header needs your exact wordmark. Image generators garble lettering, and a
near-miss logo on a customer email is worse than no logo. These are built from
your real brand files — `mts-logo-light.png` and the checkout logo — so the
letterforms are correct by construction.

## The three variants

| File | Background | Use with |
|---|---|---|
| `mts-email-header-white.png` | `#FFFFFF` | a plain white email background |
| `mts-email-header-paper.png` | `#F4F2EF` | the light Custom Liquid block |
| `mts-email-header-charcoal.png` | `#1F1F1F` | the dark Custom Liquid block |

All 1200x260 — renders at 600x130, the full container width, sharp on retina,
and shallow enough not to eat the top of the email.

**No rule, no border.** An earlier version carried a brand-red line along the
bottom. Once the Custom Liquid block sat underneath with its own stripe, the
result was two red lines and two logos stacked. The banner is now the logo on a
flat ground and nothing else — the block below carries no masthead at all.

**Match the background to your email's**, or the banner shows as a visible
rectangle instead of blending. That is the entire point of having three.

## How to use

Shopify Email > edit the automation > the logo/header block > replace the image
with the matching banner, and set its width to maximum. The block still exists,
but it now shows your masthead rather than Shopify's fallback text.

Each banner carries an 8px brand-red rule along the bottom so it reads as a
deliberate masthead rather than a gap above the content.

## Hosted URLs

See `URLS.txt`. They are in Shopify Files, so they are already on your CDN and
need no re-upload.
