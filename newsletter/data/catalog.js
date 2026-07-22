// Fallback product + application data — mirrors the storefront catalog/industries, in the
// newsletter's shape. Used when Shopify isn't configured. IMAGES are hosted on THIS app so
// email clients load them; PRODUCT LINKS use the REAL live-store handles (from products.json).

export const ASSET_BASE = 'https://hooknloop-newsletter.vercel.app'
export const SHOP_BASE = 'https://hooknloop.com.au'

const img = (file) => `${ASSET_BASE}/img/products/${file}`
const ind = (file) => `${ASSET_BASE}/img/industries/${file}`
const url = (handle) => `${SHOP_BASE}/products/${handle}`
export const BROWSE = `${SHOP_BASE}/collections/all`

export const FALLBACK_PRODUCTS = [
  { id: 'self-adhesive-roll', title: 'Self-Adhesive Hook & Loop Roll', handle: 'self-adhesive-roll', price: '32.90',
    image: img('self-adhesive-roll-1.jpg'), url: url('self-adhesive-hook-and-loop-roll'), category: 'Self-Adhesive', createdAt: '2026-01-05',
    spec: 'Peel-and-stick · industrial', sizes: ['20mm × 25m', '25mm × 25m', '50mm × 25m'], colours: ['Black', 'White'],
    blurb: 'Our workhorse peel-and-stick roll — a strong adhesive that grips smooth, clean surfaces straight off the reel.',
    uses: ['Signage & display', 'Panel mounting', 'Cable runs'] },
  { id: 'sew-on', title: 'Sew-On Hook & Loop (Non-Adhesive)', handle: 'sew-on', price: '24.46',
    image: img('sew-on-1.jpg'), url: url('sew-on-hook-and-loop-fastener'), category: 'Sew-On', createdAt: '2026-01-12',
    spec: 'Stitch-on · washes well', sizes: ['25mm × 25m', '50mm × 25m', '100mm × 25m'], colours: ['Black', 'White'],
    blurb: 'Non-adhesive tape you stitch straight to fabric — soft, flexible and it keeps its grip through the wash.',
    uses: ['Garment closures', 'Costumes', 'Upholstery'] },
  { id: 'hook-and-loop-dots', title: 'Self-Adhesive Hook & Loop Dots', handle: 'hook-and-loop-dots', price: '66.74',
    image: img('hook-and-loop-dots-1.jpg'), url: url('hook-and-loop-dots'), category: 'Dots & Coins', createdAt: '2026-02-01',
    spec: '1,000–5,000 dots per reel', sizes: ['22mm × 1000 dots', '15mm × 5000 dots'], colours: ['Black', 'White'],
    blurb: 'Pre-cut adhesive dots on a reel — hundreds of fast, repeatable fixings without cutting down a roll.',
    uses: ['POS & display', 'Mounting cards', 'Packaging'] },
  { id: 'reusable-cable-straps', title: 'Reusable Hook & Loop Cable Straps', handle: 'reusable-cable-straps', price: '25.00',
    image: img('reusable-cable-straps-1.png'), url: url('hook-and-loop-adjustable-strap'), category: 'Straps & Cable Ties', createdAt: '2026-02-18',
    spec: '20 per pack · reusable', sizes: ['25mm × 265mm (20 pack)'], colours: ['Black'],
    blurb: 'Self-gripping straps that reuse again and again — no more single-use zip ties around the workshop.',
    uses: ['Cable bundling', 'Cord management', 'Tool storage'] },
  { id: 'double-sided', title: 'Double-Sided Hook & Loop (Back-to-Back)', handle: 'double-sided', price: '21.66',
    image: img('double-sided-1.png'), url: url('double-sided-hook-and-loop'), category: 'Double-Sided', createdAt: '2026-03-03',
    spec: 'Self-gripping · no adhesive', sizes: ['12mm × 12.5m', '15mm × 12.5m', '25mm × 12.5m'], colours: ['Black'],
    blurb: 'Back-to-back tape that grips itself — wrap and secure with no adhesive and no sticky residue.',
    uses: ['Cable wrap', 'Bundling', 'Plant ties'] },
  { id: 'heavy-duty-straps', title: 'Heavy-Duty Hook & Loop Straps', handle: 'heavy-duty-straps', price: '63.00',
    image: img('heavy-duty-straps-1.png'), url: url('heavy-duty-hook-and-loop-strap'), category: 'Straps & Cable Ties', createdAt: '2026-03-22',
    spec: '50mm × 5m · set of 5', sizes: ['50mm × 5m (set of 5)'], colours: ['Orange', 'Black'],
    blurb: 'Wide, heavy-duty straps for loads that move — trailers, cargo and gear that has to stay put.',
    uses: ['Cargo & load', 'Trailers & utes', 'Equipment'] },
  { id: 'heavy-duty-adhesive', title: 'Heavy-Duty Adhesive Hook & Loop', handle: 'heavy-duty-adhesive', price: '55.43',
    image: img('heavy-duty-adhesive-1.png'), url: url('heavy-duty-adhesive-hook-and-loop'), category: 'Self-Adhesive', createdAt: '2026-04-10',
    spec: 'High-tack acrylic · heat & outdoor', sizes: ['25mm × 25m', '50mm × 25m'], colours: ['Black', 'White'],
    blurb: 'High-tack acrylic adhesive built for heat, outdoors and demanding industrial surfaces.',
    uses: ['Automotive & marine', 'Outdoor signage', 'Industrial'] },
  { id: 'hook-and-loop-for-fabric', title: 'Hook & Loop for Fabric & Clothes', handle: 'hook-and-loop-for-fabric', price: '24.46',
    image: img('hook-and-loop-for-fabric-1.jpg'), url: url('hook-and-loop-for-fabric'), category: 'Sew-On', createdAt: '2026-05-02',
    spec: 'Soft & flexible · garments', sizes: ['25mm × 25m', '50mm × 25m', '100mm × 25m'], colours: ['Black', 'White'],
    blurb: 'A soft, flexible grade made for clothing and textiles — comfortable on skin and wash-durable.',
    uses: ['Garments', 'Adaptive clothing', 'Alterations'] },
  { id: 'velcro-brand-roll', title: 'VELCRO® Brand Self-Adhesive Roll', handle: 'velcro-brand-roll', price: '84.99',
    image: img('velcro-brand-roll-4.jpg'), url: url('velcro-self-adhesive-hook-and-loop-roll'), category: 'VELCRO® Brand', createdAt: '2026-05-28',
    spec: 'Genuine VELCRO® Brand · 25m', sizes: ['19mm × 25m', '25mm × 25m', '50mm × 25m'], colours: ['Black', 'White'],
    blurb: 'Genuine VELCRO® Brand self-adhesive roll — the original, stocked in Australia for jobs that demand the real thing.',
    uses: ['Trade & spec', 'Signage', 'Displays'] },
  { id: 'velcoin-dots', title: 'VELCRO® Brand Velcoin Dots', handle: 'velcoin-dots', price: '115.00',
    image: img('velcoin-dots-1.jpg'), url: url('velcoin-hook-and-loop-sticky-dots'), category: 'Dots & Coins', createdAt: '2026-06-15',
    spec: 'Genuine VELCRO® coins', sizes: ['16mm × 1200 dots', '22mm × 900 dots'], colours: ['Black', 'White'],
    blurb: 'Genuine VELCRO® Brand coins — precise, pre-cut fixings for work where brand and consistency matter.',
    uses: ['POS & retail', 'Displays', 'Events'] },
  { id: 'fire-retardant-adhesive', title: 'Fire Retardant Adhesive Hook & Loop', handle: 'fire-retardant-adhesive', price: '55.43',
    image: img('fire-retardant-adhesive-1.png'), url: url('fire-retardant-adhesive-hook-and-loop'), category: 'Fire Retardant', createdAt: '2026-07-01',
    spec: 'FR treated · self-adhesive', sizes: ['25mm × 25m', '50mm × 25m'], colours: ['Black'],
    blurb: 'Fire-retardant self-adhesive tape for compliance-driven fit-outs and public spaces.',
    uses: ['Events & staging', 'Marine', 'Public fit-outs'] },
  { id: 'fire-retardant-sew-on', title: 'Fire Retardant Sew-On Hook & Loop', handle: 'fire-retardant-sew-on', price: '32.53',
    image: img('fire-retardant-sew-on-1.png'), url: url('fire-retardant-sew-on-hook-and-loop'), category: 'Fire Retardant', createdAt: '2026-07-18',
    spec: 'FR treated · stitch-on', sizes: ['25mm × 25m', '50mm × 25m', '100mm × 25m'], colours: ['Black'],
    blurb: 'Fire-retardant sew-on tape for soft furnishings and textiles that must meet fire standards.',
    uses: ['Theatre & staging', 'Marine upholstery', 'Hospitality'] },
]

// Short application list (weekly template "Built for your trade" grid).
export const APPLICATIONS = [
  { name: 'Signage & Displays', image: ind('signage-displays-hero.jpg'), line: 'Mount panels, banners and POS that come down clean.', href: BROWSE },
  { name: 'Automotive, Caravan & RV', image: ind('automotive-caravan-rv-hero.jpg'), line: 'Trim, panels and gear that hold through heat and vibration.', href: BROWSE },
  { name: 'Upholstery & Furniture', image: ind('upholstery-furniture-hero.jpg'), line: 'Removable cushion covers, seat pads and fabric panels.', href: BROWSE },
  { name: 'Construction & Industrial', image: ind('construction-industrial-hero.jpg'), line: 'Cable runs, temporary fixings and heavy-duty mounting.', href: BROWSE },
]

// Full industry content (industry template): hero + intro + use cases + recommended products.
export const INDUSTRIES = [
  { slug: 'signage-displays', name: 'Signage & Displays', image: ind('signage-displays-hero.jpg'),
    intro: 'Mount, swap and re-dress signage, banners and point-of-sale without tools or damage.',
    useCases: [
      ['Removable POS & display', 'Fix posters, price cards and display panels so they lift off clean for the next promo.'],
      ['Exhibition & event stands', 'Re-configurable stands and backdrops that assemble fast and pack down flat.'],
      ['Banner & fabric mounting', 'Tension fabric signage to frames and walls with a grip that holds and releases.'],
    ], recommended: ['self-adhesive-roll', 'velcro-brand-roll'] },
  { slug: 'automotive-caravan-rv', name: 'Automotive, Caravan & RV', image: ind('automotive-caravan-rv-hero.jpg'),
    intro: 'Trim, panels and gear that stay put through heat, vibration and the road.',
    useCases: [
      ['Interior trim & panels', 'Secure carpet, lining and removable panels that must come off for service.'],
      ['Caravan & RV fit-out', 'Hold flyscreens, cushions, mats and storage in place — and reposition anytime.'],
      ['Gear & load restraint', 'Strap tools, hoses and equipment in utes, trailers and vans.'],
    ], recommended: ['heavy-duty-adhesive', 'heavy-duty-straps'] },
  { slug: 'upholstery-furniture', name: 'Upholstery & Furniture', image: ind('upholstery-furniture-hero.jpg'),
    intro: 'Removable covers, seat pads and fabric panels without visible fasteners.',
    useCases: [
      ['Cushion & cover closures', 'Covers that come off for washing — no zips to snag or corrode.'],
      ['Seat pads & slipcovers', 'Keep pads and slipcovers tight and in position on dining and office chairs.'],
      ['Fabric panels on frames', 'Draw fabric over timber or MDF frames and remove it cleanly to re-cover.'],
    ], recommended: ['sew-on', 'self-adhesive-roll'] },
  { slug: 'construction-industrial', name: 'Construction & Industrial', image: ind('construction-industrial-hero.jpg'),
    intro: 'Temporary fixings, cable management and heavy-duty mounting on site.',
    useCases: [
      ['Cable & conduit runs', 'Bundle and route cabling that needs regular access.'],
      ['Temporary fixings', 'Hold protection, signage and panels during a fit-out, then remove without residue.'],
      ['Heavy-duty mounting', 'Mount tools, equipment and fixtures where bolts aren&rsquo;t practical.'],
    ], recommended: ['heavy-duty-adhesive', 'reusable-cable-straps'] },
  { slug: 'warehousing-logistics', name: 'Warehousing & Logistics', image: ind('warehousing-logistics-hero.jpg'),
    intro: 'Bundle, label and secure across the floor and the fleet.',
    useCases: [
      ['Cable & equipment bundling', 'Tidy leads and gear with reusable straps that never run out.'],
      ['Removable labelling & signage', 'Bay labels and safety signs that relocate as the layout changes.'],
      ['Load & rack securing', 'Hold covers, mats and light loads on racking and in vehicles.'],
    ], recommended: ['reusable-cable-straps', 'self-adhesive-roll'] },
  { slug: 'schools-education', name: 'Schools & Education', image: ind('schools-education-hero.jpg'),
    intro: 'Displays, learning resources and adaptive aids that stand up to daily handling.',
    useCases: [
      ['Classroom displays', 'Swap student work and posters without pins or damage to walls.'],
      ['Learning resources', 'Build reusable, re-arrangeable teaching aids and activity boards.'],
      ['Adaptive & accessible aids', 'Easy-fasten closures for younger students and accessible design.'],
    ], recommended: ['self-adhesive-roll', 'hook-and-loop-dots'] },
]
