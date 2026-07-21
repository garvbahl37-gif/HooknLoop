# HooknLoop — storefront redesign

A premium React + Vite redesign of hooknloop.com.au. The app lives in
[`storefront/`](storefront/); a developer handoff (before → after, with specs)
is in [`storefront/handoff/`](storefront/handoff/).

## Local development

```bash
cd storefront
npm install
npm run dev      # http://localhost:5199
```

## Deploy to Vercel

The repo is Vercel-ready via [`vercel.json`](vercel.json) at the root — no
dashboard configuration required.

1. Push to GitHub (already at `garvbahl37-gif/HooknLoop`).
2. In Vercel, **Add New → Project** and import the repo.
3. Deploy. Vercel reads `vercel.json` and:
   - installs + builds in `storefront/` (`npm run build`)
   - serves the static build from `storefront/dist`
   - rewrites all routes to `index.html` (SPA)

Or run a production build locally:

```bash
cd storefront && npm run build     # output in storefront/dist
```

## Stack

React 18 · Vite 5 · hash-based routing · localStorage cart & wishlist.
Design tokens live in `storefront/src/styles/tokens.css`.
