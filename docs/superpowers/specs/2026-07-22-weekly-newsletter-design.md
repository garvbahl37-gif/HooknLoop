# HooknLoop Weekly Newsletter — Design Spec

**Date:** 2026-07-22
**Status:** Approved for planning
**Author:** brainstormed with the HooknLoop owner

## 1. Goal

Send a **weekly newsletter** for HooknLoop that:

- runs on a **hosted service** and fires on schedule **even when the owner's Mac is off**;
- **auto-assembles a draft** from store data each week, which the owner **reviews, edits, and sends** (a human gate — nothing ships unseen);
- captures **new subscribers** from the existing footer signup form (currently decorative) and includes a **one-time import** of the existing list;
- lives **entirely as code in this repo** — no Claude Artifacts, no published pages, no separate hosted database.

## 2. Decisions (locked during brainstorming)

| Decision | Choice | Rationale |
|---|---|---|
| Where it runs | **Vercel** (already deploys the storefront) | No new platform; nothing depends on the owner's laptop |
| Scheduler | **Vercel Cron** | Native, config-only, fires weekly |
| Compute | **Vercel Serverless Functions** (`/api/*`) | Ship alongside the existing static build |
| Email service | **Resend** | Free tier; stores the audience *and* the weekly draft; auto-injects unsubscribe |
| Subscriber storage | **Resend Audience** (no separate DB) | "No separate database"; Resend is the source of truth for contacts |
| Draft storage | **Resend Broadcast** (draft state) | Resend also stores the weekly draft — no DB, and the owner edits it in Resend's editor |
| Content model | **Auto-assembled draft → owner approves** | Automated but quality-gated |
| Approval mechanism | **B — approve inside the Resend dashboard** | Owner reviews/edits visually and clicks Send in Resend; least custom code |
| Subscriber source | **Import existing list (one-time) + wire the footer form** | Week one already has recipients; list grows organically after |
| Opt-in | **Double opt-in, implemented statelessly** | Compliance (AU Spam Act) with **no** DB — see §6 |

### Testing safety rule (hard constraint from the owner)

- **All test sends go ONLY to `garvbahl37@gmail.com`** (the account behind `garvbahl37-gif`). The real/imported audience is **never** touched during development.
- Enforced two ways, belt-and-suspenders:
  1. A **`TEST_MODE`** env flag that, when set, forces every recipient to `TEST_RECIPIENT` (= `garvbahl37@gmail.com`) and refuses to send to the audience.
  2. Until the sending domain is verified, sends use **Resend's sandbox domain**, which *physically* only allows delivery to the account owner's own verified email.

## 3. Architecture overview

```
                         ┌───────────────────────── Vercel (hosted) ─────────────────────────┐
                         │                                                                    │
  Footer signup form ───▶│  POST /api/subscribe   ── add contact (pending) ──▶ Resend Audience│
  (storefront)           │        │                                                           │
                         │        └── send confirm email (signed link) ──▶ subscriber inbox   │
                         │                                                                    │
  Confirm link click ───▶│  GET  /api/confirm      ── flip contact to active ─▶ Resend Audience│
                         │                                                                    │
  Vercel Cron (weekly) ─▶│  GET  /api/generate-draft                                          │
                         │        • build HTML from catalog.js (rotating spotlight/tip)        │
                         │        • create Resend Broadcast (DRAFT) aimed at the Audience      │
                         │        • email the owner: "draft ready — review & send in Resend"   │
                         │                                                                    │
                         └────────────────────────────────────────────────────────────────────┘

  Owner ─▶ Resend dashboard ─▶ review / edit the draft Broadcast ─▶ click Send ─▶ Audience
                                                          (unsubscribe link auto-injected)

  One-time: `node scripts/import-subscribers.mjs existing.csv`  ──▶ Resend Audience
```

## 4. Components

Each unit has one clear purpose, a defined interface, and is independently testable.

### 4.1 `api/subscribe.js` — capture a new subscriber
- **In:** `POST { email }` from the footer form.
- **Does:** validates the email; creates a Resend contact in the audience flagged **pending** (`unsubscribed: true`, see §6); sends a confirmation email containing a signed confirm link.
- **Out:** `200 { ok: true }` (always generic, to avoid leaking whether an email exists); `400` on invalid input.
- **Depends on:** Resend SDK, `RESEND_API_KEY`, `RESEND_AUDIENCE_ID`, `NEWSLETTER_SECRET`.

### 4.2 `api/confirm.js` — complete double opt-in
- **In:** `GET /api/confirm?email=…&sig=…` (from the confirm email link).
- **Does:** recomputes the HMAC of `email` with `NEWSLETTER_SECRET`; if it matches `sig`, flips the contact to **active** (`unsubscribed: false`).
- **Out:** a tiny branded HTML page — "You're confirmed ✓" or "Link invalid/expired."
- **Depends on:** Resend SDK, `RESEND_AUDIENCE_ID`, `NEWSLETTER_SECRET`.

### 4.3 `api/generate-draft.js` — weekly auto-draft (cron target)
- **In:** `GET` from Vercel Cron (protected by Vercel's `CRON_SECRET`).
- **Does:**
  1. Builds the newsletter **HTML** via the builder module (§4.5).
  2. Creates a **Resend Broadcast in draft state**, targeted at the audience, subject + HTML set.
  3. Emails the owner a short "This week's draft is ready — review & send" notice with a deep link to the Resend broadcast.
  4. Does **not** send to subscribers (that's the owner's click in Resend).
- **Out:** `200 { broadcastId }`.
- **Depends on:** Resend SDK, builder module, `RESEND_API_KEY`, `RESEND_AUDIENCE_ID`, `OWNER_EMAIL`, `CRON_SECRET`.

### 4.4 `scripts/import-subscribers.mjs` — one-time list import
- **In:** a CSV path (`email`, optional `first_name`); run locally once by the owner.
- **Does:** reads the CSV, creates each contact in the audience as **active** (existing subscribers already consented). Idempotent — re-running skips contacts that already exist.
- **Out:** a summary (`added`, `skipped`, `failed`).
- **Guard:** refuses to run unless `--audience <id>` is passed explicitly, so it can't target the wrong list.

### 4.5 `api/_lib/newsletter.js` — pure content builder (no I/O)
- **In:** `{ products, weekNumber }`.
- **Does:** deterministically picks the week's **product spotlight** and **category highlight** (rotates by ISO week number so it differs each week and is reproducible), selects a **trade tip** from a curated array, and renders a responsive, email-safe **HTML** string with a placeholder **"this week's news"** block for the owner to fill in Resend. Returns `{ subject, html, text }`.
- **Why pure:** no network/secrets → unit-testable with a fixed `weekNumber`.
- **Depends on:** the product catalog (reuses `storefront/src/data/catalog.js` data).

### 4.6 Footer form wiring — `storefront/src/sections/Footer.jsx`
- Replace the fake `onSubmit` (`setSent(true)` only) with a real `POST /api/subscribe`; show the existing "✓ check your inbox" state on success, an inline error on failure. Copy already says "check your inbox," which now matches the double-opt-in confirm email.

## 5. Data flow — a full week

1. **(once)** Owner runs the import script → existing subscribers land in the Resend audience as active.
2. Visitor submits the footer form → `POST /api/subscribe` → pending contact + confirm email.
3. Visitor clicks the confirm link → `GET /api/confirm` → contact becomes active.
4. **Monday (cron):** `GET /api/generate-draft` → builds HTML → creates a draft Broadcast → emails the owner.
5. Owner opens Resend, edits the "this week's news" block / subject, clicks **Send**.
6. Resend delivers to all active contacts with an unsubscribe link; unsubscribes flip the contact automatically.

## 6. Double opt-in without a database

Resend has no built-in "pending confirmation" state, and we want **no separate DB**. So we reuse the contact's own `unsubscribed` flag as the pending state:

- **Pending** = contact created with `unsubscribed: true`. Broadcasts skip unsubscribed contacts, so a pending person can't receive the newsletter yet.
- **Confirm link** = `/api/confirm?email=…&sig=…`, where `sig = HMAC_SHA256(email, NEWSLETTER_SECRET)`. Stateless — the signature *is* the proof of intent; nothing stored server-side.
- **Active** = on valid confirm, set `unsubscribed: false`.

This is fully stateless, needs no storage, and naturally excludes unconfirmed emails from every send.

## 7. Configuration & secrets

All in **Vercel environment variables** (never committed):

| Var | Purpose |
|---|---|
| `RESEND_API_KEY` | Resend auth |
| `RESEND_AUDIENCE_ID` | Which audience to read/write |
| `NEWSLETTER_SECRET` | HMAC signing for confirm links |
| `OWNER_EMAIL` | Where the "draft ready" notice goes |
| `CRON_SECRET` | Vercel-provided; verifies cron calls to `/api/generate-draft` |
| `TEST_MODE` | When `"1"`, force all sends to `TEST_RECIPIENT` |
| `TEST_RECIPIENT` | `garvbahl37@gmail.com` — the only address test sends may reach |

**Vercel config additions** (`vercel.json`): a `crons` entry pointing at `/api/generate-draft` on a weekly schedule (Monday morning AEST; expressed in UTC — exact cron expression finalized in the plan). Note: Vercel `rewrites` are fallbacks applied only when no file/function matches, so the existing SPA catch-all rewrite will **not** swallow `/api/*` routes. The `api/` directory lives at the **repo root** (Vercel auto-detects it) even though the static build outputs from `storefront/`.

## 8. Error handling

- **`/api/subscribe`**: invalid email → `400`; Resend failure → `502` + log, generic message to the user; duplicate email → treat as success (idempotent, no enumeration).
- **`/api/confirm`**: bad/missing signature → friendly "invalid link" page, `400`; already-confirmed → show success (idempotent).
- **`/api/generate-draft`**: missing/incorrect `CRON_SECRET` → `401`; Resend failure → `502` + log, and the owner notice email is skipped (no broadcast half-created that looks ready).
- **Import script**: per-row try/catch; a bad row is logged and counted, never aborts the whole import.

## 9. Testing strategy

- **Unit (pure):** `newsletter.js` builder — given fixed `products` + `weekNumber`, asserts the spotlight/tip rotation and that the HTML contains expected sections and the news placeholder. No network.
- **Signature:** confirm-link HMAC round-trips; a tampered `sig` is rejected.
- **Integration (safe):** with `TEST_MODE=1` + Resend sandbox, run `/api/generate-draft` and confirm the "draft ready" email + owner notice arrive **only** at `garvbahl37@gmail.com`. Never send to the imported audience during dev.
- **Manual:** submit the footer form on a preview deploy → receive confirm email → click → verify contact flips to active in Resend.

## 10. Out of scope (YAGNI)

- Open/click analytics dashboards (Resend already shows basic stats).
- A/B subject testing, segmentation, drip sequences.
- A custom admin UI (the Resend dashboard *is* the admin UI, per decision B).
- Rich CMS-authored articles (the "this week's news" block is edited inline in Resend).

## 11. Operational prerequisites (for the plan, not blockers to writing code)

1. Free **Resend account** + API key; create one **Audience**; note its ID.
2. Verify **hooknloop.com.au** in Resend (add ~3 DNS records) for real-domain sends. **Not required for testing** (sandbox domain covers dev).
3. Export the **existing subscriber list to CSV** (`email`, optional `first_name`) for the one-time import.
