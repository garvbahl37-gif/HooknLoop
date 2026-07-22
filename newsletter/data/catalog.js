// Fallback product data — a copy of storefront/src/data/catalog.js in the newsletter's build() shape.
// Used whenever Shopify is not configured or a fetch fails, so the newsletter is buildable from day one.
// Keep in sync manually with the storefront catalog (see HANDOFF "Catalog sync").
// Image + product URLs are ABSOLUTE (live domain) so email clients render them.
const BASE = 'https://hooknloop.com.au'
const img = (p) => `${BASE}${p}`
const url = (handle) => `${BASE}/products/${handle}`

export const FALLBACK_PRODUCTS = [
  { id: 'self-adhesive-roll', title: 'Self-Adhesive Hook & Loop Roll', handle: 'self-adhesive-roll', price: '32.90',
    image: img('/img/products/self-adhesive-roll-1.jpg'), url: url('self-adhesive-roll'), category: 'Self-Adhesive', createdAt: '2026-01-05' },
  { id: 'sew-on', title: 'Sew-On Hook & Loop (Non-Adhesive)', handle: 'sew-on', price: '24.46',
    image: img('/img/products/sew-on-1.jpg'), url: url('sew-on'), category: 'Sew-On', createdAt: '2026-01-12' },
  { id: 'hook-and-loop-dots', title: 'Self-Adhesive Hook & Loop Dots', handle: 'hook-and-loop-dots', price: '66.74',
    image: img('/img/products/hook-and-loop-dots-1.jpg'), url: url('hook-and-loop-dots'), category: 'Dots & Coins', createdAt: '2026-02-01' },
  { id: 'reusable-cable-straps', title: 'Reusable Hook & Loop Cable Straps', handle: 'reusable-cable-straps', price: '25.00',
    image: img('/img/products/reusable-cable-straps-1.png'), url: url('reusable-cable-straps'), category: 'Straps & Cable Ties', createdAt: '2026-02-18' },
  { id: 'double-sided', title: 'Double-Sided Hook & Loop (Back-to-Back)', handle: 'double-sided', price: '21.66',
    image: img('/img/p-doubleside.png'), url: url('double-sided'), category: 'Double-Sided', createdAt: '2026-03-03' },
  { id: 'heavy-duty-straps', title: 'Heavy-Duty Hook & Loop Straps', handle: 'heavy-duty-straps', price: '63.00',
    image: img('/img/p-strap2.png'), url: url('heavy-duty-straps'), category: 'Straps & Cable Ties', createdAt: '2026-03-22' },
  { id: 'heavy-duty-adhesive', title: 'Heavy-Duty Adhesive Hook & Loop', handle: 'heavy-duty-adhesive', price: '55.43',
    image: img('/img/products/heavy-duty-adhesive-1.png'), url: url('heavy-duty-adhesive'), category: 'Self-Adhesive', createdAt: '2026-04-10' },
  { id: 'hook-and-loop-for-fabric', title: 'Hook & Loop for Fabric & Clothes', handle: 'hook-and-loop-for-fabric', price: '24.46',
    image: img('/img/products/hook-and-loop-for-fabric-1.jpg'), url: url('hook-and-loop-for-fabric'), category: 'Sew-On', createdAt: '2026-05-02' },
  { id: 'velcro-brand-roll', title: 'VELCRO® Brand Self-Adhesive Roll', handle: 'velcro-brand-roll', price: '84.99',
    image: img('/img/products/velcro-brand-roll-1.webp'), url: url('velcro-brand-roll'), category: 'VELCRO® Brand', createdAt: '2026-05-28' },
  { id: 'velcoin-dots', title: 'VELCRO® Brand Velcoin Dots', handle: 'velcoin-dots', price: '115.00',
    image: img('/img/products/velcoin-dots-1.webp'), url: url('velcoin-dots'), category: 'Dots & Coins', createdAt: '2026-06-15' },
  { id: 'fire-retardant-adhesive', title: 'Fire Retardant Adhesive Hook & Loop', handle: 'fire-retardant-adhesive', price: '55.43',
    image: img('/img/p-fr.png'), url: url('fire-retardant-adhesive'), category: 'Fire Retardant', createdAt: '2026-07-01' },
  { id: 'fire-retardant-sew-on', title: 'Fire Retardant Sew-On Hook & Loop', handle: 'fire-retardant-sew-on', price: '32.53',
    image: img('/img/p-fr.png'), url: url('fire-retardant-sew-on'), category: 'Fire Retardant', createdAt: '2026-07-18' },
]
