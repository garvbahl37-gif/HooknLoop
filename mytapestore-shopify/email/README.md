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

More to come: shipping confirmation, draft order invoice, refund, abandoned checkout.

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
