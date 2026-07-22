// Fallback product data — a copy of storefront/src/data/catalog.js in the newsletter's build() shape.
// Used whenever Shopify is not configured or a fetch fails, so the newsletter is buildable from day one.
// IMAGES are hosted on THIS app (newsletter/public/img/...) so email clients load them from an
// absolute URL. PRODUCT LINKS point at the live store. Keep in sync with the storefront catalog.

// Where the newsletter's own hosted assets (logo + product photos) live. Update if the domain changes.
export const ASSET_BASE = 'https://hooknloop-newsletter.vercel.app'
// Where "Shop now" links go — the live store.
export const SHOP_BASE = 'https://hooknloop.com.au'

const img = (file) => `${ASSET_BASE}/img/products/${file}`
const url = (handle) => `${SHOP_BASE}/products/${handle}`

export const FALLBACK_PRODUCTS = [
  { id: 'self-adhesive-roll', title: 'Self-Adhesive Hook & Loop Roll', handle: 'self-adhesive-roll', price: '32.90',
    image: img('self-adhesive-roll-1.jpg'), url: url('self-adhesive-roll'), category: 'Self-Adhesive', createdAt: '2026-01-05' },
  { id: 'sew-on', title: 'Sew-On Hook & Loop (Non-Adhesive)', handle: 'sew-on', price: '24.46',
    image: img('sew-on-1.jpg'), url: url('sew-on'), category: 'Sew-On', createdAt: '2026-01-12' },
  { id: 'hook-and-loop-dots', title: 'Self-Adhesive Hook & Loop Dots', handle: 'hook-and-loop-dots', price: '66.74',
    image: img('hook-and-loop-dots-1.jpg'), url: url('hook-and-loop-dots'), category: 'Dots & Coins', createdAt: '2026-02-01' },
  { id: 'reusable-cable-straps', title: 'Reusable Hook & Loop Cable Straps', handle: 'reusable-cable-straps', price: '25.00',
    image: img('reusable-cable-straps-1.png'), url: url('reusable-cable-straps'), category: 'Straps & Cable Ties', createdAt: '2026-02-18' },
  { id: 'double-sided', title: 'Double-Sided Hook & Loop (Back-to-Back)', handle: 'double-sided', price: '21.66',
    image: img('double-sided-1.png'), url: url('double-sided'), category: 'Double-Sided', createdAt: '2026-03-03' },
  { id: 'heavy-duty-straps', title: 'Heavy-Duty Hook & Loop Straps', handle: 'heavy-duty-straps', price: '63.00',
    image: img('heavy-duty-straps-1.png'), url: url('heavy-duty-straps'), category: 'Straps & Cable Ties', createdAt: '2026-03-22' },
  { id: 'heavy-duty-adhesive', title: 'Heavy-Duty Adhesive Hook & Loop', handle: 'heavy-duty-adhesive', price: '55.43',
    image: img('heavy-duty-adhesive-1.png'), url: url('heavy-duty-adhesive'), category: 'Self-Adhesive', createdAt: '2026-04-10' },
  { id: 'hook-and-loop-for-fabric', title: 'Hook & Loop for Fabric & Clothes', handle: 'hook-and-loop-for-fabric', price: '24.46',
    image: img('hook-and-loop-for-fabric-1.jpg'), url: url('hook-and-loop-for-fabric'), category: 'Sew-On', createdAt: '2026-05-02' },
  { id: 'velcro-brand-roll', title: 'VELCRO® Brand Self-Adhesive Roll', handle: 'velcro-brand-roll', price: '84.99',
    image: img('velcro-brand-roll-4.jpg'), url: url('velcro-brand-roll'), category: 'VELCRO® Brand', createdAt: '2026-05-28' },
  { id: 'velcoin-dots', title: 'VELCRO® Brand Velcoin Dots', handle: 'velcoin-dots', price: '115.00',
    image: img('velcoin-dots-1.jpg'), url: url('velcoin-dots'), category: 'Dots & Coins', createdAt: '2026-06-15' },
  { id: 'fire-retardant-adhesive', title: 'Fire Retardant Adhesive Hook & Loop', handle: 'fire-retardant-adhesive', price: '55.43',
    image: img('fire-retardant-adhesive-1.png'), url: url('fire-retardant-adhesive'), category: 'Fire Retardant', createdAt: '2026-07-01' },
  { id: 'fire-retardant-sew-on', title: 'Fire Retardant Sew-On Hook & Loop', handle: 'fire-retardant-sew-on', price: '32.53',
    image: img('fire-retardant-sew-on-1.png'), url: url('fire-retardant-sew-on'), category: 'Fire Retardant', createdAt: '2026-07-18' },
]
