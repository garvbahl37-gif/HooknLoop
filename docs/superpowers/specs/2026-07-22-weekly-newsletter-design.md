# HooknLoop Weekly Newsletter — Design Spec

**Date:** 2026-07-22
**Status:** Approved — building
**Author:** brainstormed with the HooknLoop owner

## 1. Goal

A **weekly newsletter** for HooknLoop that:

- runs on a **hosted service** and fires on schedule **even when the owner's Mac is off**;
- **auto-assembles a draft** from live store data each week, which the owner **reviews, edits, and sends** from a **custom dashboard they own** (a human gate — nothing ships unseen);
- grows its audience from **three sources**: a one-time/again **CSV upload** (done from the dashboard), the now-real **footer signup form**, and **Shopify customers** who opted into email marketing;
- pulls **product content from the Shopify backend** so the newsletter reflects real, current products and genuine new arrivals;
- shows **incoming signups on the dashboard** as they happen;
- lives **entirely as code in this repo** — no Claude Artifacts, no published pages.

## 1a. Delivery model (demo repo → developer connects Shopify)

The storefront in this repo is a **demo**; the real HooknLoop store is the live Shopify site. So the Shopify integration is delivered as a **clean, documented interface the developer connects**, not a live wiring:

- I build the full newsletter app + the **Vercel API endpoints** (`/api/shopify/sync-customers`, plus the `lib/shopify.js` adapter with `getProducts` / `getMarketingCustomers`) and document their exact request/response contracts.
- The **demo runs immediately** on the fallback: product content from `data/catalog.js`, and an empty/mock customer source — so nothing is blocked on Shopify credentials.
- The **developer connects the real Shopify account** by setting `SHOPIFY_*` env vars (and, if needed, completing the adapter's Admin-API calls exactly where marked). No code re-architecture — just plug in credentials at the documented seam.
- `HANDOFF.md` spells out every endpoint, env var, and the one adapter file to point at Shopify.

## 2. Decisions (locked during brainstorming)

| Decision | Choice | Rationale |
|---|---|---|
| Where it runs | **Vercel** | No new platform; nothing depends on the owner's laptop |
| Dashboard + API | **A new `newsletter/` Next.js app**, its **own separate Vercel project** | One folder = dashboard UI + API routes + cron in one deploy |
| Scheduler | **Vercel Cron** | Native, config-only, weekly |
| Email service | **Resend** | Free tier; stores the audience; auto-injects unsubscribe |
| Subscriber storage | **Resend Audience** (source of truth for contacts) | No self-managed contact DB |
| Draft storage | **Vercel KV** (Upstash Redis via Vercel Marketplace) | Persist the owner's edits between visits |
| **Product content source** | **Shopify Admin API** (live products/new-arrivals), with the **static catalog copy as fallback** | Newsletter reflects the real store; degrades gracefully if Shopify is unconfigured/unreachable |
| **Audience sources** | **CSV upload (dashboard) + footer form + Shopify marketing-opted customers** | All land in the one Resend audience (deduped by email) |
| Content model | **Auto-assembled draft → owner edits & sends** | Automated but quality-gated |
| Approval mechanism | **Custom dashboard the owner deploys and edits in** | Owner wanted their own simple, branded editor |
| Opt-in | **Double opt-in for the footer form, stateless** | Compliance (AU Spam Act); CSV/Shopify contacts already consented → imported active |
| **Developer deliverable** | **`newsletter/HANDOFF.md`** | The owner hands this to a developer to plug in credentials + deploy |

### Testing safety rule (hard constraint from the owner)

- **All test sends go ONLY to `garvbahl37@gmail.com`** (the account behind `garvbahl37-gif`). The real/imported audience is **never** touched during development.
- Enforced two ways: the dashboard **"Send test"** button + a **`TEST_RECIPIENT`** env var are hard-locked to that address; and until the domain is verified, Resend's **sandbox domain** only delivers to the owner's own verified email.

## 3. Repo layout

```
HooknLoop:MyTapeStore/
├── storefront/                 ← existing shop (unchanged, except the footer form is wired)
│   └── src/sections/Footer.jsx ← real POST to the newsletter app's /api/subscribe (cross-origin)
│
├── newsletter/                 ← NEW self-contained Next.js app · its own Vercel project
│   ├── app/
│   │   ├── login/page.jsx           ← password gate
│   │   ├── page.jsx                 ← THE DASHBOARD (protected): draft editor + preview,
│   │   │                              Subscribers list, CSV import, "Sync from Shopify"
│   │   └── api/
│   │       ├── login/route.js       ← check DASHBOARD_PASSWORD → signed cookie
│   │       ├── subscribe/route.js   ← footer form target (CORS)
│   │       ├── confirm/route.js     ← double opt-in link
│   │       ├── subscribers/route.js ← GET audience contacts (for the dashboard list)
│   │       ├── import/route.js      ← POST CSV upload → add contacts (active)
│   │       ├── draft/route.js       ← GET current draft / PUT edits (Vercel KV)
│   │       ├── send/route.js        ← "Send test" / "Send to subscribers"
│   │       ├── shopify/
│   │       │   └── sync-customers/route.js ← pull marketing-opted customers → audience
│   │       └── cron/route.js        ← weekly: build+save draft, email the owner
│   ├── lib/
│   │   ├── newsletter.js        ← pure builder+renderer: {products, week, fields} → {subject, html, text}
│   │   ├── resend.js            ← Resend client + audience/broadcast/contact helpers
│   │   ├── shopify.js           ← Shopify Admin API: products + marketing-opted customers
│   │   ├── kv.js                ← Vercel KV read/write for the draft
│   │   └── auth.js             ← HMAC sign/verify (session cookie + confirm links)
│   ├── data/catalog.js         ← static product fallback (copy of the storefront catalog — §6)
│   ├── vercel.json             ← crons entry → /api/cron
│   └── HANDOFF.md              ← developer setup + deploy guide (§13)
│
└── scripts/import-subscribers.mjs  ← optional CLI CSV → Resend audience (same logic as /api/import)
```

## 4. Architecture overview

```
  Footer form (storefront) ──cross-origin POST──▶ /api/subscribe ─▶ Resend (pending) + confirm email
  Confirm link click ───────────────────────────▶ /api/confirm   ─▶ Resend (active)

  Shopify store ──Admin API──▶ lib/shopify.js
        • products (incl. new arrivals) ─────────▶ newsletter draft content
        • marketing-opted customers ──/api/shopify/sync-customers──▶ Resend Audience (active)

  Vercel Cron (weekly) ─▶ /api/cron ─▶ build draft (Shopify products) ─▶ SAVE to Vercel KV
                                     └▶ email owner "draft ready — open the dashboard"

  Owner ─login─▶ Dashboard (/):
        • GET /api/draft ◀ Vercel KV → edit subject/news/spotlight/tip → PUT /api/draft (auto-save)
        • live email preview
        • Subscribers panel  ◀ GET /api/subscribers ◀ Resend Audience (email + pending/confirmed + count)
        • Import CSV  ─▶ POST /api/import ─▶ Resend Audience (active)
        • Sync from Shopify ─▶ POST /api/shopify/sync-customers
        • [Send test] ─▶ /api/send ─▶ garvbahl37@gmail.com ONLY
        • [Send to subscribers] ─▶ /api/send ─▶ Resend broadcast ─▶ Audience (unsubscribe auto-added)
```

## 5. Components

Each unit has one purpose, a defined interface, and is independently testable.

### 5.1 `lib/newsletter.js` — pure builder/renderer (no I/O)
- **build(products, weekNumber):** deterministically pick the **product spotlight**, a **new-arrival highlight** (most recently created Shopify product), and a **trade tip** (rotate by ISO week). Returns default structured fields `{ subject, news: "", spotlightId, newArrivalId, tipId }`.
- **render(fields, products):** → email-safe **`{ subject, html, text }`**.
- **Pure** → unit-testable with fixed inputs.

### 5.2 `lib/shopify.js` — Shopify Admin API client
- **getProducts():** fetch products (title, handle, price, image, `createdAt`) via the **GraphQL Admin API**; sort to expose new arrivals. Cached briefly. Falls back to `data/catalog.js` on error/misconfig.
- **getMarketingCustomers(sinceCursor?):** paginate customers whose `emailMarketingConsent.marketingState === "subscribed"`, returning `{ email, firstName }[]`.
- **Depends on:** `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_ADMIN_TOKEN`, `SHOPIFY_API_VERSION`. (Use **context7** for exact current Admin API syntax during implementation.)

### 5.3 `app/api/cron/route.js` — weekly auto-draft (cron target)
- `GET` from Vercel Cron (verify `CRON_SECRET`) → `build()` from Shopify products → **save to Vercel KV** `draft:current` (skip if already `sent` this week) → email owner. Never sends to subscribers.

### 5.4 `app/api/draft/route.js` — draft read/write (Vercel KV)
- **GET:** return `draft:current`; if missing, build fresh. **PUT:** validate + save edited fields. Session-cookie protected.

### 5.5 `app/api/send/route.js` — send test / send live
- `POST { mode: "test" | "live" }`, protected. Load KV draft → `render()` → Resend broadcast.
  - `"test"` → **`TEST_RECIPIENT`** only. `"live"` → whole audience, then mark draft `sent`.
- `409` if already `sent` (double-send guard).

### 5.6 `app/api/subscribe/route.js` — capture a subscriber (CORS)
- `POST { email }` from the storefront footer (CORS allow `ALLOWED_ORIGIN`, handle `OPTIONS`). Validate → create Resend contact **pending** (`unsubscribed: true`) → send confirm email (signed link). Generic `200` (no enumeration).

### 5.7 `app/api/confirm/route.js` — complete double opt-in
- `GET ?email=&sig=` → verify `HMAC_SHA256(email, NEWSLETTER_SECRET)` → set contact `unsubscribed: false` → tiny branded confirm page.

### 5.8 `app/api/subscribers/route.js` — dashboard subscriber list
- `GET` (protected) → list the Resend audience's contacts → return `{ email, status: pending|confirmed, createdAt }[]` + total count. This is how **new signups show on the dashboard**.

### 5.9 `app/api/import/route.js` — CSV upload (dashboard)
- `POST` multipart CSV (protected). Parse (`email`, optional `first_name`), create each contact **active** (CSV subscribers already consented), idempotent, per-row error capture. Returns `{ added, skipped, failed }`. Same logic is exposed as the standalone `scripts/import-subscribers.mjs`.

### 5.10 `app/api/shopify/sync-customers/route.js` — Shopify → audience
- `POST` (protected, and/or cron) → `lib/shopify.getMarketingCustomers()` → upsert each into the Resend audience as **active**. Returns `{ synced, skipped }`. Paginates; safe to re-run.

### 5.11 `app/api/login/route.js` + `login/page.jsx` — dashboard auth
- Single **`DASHBOARD_PASSWORD`** → signed session cookie (HMAC `NEWSLETTER_SECRET`). Middleware protects `/` and all mutating/reading admin routes. The dashboard can email the whole list, so it must not be open.

### 5.12 The dashboard — `app/page.jsx`
- **Draft editor** (subject, news block, spotlight/new-arrival pickers, tip) with **live email preview**; auto-saves to KV.
- **Subscribers panel**: searchable list + count, pending/confirmed badges.
- **Import CSV** drop zone → `/api/import`, shows the added/skipped/failed summary.
- **Sync from Shopify** button → `/api/shopify/sync-customers`.
- **Send test** / **Send to subscribers** buttons with a confirm step on live send.
- Branded in **HooknLoop's** look (navy/orange; reuse the storefront token values), simple and clean.

### 5.13 Footer form wiring — `storefront/src/sections/Footer.jsx`
- Replace the fake `onSubmit` with a real `POST ${VITE_NEWSLETTER_API}/api/subscribe`; keep the "✓ check your inbox" success (now truthful), add an inline error state.

## 6. Product content source

Primary = **Shopify Admin API** (`lib/shopify.getProducts`) so the newsletter shows live products, prices, and true new arrivals. **Fallback** = `newsletter/data/catalog.js`, a copy of the storefront catalog, used when Shopify is not yet configured or a fetch fails — so the newsletter is buildable/testable from day one. Product image URLs are **absolute** (live domain) so they render in email clients.

## 7. Double opt-in without a contact database

Footer signups only (CSV/Shopify contacts are pre-consented → added active). Reuse the contact's `unsubscribed` flag as the pending state: created `unsubscribed: true` (broadcasts skip them); confirm link `/api/confirm?email=&sig=` where `sig = HMAC_SHA256(email, NEWSLETTER_SECRET)` flips it to `false`. Stateless — no store. (Vercel KV holds only the draft; contacts always live in Resend.)

## 8. Configuration & secrets

Newsletter project's **Vercel env vars** (never committed):

| Var | Purpose |
|---|---|
| `RESEND_API_KEY` / `RESEND_AUDIENCE_ID` | Resend auth + audience |
| `NEWSLETTER_SECRET` | HMAC for confirm links + session cookie |
| `DASHBOARD_PASSWORD` | Dashboard gate |
| `OWNER_EMAIL` | Weekly "draft ready" notice |
| `TEST_RECIPIENT` | `garvbahl37@gmail.com` — only address test sends may reach |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Vercel KV (auto-added by the integration) |
| `SHOPIFY_STORE_DOMAIN` / `SHOPIFY_ADMIN_TOKEN` / `SHOPIFY_API_VERSION` | Shopify Admin API |
| `CRON_SECRET` | Vercel-provided; verifies cron calls |
| `ALLOWED_ORIGIN` | Storefront origin allowed to POST `/api/subscribe` |

Storefront build-time var: `VITE_NEWSLETTER_API` (newsletter app URL).

**`newsletter/vercel.json`:** `crons` → `/api/cron`, weekly (Monday morning AEST, expressed in UTC; exact expression in the plan).

## 9. Error handling

- **subscribe**: invalid → `400`; Resend fail → `502`+log, generic message; duplicate → success; CORS preflight handled.
- **confirm**: bad sig → friendly `400` page; already confirmed → success.
- **draft**: unauth → `401`; malformed → `400`.
- **send**: unauth → `401`; already `sent` → `409`; Resend fail → `502`; `test` can never hit the audience.
- **import**: per-row try/catch; bad rows counted, never abort; non-CSV → `400`.
- **shopify/sync-customers**: misconfig/unreachable → `502`+log, partial progress preserved (cursor).
- **cron**: bad `CRON_SECRET` → `401`; build/KV fail → `502`+log, owner notice skipped.

## 10. Testing strategy

- **Unit (pure):** `lib/newsletter.js` build/render with fixed inputs → assert rotation + HTML sections + news slot. `lib/auth.js` HMAC round-trip; tampered values rejected.
- **Shopify:** `lib/shopify` parsing against a recorded fixture response (no live calls in tests).
- **Integration (safe):** **Send test** / sandbox → email arrives **only** at `garvbahl37@gmail.com`. Never send to the audience in dev.
- **Manual:** footer form on a preview deploy → confirm email → contact active; CSV upload summary correct; Shopify sync adds marketing-opted customers; dashboard edit persists across reload (KV).

## 11. Out of scope (YAGNI)

- Open/click analytics dashboards (Resend shows basic stats), A/B subjects, segmentation, drip sequences, multi-user accounts, WYSIWYG authoring. Real-time Shopify **webhooks** are a documented phase-2 enhancement (manual "Sync from Shopify" covers v1).

## 12. Operational prerequisites (developer, see HANDOFF.md)

1. **Resend** account + API key; create one **Audience**; note its ID; verify `hooknloop.com.au` DNS for real sends (sandbox covers dev).
2. **Vercel KV** integration added to the newsletter project.
3. **Shopify custom app** in the store admin with `read_products` + `read_customers` scopes → Admin API token.
4. Existing subscriber **CSV** (`email`, optional `first_name`).
5. Choose `DASHBOARD_PASSWORD`; set all env vars in Vercel; set `VITE_NEWSLETTER_API` on the storefront.

## 13. Developer handoff (`newsletter/HANDOFF.md`)

A plain-markdown brief the owner gives a developer, covering: what the app is; every account to create (Resend, Vercel KV, Shopify custom app) with the exact scopes/records; the full env-var table with where each value comes from; local run (`npm install && npm run dev`); how to deploy the `newsletter/` folder as its own Vercel project; how to set `VITE_NEWSLETTER_API` on the storefront; the weekly operating routine; and the phase-2 Shopify-webhook note. No secrets committed — placeholders only.
