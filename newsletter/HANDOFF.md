# HooknLoop Newsletter — Developer Handoff

This folder (`newsletter/`) is a **self-contained Next.js app** that runs the HooknLoop
weekly newsletter: a password-gated dashboard that auto-builds a weekly draft, lets the
owner edit and send it via **Resend**, stores the draft in **Vercel KV**, and grows the
audience from a CSV upload, the storefront footer form, and **Shopify** customers.

It deploys as **its own Vercel project**, separate from the storefront (which, in this
repo, is a demo). Your job: create the accounts, set the env vars, connect the real
Shopify store, and deploy. **No code re-architecture is required** — Shopify/Resend/KV
are each isolated behind one file in `lib/`.

---

## 1. Run it locally

```bash
cd newsletter
npm install
cp .env.example .env.local     # fill in the values below
npm run dev                    # http://localhost:3100
npm test                       # unit tests (pure logic)
```

With no credentials, the app still runs: product content comes from `data/catalog.js`
and the Shopify customer sync returns 0. You need real Resend/KV values to actually send
or persist.

---

## 2. Accounts to create

### Resend (email)
1. Create a free account at resend.com → **API Keys** → copy into `RESEND_API_KEY`.
2. Create one **Audience** (Resend's newer UI may call this a *segment*). Copy its id into
   `RESEND_SEGMENT_ID`.
3. For real sends, **verify the domain `hooknloop.com.au`** (Resend → Domains → add the
   ~3 DNS records). Until then, keep `FROM_EMAIL=onboarding@resend.dev` (the sandbox
   domain, which only delivers to your own verified account email).

> If your Resend account still uses the legacy *audience* API instead of *segments*, that
> is the **only** thing to change and it lives in one file: `lib/resend.js`
> (`segments`/`segmentId` → `audienceId`). Confirm the current param names with context7
> (`/resend/resend-node`).

### Vercel KV (draft storage)
In the Vercel project (step 4), **Storage → Create → KV** (Upstash Redis). Vercel injects
`KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically. Locally, copy those two values
into `.env.local`. (If you prefer the newer `@upstash/redis` client, swap it inside
`lib/kv.js` — the two functions `getDraft`/`saveDraft` are the whole surface.)

### Shopify (products + customers) — the part to connect
1. In the **real** store admin: **Settings → Apps and sales channels → Develop apps →
   Create an app**.
2. **Admin API scopes:** `read_products`, `read_customers`.
3. Install the app → copy the **Admin API access token** into `SHOPIFY_ADMIN_TOKEN`.
4. Set `SHOPIFY_STORE_DOMAIN` (e.g. `hooknloop.myshopify.com`) and
   `SHOPIFY_API_VERSION` (e.g. `2025-01`).
5. That's it — `lib/shopify.js` starts using the live store the moment these are set. The
   GraphQL queries are marked with a `DEVELOPER SEAM` comment; verify the field names
   against your API version via context7 (`/shopify/shopify` or the Admin API docs) if a
   query errors. Until configured, the app falls back to `data/catalog.js` and returns 0
   customers — no errors.

---

## 3. Environment variables

| Var | What it is / where to get it |
|---|---|
| `RESEND_API_KEY` | Resend → API Keys |
| `RESEND_SEGMENT_ID` | Resend audience/segment id |
| `NEWSLETTER_SECRET` | Any long random string — signs confirm links + the session cookie |
| `DASHBOARD_PASSWORD` | The password to open the dashboard |
| `OWNER_EMAIL` | Where the weekly "draft ready" notice is sent |
| `TEST_RECIPIENT` | **Keep `garvbahl37@gmail.com`** — the ONLY address "Send test" ever reaches |
| `FROM_EMAIL` | `onboarding@resend.dev` until the domain is verified, then e.g. `news@hooknloop.com.au` |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Auto-added by the Vercel KV integration |
| `SHOPIFY_STORE_DOMAIN` / `SHOPIFY_ADMIN_TOKEN` / `SHOPIFY_API_VERSION` | Shopify custom app |
| `CRON_SECRET` | Auto-provided by Vercel Cron; set the same value locally to test `/api/cron` |
| `ALLOWED_ORIGIN` | The storefront origin allowed to POST `/api/subscribe` (CORS), e.g. `https://hooknloop.com.au` |
| `PUBLIC_BASE_URL` | This app's own URL — used to build confirm/dashboard links |

Never commit real values. `.env.local` is git-ignored; `.env.example` holds placeholders.

---

## 4. Deploy to Vercel

1. **Add New → Project** → import this repo.
2. Set **Root Directory = `newsletter/`** (important — it's not the repo root).
3. Add every env var from the table above (Project → Settings → Environment Variables).
4. Add the **KV** store (Storage tab) — it wires `KV_REST_API_*` for you.
5. Deploy. The weekly cron is already declared in `newsletter/vercel.json`
   (`/api/cron`, `0 23 * * 0` = Mon 09:00 AEST in winter — adjust for AEDT if you want a
   fixed local time year-round).

### Point the storefront at it
- On the **storefront** project set `VITE_NEWSLETTER_API` = this app's URL.
- On **this** app set `ALLOWED_ORIGIN` = the storefront's URL.

---

## 5. API endpoints (reference)

| Method + path | Auth | Purpose |
|---|---|---|
| `POST /api/subscribe` | public (CORS) | Footer form → add pending contact + confirm email |
| `GET /api/confirm?email=&sig=` | signed link | Double opt-in → mark contact active |
| `GET /api/draft` / `PUT /api/draft` | session | Read / save the current draft (Vercel KV) |
| `POST /api/send` `{mode:"test"\|"live"}` | session | Test → you only; live → broadcast to audience |
| `GET /api/subscribers` | session | List audience contacts + count (dashboard) |
| `POST /api/import` (multipart CSV) | session | Bulk-add contacts from a CSV |
| `POST /api/shopify/sync-customers` | session | Pull marketing-opted Shopify customers → audience |
| `GET /api/cron` | `CRON_SECRET` | Weekly: build+save draft, email the owner |
| `POST /api/login` | password | Sets the dashboard session cookie |

---

## 6. Weekly operating routine (for the owner)

1. Monday you get a **"draft ready"** email → open the dashboard (`PUBLIC_BASE_URL`).
2. Edit the subject, the "this week's news" block, and pick the spotlight product.
3. Click **Send test to me** — it goes only to `TEST_RECIPIENT`. Check it looks right.
4. Click **Send to subscribers**. Done. Unsubscribes are handled by Resend automatically.

Grow the list any time from the dashboard: **Import CSV** or **Sync from Shopify**.

---

## 7. Go-live checklist

- [ ] Verify `hooknloop.com.au` in Resend; switch `FROM_EMAIL` off the sandbox.
- [ ] Set a strong `DASHBOARD_PASSWORD` and a long random `NEWSLETTER_SECRET`.
- [ ] Connect Shopify (`SHOPIFY_*`) and run **Sync from Shopify** once.
- [ ] Import the existing subscriber CSV (`email`, optional `first_name`).
- [ ] Confirm a test send reaches only `TEST_RECIPIENT`, then do a real send.

---

## 8. Phase 2 (optional)

- **Real-time Shopify sync:** register Shopify webhooks `customers/create` and
  `customers/update` pointing at a small webhook route that calls the same
  `addContact()` — replaces the manual "Sync from Shopify" button.
- **Catalog sync:** `data/catalog.js` mirrors `storefront/src/data/catalog.js` for the
  fallback. Once Shopify products are live this is rarely used, but keep it roughly in
  sync (or delete it and require Shopify).
