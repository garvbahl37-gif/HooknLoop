# My Tape Store — email

Custom-coded emails for **My Tape Store** (`cvbpp2-up.myshopify.com`).

> Not to be confused with [`shopify/email-templates/`](../../shopify/email-templates/) at
> the repo root — those are **HooknLoop's**, live in Klaviyo. Different store,
> different brand, different account. Don't cross the streams.

---

## What can actually run your own code

This is the part worth being precise about, because it decides the whole setup.

| Email | Where it lives | Custom HTML/Liquid? | Cost |
|---|---|---|---|
| Order confirmation, shipping, out for delivery, delivered, refund, cancellation, **draft order invoice**, account welcome/reset, contact form | **Settings → Notifications** | ✅ **Yes — full HTML + Liquid** | Free |
| Abandoned checkout, welcome series, win-back, post-purchase | Shopify Email *automations* | ❌ Drag-and-drop editor only | Free to 10k/mo |
| Any of the above, fully custom | Klaviyo / Brevo | ✅ Yes | Paid tiers |
| Tag a customer, alert staff, branch on conditions | Shopify Flow | ❌ **Cannot email customers at all** | Free |

### Why Shopify Flow is not the answer for email

Flow's only email action is **Send internal email**, and:

- the recipient **cannot be a variable**, so it can't send to `{{ customer.email }}`
- there is **no template and no HTML** — it's plain text
- Shopify's own docs say: *"To automate emails to customers, create a marketing automation."*

Flow is still worth installing, but as an **orchestrator**: tag repeat buyers,
notify the team when a bulk order lands, flag high-value carts. Not as a mailer.

Sources: [Send internal email](https://help.shopify.com/en/manual/shopify-flow/reference/actions/send-email) ·
[Flow examples](https://help.shopify.com/en/manual/shopify-flow/reference/examples)

---

## The templates

| File | Notification | Status |
|---|---|---|
| [01-order-confirmation.html](01-order-confirmation.html) | Order confirmation | ready to paste |
| [02-abandoned-checkout.html](02-abandoned-checkout.html) | Abandoned checkout | ready to paste — **third-party app, not Notifications** |
| [03-shipping-confirmation.html](03-shipping-confirmation.html) | Shipping confirmation | ready to paste |
| [04-out-for-delivery.html](04-out-for-delivery.html) | Out for delivery | ready to paste |

More to come: draft order invoice, refund, order cancelled.

### Design decisions baked in

- **Inline styles only.** Gmail strips `<style>` blocks in many contexts; Outlook
  ignores most of what survives.
- **Tables for layout.** Outlook renders with the Word engine — no flexbox, no grid.
- **No webfonts.** Barlow won't load in email clients, so the stack falls back to
  Helvetica/Arial and the brand carries on colour and layout instead of type.
- **600px wide.** Wider gets clipped in Outlook's reading pane.
- **Hazard stripe at the top** — the store's signature device, reproduced with a
  repeating gradient so it costs no image request.
- **ABN + the words "Tax invoice"** are in the footer, so the order confirmation
  doubles as an ATO-compliant tax invoice for orders over $82.50. Don't remove
  that line without checking the requirement.

---

## Installing one (this is the "draft" step)

Notification templates have no draft mode, but nothing is sent until an order is
placed, and the store is still on a draft theme — so this is safe to do now.

1. Admin → **Settings → Notifications → Customer notifications**
2. Pick the notification (e.g. *Order confirmation*)
3. **Edit code** → select all → paste the file's contents → **Save**
4. **Preview** to check rendering, then **Send test email** to yourself
5. Open the test on a phone *and* in Outlook/Gmail before calling it done

To roll back, the editor has **Revert to default** on every template.

### Test before going live

Send a test to at least: Gmail (web + app), Outlook, and Apple Mail. Outlook is
the one that breaks layouts — if it looks right there, it looks right everywhere.


---

## 02 — Abandoned checkout

Goes into a **third-party messaging/email app**, not Settings → Notifications.
Shopify's own abandoned-checkout automation is drag-and-drop only (see the table
at the top), which is why this one lives elsewhere.

### Variables the app requires

Both are already in the template — do not delete either:

| Variable | Where it sits | Why |
|---|---|---|
| `unsubscribe_link` | footer | legally required on marketing email |
| `open_tracking_block` | last line before `</body>` | the app's open-tracking pixel |

### Variables to check against your app's docs

The template uses Shopify's standard abandoned-checkout names, which most apps
mirror. If the preview renders blank, these are the only lines to change:

| Used | Fallback if blank |
|---|---|
| `checkout.abandoned_checkout_url` | `abandoned_checkout_url` |
| `checkout.customer.first_name` | `customer.first_name` |
| `checkout.line_items` | `line_items` |
| `checkout.subtotal_price` | `subtotal_price` |

Some apps drop the `checkout.` prefix entirely. Try that first.

`abandoned_checkout_url` is the one that actually matters — it is the link that
restores the cart. If nothing else renders, that must.

### Liquid runs inside HTML comments

Worth knowing before editing: Liquid is processed across the whole file,
including inside `<!-- -->`. Putting `{{ open_tracking_block }}` in a comment
fires a second tracking pixel, and putting the recovery URL in one leaks it into
the shipped source. That is why the header comment carries no variable braces.

The one exception is the `<!--[if mso]>` block around the button — Outlook parses
that conditional, so the Liquid inside it is meant to render.

### Claims deliberately left out

- **Free shipping.** Rates are flat ($12 standard / $18 express) and the theme's
  free-shipping bar is switched off pending a decision on the threshold.
- **A GST amount.** The store's Australia tax rate is currently 0%, so
  "includes GST" would be a claim checkout does not back up.

Add either back only once it is true at checkout.

### Suggested send timing

One email at **4–6 hours** recovers most of what is recoverable. If you add a
second at ~24h and a third at ~72h, change the subject line each time — repeating
it reads as a resend and gets ignored. Do not add a discount code to the first
send; the volume tiers already give a reason to come back, and training people to
abandon carts for a coupon is expensive.
