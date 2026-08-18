# Abandoned cart — Shopify Flow build sheet

> ## ⚠ CORRECTION — do not use Flow for abandoned checkout
>
> Flow's **Send marketing email** action states: *"This email will send to
> customers subscribed to email marketing."* That is a filter, not a label.
>
> Measured against this store's real data — 18 abandoned checkouts, every one
> with an email captured:
>
> | | Carts | Value |
> |---|---|---|
> | Subscribed to marketing | 9 | $1,651.68 |
> | **Not subscribed** | **9** | **$1,035.36** |
>
> A Flow marketing email reaches **50%**. The other nine entered their email at
> checkout and never ticked a marketing box, so Flow skips them silently.
>
> **Use Shopify's built-in abandoned checkout automation instead**
> (Marketing → Automations). It sends to everyone who entered an email at
> checkout, because cart recovery is transaction follow-up rather than
> promotion — the customer initiated the purchase. That is precisely why
> Shopify ships it outside Flow.
>
> The Messaging email "Complete your order", last seen in **Draft**, *is* that
> automation. It needs **Set to active**, not a Flow.
>
> **Flow is still right for:** how-to guides, review requests, replenishment —
> genuine marketing where consent is required and appropriate.
>
> The build below is kept for those flows. The trigger and wait/consent
> structure still apply; only the abandoned-checkout use case moves.

Built by clicking. Shopify exposes no API for creating workflows — the entire
Admin API schema (2,969 types) contains **zero** `Workflow` or `Automation`
types, and `.flow` files are hash-signed. Verified, not assumed.

---

## The mistake to avoid

A workflow was started with the trigger **"Automatic discount created"**. That
event carries no customer and no abandonment, so the Send marketing email step
fails with:

```
Abandonment:  No abandonment found
Customer:     No customer found
Error: There's no Customer available from the trigger or previous steps
```

Nothing downstream can be fixed while that trigger is in place. The template
picker was never the problem.

---

## Build it

### Step 1 — Trigger

Delete the existing trigger. Add a new one and type **`abandon`** into the
trigger search. Shopify offers three, in descending order of value:

| Trigger | Fires when | Worth using? |
|---|---|---|
| **Checkout abandoned** | reached checkout, entered email, didn't pay | ✅ **start here** |
| Cart abandoned | added to cart, never reached checkout | second |
| Product browse abandoned | viewed a product, never added it | weakest intent |

Start with **Checkout abandoned**. Those people typed their email and their
address — the highest intent you will ever get without a sale, and the only one
of the three guaranteed to have a contactable customer.

### Step 2 — Wait

Add a **Wait** step: **1 hour**.

Long enough that you are not emailing someone who stepped away from their desk
mid-checkout, short enough that they still remember what they were buying.

### Step 3 — Condition

Add a **Condition**:

```
Customer > Email marketing consent > state  equals  subscribed
```

**This must come AFTER the wait, not before.** People unsubscribe during a wait,
and checking only at the start sends to them anyway.

### Step 4 — Send

**Send marketing email** → **Select template** → pick your customised template.

The `Abandonment` and `Customer` fields at the top of the action should now
resolve instead of reading "No … found". If they still show "not found", the
trigger is wrong — go back to step 1.

### Step 5 — Turn on

**Turn on workflow**, top right. A draft workflow never fires.

---

## Final shape

```
Checkout abandoned
   ↓
Wait 1 hour
   ↓
Customer email marketing consent = subscribed
   ↓
Send marketing email  →  your template
```

---

## Before disabling the old automations

Check what is actually running first — **Marketing → Automations**. Shopify ships
a built-in abandoned checkout automation, and if it is already active, this new
flow will send a **second** email for the same cart. Turn the built-in one off
before switching this on, or the customer gets chased twice.

At the time of writing the Messaging email "Complete your order" was still in
**Draft**, so most likely nothing is live yet — but confirm rather than assume.

---

## Why the wait is only 1 hour

There were **10 abandoned checkouts** sitting in the store unrecovered, three of
them worth $82.56, $508.72 and $66.56. None of them received anything. Recovery
rates fall off sharply after the first few hours, so the first email should be
early. If a second email is ever added, put it at 24 hours — and only put a
discount in that one, never the first, or monthly trade buyers learn to abandon
every cart and wait for the code.
