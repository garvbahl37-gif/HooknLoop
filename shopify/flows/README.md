# Building the flows

`.flow` files can't be hand-written — Shopify signs each export with a hash it validates on
import, and there's no public way to generate it. Tested and confirmed. Everything below is
built by clicking in the admin.

The good news, from inspecting a real export: **Flow sends marketing email directly.** The
send step points at a Marketing Activity, which is what your Messaging emails are. No
tagging, no segments, no bridge.

## Every flow has the same shape

```
Trigger  →  Who qualifies  →  Wait  →  Still subscribed?  →  Send
```

Two rules for all of them:

**Build the email in Messaging first.** The send step picks from emails that already
exist. You can't select one you haven't made.

**Put the subscribed check AFTER the wait, not before.** People unsubscribe during a
60-day wait. Checking only at the start means the email goes out anyway.

## Not a flow: the thank-you

Shopify's **Order confirmation** already sends instantly, to everyone, no consent needed.
Put the wording in **Settings → Notifications → Order confirmation** above the order
details. No automation needed.

## The flows

### 1–4. The four how-to-use-it emails

Same shape four times, only the product type and email change. Build one, then copy it.

```
Trigger:   Order fulfilled
Condition: Product type is Adhesive        ← or Sew-On / Dots / Straps
Wait:      3 days
Condition: Customer is subscribed to email marketing
Send:      the matching how-to email
```

**Blocked until Product type is filled in.** It's blank on all 12 products. Set it to
exactly `Adhesive`, `Sew-On`, `Dots` or `Straps`.

Start with **Adhesive** — it's your biggest category, so it proves the shape on real
traffic soonest.

### 5. Need any more?

```
Trigger:   Order fulfilled
Wait:      33 days
Condition: Customer has exactly 1 order
Condition: Customer is subscribed to email marketing
Send:      Need any more?
```

### 6. Running low

One per product type, because they run out at different rates.

| Product type | Wait |
|---|---|
| Dots | 45 days |
| Adhesive | 60 days |
| Straps | 75 days |
| Sew-On | 90+ days — over Flow's limit, use the segment route below |

## Win-back: no flow needed

180 days is past Flow's 90-day wait limit, but you don't need Flow for this one at all.

**Customers → Segments → Create segment.** Something like:

```
last_order_date < -180d AND customer_tags NOT CONTAINS 'msg-cooldown'
```

Then **Messaging → automation → trigger "Customer joined segment"** → send
[12-win-back.html](../email-templates/12-win-back.html).

Shopify recalculates the segment on its own, so people drop in as they hit six months. No
wait step, no limit.

*(Check the exact filter name in the segment editor — it offers them from a list.)*

Same trick works for the 90-day sew-on replenishment.

## Test each one before trusting it

1. Set the wait to **1 hour** temporarily
2. Place a real order and fulfil it
3. Watch the email arrive
4. Put the wait back

A flow that silently doesn't fire looks exactly like one that works.

**Turn them on one at a time**, a week apart. If something's misconfigured you'll know
which one.

## Before any of this

- [ ] Fix `Look` → `Loop` on the Fire Retardant Adhesive Roll
- [ ] Set Product type on all 12 products
- [ ] Sort out the duplicate abandoned-checkout workflows — two identical ones are active,
      driving four cart emails at once
