# HooknLoop — Shopify notification templates

Redesigned replacements for Shopify's built-in customer notifications.
**Nothing here is deployed.** Each file is pasted by hand into
Settings → Notifications → *(template)* → **Edit code**.

---

## Which notifications this store actually sends

Determined from 69 real orders and the store's delivery settings, not guessed.

| Notification | Evidence | Status |
|---|---|---|
| Order confirmation | 69 orders | ✅ `order-confirmation.liquid` |
| Shipping confirmation | **63 fulfilled** — highest volume after confirmation | ✅ `shipping-confirmation.liquid` |
| Order cancelled | 4 cancelled | ✅ `order-cancelled.liquid` |
| Refund notification | 4 refunded | ✅ `order-refund.liquid` |
| Abandoned checkout | recovers carts already built | ✅ `abandoned-checkout.liquid` ⚠ **must be switched on** |
| Shipping update | Shopify Shipping + Australia Post connected | ⬜ not yet |
| Out for delivery | same | ⬜ not yet |
| Delivered | same | ⬜ not yet |
| Customer account welcome / activation / password reset | 155 customers | ⬜ not yet |
| Order invoice | 6 unfulfilled/unpaid orders exist | ⬜ not yet |

### Abandoned checkout needs enabling separately

The template is only half of it. Pasting the code changes nothing on its own —
Shopify will never fire the email until it is switched on at:

**Settings → Checkout → Abandoned checkouts** — enable, and set the delay
(1 hour, 6 hours, 10 hours or 24 hours after abandonment).

Two content decisions worth keeping:

- **No discount code.** A discount in the *first* abandoned-cart email teaches
  trade buyers who order monthly to abandon every cart and wait for it. That is
  a margin leak dressed as a conversion win. If a discount is ever used, put it
  in a second, later email.
- **No urgency theatre.** No countdown, no "only 2 left", no expiring cart.
  These buyers are restocking a workshop, not impulse shopping, and invented
  scarcity from a trade supplier reads as untrustworthy.

**Deliberately skipped — these never fire for this store:**

| Notification | Why |
|---|---|
| Gift card created | 0 gift card products |
| Draft order invoice | 0 draft orders |
| Local order out for delivery / delivered | Local delivery is **Off** |
| Ready for pickup / Picked up / Pickup update | Pickup in store is **Off** |
| POS exchange receipt | no POS in use |

Skipping these is the point — redesigning ~30 templates when 10 fire is wasted
work and 20 more files to keep in sync.

---

## The design system

**Concept — a works docket.** These buyers are trades, workshops and
procurement people who read dockets and invoices all day, and HooknLoop's own
product labels are engineering spec cards (checkbox grids, HOOK / LOOP,
percentage ticks). So every piece of **data** is monospace — order number,
quantities, money, tracking number, addresses — and only prose is proportional.
Numbers land in columns that scan.

### Tokens

| Role | Value |
|---|---|
| Ink / masthead text | `#142548` |
| Footer field | `#142548` |
| Muted text | `#5a6b8c` |
| Muted on navy | `#8194b5` |
| Page background | `#f4f7fb` |
| Hairline | `#e7ecf4` |
| Action (CTA only) | `#e87722` |
| Orange text on white | `#b8460a` |
| Orange on navy | `#f0842a` |

### Type

- **Prose** — `'DM Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif`
- **Data** — `ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace`

No webfonts. Outlook ignores them, so the personality comes from the treatment
(mono for data, tight tracking, heavy display weights) rather than an exotic face.

### Structure

```
white masthead — logo left, order number right
1px hairline
headline + one-line message
the single most important datum (tracking no. / refund amount)
CTA
items table — 2px navy top rule, 1px hairlines
totals / address
navy footer — reversed logo, phone, email, site, order ref
```

### Rules

1. **Orange is the action colour, and only that.** One orange button per email.
   Cancellation and refund emails use a navy outline button instead — there is
   no happy action there, and a bright button reads as tone deaf.
2. **Never promise a delivery date.** Estimated delivery dates are Off at the
   source (Settings → Shipping and delivery) because the manual range promised
   up to 14 days on metro orders. Do not reintroduce dates in any template.
3. **Logos are PNG, never SVG.** Gmail and Outlook refuse SVG. The theme logo
   `hnl-logo-header.svg` will render as nothing.
   - Masthead (on white): `logo_5.png` — 389×69, blue on white
   - Footer (on navy): `hnl-email-logo-footer.png` — 389×69, reversed
4. **Phone numbers use non-breaking spaces.** `+61&nbsp;3&nbsp;4061&nbsp;6287`.
   A number that wraps mid-digits is a number nobody dials.
5. **600px max width, tables only.** No flex, no grid. Inline styles; the
   `<style>` block only carries the mobile media query, which several clients
   strip.

---

## Contact details used

| | |
|---|---|
| Phone | `+61 3 4061 6287` → `tel:+61340616287` |
| Email | `info@hooknloop.com.au` (subject pre-filled with the order number) |
| Site | `hooknloop.com.au` |

ABN was removed from the footer at the client's request.

---

## Installing

1. Settings → Notifications → *(template)* → **Edit code**
2. Select all, replace with the file contents, **Save**
3. **Send test notification** and check in **Gmail mobile** and **Outlook
   desktop** — the two that break email layouts most

**Worth doing once:** upload `logo_5.png` under Shopify's notification branding.
That makes *every* Shopify email carry the logo, including the ones not
redesigned here. The hardcoded fallback in these templates only covers these.

### Trade-off to know

Editing a notification marks it as customised, so it stops inheriting Shopify's
future updates to that email. That is the cost of controlling the design.

### Scope limit

These handle single-shipment orders of simple products — every order this store
takes. They do **not** handle bundles, nested line items or split carts the way
Shopify's stock templates do. Revisit if those are ever sold.
