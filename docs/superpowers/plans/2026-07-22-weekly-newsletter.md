# HooknLoop Weekly Newsletter — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A self-contained `newsletter/` Next.js app (its own Vercel project) that auto-builds a weekly HooknLoop newsletter draft, lets the owner edit and send it from a password-gated dashboard, and captures subscribers from a CSV upload, the storefront footer form, and (via a developer-connected adapter) Shopify.

**Architecture:** Next.js 15 App Router. Pure logic (`lib/newsletter.js`, `lib/auth.js`) is I/O-free and unit-tested. External services are each wrapped in one thin module (`lib/resend.js`, `lib/kv.js`, `lib/shopify.js`) so the exact SDK/param lives in one place and Shopify/Resend are swappable seams. The demo runs on a static catalog fallback + empty customer source, so nothing is blocked on real credentials; the developer connects Shopify/Resend by setting env vars.

**Tech Stack:** Next.js 15, React 18, Node 20, `resend`, `@vercel/kv`, `papaparse` (CSV), `vitest` (tests). Storefront stays Vite/React.

## Global Constraints

- **Test sends go ONLY to `TEST_RECIPIENT` = `garvbahl37@gmail.com`.** No dev/test path may ever send to the audience.
- **No secrets in git.** All keys via Vercel env vars; `.env.local` git-ignored; docs use placeholders only.
- **No self-managed contact DB.** Contacts live in Resend; Vercel KV stores only the weekly draft.
- **Footer double opt-in is stateless** (HMAC-signed confirm link); CSV/Shopify contacts are added active (pre-consented).
- **Brand:** HooknLoop navy/orange; reuse the storefront token values. Radii tight, clean, simple.
- **Node runtime** for every route that uses `crypto`, `resend`, `@vercel/kv`, or Shopify (`export const runtime = 'nodejs'`).
- **Route responses never leak whether an email exists** (subscribe returns generic 200).

---

### Task 0: Scaffold the `newsletter/` Next.js app

**Files:**
- Create: `newsletter/package.json`, `newsletter/next.config.mjs`, `newsletter/vitest.config.mjs`, `newsletter/.gitignore`, `newsletter/.env.example`, `newsletter/app/layout.jsx`, `newsletter/app/globals.css`, `newsletter/app/page.jsx` (placeholder)

**Interfaces:**
- Produces: a runnable Next.js app (`npm run dev` on port 3100) and `npm test` (vitest) wired up.

- [ ] **Step 1: Create `newsletter/package.json`**

```json
{
  "name": "hooknloop-newsletter",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev -p 3100",
    "build": "next build",
    "start": "next start -p 3100",
    "test": "vitest run"
  },
  "dependencies": {
    "next": "^15.1.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "resend": "^4.0.0",
    "@vercel/kv": "^3.0.0",
    "papaparse": "^5.4.1"
  },
  "devDependencies": {
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `newsletter/next.config.mjs`**

```js
/** @type {import('next').NextConfig} */
export default { reactStrictMode: true }
```

- [ ] **Step 3: Create `newsletter/vitest.config.mjs`**

```js
import { defineConfig } from 'vitest/config'
export default defineConfig({ test: { environment: 'node', include: ['lib/**/*.test.js'] } })
```

- [ ] **Step 4: Create `newsletter/.gitignore` and `newsletter/.env.example`**

`.gitignore`:
```
node_modules/
.next/
.env.local
```

`.env.example` (placeholders only — copied into HANDOFF):
```
RESEND_API_KEY=re_xxx
RESEND_SEGMENT_ID=seg_xxx          # the Resend list/segment id (was "audience")
NEWSLETTER_SECRET=change-me-long-random
DASHBOARD_PASSWORD=change-me
OWNER_EMAIL=you@hooknloop.com.au
TEST_RECIPIENT=garvbahl37@gmail.com
FROM_EMAIL=onboarding@resend.dev     # sandbox until domain verified
KV_REST_API_URL=
KV_REST_API_TOKEN=
SHOPIFY_STORE_DOMAIN=
SHOPIFY_ADMIN_TOKEN=
SHOPIFY_API_VERSION=2025-01
CRON_SECRET=
ALLOWED_ORIGIN=http://localhost:5199
PUBLIC_BASE_URL=http://localhost:3100
```

- [ ] **Step 5: Create `newsletter/app/layout.jsx`, `app/globals.css`, `app/page.jsx` placeholder**

`layout.jsx`:
```jsx
import './globals.css'
export const metadata = { title: 'HooknLoop Newsletter' }
export default function RootLayout({ children }) {
  return (<html lang="en"><body>{children}</body></html>)
}
```

`globals.css` (HooknLoop tokens):
```css
:root{--navy:#0b2447;--navy-2:#12356b;--orange:#e8590c;--ink:#1b1f24;--muted:#5b6472;--ground:#f6f7f9;--line:#e3e7ee;--card:14px;--control:10px}
*{box-sizing:border-box}body{margin:0;font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:var(--ink);background:var(--ground)}
button{font:inherit;cursor:pointer;border-radius:var(--control)}
input,textarea,select{font:inherit;border:1px solid var(--line);border-radius:var(--control);padding:8px 10px;width:100%}
```

`app/page.jsx`:
```jsx
export default function Home(){ return <main style={{padding:24}}>Newsletter dashboard — see Task 11.</main> }
```

- [ ] **Step 6: Install + verify boot**

Run: `cd newsletter && npm install && npm run build`
Expected: build succeeds (one placeholder route).

- [ ] **Step 7: Commit**

```bash
git add newsletter/package.json newsletter/next.config.mjs newsletter/vitest.config.mjs newsletter/.gitignore newsletter/.env.example newsletter/app
git commit -m "feat(newsletter): scaffold Next.js app"
```

---

### Task 1: `lib/auth.js` — HMAC sign/verify (pure)

**Files:**
- Create: `newsletter/lib/auth.js`, `newsletter/lib/auth.test.js`

**Interfaces:**
- Produces:
  - `sign(value: string): string` — hex HMAC-SHA256 of `value` with `NEWSLETTER_SECRET`.
  - `verify(value: string, sig: string): boolean` — timing-safe compare.
  - `sessionCookie(): string` and `isValidSession(cookieValue: string): boolean` — signed constant `"owner"` token.

- [ ] **Step 1: Write failing test — `newsletter/lib/auth.test.js`**

```js
import { describe, it, expect, beforeAll } from 'vitest'
import { sign, verify, isValidSession, sessionCookie } from './auth.js'
beforeAll(() => { process.env.NEWSLETTER_SECRET = 'test-secret' })
describe('auth', () => {
  it('verifies a valid signature and rejects a tampered one', () => {
    const s = sign('a@b.com'); expect(verify('a@b.com', s)).toBe(true)
    expect(verify('a@b.com', s + '0')).toBe(false)
    expect(verify('x@b.com', s)).toBe(false)
  })
  it('round-trips a session cookie', () => {
    const c = sessionCookie(); expect(isValidSession(c)).toBe(true)
    expect(isValidSession('nope')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd newsletter && npx vitest run lib/auth.test.js`
Expected: FAIL (module not found / functions undefined).

- [ ] **Step 3: Implement `newsletter/lib/auth.js`**

```js
import crypto from 'node:crypto'
const secret = () => process.env.NEWSLETTER_SECRET || ''
export function sign(value) {
  return crypto.createHmac('sha256', secret()).update(String(value)).digest('hex')
}
export function verify(value, sig) {
  if (!sig) return false
  const expected = sign(value)
  const a = Buffer.from(expected), b = Buffer.from(String(sig))
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
export function sessionCookie() { return `owner.${sign('owner')}` }
export function isValidSession(cookieValue) {
  if (!cookieValue?.startsWith('owner.')) return false
  return verify('owner', cookieValue.slice('owner.'.length))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd newsletter && npx vitest run lib/auth.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add newsletter/lib/auth.js newsletter/lib/auth.test.js
git commit -m "feat(newsletter): HMAC sign/verify + session cookie"
```

---

### Task 2: `lib/newsletter.js` — draft builder + HTML renderer (pure)

**Files:**
- Create: `newsletter/lib/newsletter.js`, `newsletter/lib/newsletter.test.js`

**Interfaces:**
- Consumes: `products: {id,title,handle,price,image,url,category,createdAt}[]`.
- Produces:
  - `TIPS: string[]` (curated trade tips).
  - `build(products, weekNumber): { subject, news, spotlightId, newArrivalId, tipId }` — deterministic rotation.
  - `render(fields, products): { subject, html, text }` — email-safe HTML incl. a news block, spotlight, new-arrival, tip, and an unsubscribe placeholder token `{{unsubscribe}}` (Resend replaces it).

- [ ] **Step 1: Write failing test — `newsletter/lib/newsletter.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { build, render, TIPS } from './newsletter.js'
const products = [
  { id: '1', title: 'Self-Adhesive Roll', handle: 'a', price: '32.90', image: 'https://x/a.jpg', url: 'https://x/a', category: 'Self-Adhesive', createdAt: '2026-07-01' },
  { id: '2', title: 'Heavy-Duty Straps', handle: 'b', price: '63.00', image: 'https://x/b.jpg', url: 'https://x/b', category: 'Straps', createdAt: '2026-07-20' },
]
describe('newsletter', () => {
  it('build is deterministic per week and picks the newest product as new arrival', () => {
    const a = build(products, 30), b = build(products, 30)
    expect(a).toEqual(b)
    expect(a.newArrivalId).toBe('2')            // newest createdAt
    expect(a.tipId).toBe(30 % TIPS.length)
  })
  it('build rotates the spotlight across weeks', () => {
    expect(build(products, 30).spotlightId).not.toBe(build(products, 31).spotlightId)
  })
  it('render embeds subject, news, product titles and the unsubscribe token', () => {
    const fields = { subject: 'Hi', news: 'Big week', spotlightId: '1', newArrivalId: '2', tipId: 0 }
    const { subject, html, text } = render(fields, products)
    expect(subject).toBe('Hi')
    expect(html).toContain('Big week')
    expect(html).toContain('Self-Adhesive Roll')
    expect(html).toContain('{{unsubscribe}}')
    expect(text).toContain('Big week')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd newsletter && npx vitest run lib/newsletter.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement `newsletter/lib/newsletter.js`**

```js
export const TIPS = [
  'Clean and dry the surface before applying self-adhesive hook & loop — adhesion doubles on a degreased surface.',
  'Sew-on tape outlasts adhesive on anything that flexes or gets washed. Match it to the fabric weight.',
  'For outdoor or high-heat jobs, reach for the heavy-duty acrylic adhesive, not the standard rubber one.',
  'Dots and coins beat cutting a roll when you need hundreds of small, repeatable fixings.',
  'Reusable cable straps pay for themselves fast in a workshop — no more single-use zip ties.',
]
const byNewest = (a, b) => new Date(b.createdAt) - new Date(a.createdAt)

export function build(products, weekNumber) {
  const list = [...products]
  const spotlight = list[weekNumber % list.length]
  const newest = [...list].sort(byNewest)[0]
  return {
    subject: `HooknLoop weekly — ${spotlight?.title ?? 'trade tips & picks'}`,
    news: '',
    spotlightId: spotlight?.id ?? null,
    newArrivalId: newest?.id ?? null,
    tipId: weekNumber % TIPS.length,
  }
}

const find = (products, id) => products.find(p => p.id === id)
const card = (p, label) => !p ? '' : `
  <table role="presentation" width="100%" style="border:1px solid #e3e7ee;border-radius:14px;margin:12px 0"><tr>
    <td width="120" style="padding:12px"><img src="${p.image}" width="108" alt="${p.title}" style="border-radius:10px;display:block"></td>
    <td style="padding:12px;vertical-align:top">
      <div style="font:12px sans-serif;color:#e8590c;text-transform:uppercase;letter-spacing:.04em">${label}</div>
      <div style="font:600 16px sans-serif;color:#0b2447;margin:4px 0">${p.title}</div>
      <div style="font:14px sans-serif;color:#5b6472">From $${p.price}</div>
      <a href="${p.url}" style="display:inline-block;margin-top:8px;background:#e8590c;color:#fff;text-decoration:none;padding:8px 14px;border-radius:10px;font:600 13px sans-serif">Shop now</a>
    </td></tr></table>`

export function render(fields, products) {
  const spotlight = find(products, fields.spotlightId)
  const arrival = find(products, fields.newArrivalId)
  const tip = TIPS[fields.tipId] ?? TIPS[0]
  const html = `<!doctype html><html><body style="margin:0;background:#f6f7f9;padding:24px">
    <table role="presentation" width="600" align="center" style="background:#fff;border-radius:14px;overflow:hidden">
      <tr><td style="background:#0b2447;color:#fff;padding:20px 24px;font:700 18px sans-serif">HooknLoop</td></tr>
      <tr><td style="padding:24px">
        ${fields.news ? `<p style="font:15px sans-serif;color:#1b1f24">${fields.news}</p>` : ''}
        ${card(spotlight, 'This week&rsquo;s pick')}
        ${arrival && arrival.id !== spotlight?.id ? card(arrival, 'New arrival') : ''}
        <div style="border:1px solid #e3e7ee;border-radius:14px;padding:14px;margin-top:12px">
          <div style="font:12px sans-serif;color:#e8590c;text-transform:uppercase;letter-spacing:.04em">Trade tip</div>
          <p style="font:14px sans-serif;color:#1b1f24;margin:6px 0 0">${tip}</p>
        </div>
      </td></tr>
      <tr><td style="padding:16px 24px;background:#f6f7f9;font:12px sans-serif;color:#5b6472">
        You&rsquo;re receiving this because you subscribed at hooknloop.com.au. <a href="{{unsubscribe}}">Unsubscribe</a>.
      </td></tr>
    </table></body></html>`
  const text = `${fields.news}\n\nThis week's pick: ${spotlight?.title ?? ''} — ${spotlight?.url ?? ''}\n` +
    `${arrival ? `New arrival: ${arrival.title} — ${arrival.url}\n` : ''}\nTrade tip: ${tip}\n\nUnsubscribe: {{unsubscribe}}`
  return { subject: fields.subject, html, text }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd newsletter && npx vitest run lib/newsletter.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add newsletter/lib/newsletter.js newsletter/lib/newsletter.test.js
git commit -m "feat(newsletter): pure draft builder + email HTML renderer"
```

---

### Task 3: `data/catalog.js` fallback + `lib/shopify.js` adapter

**Files:**
- Create: `newsletter/data/catalog.js`, `newsletter/lib/shopify.js`, `newsletter/lib/shopify.test.js`

**Interfaces:**
- Produces:
  - `FALLBACK_PRODUCTS` (in `data/catalog.js`) — array in the `build()` product shape, copied from `storefront/src/data/catalog.js`, images as **absolute** `https://hooknloop.com.au/...` URLs (or the demo domain).
  - `getProducts(): Promise<Product[]>` — Shopify Admin GraphQL when `SHOPIFY_*` set, else `FALLBACK_PRODUCTS`.
  - `getMarketingCustomers(): Promise<{email,firstName}[]>` — Shopify marketing-opted customers when configured, else `[]`.
  - `mapShopifyProduct(node)` / `mapShopifyCustomer(node)` — pure mappers (tested against a fixture).

- [ ] **Step 1: Write failing test — `newsletter/lib/shopify.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { getProducts, getMarketingCustomers, mapShopifyProduct } from './shopify.js'
describe('shopify adapter', () => {
  it('falls back to local catalog when SHOPIFY env is unset', async () => {
    delete process.env.SHOPIFY_STORE_DOMAIN
    const products = await getProducts()
    expect(products.length).toBeGreaterThan(0)
    expect(products[0]).toHaveProperty('id')
    expect(products[0].image).toMatch(/^https?:\/\//)
    expect(await getMarketingCustomers()).toEqual([])
  })
  it('maps a Shopify product node to the build() shape', () => {
    const node = { id: 'gid://shopify/Product/9', title: 'X', handle: 'x', createdAt: '2026-07-20T00:00:00Z',
      onlineStoreUrl: 'https://s/x', featuredImage: { url: 'https://s/x.jpg' },
      priceRangeV2: { minVariantPrice: { amount: '12.50' } }, productType: 'Straps' }
    const p = mapShopifyProduct(node)
    expect(p).toEqual({ id: 'gid://shopify/Product/9', title: 'X', handle: 'x', price: '12.50',
      image: 'https://s/x.jpg', url: 'https://s/x', category: 'Straps', createdAt: '2026-07-20T00:00:00Z' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd newsletter && npx vitest run lib/shopify.test.js`
Expected: FAIL.

- [ ] **Step 3: Create `newsletter/data/catalog.js`** (copy from storefront; abbreviated — copy all 12 products, absolute image URLs)

```js
// Fallback product data — copy of storefront/src/data/catalog.js in the newsletter's build() shape.
// Keep in sync manually (see HANDOFF "Catalog sync"). Images are ABSOLUTE so email clients render them.
export const FALLBACK_PRODUCTS = [
  { id: 'self-adhesive-roll', title: 'Self-Adhesive Hook & Loop Roll', handle: 'self-adhesive-roll', price: '32.90',
    image: 'https://hooknloop.com.au/img/products/self-adhesive-roll-1.jpg', url: 'https://hooknloop.com.au/products/self-adhesive-roll',
    category: 'Self-Adhesive', createdAt: '2026-01-01' },
  { id: 'heavy-duty-straps', title: 'Heavy-Duty Hook & Loop Straps', handle: 'heavy-duty-straps', price: '63.00',
    image: 'https://hooknloop.com.au/img/p-strap2.png', url: 'https://hooknloop.com.au/products/heavy-duty-straps',
    category: 'Straps', createdAt: '2026-07-15' },
  // …copy the remaining 10 products from storefront/src/data/catalog.js, same shape…
]
```

- [ ] **Step 4: Implement `newsletter/lib/shopify.js`**

```js
import { FALLBACK_PRODUCTS } from '../data/catalog.js'

const configured = () => !!(process.env.SHOPIFY_STORE_DOMAIN && process.env.SHOPIFY_ADMIN_TOKEN)
const endpoint = () =>
  `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/${process.env.SHOPIFY_API_VERSION || '2025-01'}/graphql.json`

async function gql(query, variables) {
  const res = await fetch(endpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`Shopify ${res.status}`)
  const json = await res.json()
  if (json.errors) throw new Error('Shopify GraphQL error')
  return json.data
}

export function mapShopifyProduct(node) {
  return {
    id: node.id, title: node.title, handle: node.handle,
    price: node.priceRangeV2?.minVariantPrice?.amount ?? '',
    image: node.featuredImage?.url ?? '', url: node.onlineStoreUrl ?? '',
    category: node.productType ?? '', createdAt: node.createdAt,
  }
}
export function mapShopifyCustomer(node) {
  return { email: node.email, firstName: node.firstName ?? '' }
}

// DEVELOPER SEAM: verify field names against your Admin API version via context7.
const PRODUCTS_Q = `query { products(first: 24, sortKey: CREATED_AT, reverse: true) {
  nodes { id title handle createdAt productType onlineStoreUrl featuredImage { url }
          priceRangeV2 { minVariantPrice { amount } } } } }`
const CUSTOMERS_Q = `query($cursor: String) { customers(first: 100, after: $cursor) {
  nodes { email firstName emailMarketingConsent { marketingState } }
  pageInfo { hasNextPage endCursor } } }`

export async function getProducts() {
  if (!configured()) return FALLBACK_PRODUCTS
  try {
    const data = await gql(PRODUCTS_Q)
    const mapped = data.products.nodes.map(mapShopifyProduct).filter(p => p.image && p.url)
    return mapped.length ? mapped : FALLBACK_PRODUCTS
  } catch { return FALLBACK_PRODUCTS }
}

export async function getMarketingCustomers() {
  if (!configured()) return []
  const out = []; let cursor = null
  do {
    const data = await gql(CUSTOMERS_Q, { cursor })
    for (const n of data.customers.nodes)
      if (n.emailMarketingConsent?.marketingState === 'SUBSCRIBED' && n.email) out.push(mapShopifyCustomer(n))
    cursor = data.customers.pageInfo.hasNextPage ? data.customers.pageInfo.endCursor : null
  } while (cursor)
  return out
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd newsletter && npx vitest run lib/shopify.test.js`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add newsletter/data/catalog.js newsletter/lib/shopify.js newsletter/lib/shopify.test.js
git commit -m "feat(newsletter): shopify adapter with local-catalog fallback"
```

---

### Task 4: `lib/resend.js` — contacts + broadcast wrapper

**Files:**
- Create: `newsletter/lib/resend.js`, `newsletter/lib/resend.test.js`

**Interfaces:**
- Produces (all async, all target the segment in `RESEND_SEGMENT_ID`):
  - `addContact(email, { firstName?, active? }): Promise<void>` — create contact; `active` false → `unsubscribed:true` (pending).
  - `setSubscribed(email, value: boolean): Promise<void>` — flip `unsubscribed`.
  - `listContacts(): Promise<{email,status,createdAt}[]>` — `status` = `unsubscribed ? 'pending' : 'confirmed'`.
  - `sendBroadcast({ subject, html, text }, { toTestOnly: boolean }): Promise<{id}>` — test → single email to `TEST_RECIPIENT`; live → broadcast to the segment.
- Design: the Resend SDK is imported once here; if params drift, only this file changes.

- [ ] **Step 1: Write failing test — `newsletter/lib/resend.test.js`** (mock the SDK)

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
const create = vi.fn(async () => ({ data: { id: 'c1' } }))
const update = vi.fn(async () => ({ data: {} }))
const list = vi.fn(async () => ({ data: { data: [{ email: 'a@b.com', unsubscribed: true, created_at: '2026-07-01' }] } }))
const bcreate = vi.fn(async () => ({ data: { id: 'b1' } }))
const send = vi.fn(async () => ({ data: { id: 'e1' } }))
vi.mock('resend', () => ({ Resend: class { contacts = { create, update, list }; broadcasts = { create: bcreate }; emails = { send } } }))
beforeEach(() => { vi.clearAllMocks(); process.env.RESEND_SEGMENT_ID = 'seg_1'; process.env.TEST_RECIPIENT = 'garvbahl37@gmail.com'; process.env.FROM_EMAIL = 'onboarding@resend.dev' })

const load = async () => await import('./resend.js?' + Math.random())
describe('resend wrapper', () => {
  it('addContact(active:false) marks the contact unsubscribed (pending)', async () => {
    const { addContact } = await load(); await addContact('a@b.com', { active: false })
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ email: 'a@b.com', unsubscribed: true, segments: ['seg_1'] }))
  })
  it('listContacts maps unsubscribed→pending', async () => {
    const { listContacts } = await load(); const rows = await listContacts()
    expect(rows[0]).toEqual({ email: 'a@b.com', status: 'pending', createdAt: '2026-07-01' })
  })
  it('sendBroadcast test-only sends a single email to TEST_RECIPIENT and never a broadcast', async () => {
    const { sendBroadcast } = await load()
    await sendBroadcast({ subject: 'S', html: '<b>h</b>', text: 't' }, { toTestOnly: true })
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: 'garvbahl37@gmail.com' }))
    expect(bcreate).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd newsletter && npx vitest run lib/resend.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement `newsletter/lib/resend.js`**

```js
import { Resend } from 'resend'
const client = () => new Resend(process.env.RESEND_API_KEY)
const seg = () => process.env.RESEND_SEGMENT_ID
const from = () => process.env.FROM_EMAIL || 'onboarding@resend.dev'

export async function addContact(email, { firstName = '', active = true } = {}) {
  await client().contacts.create({ email, firstName, unsubscribed: !active, segments: [seg()] })
}
export async function setSubscribed(email, value) {
  await client().contacts.update({ email, segments: [seg()], unsubscribed: !value })
}
export async function listContacts() {
  const res = await client().contacts.list({ segmentId: seg(), limit: 100 })
  const rows = res.data?.data ?? []
  return rows.map(c => ({ email: c.email, status: c.unsubscribed ? 'pending' : 'confirmed', createdAt: c.created_at }))
}
export async function sendBroadcast({ subject, html, text }, { toTestOnly } = {}) {
  if (toTestOnly) {
    const r = await client().emails.send({ from: from(), to: process.env.TEST_RECIPIENT, subject: `[TEST] ${subject}`, html, text })
    return { id: r.data?.id }
  }
  const r = await client().broadcasts.create({ name: subject, from: from(), subject, html, text, segmentId: seg(), send: true })
  return { id: r.data?.id }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd newsletter && npx vitest run lib/resend.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add newsletter/lib/resend.js newsletter/lib/resend.test.js
git commit -m "feat(newsletter): resend contacts + broadcast wrapper (test-only guard)"
```

---

### Task 5: `lib/kv.js` — draft store wrapper

**Files:**
- Create: `newsletter/lib/kv.js`, `newsletter/lib/kv.test.js`

**Interfaces:**
- Produces:
  - `getDraft(): Promise<Draft|null>` — reads key `draft:current`.
  - `saveDraft(draft): Promise<void>` — writes `draft:current`.
  - `Draft` = `{ weekOf, subject, news, spotlightId, newArrivalId, tipId, status: 'draft'|'sent', updatedAt }`.
- Design: `@vercel/kv` imported once here; swap to `@upstash/redis` in this file only (documented in HANDOFF).

- [ ] **Step 1: Write failing test — `newsletter/lib/kv.test.js`** (mock @vercel/kv with an in-memory map)

```js
import { describe, it, expect, vi } from 'vitest'
const store = new Map()
vi.mock('@vercel/kv', () => ({ kv: { get: async k => store.get(k) ?? null, set: async (k, v) => { store.set(k, v) } } }))
describe('kv', () => {
  it('saves and reads back the draft', async () => {
    const { getDraft, saveDraft } = await import('./kv.js')
    expect(await getDraft()).toBeNull()
    await saveDraft({ subject: 'S', status: 'draft' })
    expect((await getDraft()).subject).toBe('S')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd newsletter && npx vitest run lib/kv.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement `newsletter/lib/kv.js`**

```js
import { kv } from '@vercel/kv'
const KEY = 'draft:current'
export async function getDraft() { return (await kv.get(KEY)) ?? null }
export async function saveDraft(draft) { await kv.set(KEY, draft) }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd newsletter && npx vitest run lib/kv.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add newsletter/lib/kv.js newsletter/lib/kv.test.js
git commit -m "feat(newsletter): vercel KV draft store wrapper"
```

---

### Task 6: Auth — `/api/login`, login page, middleware

**Files:**
- Create: `newsletter/app/api/login/route.js`, `newsletter/app/login/page.jsx`, `newsletter/middleware.js`, `newsletter/lib/session.js`

**Interfaces:**
- Consumes: `isValidSession`, `sessionCookie` (Task 1).
- Produces: `requireSession(request): Response|null` in `lib/session.js` — returns a 401 Response if the cookie is missing/invalid, else null. Cookie name `nl_session`.

- [ ] **Step 1: Implement `newsletter/lib/session.js`**

```js
import { isValidSession } from './auth.js'
export const COOKIE = 'nl_session'
export function requireSession(request) {
  const c = request.cookies?.get?.(COOKIE)?.value || parseCookie(request.headers.get('cookie'))[COOKIE]
  if (!isValidSession(c)) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  return null
}
function parseCookie(str) {
  return Object.fromEntries((str || '').split(';').map(p => p.trim().split('=').map(decodeURIComponent)).filter(a => a[0]))
}
```

- [ ] **Step 2: Implement `newsletter/app/api/login/route.js`**

```js
import { sessionCookie } from '../../../lib/auth.js'
import { COOKIE } from '../../../lib/session.js'
export const runtime = 'nodejs'
export async function POST(request) {
  const { password } = await request.json().catch(() => ({}))
  if (!password || password !== process.env.DASHBOARD_PASSWORD)
    return Response.json({ error: 'invalid' }, { status: 401 })
  const res = Response.json({ ok: true })
  res.headers.append('Set-Cookie',
    `${COOKIE}=${sessionCookie()}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=2592000`)
  return res
}
```

- [ ] **Step 3: Implement `newsletter/app/login/page.jsx`**

```jsx
'use client'
import { useState } from 'react'
export default function Login() {
  const [pw, setPw] = useState(''); const [err, setErr] = useState('')
  async function submit(e) {
    e.preventDefault()
    const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) })
    if (r.ok) location.href = '/'; else setErr('Wrong password')
  }
  return (<main style={{maxWidth:320,margin:'80px auto',padding:24}}>
    <h1 style={{color:'#0b2447'}}>HooknLoop Newsletter</h1>
    <form onSubmit={submit}>
      <input type="password" placeholder="Dashboard password" value={pw} onChange={e=>setPw(e.target.value)} />
      <button style={{marginTop:12,background:'#e8590c',color:'#fff',border:0,padding:'10px 16px'}}>Sign in</button>
      {err && <p style={{color:'#c0392b'}}>{err}</p>}
    </form></main>)
}
```

- [ ] **Step 4: Implement `newsletter/middleware.js`** (protect `/` only; APIs self-guard)

```js
import { NextResponse } from 'next/server'
import { isValidSession } from './lib/auth.js'
import { COOKIE } from './lib/session.js'
export function middleware(request) {
  if (request.nextUrl.pathname === '/' && !isValidSession(request.cookies.get(COOKIE)?.value))
    return NextResponse.redirect(new URL('/login', request.url))
  return NextResponse.next()
}
export const config = { matcher: ['/'] }
```

- [ ] **Step 5: Manual verify + commit**

Run: `cd newsletter && npm run dev`, visit `http://localhost:3100/` → redirected to `/login`; wrong password rejected; correct `DASHBOARD_PASSWORD` (set in `.env.local`) → dashboard.

```bash
git add newsletter/lib/session.js newsletter/app/api/login newsletter/app/login newsletter/middleware.js
git commit -m "feat(newsletter): password gate (login route, page, middleware)"
```

---

### Task 7: `/api/subscribe` + `/api/confirm` (footer double opt-in, CORS)

**Files:**
- Create: `newsletter/app/api/subscribe/route.js`, `newsletter/app/api/confirm/route.js`

**Interfaces:**
- Consumes: `addContact`, `setSubscribed` (Task 4); `sign`, `verify` (Task 1); Resend `emails.send` via a small inline confirm-email send.
- Produces: `POST /api/subscribe {email}` → generic 200 + CORS; `GET /api/confirm?email=&sig=` → HTML page.

- [ ] **Step 1: Implement `newsletter/app/api/subscribe/route.js`**

```js
import { Resend } from 'resend'
import { addContact } from '../../../lib/resend.js'
import { sign } from '../../../lib/auth.js'
export const runtime = 'nodejs'
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
function cors() {
  return { 'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }
}
export async function OPTIONS() { return new Response(null, { status: 204, headers: cors() }) }
export async function POST(request) {
  const { email } = await request.json().catch(() => ({}))
  if (!email || !EMAIL_RE.test(email)) return Response.json({ error: 'invalid' }, { status: 400, headers: cors() })
  try {
    await addContact(email, { active: false })
    const link = `${process.env.PUBLIC_BASE_URL}/api/confirm?email=${encodeURIComponent(email)}&sig=${sign(email)}`
    await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: process.env.FROM_EMAIL || 'onboarding@resend.dev', to: email,
      subject: 'Confirm your HooknLoop subscription',
      html: `<p>Tap to confirm you want HooknLoop trade tips &amp; price drops:</p><p><a href="${link}">Confirm subscription</a></p>`,
    })
  } catch (e) { console.error('subscribe', e) /* still generic 200: no enumeration */ }
  return Response.json({ ok: true }, { headers: cors() })
}
```

- [ ] **Step 2: Implement `newsletter/app/api/confirm/route.js`**

```js
import { setSubscribed } from '../../../lib/resend.js'
import { verify } from '../../../lib/auth.js'
export const runtime = 'nodejs'
const page = (title, body) => new Response(
  `<!doctype html><meta charset=utf-8><body style="font:16px sans-serif;max-width:420px;margin:80px auto;text-align:center;color:#1b1f24">
   <h1 style="color:#0b2447">${title}</h1><p>${body}</p></body>`,
  { headers: { 'Content-Type': 'text/html' }, status: title.includes('✓') ? 200 : 400 })
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email'), sig = searchParams.get('sig')
  if (!email || !verify(email, sig)) return page('Invalid link', 'This confirmation link is not valid.')
  try { await setSubscribed(email, true) } catch (e) { console.error('confirm', e); return page('Something went wrong', 'Please try again later.') }
  return page('You&rsquo;re confirmed ✓', 'You&rsquo;ll get the HooknLoop weekly newsletter. Welcome aboard.')
}
```

- [ ] **Step 3: Manual verify + commit**

With `.env.local` set (sandbox `FROM_EMAIL`, real `RESEND_API_KEY`/`RESEND_SEGMENT_ID`, `TEST_RECIPIENT` = your email), POST your own email and click the confirm link → contact flips to confirmed in Resend.

```bash
git add newsletter/app/api/subscribe newsletter/app/api/confirm
git commit -m "feat(newsletter): stateless double opt-in subscribe + confirm (CORS)"
```

---

### Task 8: `/api/draft` (GET/PUT) + `/api/send` (test/live)

**Files:**
- Create: `newsletter/app/api/draft/route.js`, `newsletter/app/api/send/route.js`, `newsletter/lib/week.js`

**Interfaces:**
- Consumes: `getDraft`, `saveDraft` (Task 5); `build`, `render` (Task 2); `getProducts` (Task 3); `sendBroadcast` (Task 4); `requireSession` (Task 6).
- Produces: `isoWeek(date): number` in `lib/week.js`; draft GET returns `{draft, products}`; PUT saves fields; send `POST {mode}`.

- [ ] **Step 1: Implement `newsletter/lib/week.js`**

```js
export function isoWeek(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() - day + 3)
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4))
  const fday = (firstThursday.getUTCDay() + 6) % 7
  firstThursday.setUTCDate(firstThursday.getUTCDate() - fday + 3)
  return 1 + Math.round((date - firstThursday) / (7 * 864e5))
}
```

- [ ] **Step 2: Implement `newsletter/app/api/draft/route.js`**

```js
import { getDraft, saveDraft } from '../../../lib/kv.js'
import { getProducts } from '../../../lib/shopify.js'
import { build } from '../../../lib/newsletter.js'
import { isoWeek } from '../../../lib/week.js'
import { requireSession } from '../../../lib/session.js'
export const runtime = 'nodejs'
export async function GET(request) {
  const denied = requireSession(request); if (denied) return denied
  const products = await getProducts()
  let draft = await getDraft()
  if (!draft) { draft = { ...build(products, isoWeek()), weekOf: new Date().toISOString().slice(0,10), status: 'draft', updatedAt: Date.now() }; await saveDraft(draft) }
  return Response.json({ draft, products })
}
export async function PUT(request) {
  const denied = requireSession(request); if (denied) return denied
  const body = await request.json().catch(() => ({}))
  const current = (await getDraft()) || {}
  const next = { ...current,
    subject: body.subject ?? current.subject, news: body.news ?? current.news,
    spotlightId: body.spotlightId ?? current.spotlightId, newArrivalId: body.newArrivalId ?? current.newArrivalId,
    tipId: body.tipId ?? current.tipId, status: 'draft', updatedAt: Date.now() }
  await saveDraft(next)
  return Response.json({ ok: true, draft: next })
}
```

- [ ] **Step 3: Implement `newsletter/app/api/send/route.js`**

```js
import { getDraft, saveDraft } from '../../../lib/kv.js'
import { getProducts } from '../../../lib/shopify.js'
import { render } from '../../../lib/newsletter.js'
import { sendBroadcast } from '../../../lib/resend.js'
import { requireSession } from '../../../lib/session.js'
export const runtime = 'nodejs'
export async function POST(request) {
  const denied = requireSession(request); if (denied) return denied
  const { mode } = await request.json().catch(() => ({}))
  const draft = await getDraft()
  if (!draft) return Response.json({ error: 'no draft' }, { status: 404 })
  if (mode === 'live' && draft.status === 'sent') return Response.json({ error: 'already sent' }, { status: 409 })
  const rendered = render(draft, await getProducts())
  try {
    const { id } = await sendBroadcast(rendered, { toTestOnly: mode !== 'live' })
    if (mode === 'live') await saveDraft({ ...draft, status: 'sent', updatedAt: Date.now() })
    return Response.json({ ok: true, id })
  } catch (e) { console.error('send', e); return Response.json({ error: 'send failed' }, { status: 502 }) }
}
```

- [ ] **Step 4: Manual verify + commit**

Dashboard-less check with curl (after logging in via browser and copying the `nl_session` cookie): `GET /api/draft` returns a draft; `POST /api/send {"mode":"test"}` emails only `TEST_RECIPIENT`.

```bash
git add newsletter/lib/week.js newsletter/app/api/draft newsletter/app/api/send
git commit -m "feat(newsletter): draft read/write + test/live send (double-send guard)"
```

---

### Task 9: `/api/subscribers`, `/api/import` (CSV), `/api/shopify/sync-customers`

**Files:**
- Create: `newsletter/app/api/subscribers/route.js`, `newsletter/app/api/import/route.js`, `newsletter/app/api/shopify/sync-customers/route.js`

**Interfaces:**
- Consumes: `listContacts`, `addContact` (Task 4); `getMarketingCustomers` (Task 3); `requireSession` (Task 6); `papaparse`.
- Produces: subscribers list JSON; import summary `{added,skipped,failed}`; sync summary `{synced,skipped}`.

- [ ] **Step 1: Implement `newsletter/app/api/subscribers/route.js`**

```js
import { listContacts } from '../../../lib/resend.js'
import { requireSession } from '../../../lib/session.js'
export const runtime = 'nodejs'
export async function GET(request) {
  const denied = requireSession(request); if (denied) return denied
  const contacts = await listContacts()
  return Response.json({ count: contacts.length, contacts })
}
```

- [ ] **Step 2: Implement `newsletter/app/api/import/route.js`**

```js
import Papa from 'papaparse'
import { addContact } from '../../../lib/resend.js'
import { requireSession } from '../../../lib/session.js'
export const runtime = 'nodejs'
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
export async function POST(request) {
  const denied = requireSession(request); if (denied) return denied
  const form = await request.formData()
  const file = form.get('file')
  if (!file) return Response.json({ error: 'no file' }, { status: 400 })
  const text = await file.text()
  const { data } = Papa.parse(text, { header: true, skipEmptyLines: true })
  let added = 0, skipped = 0, failed = 0
  for (const row of data) {
    const email = (row.email || row.Email || '').trim()
    if (!EMAIL_RE.test(email)) { skipped++; continue }
    try { await addContact(email, { firstName: row.first_name || '', active: true }); added++ }
    catch { failed++ }
  }
  return Response.json({ added, skipped, failed })
}
```

- [ ] **Step 3: Implement `newsletter/app/api/shopify/sync-customers/route.js`**

```js
import { getMarketingCustomers } from '../../../../lib/shopify.js'
import { addContact } from '../../../../lib/resend.js'
import { requireSession } from '../../../../lib/session.js'
export const runtime = 'nodejs'
export async function POST(request) {
  const denied = requireSession(request); if (denied) return denied
  let synced = 0, skipped = 0
  try {
    const customers = await getMarketingCustomers()
    for (const c of customers) {
      try { await addContact(c.email, { firstName: c.firstName, active: true }); synced++ } catch { skipped++ }
    }
  } catch (e) { console.error('shopify sync', e); return Response.json({ error: 'shopify unavailable' }, { status: 502 }) }
  return Response.json({ synced, skipped })
}
```

- [ ] **Step 4: Manual verify + commit**

`POST /api/import` with a 2-row CSV → summary; `GET /api/subscribers` shows them; `POST /api/shopify/sync-customers` returns `{synced:0}` in demo (no Shopify) — 200, not error.

```bash
git add newsletter/app/api/subscribers newsletter/app/api/import newsletter/app/api/shopify
git commit -m "feat(newsletter): subscribers list, CSV import, shopify customer sync"
```

---

### Task 10: `/api/cron` + `vercel.json` weekly schedule

**Files:**
- Create: `newsletter/app/api/cron/route.js`, `newsletter/vercel.json`

**Interfaces:**
- Consumes: `getProducts` (Task 3), `build` (Task 2), `saveDraft`/`getDraft` (Task 5), `isoWeek` (Task 8), Resend `emails.send`.
- Produces: weekly draft build + owner notice; cron config.

- [ ] **Step 1: Implement `newsletter/app/api/cron/route.js`**

```js
import { Resend } from 'resend'
import { getProducts } from '../../../lib/shopify.js'
import { build } from '../../../lib/newsletter.js'
import { getDraft, saveDraft } from '../../../lib/kv.js'
import { isoWeek } from '../../../lib/week.js'
export const runtime = 'nodejs'
export async function GET(request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`)
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  const weekOf = new Date().toISOString().slice(0, 10)
  const existing = await getDraft()
  if (existing && existing.weekOf === weekOf && existing.status !== 'sent')
    return Response.json({ ok: true, note: 'draft already exists' })
  const draft = { ...build(await getProducts(), isoWeek()), weekOf, status: 'draft', updatedAt: Date.now() }
  await saveDraft(draft)
  try {
    await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: process.env.FROM_EMAIL || 'onboarding@resend.dev', to: process.env.OWNER_EMAIL,
      subject: 'This week’s HooknLoop newsletter is ready',
      html: `<p>Your draft is built. <a href="${process.env.PUBLIC_BASE_URL}/">Open the dashboard</a> to review and send.</p>`,
    })
  } catch (e) { console.error('cron notice', e) }
  return Response.json({ ok: true, saved: true })
}
```

- [ ] **Step 2: Implement `newsletter/vercel.json`** (Vercel Cron sends an `Authorization: Bearer $CRON_SECRET` header automatically)

```json
{
  "crons": [{ "path": "/api/cron", "schedule": "0 23 * * 0" }]
}
```
(`0 23 * * 0` = Mon 09:00 AEST in winter (UTC+10). Adjust for AEDT in the plan-owner's discretion.)

- [ ] **Step 3: Commit**

```bash
git add newsletter/app/api/cron newsletter/vercel.json
git commit -m "feat(newsletter): weekly cron builds draft + emails owner"
```

---

### Task 11: The dashboard — `app/page.jsx`

**Files:**
- Modify: `newsletter/app/page.jsx` (replace placeholder)
- Create: `newsletter/app/dashboard.css`

**Interfaces:**
- Consumes: `/api/draft`, `/api/send`, `/api/subscribers`, `/api/import`, `/api/shopify/sync-customers`.

- [ ] **Step 1: Implement `newsletter/app/page.jsx`** (client component; editor + live preview + panels)

```jsx
'use client'
import { useEffect, useState, useCallback } from 'react'
import './dashboard.css'
export default function Dashboard() {
  const [draft, setDraft] = useState(null); const [products, setProducts] = useState([])
  const [subs, setSubs] = useState({ count: 0, contacts: [] }); const [msg, setMsg] = useState('')
  useEffect(() => { fetch('/api/draft').then(r=>r.json()).then(d=>{ setDraft(d.draft); setProducts(d.products) })
    fetch('/api/subscribers').then(r=>r.json()).then(setSubs) }, [])
  const save = useCallback(async (patch) => {
    const next = { ...draft, ...patch }; setDraft(next)
    await fetch('/api/draft', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(next) })
  }, [draft])
  async function send(mode) {
    if (mode === 'live' && !confirm('Send to ALL subscribers now?')) return
    const r = await fetch('/api/send', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ mode }) })
    const j = await r.json(); setMsg(r.ok ? (mode==='live'?'Sent to subscribers ✓':'Test sent to you ✓') : (j.error||'Failed'))
  }
  async function importCsv(e) {
    const file = e.target.files[0]; if (!file) return
    const fd = new FormData(); fd.append('file', file)
    const r = await fetch('/api/import', { method:'POST', body: fd }); const j = await r.json()
    setMsg(`Imported: ${j.added} added, ${j.skipped} skipped, ${j.failed} failed`)
    fetch('/api/subscribers').then(r=>r.json()).then(setSubs)
  }
  async function syncShopify() {
    const r = await fetch('/api/shopify/sync-customers', { method:'POST' }); const j = await r.json()
    setMsg(r.ok ? `Shopify sync: ${j.synced} added` : 'Shopify not connected yet')
    fetch('/api/subscribers').then(r=>r.json()).then(setSubs)
  }
  if (!draft) return <main className="wrap">Loading…</main>
  const preview = renderPreview(draft, products)
  return (<main className="wrap">
    <header className="top"><b>HooknLoop Newsletter</b><span>{subs.count} subscribers</span></header>
    {msg && <div className="msg">{msg}</div>}
    <div className="cols">
      <section className="editor">
        <label>Subject<input value={draft.subject||''} onChange={e=>save({subject:e.target.value})} /></label>
        <label>This week&rsquo;s news<textarea rows={4} value={draft.news||''} onChange={e=>save({news:e.target.value})} /></label>
        <label>Spotlight product
          <select value={draft.spotlightId||''} onChange={e=>save({spotlightId:e.target.value})}>
            {products.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
        <div className="row">
          <button className="ghost" onClick={()=>send('test')}>Send test to me</button>
          <button className="primary" onClick={()=>send('live')} disabled={draft.status==='sent'}>
            {draft.status==='sent'?'Already sent':'Send to subscribers'}</button>
        </div>
        <div className="tools">
          <label className="upload">Import CSV<input type="file" accept=".csv" onChange={importCsv} hidden /></label>
          <button className="ghost" onClick={syncShopify}>Sync from Shopify</button>
        </div>
      </section>
      <section className="preview"><iframe title="preview" srcDoc={preview} /></section>
    </div>
    <section className="subs">
      <h3>Subscribers</h3>
      <ul>{subs.contacts.map(c=><li key={c.email}>{c.email} <span className={c.status}>{c.status}</span></li>)}</ul>
    </section>
  </main>)
}
function renderPreview(draft, products) {
  const p = products.find(x=>x.id===draft.spotlightId)
  return `<div style="font-family:sans-serif;padding:16px">
    <div style="background:#0b2447;color:#fff;padding:12px;border-radius:10px">HooknLoop</div>
    <p>${draft.news||'<em>Add this week&rsquo;s news…</em>'}</p>
    ${p?`<div style="border:1px solid #e3e7ee;border-radius:12px;padding:10px"><b>${p.title}</b><br>From $${p.price}</div>`:''}</div>`
}
```

- [ ] **Step 2: Implement `newsletter/app/dashboard.css`**

```css
.wrap{max-width:1000px;margin:0 auto;padding:20px}
.top{display:flex;justify-content:space-between;align-items:center;color:#0b2447;border-bottom:1px solid #e3e7ee;padding-bottom:12px}
.msg{background:#fff4ec;border:1px solid #f3c9a8;color:#8a3a0c;padding:8px 12px;border-radius:10px;margin:12px 0}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px}
@media(max-width:820px){.cols{grid-template-columns:1fr}}
.editor label{display:block;margin-bottom:12px;font:600 13px sans-serif;color:#5b6472}
.editor input,.editor textarea,.editor select{margin-top:4px}
.row{display:flex;gap:10px;margin-top:8px}
.tools{display:flex;gap:10px;margin-top:16px;border-top:1px solid #e3e7ee;padding-top:16px}
.primary{background:#e8590c;color:#fff;border:0;padding:10px 16px}
.ghost{background:#fff;border:1px solid #e3e7ee;padding:10px 16px;color:#0b2447}
.upload{background:#fff;border:1px solid #e3e7ee;padding:10px 16px;border-radius:10px;cursor:pointer;color:#0b2447;font:600 13px sans-serif}
.preview iframe{width:100%;height:520px;border:1px solid #e3e7ee;border-radius:12px;background:#fff}
.subs{margin-top:24px}.subs ul{list-style:none;padding:0;columns:2}.subs li{padding:4px 0}
.subs .pending{color:#b45309;font-size:12px}.subs .confirmed{color:#3d6456;font-size:12px}
```

- [ ] **Step 3: Manual verify + commit**

Run: `cd newsletter && npm run dev` → dashboard loads the draft, edits auto-save, "Send test to me" reaches only your inbox, CSV import + subscriber list work.

```bash
git add newsletter/app/page.jsx newsletter/app/dashboard.css
git commit -m "feat(newsletter): dashboard — editor, preview, send, import, subscribers"
```

---

### Task 12: Wire the storefront footer form

**Files:**
- Modify: `storefront/src/sections/Footer.jsx`
- Modify: `storefront/.env.example` (create if absent) — document `VITE_NEWSLETTER_API`

**Interfaces:**
- Consumes: `POST ${VITE_NEWSLETTER_API}/api/subscribe`.

- [ ] **Step 1: Read the current form** — Run: `grep -n "ft__signup" storefront/src/sections/Footer.jsx`

- [ ] **Step 2: Replace the fake submit** — change the `onSubmit` to POST the email, keeping the existing `sent` success UI:

```jsx
// state already has: const [sent, setSent] = useState(false)
const [error, setError] = useState('')
async function handleSubscribe(e) {
  e.preventDefault()
  const email = e.target.querySelector('input[type=email]').value
  try {
    const base = import.meta.env.VITE_NEWSLETTER_API || ''
    const r = await fetch(`${base}/api/subscribe`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
    })
    if (r.ok) setSent(true); else setError('Please check your email and try again.')
  } catch { setError('Something went wrong — try again.') }
}
// <form className="ft__signup" onSubmit={handleSubscribe}> … {error && <p className="ft__signup-err">{error}</p>}
```

- [ ] **Step 3: Document the env var** — `storefront/.env.example`:

```
VITE_NEWSLETTER_API=https://your-newsletter-app.vercel.app
```

- [ ] **Step 4: Manual verify + commit**

Run the storefront (`cd storefront && npm run dev`) with `VITE_NEWSLETTER_API` pointing at the local newsletter app; submit the footer form → confirm email arrives.

```bash
git add storefront/src/sections/Footer.jsx storefront/.env.example
git commit -m "feat(storefront): wire footer signup to newsletter /api/subscribe"
```

---

### Task 13: `newsletter/HANDOFF.md` — developer setup + deploy guide

**Files:**
- Create: `newsletter/HANDOFF.md`

- [ ] **Step 1: Write `newsletter/HANDOFF.md`** covering, with no real secrets (placeholders only):
  1. **What this is** — a Next.js app deployed as its own Vercel project; the storefront is a separate demo.
  2. **Accounts to create:** Resend (API key + one Audience/Segment → `RESEND_SEGMENT_ID`; verify `hooknloop.com.au` DNS for real sends); Vercel KV integration (auto-adds `KV_REST_API_*`); Shopify **custom app** with `read_products` + `read_customers` → `SHOPIFY_ADMIN_TOKEN`, plus `SHOPIFY_STORE_DOMAIN`.
  3. **Env var table** — every var from `.env.example`, what it is, where to get it.
  4. **Connect Shopify** — set the `SHOPIFY_*` vars; the seam is `newsletter/lib/shopify.js` (verify GraphQL field names for your API version via context7); nothing else changes. Until set, the app uses `data/catalog.js` + returns 0 customers.
  5. **Deploy** — import the repo in Vercel, set **Root Directory = `newsletter/`**, add all env vars, deploy. Cron runs automatically from `vercel.json`.
  6. **Point the storefront at it** — set `VITE_NEWSLETTER_API` on the storefront project to the newsletter app URL; set `ALLOWED_ORIGIN` on the newsletter app to the storefront origin.
  7. **Weekly routine** — Monday you get "draft ready"; open the dashboard, edit, **Send test to me** first (only ever reaches `TEST_RECIPIENT`), then **Send to subscribers**.
  8. **Go-live checklist** — verify domain in Resend, switch `FROM_EMAIL` off the sandbox, set a strong `DASHBOARD_PASSWORD` and long random `NEWSLETTER_SECRET`.
  9. **Phase 2** — Shopify webhooks (`customers/create|update`) → `/api/shopify/sync-customers` for real-time sync instead of the manual button.
  10. **Catalog sync** — how `data/catalog.js` mirrors `storefront/src/data/catalog.js`.

- [ ] **Step 2: Commit**

```bash
git add newsletter/HANDOFF.md
git commit -m "docs(newsletter): developer setup + deploy handoff"
```

---

## Self-Review

**Spec coverage:** goal/§1 → all tasks; delivery model §1a → Task 3 (fallback) + Task 13; dashboard §5.12 → Task 11; subscribers list §5.8 → Task 9 + Task 11; CSV upload §5.9 → Task 9 + Task 11; Shopify products §5.2/§6 → Task 3; Shopify customers §5.10 → Task 9; double opt-in §7 → Task 7; draft store §5.4 → Tasks 5, 8; send §5.5 → Task 8; auth §5.11 → Task 6; cron §5.3 → Task 10; footer §5.13 → Task 12; env/secrets §8 → Task 0 + Task 13; handoff §13 → Task 13. **Test-only-to-`garvbahl37@gmail.com`** enforced in `lib/resend.js` (Task 4) and exercised in Task 8/11.

**Placeholder scan:** the only intentionally-deferred items are the remaining 10 fallback products (Task 3, explicit "copy from storefront") and the exact AEDT cron offset (Task 10) — both are copy/adjust actions with the source named, not logic gaps.

**Type consistency:** product shape `{id,title,handle,price,image,url,category,createdAt}` is identical across `newsletter.js`, `shopify.js`, `catalog.js`, draft routes, and the dashboard. Draft shape `{weekOf,subject,news,spotlightId,newArrivalId,tipId,status,updatedAt}` is identical across `kv.js`, `draft`, `send`, `cron`, and the dashboard. `sendBroadcast(rendered, {toTestOnly})`, `addContact(email,{firstName,active})`, `listContacts()→{email,status,createdAt}` match every call site.
