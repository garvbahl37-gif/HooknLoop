# HooknLoop Weekly Newsletter — Design Spec

**Date:** 2026-07-22
**Status:** Approved for planning
**Author:** brainstormed with the HooknLoop owner

## 1. Goal

Send a **weekly newsletter** for HooknLoop that:

- runs on a **hosted service** and fires on schedule **even when the owner's Mac is off**;
- **auto-assembles a draft** from store data each week, which the owner **reviews, edits, and sends** from a **custom dashboard they own** (a human gate — nothing ships unseen);
- captures **new subscribers** from the existing footer signup form (currently decorative) and includes a **one-time import** of the existing list;
- lives **entirely as code in this repo** — no Claude Artifacts, no published pages.

## 2. Decisions (locked during brainstorming)

| Decision | Choice | Rationale |
|---|---|---|
| Where it runs | **Vercel** | No new platform; nothing depends on the owner's laptop |
| Dashboard + API | **A new `newsletter/` Next.js app**, deployed as its **own separate Vercel project** | One folder = dashboard UI + API routes + cron in a single deploy; clean separation from the shop |
| Scheduler | **Vercel Cron** | Native, config-only, fires weekly |
| Email service | **Resend** | Free tier; stores the audience; auto-injects unsubscribe |
| Subscriber storage | **Resend Audience** (source of truth for contacts) | No self-managed contact DB |
| Draft storage | **Vercel KV** (Upstash Redis via Vercel Marketplace) | Persist the owner's edits between visits; tiny, free tier, stays on Vercel |
| Content model | **Auto-assembled draft → owner edits & sends** | Automated but quality-gated |
| Approval mechanism | **Custom dashboard the owner deploys and edits in** (replaces the earlier "edit in Resend" idea) | Owner wanted their own simple, branded editor |
| Subscriber source | **Import existing list (one-time) + wire the footer form** | Week one already has recipients; grows organically after |
| Opt-in | **Double opt-in, implemented statelessly** | Compliance (AU Spam Act) with no contact DB — see §7 |

### Testing safety rule (hard constraint from the owner)

- **All test sends go ONLY to `garvbahl37@gmail.com`** (the account behind `garvbahl37-gif`). The real/imported audience is **never** touched during development.
- Enforced two ways:
  1. The dashboard's **"Send test"** button and a **`TEST_RECIPIENT`** env var (= `garvbahl37@gmail.com`) — test sends are hard-coded to that single address.
  2. Until the sending domain is verified, sends use **Resend's sandbox domain**, which *physically* only delivers to the account owner's own verified email.

## 3. Repo layout

```
HooknLoop:MyTapeStore/
├── storefront/                 ← existing shop (unchanged, except the footer form is wired)
│   └── src/sections/Footer.jsx ← real POST to the newsletter app's /api/subscribe (cross-origin)
│
├── newsletter/                 ← NEW self-contained Next.js app · its own Vercel project
│   ├── app/
│   │   ├── login/page.jsx       ← password gate
│   │   ├── page.jsx             ← THE DASHBOARD (protected)
│   │   └── api/
│   │       ├── login/route.js       ← check DASHBOARD_PASSWORD → signed cookie
│   │       ├── subscribe/route.js   ← footer form target (CORS enabled)
│   │       ├── confirm/route.js     ← double opt-in link
│   │       ├── draft/route.js       ← GET current draft / PUT edits (Vercel KV)
│   │       ├── send/route.js        ← "Send test" / "Send to subscribers"
│   │       └── cron/route.js        ← weekly: build+save draft, email the owner
│   ├── lib/
│   │   ├── newsletter.js        ← pure builder+renderer: {products, week, fields} → {subject, html, text}
│   │   ├── resend.js            ← Resend client + audience/broadcast helpers
│   │   ├── kv.js                ← Vercel KV read/write for the draft
│   │   └── auth.js             ← HMAC sign/verify (cookie + confirm links)
│   ├── data/catalog.js         ← product data (shared copy of the storefront catalog — see §6)
│   └── vercel.json             ← crons entry → /api/cron
│
└── scripts/import-subscribers.mjs  ← one-time CSV → Resend audience
```

## 4. Architecture overview

```
  Footer form (storefront) ──cross-origin POST──▶ newsletter app  /api/subscribe
                                                        │ add contact (pending) ─▶ Resend Audience
                                                        └ send confirm email (signed link)
  Confirm link click ─────────────────────────▶ /api/confirm  ── flip to active ─▶ Resend Audience

  Vercel Cron (weekly) ───────────────────────▶ /api/cron
                                                 • build draft from catalog (lib/newsletter.js)
                                                 • SAVE structured draft ─▶ Vercel KV
                                                 • email owner: "draft ready — open the dashboard"

  Owner ─login─▶ Dashboard (/)  ── GET /api/draft ◀─ Vercel KV
                     • edit subject / news / spotlight / tip  ── PUT /api/draft ─▶ Vercel KV (auto-save)
                     • live email preview
                     • [Send test] ─▶ /api/send ─▶ Resend ─▶ garvbahl37@gmail.com ONLY
                     • [Send to subscribers] ─▶ /api/send ─▶ Resend broadcast ─▶ Audience
                                                        (unsubscribe link auto-injected)

  One-time: node scripts/import-subscribers.mjs --audience <id> existing.csv ─▶ Resend Audience
```

## 5. Components

Each unit has one purpose, a defined interface, and is independently testable.

### 5.1 `lib/newsletter.js` — pure builder/renderer (no I/O)
- **build(products, weekNumber):** deterministically selects the **product spotlight** and **category highlight** (rotate by ISO week so each week differs and is reproducible) and a **trade tip** from a curated array. Returns the default **structured draft fields** `{ subject, news: "", spotlightHandle, categorySlug, tipId }`.
- **render(fields, products):** turns fields into a responsive, email-safe **`{ subject, html, text }`**.
- **Why pure:** no network/secrets → unit-testable with a fixed `weekNumber`/fields.

### 5.2 `app/api/cron/route.js` — weekly auto-draft (cron target)
- **In:** `GET` from Vercel Cron (verify Vercel's `CRON_SECRET`).
- **Does:** `build()` the draft → **save to Vercel KV** under `draft:current` (only if not already sent this week) → email the owner "draft ready — open the dashboard."
- **Out:** `200 { saved: true }`. Never sends to subscribers.

### 5.3 `app/api/draft/route.js` — draft read/write (Vercel KV)
- **GET:** returns `draft:current` from KV; if missing, builds a fresh one on the fly and returns it (so the dashboard always has something).
- **PUT:** validates and saves edited fields (`subject`, `news`, `spotlightHandle`, `tipId`) back to KV. Auto-save (debounced) from the dashboard.
- **Auth:** requires the dashboard session cookie.

### 5.4 `app/api/send/route.js` — send test / send live
- **In:** `POST { mode: "test" | "live" }`, session-cookie protected.
- **Does:** loads the KV draft → `render()` → creates a Resend broadcast.
  - `mode: "test"` → sends to **`TEST_RECIPIENT`** (`garvbahl37@gmail.com`) only.
  - `mode: "live"` → sends the broadcast to the whole audience; marks the KV draft `status: "sent"`.
- **Out:** `200 { id }`; `409` if the current draft is already `sent` (guards double-send).

### 5.5 `app/api/subscribe/route.js` — capture a subscriber (CORS)
- **In:** `POST { email }` from the storefront footer (cross-origin → **CORS allow the storefront origin**, handle `OPTIONS` preflight).
- **Does:** validate email; create a Resend contact flagged **pending** (`unsubscribed: true`, §7); send a confirmation email with a signed confirm link.
- **Out:** generic `200 { ok: true }` (no email enumeration); `400` on invalid input.

### 5.6 `app/api/confirm/route.js` — complete double opt-in
- **In:** `GET /api/confirm?email=…&sig=…`.
- **Does:** recompute `HMAC_SHA256(email, NEWSLETTER_SECRET)`; if it matches, set the contact `unsubscribed: false`.
- **Out:** tiny branded HTML page — "You're confirmed ✓" or "Link invalid."

### 5.7 `app/api/login/route.js` + `login/page.jsx` — dashboard auth
- Single **`DASHBOARD_PASSWORD`** env var. Correct password → set a signed session cookie (HMAC with `NEWSLETTER_SECRET`). A tiny middleware protects `/` and the mutating API routes. The dashboard can email the whole list, so it must not be open.

### 5.8 `scripts/import-subscribers.mjs` — one-time list import
- **In:** a CSV (`email`, optional `first_name`), run locally once.
- **Does:** create each contact **active** (existing subscribers already consented). Idempotent; per-row try/catch. Refuses to run without an explicit `--audience <id>`.

### 5.9 Footer form wiring — `storefront/src/sections/Footer.jsx`
- Replace the fake `onSubmit` (`setSent(true)` only) with a real `POST` to `${VITE_NEWSLETTER_API}/api/subscribe`; keep the existing "✓ check your inbox" success state (now truthful — the confirm email), add an inline error state. `VITE_NEWSLETTER_API` = the newsletter app's deployed URL.

## 6. Sharing the product catalog

The dashboard/builder needs product data, but lives in a **separate** Vercel project from the storefront. To avoid a fragile cross-project import, `newsletter/data/catalog.js` holds a **copy of the product data** (name, handle, price, image URL, category, badge). Product images are referenced by **absolute URLs** on the live storefront domain so they render in email clients. A short note in both files points at the other; the plan defines a tiny sync step (copy script or manual) so they don't silently drift.

## 7. Double opt-in without a contact database

Resend has no built-in "pending confirmation" state, and we keep **no self-managed contact DB**. Reuse the contact's own `unsubscribed` flag as the pending state:

- **Pending** = contact created `unsubscribed: true`. Broadcasts skip unsubscribed contacts, so a pending person can't receive the newsletter yet.
- **Confirm link** = `/api/confirm?email=…&sig=…`, `sig = HMAC_SHA256(email, NEWSLETTER_SECRET)`. Stateless — the signature *is* the proof of intent.
- **Active** = on valid confirm, set `unsubscribed: false`.

(Vercel KV stores only the *draft*, never contacts — contacts always live in Resend.)

## 8. Configuration & secrets

All in the **newsletter project's Vercel environment variables** (never committed):

| Var | Purpose |
|---|---|
| `RESEND_API_KEY` | Resend auth |
| `RESEND_AUDIENCE_ID` | Which audience to read/write |
| `NEWSLETTER_SECRET` | HMAC for confirm links **and** the session cookie |
| `DASHBOARD_PASSWORD` | Gate to the dashboard |
| `OWNER_EMAIL` | Where the weekly "draft ready" notice goes |
| `TEST_RECIPIENT` | `garvbahl37@gmail.com` — the only address test sends may reach |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Vercel KV connection (auto-added by the KV integration) |
| `CRON_SECRET` | Vercel-provided; verifies cron calls to `/api/cron` |
| `ALLOWED_ORIGIN` | The storefront origin allowed to POST to `/api/subscribe` (CORS) |

Storefront gets one build-time var: `VITE_NEWSLETTER_API` (the newsletter app URL).

**`newsletter/vercel.json`:** a `crons` entry → `/api/cron`, weekly (Monday morning AEST, expressed in UTC — exact cron expression finalized in the plan).

## 9. Error handling

- **`/api/subscribe`**: invalid email → `400`; Resend failure → `502` + log, generic message; duplicate → treat as success (idempotent, no enumeration); CORS preflight handled.
- **`/api/confirm`**: bad signature → friendly "invalid link" page (`400`); already-confirmed → show success (idempotent).
- **`/api/draft`**: unauthenticated → `401`; malformed fields → `400`.
- **`/api/send`**: unauthenticated → `401`; draft already `sent` → `409`; Resend failure → `502` + log; `mode:"test"` can never target the audience.
- **`/api/cron`**: bad `CRON_SECRET` → `401`; build/KV failure → `502` + log, owner notice skipped.
- **Import script**: per-row try/catch; a bad row is logged and counted, never aborts the run.

## 10. Testing strategy

- **Unit (pure):** `lib/newsletter.js` `build`/`render` — fixed `products` + `weekNumber` → assert spotlight/tip rotation and that the HTML contains the expected sections + news slot. No network.
- **Signature:** confirm-link + session-cookie HMAC round-trip; tampered values rejected.
- **Integration (safe):** with the **Send test** button / Resend sandbox, confirm the email arrives **only** at `garvbahl37@gmail.com`. Never send to the imported audience during dev.
- **Manual:** footer form on a preview deploy → confirm email → click → contact flips to active in Resend; dashboard edit persists across reload (KV).

## 11. Out of scope (YAGNI)

- Open/click analytics dashboards (Resend shows basic stats).
- A/B subject testing, segmentation, drip sequences, multi-user accounts.
- Rich WYSIWYG/CMS authoring (the dashboard edits a fixed set of structured fields + a free-text news block).

## 12. Operational prerequisites (for the plan, not blockers to writing code)

1. Free **Resend account** + API key; create one **Audience**; note its ID.
2. Add the **Vercel KV** integration to the newsletter project (auto-populates the KV env vars).
3. Verify **hooknloop.com.au** in Resend (add ~3 DNS records) for real-domain sends. **Not required for testing** (sandbox domain covers dev).
4. Export the **existing subscriber list to CSV** (`email`, optional `first_name`) for the one-time import.
5. Choose a **`DASHBOARD_PASSWORD`** and set the newsletter env vars in Vercel.
