// Fallback product + application data — mirrors the storefront catalog/industries, in the
// newsletter's shape. Used when Shopify isn't configured. IMAGES are hosted on THIS app so
// email clients load them from absolute URLs; PRODUCT LINKS point at the live store.

export const ASSET_BASE = 'https://hooknloop-newsletter.vercel.app'
export const SHOP_BASE = 'https://hooknloop.com.au'

const img = (file) => `${ASSET_BASE}/img/products/${file}`
const url = (handle) => `${SHOP_BASE}/products/${handle}`
const ind = (file) => `${ASSET_BASE}/img/industries/${file}`

export const FALLBACK_PRODUCTS = [
  { id: 'self-adhesive-roll', title: 'Self-Adhesive Hook & Loop Roll', handle: 'self-adhesive-roll', price: '32.90',
    image: img('self-adhesive-roll-1.jpg'), url: url('self-adhesive-roll'), category: 'Self-Adhesive', createdAt: '2026-01-05',
    spec: 'Peel-and-stick · industrial',
    blurb: 'Our workhorse peel-and-stick roll — a strong adhesive that grips smooth, clean surfaces straight off the reel.',
    uses: ['Signage & display', 'Panel mounting', 'Cable runs'] },
  { id: 'sew-on', title: 'Sew-On Hook & Loop (Non-Adhesive)', handle: 'sew-on', price: '24.46',
    image: img('sew-on-1.jpg'), url: url('sew-on'), category: 'Sew-On', createdAt: '2026-01-12',
    spec: 'Stitch-on · washes well',
    blurb: 'Non-adhesive tape you stitch straight to fabric — soft, flexible and it keeps its grip through the wash.',
    uses: ['Garment closures', 'Costumes', 'Upholstery'] },
  { id: 'hook-and-loop-dots', title: 'Self-Adhesive Hook & Loop Dots', handle: 'hook-and-loop-dots', price: '66.74',
    image: img('hook-and-loop-dots-1.jpg'), url: url('hook-and-loop-dots'), category: 'Dots & Coins', createdAt: '2026-02-01',
    spec: '1,000–5,000 dots per reel',
    blurb: 'Pre-cut adhesive dots on a reel — hundreds of fast, repeatable fixings without cutting down a roll.',
    uses: ['POS & display', 'Mounting cards', 'Packaging'] },
  { id: 'reusable-cable-straps', title: 'Reusable Hook & Loop Cable Straps', handle: 'reusable-cable-straps', price: '25.00',
    image: img('reusable-cable-straps-1.png'), url: url('reusable-cable-straps'), category: 'Straps & Cable Ties', createdAt: '2026-02-18',
    spec: '20 per pack · reusable',
    blurb: 'Self-gripping straps that reuse again and again — no more single-use zip ties around the workshop.',
    uses: ['Cable bundling', 'Cord management', 'Tool storage'] },
  { id: 'double-sided', title: 'Double-Sided Hook & Loop (Back-to-Back)', handle: 'double-sided', price: '21.66',
    image: img('double-sided-1.png'), url: url('double-sided'), category: 'Double-Sided', createdAt: '2026-03-03',
    spec: 'Self-gripping · no adhesive',
    blurb: 'Back-to-back tape that grips itself — wrap and secure with no adhesive and no sticky residue.',
    uses: ['Cable wrap', 'Bundling', 'Plant ties'] },
  { id: 'heavy-duty-straps', title: 'Heavy-Duty Hook & Loop Straps', handle: 'heavy-duty-straps', price: '63.00',
    image: img('heavy-duty-straps-1.png'), url: url('heavy-duty-straps'), category: 'Straps & Cable Ties', createdAt: '2026-03-22',
    spec: '50mm × 5m · set of 5',
    blurb: 'Wide, heavy-duty straps for loads that move — trailers, cargo and gear that has to stay put.',
    uses: ['Cargo & load', 'Trailers & utes', 'Equipment'] },
  { id: 'heavy-duty-adhesive', title: 'Heavy-Duty Adhesive Hook & Loop', handle: 'heavy-duty-adhesive', price: '55.43',
    image: img('heavy-duty-adhesive-1.png'), url: url('heavy-duty-adhesive'), category: 'Self-Adhesive', createdAt: '2026-04-10',
    spec: 'High-tack acrylic · heat & outdoor',
    blurb: 'High-tack acrylic adhesive built for heat, outdoors and demanding industrial surfaces.',
    uses: ['Automotive & marine', 'Outdoor signage', 'Industrial'] },
  { id: 'hook-and-loop-for-fabric', title: 'Hook & Loop for Fabric & Clothes', handle: 'hook-and-loop-for-fabric', price: '24.46',
    image: img('hook-and-loop-for-fabric-1.jpg'), url: url('hook-and-loop-for-fabric'), category: 'Sew-On', createdAt: '2026-05-02',
    spec: 'Soft & flexible · garments',
    blurb: 'A soft, flexible grade made for clothing and textiles — comfortable on skin and wash-durable.',
    uses: ['Garments', 'Adaptive clothing', 'Alterations'] },
  { id: 'velcro-brand-roll', title: 'VELCRO® Brand Self-Adhesive Roll', handle: 'velcro-brand-roll', price: '84.99',
    image: img('velcro-brand-roll-4.jpg'), url: url('velcro-brand-roll'), category: 'VELCRO® Brand', createdAt: '2026-05-28',
    spec: 'Genuine VELCRO® Brand · 25m',
    blurb: 'Genuine VELCRO® Brand self-adhesive roll — the original, stocked in Australia for jobs that demand the real thing.',
    uses: ['Trade & spec', 'Signage', 'Displays'] },
  { id: 'velcoin-dots', title: 'VELCRO® Brand Velcoin Dots', handle: 'velcoin-dots', price: '115.00',
    image: img('velcoin-dots-1.jpg'), url: url('velcoin-dots'), category: 'Dots & Coins', createdAt: '2026-06-15',
    spec: 'Genuine VELCRO® coins',
    blurb: 'Genuine VELCRO® Brand coins — precise, pre-cut fixings for work where brand and consistency matter.',
    uses: ['POS & retail', 'Displays', 'Events'] },
  { id: 'fire-retardant-adhesive', title: 'Fire Retardant Adhesive Hook & Loop', handle: 'fire-retardant-adhesive', price: '55.43',
    image: img('fire-retardant-adhesive-1.png'), url: url('fire-retardant-adhesive'), category: 'Fire Retardant', createdAt: '2026-07-01',
    spec: 'FR treated · self-adhesive',
    blurb: 'Fire-retardant self-adhesive tape for compliance-driven fit-outs and public spaces.',
    uses: ['Events & staging', 'Marine', 'Public fit-outs'] },
  { id: 'fire-retardant-sew-on', title: 'Fire Retardant Sew-On Hook & Loop', handle: 'fire-retardant-sew-on', price: '32.53',
    image: img('fire-retardant-sew-on-1.png'), url: url('fire-retardant-sew-on'), category: 'Fire Retardant', createdAt: '2026-07-18',
    spec: 'FR treated · stitch-on',
    blurb: 'Fire-retardant sew-on tape for soft furnishings and textiles that must meet fire standards.',
    uses: ['Theatre & staging', 'Marine upholstery', 'Hospitality'] },
]

// Application areas (from the storefront industry pages) — image + one-line use.
export const APPLICATIONS = [
  { name: 'Signage & Displays', image: ind('signage-displays-hero.jpg'), line: 'Mount panels, banners and POS that come down clean.', href: `${SHOP_BASE}/pages/signage-displays` },
  { name: 'Automotive, Caravan & RV', image: ind('automotive-caravan-rv-hero.jpg'), line: 'Trim, panels and gear that hold through heat and vibration.', href: `${SHOP_BASE}/pages/automotive-caravan-rv` },
  { name: 'Upholstery & Furniture', image: ind('upholstery-furniture-hero.jpg'), line: 'Removable cushion covers, seat pads and fabric panels.', href: `${SHOP_BASE}/pages/upholstery-furniture` },
  { name: 'Construction & Industrial', image: ind('construction-industrial-hero.jpg'), line: 'Cable runs, temporary fixings and heavy-duty mounting.', href: `${SHOP_BASE}/pages/construction-industrial` },
]
