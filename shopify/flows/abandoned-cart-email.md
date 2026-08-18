# Abandoned cart — Messaging email build sheet

For the Shopify Email (Messaging) template selected by the Flow in
[abandoned-cart.md](abandoned-cart.md).

**This is a block editor, not Liquid.** There is nowhere to paste an HTML file,
so this is a section-by-section build. The values below make it read as the same
system as the five notification templates in `shopify/email-templates/`.

---

## The products are already handled

The **Abandoned checkout** block (blue outline in the editor) is dynamic.
Shopify fills it at send time with:

- product image
- product title
- the variant they chose — `25mm x 25m / Black / Hook`
- price
- a **Complete your order** button carrying the recovery link

You cannot edit inside it, and you do not need to. It restores their cart, their
address and their shipping selection, so they resume rather than restart.

Everything below is what you add **around** it.

---

## Subject line and preview text

| Field | Text |
|---|---|
| Subject | `Your cart is still here` |
| Preview text | `Pick up where you left off — nothing to re-enter.` |

No "Don't miss out", no "Hurry", no emoji. These buyers are restocking a
workshop, not impulse shopping, and urgency theatre from a trade supplier reads
as untrustworthy.

---

## Section order

```
1  Image      — logo
2  Text       — headline
3  Text       — body
4  ▓▓▓ Abandoned checkout block ▓▓▓   ← already there, don't move it up
5  Text       — three facts
6  Text       — contact
```

Keep the dynamic block in the middle. The reader should see what they left
*before* being asked to do anything about it.

### 1. Image — logo

Upload `logo_5.png` (already in Files, 389×69, blue on white).
Width **180px**, aligned left.

### 2. Text — headline

```
Your cart is still here.
```

Size **31px**, weight **bold**, colour **#142548**.

### 3. Text — body

```
We've held onto everything you picked, along with your details.
Pick up exactly where you left off — nothing to re-enter.
```

Size **16px**, colour **#5A6B8C**.

### 5. Text — three facts

```
Stocked in Australia — dispatched from our own warehouse, not drop-shipped.
Free shipping over $300 — on all standard domestic orders.
Need a custom size? — we cut to length. Call before you order.
```

Size **13.5px**, colour **#5A6B8C**, with the lead-in of each line **bold** in
**#142548**.

These are the three things that actually stall a trade checkout: is it in stock,
what does delivery cost, and can I get the size I need. Free shipping over $300
is a real threshold from the store's own rates, not an invented incentive.

### 6. Text — contact

```
Questions? Call +61 3 4061 6287 or reply to this email.
```

Size **13.5px**, colour **#5A6B8C**. Phone in **#142548 bold**.

---

## Colours

Set in the **Email colors** panel on the left:

| Setting | Value |
|---|---|
| Content background | `#FFFFFF` |
| Border | `#E7ECF4` — matches the hairlines in the notification templates (default `#FAFAFA` is too faint to read as a border) |

**The button colour is not in this editor.** It comes from
**Settings → Brand → Colors**. Set the brand primary to **`#E87722`** and the
"Complete your order" button turns orange across every Shopify Email instead of
the default black — matching the CTA in the five notification templates.

---

## Deliberately not included

**No discount code.** A discount in the *first* abandoned-cart email teaches
trade buyers who order monthly to abandon every cart and wait for it. That is a
margin leak dressed as a conversion win. If one is ever used, put it in a second
email at 24 hours.

**No countdown or stock scarcity.** Nothing expires, nothing is "almost gone".

**No delivery estimate.** Same reason it was removed everywhere else — shipping
is not calculated until the address step.

---

## Before it can send

1. **Set to active** — the email was last seen in **Draft**. A draft never sends.
2. The Flow must use the **Checkout abandoned** trigger — see
   [abandoned-cart.md](abandoned-cart.md).
3. **Turn on workflow** in Flow.

All three. Any one of them left undone means silence.
