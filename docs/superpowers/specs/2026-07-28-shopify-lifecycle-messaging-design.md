# HooknLoop Transactional & Post-Purchase Messaging — Design Spec

**Date:** 2026-07-28
**Status:** Approved — ready for implementation plan
**Author:** brainstormed with the HooknLoop owner
**Source material:** the owner's transactional + post-purchase plan (sections A–D)

**Message count:** the plan's stages expand to **29 distinct emails** — 15 transactional
(A11's return set is four emails; shipping confirmation and shipping update are separate)
and 14 post-purchase (B2's education set is four; B9's B2B set is three; B8's seven
replenishment tiers are one email with tiered timing).

## 1. Goal

Turn the owner's messaging plan into **one markdown playbook** that a non-developer can
execute in the Shopify admin, using **only native Shopify** — no Klaviyo, no Mailchimp
journeys, no new vendor, no code.

The playbook is the sole deliverable. It specifies, for each of the 29 messages, exactly
which admin screen it lives in, what triggers it, what it says, and when it must not send.

**Explicitly not delivered:** Liquid notification templates, Shopify Flow export files, or
any change to this repo's apps. The owner decided the emails may keep Shopify's default
visual design for now.

## 2. Decisions (locked during brainstorming)

| Decision | Choice | Rationale |
|---|---|---|
| Platform | **Native Shopify only** — Notifications + Flow + Messaging | No new vendor, no recurring cost |
| Deliverable | **One markdown build guide**, no Liquid | Owner wants the structure and copy, not template code |
| Scope | **All 29 messages**, phased by build order | Phase 1 ships without waiting on the catalog cleanup |
| Post-purchase mechanism | **Flow → customer tag → segment → Messaging automation** | The only native path from custom logic to a marketing send |
| Section B timing anchor | **`Order fulfilled` + 3-day AU transit buffer** | No native "delivered" trigger exists |
| Contact throttle | **Single `msg-cooldown` tag**, not "3 in 7 days" | Flow cannot count events; cooldown is stricter and buildable |
| A3 / A6 | **Internal alert to ops + manual customer message** | Flow has no customer-facing transactional send |
| A7 / A8 | **Carrier / Shop app only** | No native trigger, and duplicate sends are worse than none |
| All SMS | **Out of scope** | Shopify Messaging automations are email-only |

## 3. Platform findings (verified, 2026-07-28)

These were confirmed against Shopify's help documentation, not assumed. They are the
reason the design looks the way it does.

| # | Finding | Source | Consequence |
|---|---|---|---|
| F1 | **Shopify Flow has no marketing-email action.** Its only email actions are `Send internal email`, `Send order invoice`, `Send draft order invoice`, `Send payment reminder`, `Send B2B access email` | Flow actions reference | Section B cannot be sent from Flow; needs the segment bridge (§4) |
| F2 | **No "order delivered" trigger.** Flow has `Order created`, `Order paid`, `Order fulfilled`, `Fulfillment created`, `Fulfillment event created`, `Order canceled`, `Refund created`, `Return requested/approved/declined/canceled/closed/processed/reopened`, `Scheduled time` | Flow triggers reference | All "days after delivery" timings re-anchor to dispatch (§6) |
| F3 | **`Wait` caps at 90 days per workflow**, with no wait-until-date. Docs direct longer delays to a scheduled workflow + `Get data` | Flow wait action reference | B8's 90–120 day tiers can't use a wait |
| F4 | **Marketing automations live in Shopify Messaging**, send only to marketing-subscribed customers, and the docs redirect custom automations back to Flow | Marketing automations manual | Confirms the F1 circle; the segment bridge is the only exit |
| F5 | **Flow has no customer-facing transactional send** (corollary of F1) | Flow actions reference | A3 and A6 become internal alerts |

### 3.1 Unverified assumption — blocking

The architecture rests on Shopify Messaging's **"Customer joined segment"** trigger, which
came from a documentation summary rather than the admin UI. **Phase 2 and Phase 3 must not
begin until this is confirmed in the live admin.** The playbook opens with that check.

If the trigger does not exist as described, section B is not natively buildable and the
platform decision must be revisited.

## 4. Architecture — the segment bridge

Three send surfaces exist. Every message belongs to exactly one.

| | Surface | Capabilities | Limits |
|---|---|---|---|
| **S1** | Notification templates (Settings → Notifications) | Transactional; ignores marketing consent; Liquid-editable | Only fires on Shopify's own built-in events |
| **S2** | Shopify Flow | Triggers, conditions, `Wait` ≤90d, add/remove customer tags, internal email, Admin API | **Cannot send a marketing email** (F1) |
| **S3** | Shopify Messaging | Marketing sends; consent-aware; auto unsubscribe + AU postal footer | Cannot express custom logic |

S2 has the logic and no customer-facing mouth. S3 has the mouth and no logic. They join
through customer tags:

```
Flow evaluates the logic  →  writes a customer TAG
                                  ↓
             a customer SEGMENT is defined by that tag
                                  ↓
    Messaging automation fires on "Customer joined segment"  →  email sends
```

Every section-B message is one instance of this pattern.

**Why this also solves suppression.** Segments can exclude tags. A customer holding
`hold-return-open` never *joins* the segment, so the pending message never sends — and
they join naturally once the hold clears. Held messages are deferred rather than lost.

**Known limitation:** send ordering between competing automations is not controllable. If
two segments become eligible the same day, the order is undefined. The `msg-cooldown` tag
(§5) is what stops that mattering.

## 5. Data model — customer tags

Tags are the only shared state between Flow and Messaging, so the tag vocabulary *is* the
interface. Two families.

### 5.1 State tags — durable, never auto-removed

| Tag | Written when | Read by |
|---|---|---|
| `owns-<product-handle>-<side>` | Any order paid containing that product+side variant | B4 pair-up exclusion, B6 |
| `seg-b2b` | B2B classification met (§5.3) | B9 |
| `hold-return-open` | `Return requested`; removed on return closed/processed | Every section-B segment |
| `hold-complaint` | Set manually by ops; removed manually | Every section-B segment |

`owns-*` is exact rather than heuristic **because hook-vs-loop is a variant option on the
product** (§7). Example: `owns-self-adhesive-hook-and-loop-roll-hook`.

### 5.2 Journey tags — drive one send, then removed

`jrny-thankyou` · `jrny-edu-adhesive` · `jrny-edu-sewon` · `jrny-edu-dots` ·
`jrny-edu-straps` · `jrny-checkin` · `jrny-pairup` · `jrny-review` · `jrny-complement` ·
`jrny-second` · `jrny-replen` · `jrny-b2b-7` · `jrny-b2b-30` · `jrny-b2b-60`

Each is written by a Flow, defines exactly one segment, and is removed by a daily
scheduled cleanup Flow once the send window has passed.

### 5.3 B2B classification

`seg-b2b` is set by a Flow on `Order paid` when **any** of: company name present on the
order, order value above a threshold the owner sets, quantity above a threshold, or a
manually applied `b2b` tag. The owner's plan also lists "business email" and "previous
quote"; both are dropped — email-domain inference is unreliable and quote history is not
natively queryable.

### 5.4 Deliberate deviation from the plan — the throttle

Section C of the plan asks for "no more than three marketing contacts within seven days."
**Flow cannot count events**, so this is replaced by:

- every marketing send writes `msg-cooldown`
- a daily `Scheduled time` Flow removes `msg-cooldown` after the cooldown window
- every section-B segment excludes `msg-cooldown`

This enforces **one** marketing message per window — stricter than the plan's rule, and
actually buildable. The intent (don't over-message) is preserved; the exact rule is not.
The cooldown window length is an owner decision; the playbook recommends 5 days.

## 6. Timing — re-anchoring section B

With no delivered trigger (F2), section B anchors on `Order fulfilled` plus a **3-day AU
domestic transit buffer**.

| Plan message | Plan timing | Native timing |
|---|---|---|
| B1 first-order thank-you | 1 day after order | `Order paid` + 1 day (unchanged) |
| B2 product application | 2–3 days after dispatch | `Order fulfilled` + 3 days (unchanged) |
| B3 delivery check-in | 2–3 days after delivery | `Order fulfilled` + 6 days |
| B4 matching-side cross-sell | 7 days after delivery | `Order fulfilled` + 10 days |
| B5 review request | 10 days after delivery | `Order fulfilled` + 13 days |
| B6 complementary product | 14–21 days after delivery | `Order fulfilled` + 20 days |
| B7 second purchase | 30 days after delivery | `Order fulfilled` + 33 days |
| B8 replenishment | 45–120 days | 45–75 days as waits; **≥90 days as `Scheduled time` + `Get data` + segment** (F3) |
| B9 B2B follow-up | 7 / 30 / 60 days after delivery | `Order fulfilled` + 10 / 33 / 63 days |

**Optional upgrade.** If the carrier writes delivery events into Shopify, the
`Fulfillment event created` trigger can replace the buffer with a real delivered signal.
The playbook includes a short test procedure: place a test order, fulfil it with real
tracking, and inspect whether a delivered-status fulfilment event lands. This is a
per-carrier question and cannot be answered from documentation.

## 7. Catalog findings — Phase 0 prerequisites

Audited against the live `hooknloop.com.au/products.json` on 2026-07-28 (12 products).

**The enabling finding:** 9 of 12 products carry an option named `Hook or Loop?`. Eight
use the values `Hook / Loop / Both`; the ninth is defective (C1 below). Hook-vs-loop,
width and colour are **variant options on a
single product**, not separate products. So B4's "matching side" is the *same product, a
different variant* — same handle, same width, same colour, opposite side. The
compatibility table the plan calls for is unnecessary.

The three products without the option are `hook-and-loop-adjustable-strap`,
`double-sided-hook-and-loop` and `heavy-duty-hook-and-loop-strap` — correctly so, as they
are pre-assembled or inherently dual-sided. They are excluded from B4.

**The blockers:**

| # | Defect | Effect | Fix |
|---|---|---|---|
| C1 | `fire-retardant-adhesive-hook-and-loop` has option value **`Look`**, not `Loop` | Any Flow condition matching "Loop" silently skips this product — a wrong-side cross-sell | Correct the variant option value |
| C2 | **`product_type` is empty on all 12 products** | B2's four education branches have no field to branch on | Set `product_type` per §7.1 |
| C3 | Tags present on only 2 of 12 products (`adhesive`, `hook and loop`, `self adhesive`) | No usable fallback taxonomy for C2 | Optional once C2 is done |
| C4 | Size strings inconsistent: `50mm x25` (no unit), `25m x 25mm` (reversed), `100mm x25m`, `22mm x1000 dots` | "Same width" matching in B4/B6 is unreliable | Normalise to `<width>mm x <length>` |
| C5 | [newsletter/data/catalog.js](../../../newsletter/data/catalog.js) colours disagree with live (mirror says Black, live says Orange) | Stale mirror could be cited as truth | Mark non-authoritative in a header comment |

C1 and C2 are hard blockers for Phases 2–3. C4 is a correctness risk, not a blocker. C5 is
hygiene affecting this repo, not Shopify.

### 7.1 `product_type` taxonomy

Four values, matching the plan's four education emails exactly:

| `product_type` | Products |
|---|---|
| `Adhesive` | `self-adhesive-hook-and-loop-roll`, `heavy-duty-adhesive-hook-and-loop`, `fire-retardant-adhesive-hook-and-loop`, `velcro-self-adhesive-hook-and-loop-roll`, `hook-and-loop-for-fabric` |
| `Sew-On` | `sew-on-hook-and-loop-fastener`, `fire-retardant-sew-on-hook-and-loop` |
| `Dots` | `hook-and-loop-dots`, `velcoin-hook-and-loop-sticky-dots` |
| `Straps` | `hook-and-loop-adjustable-strap`, `heavy-duty-hook-and-loop-strap`, `double-sided-hook-and-loop` |

`hook-and-loop-for-fabric` is adhesive-backed despite its sew-on-sounding name; the owner
should confirm this placement before Phase 2, as it decides which education email its
buyers receive.

## 8. Phases

Ordered to match the plan's section D build order, regrouped so Phase 1 is independently
shippable.

### Phase 0 — Catalog remediation
Fix C1–C5. Blocks Phases 2 and 3. Does **not** block Phase 1. Done in the Shopify admin
plus one comment in this repo.

### Phase 1 — Transactional (plan D1–D4)
No catalog dependency; ships first.

| Message | Surface | Home |
|---|---|---|
| A1 order confirmation | S1 | "Order confirmation" template + dynamic hook-only/loop-only warning |
| A2 payment pending/failed | S2 | Flow → native `Send payment reminder` action |
| A3 processing update | S2 | Flow → `Send internal email` to ops → **manual** customer message |
| A4 shipping confirmation | S1 | "Shipping confirmation" template |
| A4b shipping update | S1 | "Shipping update" template |
| A5 split shipment | S1 | "Shipping confirmation" — compare `fulfillment.line_items` to `order.line_items` to render "still to come" |
| A6 delivery delay | S2 | Flow → `Send internal email` to ops → **manual** customer message |
| A9 cancellation | S1 | "Order cancelled" template |
| A10 refund | S1 | "Refund" template |
| A11 return/exchange ×4 | S1 | Shopify's return notification set |

A7 out-for-delivery and A8 delivered are **not built** — carrier or Shop app only (§10).

### Phase 2 — Education & service (plan D5–D9)
Requires Phase 0 C2. B1 thank-you · B2 education ×4 branched on `product_type` ·
B3 delivery check-in.

### Phase 3 — Commercial (plan D10–D15)
Requires Phase 0 C1+C2 and accumulated `owns-*` tags. B4 pair-up · B5 review ·
B6 complementary · B7 second purchase · B8 replenishment · B9 B2B ×3.

**Phase 3 has a warm-up period.** `owns-*` tags only accumulate from the moment the
Phase 1 tagging Flow goes live, so B4's exclusion is unreliable for customers whose
purchase history predates it. Either backfill tags from historical orders via the Admin
API, or accept some redundant cross-sells for the first months. The playbook recommends
accepting it and states the trade-off.

## 9. Per-message spec format

Every one of the 29 messages is documented with the same block, so the playbook is
mechanically executable rather than interpretive:

- **Surface** — S1, S2 or S3
- **Trigger** — the exact Shopify trigger name
- **Entry conditions** — what must be true
- **Wait** — duration, or the scheduled-workflow alternative
- **Tags read / tags written**
- **Segment definition** — the literal segment query, for S3 messages
- **Subject line + body copy** — send-ready, not placeholder
- **Suppression & exit** — which holds apply, when the journey tag is removed
- **Native caveats** — anything the owner should know is approximated

## 10. Out of scope

| Item | Why | What happens instead |
|---|---|---|
| All HooknLoop-originated SMS (A4, A6, A7, A8, B8 SMS legs) | Shopify Messaging automations are email-only; native SMS covers only order confirmation when no email was given | Carrier notifications + Shop app |
| A7 out-for-delivery, A8 delivered | No native trigger (F2); duplicate sends from both carrier and store are worse than none | Carrier only — pick one system, as the plan itself advises |
| A3, A6 as automated customer emails | Flow has no customer-facing transactional send (F5) | Internal alert to ops, manual customer message |
| Exact "3 marketing contacts in 7 days" | Flow cannot count events | Single-cooldown approximation (§5.4) |
| B9's "business email" and "previous quote" B2B signals | Domain inference is unreliable; quote history is not natively queryable | Four remaining B2B signals (§5.3) |
| Liquid template code | Owner chose build-guide-only | Prose instructions describing each template change |

**Coverage:** 25 of 29 messages fully automated natively (A1, A2, A4, A4b, A5, A9, A10,
A11×4, B1, B2×4, B3, B4, B5, B6, B7, B8, B9×3), 2 downgraded to internal alerts (A3, A6),
2 handed to the carrier (A7, A8).

## 11. Operational prerequisites

Before Phase 1 begins, confirm in the live admin:

1. **Shopify Flow is installed** and available on the store's current plan.
2. **Shopify Messaging is installed**, and its **"Customer joined segment"** trigger exists (§3.1 — blocking for Phases 2–3).
3. **Marketing consent** is being collected — Messaging sends only to subscribed customers, so section B reaches a subset of buyers by design.
4. **The required AU postal address** is set in Messaging's footer settings. The Spam Act 2003 requires it on every marketing message; Shopify appends it on send, but only once configured.
5. **An ops inbox** exists for the A3/A6 internal alerts, with an owner who acts on them.

## 12. Deliverable location

`docs/shopify-lifecycle-messaging-playbook.md` — one file, sectioned by phase, with the
29 per-message blocks and the appendices above.

## 13. Success criteria

- Every one of the 29 plan messages appears in the playbook, either with a complete spec block or in the §10 out-of-scope table with a reason.
- A non-developer can build each Flow, segment and automation from the playbook without asking a follow-up question.
- No step depends on Liquid knowledge.
- Every native limitation the owner would otherwise discover mid-build is stated up front.
