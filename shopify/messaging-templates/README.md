# Shopify Messaging email templates

Eleven emails, as pasteable HTML for **Shopify Messaging**.

These are the same emails as [`../email-templates/`](../email-templates/), converted.
That folder's versions are for Klaviyo and Brevo and **will not work here** — they
carry `{% unsubscribe_link %}`, `{% for %}` loops and `{{ event.* }}` variables that
Messaging does not understand.

## Why this folder exists

Messaging requires two variables in every template:

```
{{ unsubscribe_link }}      the template is rejected without it
{{ open_tracking_block }}   the open pixel
```

Both are **pre-formatted** — each emits its own HTML. They go in standalone. Shopify's
own example is:

```html
<div id="footer">{{ unsubscribe_link }} {{ open_tracking_block }}</div>
```

Wrapping `unsubscribe_link` in your own `<a href="…">` nests one anchor inside another;
the browser closes the `href` at the first inner quote and prints the rest as visible
text. If you need the bare URL to style yourself, use `{{ unsubscribe_url }}` instead.

Those variables are Liquid, so **Liquid runs** — loops and conditionals work.

One trap: Liquid parses HTML comments too, so a lone opening tag inside a comment is an
unclosed tag and breaks the whole file. No file here writes a Liquid tag in a comment.

## The emails

| File | Subject line | Send when |
|---|---|---|
| [abandoned-checkout.html](abandoned-checkout.html) | You are one step away | Checkout abandoned |
| [abandoned-cart.html](abandoned-cart.html) | Your cart is still here | Cart abandoned |
| [01-thank-you.html](01-thank-you.html) | Thanks for your order | 1 day after order |
| [02-how-to-use-it.html](02-how-to-use-it.html) | Getting it to hold | 3 days after dispatch |
| [10-second-order.html](10-second-order.html) | Need any more? | 33 days |
| [11-replenishment.html](11-replenishment.html) | Running low? | 45–90 days |
| [12-win-back.html](12-win-back.html) | Been a while | 6 months |
| [13-cart-1-you-left-items.html](13-cart-1-you-left-items.html) | You left items at checkout | 1 hour |
| [14-cart-2-complete-your-order.html](14-cart-2-complete-your-order.html) | Complete your order | 24 hours |
| [15-cart-3-we-saved-your-cart.html](15-cart-3-we-saved-your-cart.html) | We saved your cart for you | 72 hours |
| [17-welcome-subscriber.html](17-welcome-subscriber.html) | Thanks for signing up | Immediately |

## Pasting one in

1. **Marketing → Automations** (or Campaigns), create the email.
2. Switch the editor to the **custom HTML / code** view — the one showing the
   `templates must include {{ unsubscribe_link }} and {{ open_tracking_block }}` note.
3. Open the `.html` file, copy **everything**, paste it in, replacing what's there.
4. Set the subject line from the table above. The preview text is already built into
   each file as a hidden preheader, so leave that field to it or repeat it.
5. Send yourself a test before activating.

Nothing here needs uploading — the logos are already on your Shopify CDN and load
from there.

## The five cart emails render real products

`abandoned-checkout`, `abandoned-cart`, `13`, `14` and `15` show the customer the
actual items they left — product image, title, variant and quantity. Nothing to drop
in, nothing to hand-build.

```liquid
{%- for line in abandoned_checkout.line_items %}
  {{ line.image_url }}  {{ line.product_title }}  {{ line.variant_title }}  {{ line.quantity }}
{%- endfor %}
{{ abandoned_checkout.remaining_products_count }} more
```

**The variable names differ from the notification templates, and Shopify documents two
possible scopes** — `abandoned_checkout.line_items` *and* a bare `line_items` — without
saying which is live at render time. Guessing wrong renders a silently empty block with
no error, so every field falls back rather than betting:

| Field | Tried first (Messaging) | Falls back to (notification) |
|---|---|---|
| collection | `abandoned_checkout.line_items` | `line_items` |
| title | `line.product_title` | `line.title` |
| variant | `line.variant_title` | `line.variant.title` |
| image | `line.image_url` | `line.image` |
| quantity | `line.quantity` | same |
| recovery link | `abandoned_checkout.url` | `url` |

Whichever scope is real, the products render. `line.line_price` exists in neither useful
form, which is why no prices are shown.

Two limits worth knowing:

* **Only the first five items** are returned. `remaining_products_count` carries the
  rest, rendered as a "+N more in your cart" row.
* **No per-item price exists** in this scope. Prices are left out entirely — the
  recovery link returns them to a checkout that already has the figures, so repeating
  them here adds nothing and risks disagreeing with it.

**These five only work inside the abandoned-checkout automation** — `abandoned_checkout.*`
exists only in that scope. Paste one into an ordinary campaign and the product table
renders empty.

## What changed from the originals

| Original | Here | Why |
|---|---|---|
| `{% unsubscribe_link %}` | `{{ unsubscribe_link }}` | Klaviyo syntax → Messaging syntax |
| *(none)* | `{{ open_tracking_block }}` | Required; the originals had no equivalent |
| `{% for item in event.extra.line_items %}` | `{% for line in abandoned_checkout.line_items %}` | Klaviyo's line items → Shopify's abandoned-checkout scope |
| `{{ event.extra.checkout_url }}` | `{{ abandoned_checkout.url }}` | Klaviyo variable → Messaging variable |
| `{% if first_name %}, {{ first_name }}{% endif %}` | dropped | Conditionals do work here, but `first_name` is a Klaviyo variable — Shopify's is `customer.first_name`, and it isn't in scope for every automation. Add it back per-email once you've confirmed it resolves; a greeting that renders `Thanks for signing up, ` is worse than none |
| Three-facts panel, `Shop all · Bulk orders · Contact` row | removed | One call to action per email |
| `16-browse-pick-up-where-you-left-off` | dropped | Not wanted |

## Editing

Don't edit the `.html` files — they're generated, and a change to the shell would
have to be repeated eleven times. Edit [build.py](build.py) and run it:

```bash
python3 build.py
```

Copy lives in the `EMAILS` list at the bottom; the shell and colours live at the top.

## Colour

All measured against WCAG AA, not eyeballed:

| | Ratio | |
|---|---|---|
| Body `#5a6b8c` on white | 5.36 | pass |
| Headline `#142548` on white | 15.13 | pass |
| CTA `#142548` on `#e87722` | 5.11 | pass |
| Footer `#8194b5` on navy | 4.93 | pass |
| Section label `#b8460a` on white | 5.36 | pass |

Note the two oranges. `#e87722` is a **fill** and carries navy text. On white as small
text it measures 2.96 and fails, so section labels use `#b8460a` — already this repo's
link colour. Keep that split if you add anything.
