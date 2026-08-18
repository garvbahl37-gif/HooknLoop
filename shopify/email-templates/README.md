# HooknLoop email templates

Eight emails, plus [the text messages](sms-copy.md).

Open any file in a browser to see what it looks like.

They match the four Mailchimp templates in [`newsletter/mailchimp/`](../../newsletter/mailchimp/)
— same navy and orange, same layout.

## The emails

Everything below is live in Klaviyo. IDs are the Klaviyo template ids.

| File | Klaviyo name / id | What it does | When |
|---|---|---|---|
| [01-thank-you.html](01-thank-you.html) | `HooknLoop_ThankYou` · `XCka7Y` | Thanks, what happens next | 1 day after order |
| [02-how-to-use-it.html](02-how-to-use-it.html) | `HooknLoop_HowToUseIt` · `SVQvc3` | How to make it hold — all product types | 3 days after dispatch |
| [10-second-order.html](10-second-order.html) | `HooknLoop_SecondOrder` · `SPiJJ7` | Nudge after one order only | 33 days |
| [11-replenishment.html](11-replenishment.html) | `HooknLoop_RunningLow` · `WRV3EU` | Restock reminder | 45–90 days |
| [12-win-back.html](12-win-back.html) | `HooknLoop_WinBack` · `XWGCdn` | Gone quiet | 6 months |
| [13-cart-1-you-left-items.html](13-cart-1-you-left-items.html) | `HooknLoop_Cart1_LeftItems` · `Xf4jfm` | Abandoned cart, shows real items | 1 hour |
| [14-cart-2-complete-your-order.html](14-cart-2-complete-your-order.html) | `HooknLoop_Cart2_CompleteOrder` · `VZ2e27` | Second nudge, answers the objection | 24 hours |
| [15-cart-3-we-saved-your-cart.html](15-cart-3-we-saved-your-cart.html) | `HooknLoop_Cart3_SavedCart` · `SjxcDK` | Last one, says so | 72 hours |
| [16-browse-pick-up-where-you-left-off.html](16-browse-pick-up-where-you-left-off.html) | `HooknLoop_Browse_PickUp` · `R5v7qv` | Browsed but never added to cart | 4 hours |
| [17-welcome-subscriber.html](17-welcome-subscriber.html) | `HooknLoop_Welcome` · `VcJEGG` | New subscriber | Immediately |

**The four separate how-to emails are gone**, replaced by one covering every product
type. They needed a `Product type is Adhesive` condition, and that field is blank on all
12 Shopify products — so those flows could never have fired. One email needs no condition
and works today.

Number gaps (03–09) are deliberate. Nothing is renumbered, so anything already referenced
by name keeps working.

The waits count from when you **post** the order, not when it arrives — Shopify can't tell
you when something's delivered. Each one has about 3 days built in for the post.

## 01 isn't an automation

**Thank-you goes in Settings → Notifications → Order confirmation.** Shopify already sends
that instantly, to everyone, no marketing consent needed. Use this file as the wording,
pasted above the order details Shopify fills in.

Don't build a separate thank-you flow — two of them in one day is clutter.

## Two things to fix first

**1. Fill in "Product type" on all 12 products.** It's blank on every one at the moment,
so 02–05 have no way of knowing which to send. Use these four words exactly: `Adhesive`,
`Sew-On`, `Dots`, `Straps`.

**2. Fix the spelling on the Fire Retardant Adhesive Roll.** One of its options says `Look`
instead of `Loop`. Worth fixing regardless — it's live on the storefront right now.

## Getting them into Shopify

Shopify Messaging builds emails from blocks — it isn't a paste-in-HTML editor like
Mailchimp. So either:

- **If there's a Custom HTML block**, paste the file straight in.
- **If there isn't**, open the file in a browser and rebuild it using Shopify's blocks.
  All the wording, colours, pictures and spacing are there to copy.

## Bits to swap

| What | Where |
|---|---|
| `{{ customer.first_name }}` | Email 01 — use Shopify's variable button, don't type it |
| `{{ order.order_status_url }}` | Email 01 |

**Don't add an unsubscribe link yourself.** Shopify puts one on every marketing email
automatically. Typing your own breaks the layout — the link code leaks out and shows up as
gibberish in the email.

## Pictures

Product photos come straight from your own Shopify account, so they stay up to date.

The banner and logo load from `hooknloop-newsletter.vercel.app`, same as your Mailchimp
templates. To be safe long term, upload those two to **Content → Files** in Shopify and
swap the links over.

## Why they're written this way

- **No discounts.** Every email gives a reason to buy rather than money off. Discounting
  from the start just teaches people to wait for one.
- **Plain words, short sentences.** These go to people mid-job, read on a phone. Nothing
  clever.
