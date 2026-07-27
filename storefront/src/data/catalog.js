/*  Shared catalog — real HooknLoop products, prices in AUD incl. GST.
    Used by the collection grid, product page, search, cart and footer.        */

export const CATEGORIES = [
  { slug: 'self-adhesive', name: 'Self-Adhesive', blurb: 'Peel & stick for smooth surfaces' },
  { slug: 'sew-on', name: 'Sew-On', blurb: 'Non-adhesive, for fabric' },
  { slug: 'velcro-brand', name: 'VELCRO® Brand', blurb: 'Genuine, stocked in AU' },
  { slug: 'dots', name: 'Dots & Coins', blurb: 'Peel & stick fixings' },
  { slug: 'straps', name: 'Straps & Cable Ties', blurb: 'Reusable, self-gripping' },
  { slug: 'double-sided', name: 'Double-Sided', blurb: 'Grips itself, no adhesive' },
  { slug: 'fire-retardant', name: 'Fire Retardant', blurb: 'Trade & compliance' },
]

export const PRODUCTS = [
  /* Order matches the live store's /collections/all (browse-all) listing. */
  { handle: 'self-adhesive-roll', name: 'Self-Adhesive Hook & Loop Roll', cat: 'self-adhesive', from: 32.90, img: '/img/p-hook.jpg',
    badge: 'Best seller', spec: 'Peel-and-stick · industrial', hookLoop: true,
    sizes: [{ label: '20mm × 25m', single: 32.90 }, { label: '25mm × 25m', single: 35.28 }, { label: '50mm × 25m', single: 63.59 }],
    colours: ['Black', 'White'], gallery: ['/img/p-hook.jpg', '/img/sa-4.jpg', '/img/sa-2.jpg', '/img/sa-3.jpg', '/img/p-loop.jpg'] },
  { handle: 'sew-on', name: 'Sew-On Hook & Loop (Non-Adhesive)', cat: 'sew-on', from: 24.46, img: '/img/p-loop.jpg',
    badge: 'Best seller', spec: 'Stitch-on · washes well', hookLoop: true,
    sizes: [{ label: '25mm × 25m', single: 24.46 }, { label: '50mm × 25m', single: 39.56 }, { label: '100mm × 25m', single: 58.73 }], colours: ['Black', 'White'], gallery: ['/img/p-loop.jpg'] },
  { handle: 'hook-and-loop-dots', name: 'Self-Adhesive Hook & Loop Dots', cat: 'dots', from: 66.74, img: '/img/p-dots.jpg',
    badge: null, spec: '1,000–5,000 dots per reel', hookLoop: true,
    sizes: [{ label: '22mm × 1000 dots', single: 66.74 }, { label: '15mm × 5000 dots', single: 118.42 }], colours: ['Black', 'White'], gallery: ['/img/p-dots.jpg'] },
  { handle: 'reusable-cable-straps', name: 'Reusable Hook & Loop Cable Straps', cat: 'straps', from: 25.00, img: '/img/p-strap.jpg',
    badge: 'Self-fastening', spec: '20 per pack · reusable', hookLoop: false,
    sizes: [{ label: '25mm × 265mm (20 pack)', single: 25.00 }], colours: ['Black'], gallery: ['/img/p-strap.jpg'] },
  { handle: 'double-sided', name: 'Double-Sided Hook & Loop (Back-to-Back)', cat: 'double-sided', from: 21.66, img: '/img/p-doubleside.png',
    badge: null, spec: 'Self-gripping · no adhesive', hookLoop: false,
    sizes: [{ label: '12mm × 12.5m', single: 21.66 }, { label: '15mm × 12.5m', single: 22.95 }, { label: '25mm × 12.5m', single: 30.93 }], colours: ['Black'], gallery: ['/img/p-doubleside.png'] },
  { handle: 'heavy-duty-straps', name: 'Heavy-Duty Hook & Loop Straps', cat: 'straps', from: 63.00, img: '/img/p-strap2.png',
    badge: null, spec: '50mm × 5m · set of 5', hookLoop: false,
    sizes: [{ label: '50mm × 5m (set of 5)', single: 63.00 }], colours: ['Orange/Black'], gallery: ['/img/p-strap2.png'] },
  { handle: 'heavy-duty-adhesive', name: 'Heavy-Duty Adhesive Hook & Loop', cat: 'self-adhesive', from: 55.43, img: '/img/p-heavyduty.png',
    badge: 'Industrial', spec: 'High-tack acrylic · heat & outdoor', hookLoop: true,
    sizes: [{ label: '25mm × 25m', single: 55.43 }, { label: '50mm × 25m', single: 78.60 }], colours: ['Black', 'White'], gallery: ['/img/p-heavyduty.png'] },
  { handle: 'hook-and-loop-for-fabric', name: 'Hook & Loop for Fabric & Clothes', cat: 'sew-on', from: 24.46, img: '/img/p-loop.jpg',
    badge: 'Industrial grade', spec: 'Soft & flexible · garments', hookLoop: true,
    sizes: [{ label: '25mm × 25m', single: 24.46 }, { label: '50mm × 25m', single: 39.56 }, { label: '100mm × 25m', single: 58.73 }], colours: ['Black', 'White'], gallery: ['/img/p-loop.jpg'] },
  { handle: 'velcro-brand-roll', name: 'VELCRO® Brand Self-Adhesive Roll', cat: 'velcro-brand', from: 84.99, img: '/img/p-loop.jpg',
    badge: 'Genuine VELCRO®', spec: 'Genuine VELCRO® Brand · 25m', hookLoop: true,
    sizes: [{ label: '19mm × 25m', single: 84.99 }, { label: '25mm × 25m', single: 93.92 }, { label: '50mm × 25m', single: 179.00 }], colours: ['Black', 'White'], gallery: ['/img/p-loop.jpg', '/img/p-hook.jpg'] },
  { handle: 'velcoin-dots', name: 'VELCRO® Brand Velcoin Dots', cat: 'dots', from: 115.00, img: '/img/p-dots.jpg',
    badge: 'Genuine VELCRO®', spec: 'Genuine VELCRO® coins', hookLoop: true,
    sizes: [{ label: '16mm × 1200 dots', single: 115.00 }, { label: '22mm × 900 dots', single: 139.00 }], colours: ['Black', 'White'], gallery: ['/img/p-dots.jpg'] },
  { handle: 'fire-retardant-adhesive', name: 'Fire Retardant Adhesive Hook & Loop', cat: 'fire-retardant', from: 55.43, img: '/img/p-fr.png',
    badge: 'Industrial grade', spec: 'FR treated · self-adhesive', hookLoop: true,
    sizes: [{ label: '25mm × 25m', single: 55.43 }, { label: '50mm × 25m', single: 78.60 }], colours: ['Black'], gallery: ['/img/p-fr.png'] },
  { handle: 'fire-retardant-sew-on', name: 'Fire Retardant Sew-On Hook & Loop', cat: 'fire-retardant', from: 32.53, img: '/img/p-fr.png',
    badge: 'Industrial grade', spec: 'FR treated · stitch-on', hookLoop: true,
    sizes: [{ label: '25mm × 25m', single: 32.53 }, { label: '50mm × 25m', single: 51.27 }, { label: '100mm × 25m', single: 65.53 }], colours: ['Black'], gallery: ['/img/p-fr.png'] },
]

/*  The vendor/brand for every product on the live store. */
export const BRAND = 'HooknLoop'

/*  Real product photography, fetched per product from the live hooknloop.com.au
    listings so every card and gallery shows the correct item (the earlier build
    reused a few generic shots — VELCRO, sew-on, fabric, velcoin and FR sew-on
    were wrong). This overrides the img + gallery set inline above.              */
const PRODUCT_IMAGES = {
  'self-adhesive-roll': ['/img/products/self-adhesive-roll-1.jpg', '/img/products/self-adhesive-roll-2.jpg', '/img/products/self-adhesive-roll-3.jpg', '/img/products/self-adhesive-roll-4.jpg'],
  'heavy-duty-adhesive': ['/img/products/heavy-duty-adhesive-1.png', '/img/products/heavy-duty-adhesive-2.jpg'],
  'velcro-brand-roll': ['/img/products/velcro-brand-roll-1.webp', '/img/products/velcro-brand-roll-2.webp', '/img/products/velcro-brand-roll-3.webp', '/img/products/velcro-brand-roll-4.jpg'],
  'sew-on': ['/img/products/sew-on-1.jpg', '/img/products/sew-on-2.jpg', '/img/products/sew-on-3.jpg', '/img/products/sew-on-4.jpg'],
  'hook-and-loop-for-fabric': ['/img/products/hook-and-loop-for-fabric-1.jpg', '/img/products/hook-and-loop-for-fabric-2.jpg', '/img/products/hook-and-loop-for-fabric-3.jpg', '/img/products/hook-and-loop-for-fabric-4.jpg'],
  'hook-and-loop-dots': ['/img/products/hook-and-loop-dots-1.jpg', '/img/products/hook-and-loop-dots-2.jpg', '/img/products/hook-and-loop-dots-3.jpg', '/img/products/hook-and-loop-dots-4.jpg'],
  'velcoin-dots': ['/img/products/velcoin-dots-1.webp', '/img/products/velcoin-dots-2.webp'],
  'reusable-cable-straps': ['/img/products/reusable-cable-straps-1.png', '/img/products/reusable-cable-straps-2.png', '/img/products/reusable-cable-straps-3.jpg'],
  'heavy-duty-straps': ['/img/products/heavy-duty-straps-1.png', '/img/products/heavy-duty-straps-2.png', '/img/products/heavy-duty-straps-3.png', '/img/products/heavy-duty-straps-4.png'],
  'double-sided': ['/img/products/double-sided-1.png', '/img/products/double-sided-2.png', '/img/products/double-sided-3.jpg'],
  'fire-retardant-adhesive': ['/img/products/fire-retardant-adhesive-1.png'],
  'fire-retardant-sew-on': ['/img/products/fire-retardant-sew-on-1.png'],
}
PRODUCTS.forEach((p) => { const g = PRODUCT_IMAGES[p.handle]; if (g && g.length) { p.img = g[0]; p.gallery = g } })

/*  Real per-product star rating + review count, exactly as shown on the live
    hooknloop.com.au listings. [rating, reviewCount]. Heavy-duty straps carry no
    rating on the store, so we show "no reviews yet" rather than inventing one.   */
export const RATINGS = {
  'self-adhesive-roll': [4.0, 1],
  'heavy-duty-adhesive': [5.0, 2],
  'velcro-brand-roll': [5.0, 1],
  'sew-on': [5.0, 2],
  'hook-and-loop-for-fabric': [5.0, 1],
  'hook-and-loop-dots': [5.0, 1],
  'velcoin-dots': [5.0, 1],
  'reusable-cable-straps': [5.0, 2],
  'heavy-duty-straps': [0, 0],
  'double-sided': [4.5, 2],
  'fire-retardant-adhesive': [5.0, 1],
  'fire-retardant-sew-on': [5.0, 1],
}
export const productRating = (handle) => RATINGS[handle] || [0, 0]

/*  Per-product FAQs. Questions are the store's own product-specific questions
    (from each live product page); answers are rewritten into clean, professional
    copy that preserves every fact. Four products carry no FAQ on the live store
    (heavy-duty-adhesive, hook-and-loop-for-fabric, both fire-retardant) — those
    FAQs are written from the product's real specifications, no invented facts.   */
export const PRODUCT_FAQS = {
  'self-adhesive-roll': [
    { q: 'Do I need to buy the hook and loop separately, or does it come together?', a: 'You can order whichever suits your project: the hook side on its own, the loop side on its own, or both together as a matched set.' },
    { q: 'What surfaces does this self-adhesive hook-and-loop tape stick to?', a: 'It adheres reliably to smooth surfaces such as plastic, sheet metal, timber boards and painted walls.' },
    { q: 'How many times can this self-adhesive hook and loop fastener be reused?', a: 'It withstands roughly 5,000 open-and-close cycles while retaining its grip with minimal loss of holding strength.' },
    { q: 'Can I cut the self-adhesive hook & loop tape roll to a shorter length?', a: 'Yes. The 25-metre roll can be trimmed to your exact required length with ordinary scissors, cutting cleanly every time.' },
    { q: 'Does this adhesive hook-and-loop work outdoors or in warm conditions?', a: 'Yes. It performs across a temperature range of −10°C to 70°C, making it suitable for yards, garages and warm enclosed spaces.' },
  ],
  'heavy-duty-adhesive': [
    { q: 'How is this different from the standard self-adhesive tape?', a: 'It uses a high-performance acrylic adhesive instead of rubber, so it holds through heat, UV, weather and moisture where the standard rubber-based tape would let go.' },
    { q: 'What surfaces does the heavy-duty acrylic adhesive bond to?', a: 'It bonds to metal, glass, timber, painted surfaces, PVC/ABS and aluminium — wipe the surface clean and dry first for the strongest hold.' },
    { q: 'Can I use it outdoors or in high heat?', a: 'Yes. The acrylic adhesive is UV, weather and moisture resistant, making it suited to outdoor, automotive and warm industrial environments.' },
    { q: 'What sizes and colours are available?', a: 'It comes in 25 mm and 50 mm widths, 25 metres per roll, in black or white — as hook only, loop only, or both together.' },
    { q: 'Do you offer bulk discounts?', a: 'Yes — volume discounts of up to 30% apply automatically on bulk orders, and trade accounts get further pricing.' },
  ],
  'velcro-brand-roll': [
    { q: 'Is this a genuine VELCRO Brand product or a generic tape?', a: 'This is 100% genuine VELCRO Brand tape, not a generic knock-off, so it holds securely where cheaper alternatives tend to slip off.' },
    { q: 'What sizes can I get the self-adhesive VELCRO roll in?', a: 'Choose from 19 mm, 25 mm or 50 mm widths, with 25 metres on every roll. It is available in black or white, as hook only, loop only, or both together.' },
    { q: 'Which surfaces does this adhesive VELCRO tape stick to properly?', a: 'It adheres firmly to smooth surfaces such as wood, metal, plastic and glass. Simply wipe the area clean and dry beforehand and the tape will bond solidly and resist pulling.' },
    { q: 'Once stuck down, can the hook and loop still be opened and closed?', a: 'Yes, the hook and loop can be opened and closed thousands of times without wearing out.' },
    { q: 'Are there bulk discounts if I need several rolls?', a: 'Yes, you receive 5% off at 5 rolls, scaling up to 30% off on orders of 50 rolls or more.' },
  ],
  'sew-on': [
    { q: 'Why use sew-on hook and loop on fabric instead of the adhesive one?', a: 'On fabric, adhesive backing tends to fail, typically detaching after around two wash cycles. A sewn installation bonds securely to the material and offers far greater durability.' },
    { q: 'What sizes does this sew-on hook and loop tape come in?', a: 'It is available in three widths — 25 mm, 50 mm and 100 mm — with each roll measuring 25 metres. You can choose black or white, and select hook only, loop only, or both together.' },
    { q: 'Will it survive regular machine washing?', a: 'Yes. The tape is made from 100% nylon, so it is safe for machine washing and designed for durable fabric applications.' },
    { q: 'Do I need to order hook and loop separately, or can I get both at once?', a: "There is no need to place separate orders. Simply select the 'Both' option on the product page to receive the hook and loop together in a single order." },
    { q: 'Is there a bulk discount if I need a lot of rolls?', a: 'Yes. Discounts start at 5% off for 5 rolls and scale up to 30% off at 50 rolls, applied automatically at checkout.' },
  ],
  'hook-and-loop-for-fabric': [
    { q: 'Why choose sew-on hook and loop for clothing?', a: 'Stitched hook and loop stays put through repeated washing and wear, where an adhesive backing would peel away from fabric after only a few washes.' },
    { q: 'Is it soft enough for garments?', a: 'Yes — it is made from soft, flexible 100% nylon designed to sit comfortably against skin and move with the fabric.' },
    { q: 'Can it be machine washed?', a: 'Yes. It is 100% nylon and machine washable, built for garments and other fabric applications.' },
    { q: 'What sizes and colours are available?', a: 'Choose 25 mm, 50 mm or 100 mm widths, 25 metres per roll, in black or white — hook only, loop only, or both together.' },
    { q: 'Do I need both the hook and loop sides?', a: "A working fastener needs one of each. Select 'Both' to receive the matched hook and loop set in a single order." },
  ],
  'hook-and-loop-dots': [
    { q: 'What exactly are hook and loop dots, and how are they different from tape?', a: 'They use the same hook-and-loop fastening system as our tape, but come as individual round pieces rather than continuous strips, making them ideal for spot fixes and smaller fastening points.' },
    { q: 'What sizes do the dots come in, and how many are in a pack?', a: 'They are available in 22 mm and 15 mm diameters, supplied at either 1,000 or 5,000 dots per roll, in white or black. You can buy the hook or loop pieces separately, or together as a matched set.' },
    { q: 'What surfaces do these adhesive dots actually stick to properly?', a: 'They adhere strongly to plastic, wood, metal and glass. For a reliable bond, ensure the surface is thoroughly cleaned and completely dry before application.' },
    { q: 'Are these reusable, or is it a one-time stick?', a: 'The hook-and-loop fastening opens and closes repeatedly without losing grip strength. The adhesive backing, however, is single-use and bonds once to a fresh, clean surface.' },
    { q: 'Are these good for bulk buying if I need a lot of dots regularly?', a: 'Yes. Volume discounts of up to 30% are applied automatically at checkout depending on quantity, and the 5,000-dot roll is especially popular with commercial buyers.' },
  ],
  'velcoin-dots': [
    { q: 'How strong is the hold on these Velcro dots?', a: 'They hold firmly for everyday fastening tasks such as remote controls, lightweight frames, cable management and small displays. For best results, ensure the surface is clean and dry before applying the adhesive backing.' },
    { q: 'Will they damage the surface when removed?', a: 'On most smooth, painted surfaces they lift away cleanly. Simply peel slowly at a low angle to avoid any marking.' },
    { q: 'Are the hook and loop sides sold together?', a: 'The hook and loop are sold as separate components, so both must be ordered together. The fastener requires both parts to function — one alone will not work.' },
    { q: 'Are Velcro sticky dots reusable?', a: 'The hook and loop mechanism itself withstands repeated use without issue. However, the adhesive backing is a one-time application and will not re-bond once removed.' },
    { q: 'What sizes do they come in?', a: 'They are available in 16 mm and 22 mm. We recommend the 22 mm size where you need a slightly stronger hold or a larger contact area.' },
  ],
  'reusable-cable-straps': [
    { q: "What's the hook and loop strap actually used for day to day?", a: 'It is most commonly used for cable management — wrapping cords, power boards and extension leads to keep everything neat and tangle-free. It works equally well in a home office or a garage and workspace.' },
    { q: 'Is it genuinely reusable, or does the grip start to go after a while?', a: "It is built for repeated use, and the hook and loop won't fray or lose its grip even with daily opening and closing. Unlike cheap cable ties, you won't be replacing these every few weeks." },
    { q: 'Can it handle different cable thicknesses, or is it one fixed size?', a: 'It is fully adjustable, so both thin cables and thicker bundles are handled with ease. Simply wrap it where it sits comfortably and press it closed.' },
    { q: 'Is it safe to use on delicate cables without scratching them?', a: 'Yes — the loop side that contacts your cables is a soft material that prevents damage to bundled items, strong enough to hold securely while remaining gentle.' },
    { q: 'How quickly can you actually fasten and remove these?', a: 'Just a few seconds — wrap it around, press it together, and it is fastened. To access the cables again, simply pull it apart; no tools and no cutting.' },
  ],
  'heavy-duty-straps': [
    { q: 'How much weight can these heavy-duty hook and loop straps actually hold?', a: 'Made from thick, heavy nylon webbing with industrial-grade fastenings, they are rated to bear loads of up to approximately 100 kilograms — reliable for palletised goods, heavy equipment and oversized items.' },
    { q: 'Do I need any tools or buckles to strap things down?', a: 'No tools are required — simply wrap the strap around your load and press the hook and loop together. It takes only a few seconds, with no ratchets or tensioners.' },
    { q: 'Can these replace plastic wrap or single-use strapping?', a: 'Yes, and this is where they deliver the greatest value. Rather than working through rolls of plastic wrap, you reuse the same straps repeatedly, lowering costs and cutting waste.' },
    { q: 'Are they a fixed size, or can I adjust them?', a: 'The straps are fully adjustable, so varying pallet sizes and load shapes are easily accommodated — no need to force a fixed size to work.' },
    { q: 'Do they hold up with heavy daily use, or wear out fast?', a: 'They are machine washable and built for daily industrial use, so the grip stays consistent under constant handling — considerably more durable than cheaper alternatives.' },
  ],
  'double-sided': [
    { q: "What's the difference between double-sided hook & loop and regular hook and loop?", a: 'Regular hook and loop needs two separate strips, one on each surface. Double-sided tape carries hook material on one face and loop on the other, so it wraps back onto itself and fastens automatically.' },
    { q: 'What do people actually use back-to-back hook & loop for?', a: 'It is most commonly used for cable management, securing gear and strapping items in transit. Unlike a zip tie, it is fully reusable and removable.' },
    { q: 'How many times can you reuse it before it stops holding?', a: 'The hook-and-loop mechanism withstands thousands of fastening and unfastening cycles without any loss of grip strength.' },
    { q: 'Do I need to buy it in a fixed length, or can I cut it down?', a: 'It comes on a roll, so you simply cut the exact length you need. A pair of scissors cuts it cleanly, with no special tools required.' },
    { q: "Will it work on cables or items that aren't a uniform shape?", a: 'Yes. Because it wraps around the object and fastens to itself, it adjusts to any shape or diameter, making it well suited to irregular items.' },
  ],
  'fire-retardant-adhesive': [
    { q: 'What makes this hook and loop fire-retardant?', a: "It uses a fire-retardant treated backing; the exact standard is stated on the manufacturer's technical data sheet, which we supply on request." },
    { q: 'Where is fire-retardant hook and loop typically used?', a: 'In transport, marine, hospitality and commercial fit-outs where materials must meet fire-safety requirements.' },
    { q: 'Is it self-adhesive, and what does it stick to?', a: 'Yes — it is self-adhesive for smooth, clean surfaces such as metal, panels and painted finishes; wipe the area clean and dry first for the best bond.' },
    { q: 'What sizes does it come in?', a: 'It is available in 25 mm and 50 mm widths, 25 metres per roll, in black, and can be cut to your required length.' },
    { q: 'Can I get the fire-retardant certification?', a: "Yes — the technical data sheet with the fire-retardant rating is available on request; we don't publish a figure we can't certify." },
  ],
  'fire-retardant-sew-on': [
    { q: 'What makes this sew-on tape fire-retardant?', a: "The backing is fire-retardant treated; the specific standard is on the manufacturer's technical data sheet, supplied on request." },
    { q: 'Why sew-on rather than adhesive for fire-retardant work?', a: 'Stitching gives a durable, permanent fix for upholstery, seating and fabric work, and avoids relying on an adhesive that can fail on fabric.' },
    { q: 'Where is it commonly used?', a: 'In transport seating, marine, hospitality and commercial upholstery where fire-safety compliance is required.' },
    { q: 'What sizes and colours are available?', a: 'It comes in 25 mm, 50 mm and 100 mm widths, 25 metres per roll, in black, cut to your required length.' },
    { q: 'Can I get the fire-retardant data sheet?', a: "Yes — the TDS with the fire-retardant rating is available on request; we don't publish a rating we can't certify." },
  ],
}
export const productFaqs = (handle) => PRODUCT_FAQS[handle] || []

/* Real per-product customer reviews, pulled from the live store's Judge.me widget. */
export const PRODUCT_REVIEWS = {
  "self-adhesive-roll": [
    { rating: 4, name: "Anonymous", title: "Good service\nQuick", body: "Good service Quick delivery", date: "2026-05-24", verified: true, location: "Australia" },
  ],
  "heavy-duty-adhesive": [
    { rating: 5, name: "Paul J.", title: "", body: "I've used loads of adhesive hook and loop over the years and this industrial grade tape from HooknLoop is a step above. The acrylic adhesive grips metal and painted panels without budging even in warm weather. It's the real deal.", date: "2026-05-01", verified: false, location: "Australia" },
    { rating: 5, name: "Shane D.", title: "", body: "We run a small logistics operation and these straps from HooknLoop have replaced our stretch wrap on pallets. They go on in seconds and hold boxes securely. No buckles, no fuss. The 50mm width handles the job well.", date: "2026-05-01", verified: false, location: "Australia" },
  ],
  "velcro-brand-roll": [
    { rating: 5, name: "Belinda H.", title: "", body: "I've tried cheaper tapes before and they always peel off after a few weeks. This genuine VELCRO brand roll from HooknLoop sticks to metal and painted surfaces without any fuss. Cut to size, press on, and it's done. No going back.", date: "2026-05-01", verified: false, location: "Australia" },
  ],
  "sew-on": [
    { rating: 5, name: "Renee T.", title: "", body: "I needed a washable fastener for some clothing alterations and HooknLoop's sew-on tape did the job perfectly. The 25mm width was easy to work with and the grip is solid after multiple washes. Really good quality for the price.", date: "2026-05-05", verified: false, location: "Australia" },
    { rating: 5, name: "Lachlan M.", title: "", body: "I've been sewing for years and this nylon sew-on tape from HooknLoop is one of the best I've used. It stitches in cleanly and holds up through the wash without budging. I used it on school bags and cushion covers and both look great.", date: "2026-05-01", verified: false, location: "Australia" },
  ],
  "hook-and-loop-for-fabric": [
    { rating: 5, name: "Diane K.", title: "", body: "I sew uniforms and have tried a few brands over the years. This fabric hook and loop from HooknLoop is my favourite now. It comes in a good range of widths and colours and washes without losing its grip. The nylon is soft against skin too.", date: "2026-05-01", verified: false, location: "Australia" },
  ],
  "hook-and-loop-dots": [
    { rating: 5, name: "Kylie F.", title: "", body: "This roll from HooknLoop has been sitting on my craft table for months now and I keep reaching for it. It sticks firmly to smooth surfaces and I've reused pieces multiple times without losing grip. Good stuff at a fair price.", date: "2026-05-01", verified: false, location: "Australia" },
  ],
  "velcoin-dots": [
    { rating: 5, name: "Jess W.", title: "", body: "These VELCOIN dots from HooknLoop are so handy. I used them to mount labels on shelves at work and they stick firmly but peel off cleanly when I need to reposition. Peel and stick, done. Brilliant little things.", date: "2026-05-01", verified: false, location: "Australia" },
  ],
  "reusable-cable-straps": [
    { rating: 5, name: "James O.", title: "", body: "I work in IT and cable management is half the job. These reusable straps from HooknLoop are great. They grip firmly, adjust easily and don't damage cables at all. A bundle of 20 is very good value for the price.", date: "2026-05-01", verified: false, location: "Australia" },
    { rating: 5, name: "Malcolm", title: "", body: "Quick delivery", date: "2026-03-24", verified: true, location: "Australia" },
  ],
  "double-sided": [
    { rating: 4, name: "Sarah V.", title: "", body: "I ordered the 25mm black roll for bundling garden hoses and extension leads. It holds well, cuts easily to size and doesn't damage surfaces. Really clever product from HooknLoop. I've already recommended it to a few mates.", date: "2026-05-01", verified: false, location: "Australia" },
    { rating: 5, name: "Tim R", title: "", body: "This back to back tape from HooknLoop is something I didn't know I needed until I tried it. It wraps around cables and grips itself with no adhesive at all. I've used it to bundle cords in my home studio and it's kept things tidy for months.", date: "2026-05-01", verified: false, location: "Australia" },
  ],
  "fire-retardant-adhesive": [
    { rating: 5, name: "Greg H.", title: "", body: "We needed a fire-safe fastening solution for an acoustic panel installation and this tape from HooknLoop ticked every box. It sticks firmly to smooth surfaces and peels back cleanly when needed. Delivery was fast and the quality is clearly there.", date: "2026-05-01", verified: false, location: "Australia" },
  ],
  "fire-retardant-sew-on": [
    { rating: 5, name: "Andrew S.", title: "", body: "I source materials for protective workwear and this sew-on fire retardant tape from HooknLoop is a standby for us now. It stitches in cleanly onto heavy fabrics and holds its grip through repeated use. Good quality at a reasonable price.", date: "2026-05-01", verified: false, location: "Australia" },
  ],
}
export const productReviews = (handle) => PRODUCT_REVIEWS[handle] || []

/* Real product description (intro) + Key Features, verbatim from the live store. */
export const PRODUCT_COPY = {
  "self-adhesive-roll": {
    heading: "",
    paras: ["Our Self-Adhesive Hook and Loop Roll is a reusable, useful and handy fastening solution crafted to make installation easy without drilling, screwing or permanent fixing. With an amazing, durable pressure-sensitive adhesive backing, this hook-and-loop system firmly bonds to smooth surfaces. Allowing repeated opening and closing, it remains strong with multiple uses with no loss of grip. It is a dependable sticky hook and loop fastener, delivering steady holding strength for everyday use. Perfect for home projects and commercial applications, this fastener is a dependable and adhesive solution. The rolls come with the beneficial flexibility of cutting down to custom lengths to suit your exact needs."],
    features: ["Strong rubber adhesive for indoor & outdoor use.", "Reusable up to 5,000 times.", "Made from 100% premium nylon.", "Strong self-adhesive backing for quick and tool-free installation.", "Works in temperatures from -10°C to 70°C.", "Customisable length - cut to size as required.", "Durable and long-lasting performance."],
  },
  "heavy-duty-adhesive": {
    heading: "Industrial Grade — High Temperature Acrylic Adhesive",
    paras: ["At HooknLoop.com.au, we understand that standard hook and loop just doesn’t last in real industrial conditions. That’s why we provide Heavy Duty Adhesive Hook & Loop Tape, which is built to deliver high-strength and dependable grip. It features a heat and moisture-tolerant acrylic adhesive with tough nylon backing, hence, delivers robust and durable bonding on different materials, including plastics, metal, and painted panels.", "From automotive interiors to construction sites and industrial equipment, our tape keeps its grip when others fail. It is engineered for reliable performance in hot, humid, and harsh environments all over the country."],
    features: ["True Heavy Duty Industrial Quality", "High-Performance Acrylic Adhesive Backing", "Built as an Industrial Strength Hook and Loop Fastening Solution", "Handles High Temperatures & Harsh Conditions", "UV, Weather & Moisture Resistant", "Strong Shear & Peel Strength", "Reliable Indoor & Outdoor Performance", "Works on Rough & Smooth Surfaces"],
  },
  "velcro-brand-roll": {
    heading: "",
    paras: ["VELCRO® brand self-adhesive roll is made of long-lasting nylon hook and loop material, designed to be used in the home, office or workshop environment and offer reliable fastening. Designed to provide strong and consistent holding performance, this industrial-grade adhesive solution bonds securely to dry and clean surfaces. Easy to stick on wood, metal, plastic, and glass, it comes with durability and weather resistance. Just cut adhesive velcro tape to any size and use them comfortably for managing cables, mounting lightweight items, securing carpets, and small & large DIY projects as well. This handy VELCRO® hook and loop tape delivers flawless, practical results when applied in both temporary and permanent applications."],
    features: ["Genuine VELCRO® brand hook and loop for reliable performance", "Strong self-adhesive backing for fast, tool-free application", "Reusable fastening system – opens and closes thousands of times", "Customisable roll length – cut to size as needed", "Durable and long-lasting construction", "Ideal for indoor use on clean, smooth, and dry surfaces"],
  },
  "sew-on": {
    heading: "",
    paras: ["When you need a reliable, reusable fastening solution, our premium sew-on hook and loop fastener tape works incredibly. It is designed for applications where permanent, washable and long-lasting hold is required. This hook and loop tape promises seamless results as manufactured with strong, durable nylon material, when applied in clothing alterations, home textiles, cushion covers, or even DIY projects. It ensures secure closing where buttons or zippers are not workable, with its sewable edges that integrate smoothly into fabric and hold up well through regular washing. Available in various widths and colours, this sew-on hook and loop fastener perfectly meets designing and application needs."],
    features: ["Sew-on application for a secure and permanent attachment", "Strong hook and loop fastening with reliable holding power", "Durable and reusable – suitable for repeated opening and closing", "Washable and flexible, ideal for fabric applications", "Easy to cut and stitch, to the required lengths"],
  },
  "hook-and-loop-for-fabric": {
    heading: "",
    paras: ["When durable strength is required with all-day comfort, our Hook and Loop for Fabric is the choice for using in professional textiles. It is specifically designed for stitching onto clothing and flexible fabrics. You do not need to rely on adhesives and still get a reliable hold with this fastening solution.", "Whether you’re manufacturing uniforms, producing industrial textiles, or working on detailed sewing projects, HooknLoop.com.au provides hook and loop solutions with consistent grip and durability trusted across Australia."],
    features: ["Made for Sewing – Specifically engineered for secure stitching onto fabric", "Reliable Holding Strength – Strong engagement that stays in place", "Soft & Flexible Construction – Comfortable for wearable applications", "Fabric-Safe And Wash-Friendly – Performs reliably in machine washing", "Long Service Life – Designed for repeated opening and closing"],
  },
  "hook-and-loop-dots": {
    heading: "",
    paras: ["Our adhesive hook and loop dots are a simple and reliable fastening solution for lightweight items with quick application and clean removal. These dots provide a strong grip as made from durable hook and loop material, making it easy to open and close. With pressure-sensitive adhesive backing, it guarantees quick installation on clean, smooth surfaces, which allows for the use of no tools or drilling. Perfect for craft projects, these hook and loop fastener dots can be used in school or at home, for signage, displays, office organisation, and light DIY tasks. With a clean, professional finish, these compact, neat, and versatile hook and loop adhesive dots deliver convenience."],
    features: ["Round dots for fast and easy application", "Strong self-adhesive backing – no tools required", "Reusable hook and loop fastening", "Clean and discreet finish", "Easy peel-and-stick installation"],
  },
  "velcoin-dots": {
    heading: "",
    paras: ["VELCRO® brand VELCOIN® adhesive hook and loop dots provide a fast, tidy, and dependable fastening solution for everything from home projects to industrial applications. Whether you’re into crafts, setting up displays, managing cables, or lightweight mounting, just peel, stick, and press for a secure hold."],
    features: ["Premium VELCRO® Brand Quality: Enjoy a strong, durable adhesive backing that sticks to most clean, smooth surfaces.", "Fast & Easy to Use: Simply peel and stick-no tools or messy glues needed!", "Reusable & Adjustable: The hook and loop design makes it easy to remove and reposition without damaging the surface.", "Available in Two Sizes & Colours: Choose between 16mm or 22mm diameter in timeless black or white to suit your needs.", "Versatile Applications: Perfect for crafts, decorations, displays, office setups, signage, school projects, and so much more."],
  },
  "reusable-cable-straps": {
    heading: "",
    paras: ["Sort out and make your cables mess-free using our high-quality Hook and Loop Cable Straps & Ties. These are sturdy and do not fray or lose their grip, even when they are subjected to daily use. Only wrap them around a bunch of cords, power strips or extension leads and achieve a clean and managed setup at your home office, garage, or workspace. Adjustable and reusable so many times, so they can be used to provide a safe grip, easily adjustable, suiting varying sizes, making them ideal for both small-scale organisation tasks and professional cable management. Get this strong, durable and versatile cable strapping solution today."],
    features: ["Reusable hook and loop fastening", "Adjustable and easy to reposition", "Strong yet gentle on cables", "Durable and long-lasting material", "Quick wrap-and-secure design"],
  },
  "heavy-duty-straps": {
    heading: "",
    paras: ["The heavy-duty hook-and-loop straps are trusted for their durable and versatile fastening solution for routine activities in warehousing, logistics and transport industries. Crafted with thick nylon webbing, these come with industrial-quality hook and loop fittings that support heavy loads of up to 100 kg. Its large width promises a strong holding solution for stabilising palletised goods without the need for buckets, ratchets, or single-use stretch wrap. They are tough on wear and soft on surfaces, and can be washed in the machines easily. These hook and loop straps are reusable and easy to use, and provide easy adjustment with quick removal. Due to which it saves time, reduce waster and lowers ongoing packaging costs."],
    features: ["Heavy-Duty Hook & Loop Closure Strong hook and loop fastening provides high holding capacity to pallet loads both in storage and transportation.", "Reusable & Cost-Effective A smart, reusable solution that replaces single-use strapping and plastic wrap.", "Fast Application & Removal No tools, buckles, and tensioners needed, wrap, press and fasten within seconds.", "Adjustable Fit Fits neatly with the preferences of other pallet sizes, load shapes, and bundling needs.", "Durable Construction Created using strong hook and loop materials that can be used in daily industrial processing."],
  },
  "double-sided": {
    heading: "",
    paras: ["Fastening and bundling turn easy and fast with our double-sided hook and loop tape - a versatile, reusable, and cost-effective self-gripping option. Featuring hook material on one side and loop on the other, this back-to-back hook & loop fastener grips onto itself. Designed from durable nylon/polyester materials, this self-gripping hook and loop tape provides amazing flexibility. With soft textile design, it promises no surface damage while maintaining strong holding power. Perfect for temporary fastening, organising items, and reusable strapping across home, office, and industrial environments. Maintains strong adhesion even after repeated use as a self-gripping fastening solution without the use of any adhesive or hardware."],
    features: ["Hook on one side, loop on the other", "Self Gripping Back to Back", "No adhesive or tools required", "Reusable and adjustable fastening solution", "Customisable length- cut to size as needed", "Durable and long-lasting material"],
  },
  "fire-retardant-adhesive": {
    heading: "",
    paras: ["The Fire Retardant Adhesive Hook and Loop is designed to be used in an environment where practicality and safety are essential. It is constructed using flame-resistant material, which reduces the risk of fire and also offers good and solid fastening. The pressure-sensitive backing on the heavy-duty tape enables rapid adhesion in place on smooth, clean surfaces without the use of any tools. No drillings and screws are required. Having a stable holding capacity, it can be opened and closed several times. No worries about losing grip. It simplifies cable handling, panel fitting, insulating wrappings and display configurations. The tape is a convenient, reusable and safety-oriented fastener that is ideal when used in a commercial and industrial environment."],
    features: ["Fire Retardant Material - Created to assist in curbing the spread of flames in areas that are safety-sensitive.", "Strong Self-Adhesive Backing - Rubber-based adhesive that is a high-performance product for secure bonding.", "Tool-Free Installation - No time and labour saving. Peel-and-stick application.", "Reusable Fastening System - Opens and seals up many times without grip loss.", "Adjustable Length - Delivered in rolls and easy to cut to size.", "Long-Lasting & Durable - Performs well when used regularly."],
  },
  "fire-retardant-sew-on": {
    heading: "",
    paras: ["If safety is paramount for you, buy our Fire Retardant Sew On Hook and Loop Tape, which offers a sure fastening in such high-risk settings. It is intended to be used in work where flame protection is necessary and is suitable in protective apparel, industrial fabrics, stage curtains, transportation, interiors, and specialised equipment covers. This sew-on solution can be sewn securely onto material to serve as a permanent, reusable and heat-resistant fastening solution. It is made from flame-retarded treated materials, and thus it can minimise the spread of flames without compromising on high consistent grip performance.", "Strong, versatile, and designed with professional performance in mind, it offers reliability and rapid connection where performance and longevity are essential."],
    features: ["Flame Retardant Construction Engineered from specially-treated fibre that becomes non-ignitable and helps reduce the spread of the flame.", "Sew-On Application This is used to ensure permanent holding and is used to secure a hold on the fabric.", "High Cycle Life Provides high consistency in fastening strength with multiple openings and closings.", "Industrial-Grade Strength Delivers a strong and reliable grip when it comes to heavy commercial and textile-related jobs.", "Flexible and Fabric Friendly Soft and durable design, perfect for garments or protective clothing.", "Custom Length Choices Provided in roll form, where it can be cut easily to the desired size"],
  },
}
export const productCopy = (handle) => PRODUCT_COPY[handle] || { heading: '', paras: [], features: [] }

/*  Per-product SKU, key applications and specifications — fetched from the live
    hooknloop.com.au product pages. SKU shown is the default configuration.
    Fire-retardant products state no standard/rating on the store, so we don't
    publish one (TDS on request), keeping to the "no uncertifiable figures" rule. */
export const PRODUCT_DETAILS = {
  'self-adhesive-roll': {
    sku: 'HL20RAB',
    applications: ['Securing mats, rugs & lightweight panels', 'Office, home & DIY projects', 'Craft, display & signage', 'Temporary mounting & organisation', 'Displays & exhibitions'],
    specs: [['Material', '100% nylon'], ['Backing', 'Pressure-sensitive rubber adhesive'], ['Width', '20 / 25 / 50 mm'], ['Length', '25 m per roll'], ['Colours', 'Black · White'], ['Temperature', '−10°C to 70°C'], ['Reusability', 'Up to 5,000 open/close cycles']],
  },
  'heavy-duty-adhesive': {
    sku: 'HL25AABW',
    applications: ['Construction — wall panels, access doors, signage', 'Automotive & transport — trims, caravan/RV, dash', 'Manufacturing — machine covers, insulation, panels', 'Home & DIY — frame mounting, tool boards, garage'],
    specs: [['Material', 'Nylon with acrylic adhesive'], ['Backing', 'High-performance acrylic (heat & moisture tolerant)'], ['Width', '25 / 50 mm'], ['Length', '25 m per roll'], ['Colours', 'Black · White'], ['Environment', 'UV, weather & moisture resistant'], ['Surfaces', 'Metal, glass, wood, painted, PVC/ABS, aluminium']],
  },
  'velcro-brand-roll': {
    sku: 'VelcroHL19RAB',
    applications: ['Cable & wire management', 'Securing lightweight panels, signs & displays', 'Organising tools, remotes & accessories', 'Craft, DIY & temporary mounting', 'Office, retail & home organisation'],
    specs: [['Brand', 'Genuine VELCRO®'], ['Material', 'Nylon hook & loop'], ['Backing', 'Self-adhesive'], ['Width', '19 / 25 / 50 mm'], ['Length', '25 m per roll'], ['Colours', 'Black · White'], ['Reusability', 'Opens & closes thousands of times']],
  },
  'sew-on': {
    sku: 'HL25B',
    applications: ['Clothing & garments', 'Upholstery & soft furnishings', 'Bags, backpacks & accessories', 'Curtains, cushions & covers', 'Craft, tailoring & DIY sewing'],
    specs: [['Material', '100% nylon'], ['Type', 'Non-adhesive, sew-on'], ['Width', '25 / 50 / 100 mm'], ['Length', '25 m per roll'], ['Colours', 'Black · White'], ['Washable', 'Yes'], ['Reusability', 'Durable for repeated open/close']],
  },
  'hook-and-loop-for-fabric': {
    sku: 'HL25FCB',
    applications: ['Clothing & work uniforms', 'Jackets & safety wear', 'School bags & backpacks', 'Upholstery & soft furnishings', 'Curtains & drapery', 'Sports & protective gear'],
    specs: [['Material', 'Nylon (sew-on)'], ['Backing', 'Fabric-safe, designed for stitching'], ['Width', '25 / 50 / 100 mm'], ['Length', '25 m per roll'], ['Colours', 'Black · White'], ['Washable', 'Yes — machine washable'], ['Sides', 'Hook, loop or both']],
  },
  'hook-and-loop-dots': {
    sku: 'HL22RADB',
    applications: ['Craft & DIY projects', 'Mounting lightweight signs, posters & displays', 'Securing stationery, photos & teaching aids', 'Home, office & classroom organisation', 'Temporary mounting & fastening'],
    specs: [['Material', 'Nylon with adhesive backing'], ['Diameter', '15 mm / 22 mm'], ['Per reel', '5,000 (15 mm) · 1,000 (22 mm)'], ['Colours', 'Black · White'], ['Adhesive', 'Pressure-sensitive self-adhesive'], ['Reusability', 'Thousands of open/close cycles']],
  },
  'velcoin-dots': {
    sku: 'Velcoin-H16RADB',
    applications: ['Crafts & decorative projects', 'Display setups & signage', 'Cable management', 'Lightweight mounting', 'Office & school organisation'],
    specs: [['Brand', 'Genuine VELCRO® (Velcoin)'], ['Diameter', '16 mm / 22 mm'], ['Per reel', '1,200 (16 mm) · 900 (22 mm)'], ['Colours', 'Black · White'], ['Adhesive', 'Strong, durable self-adhesive'], ['Reusability', 'Removable & repositionable']],
  },
  'reusable-cable-straps': {
    sku: 'HLSTRAP305/BK',
    applications: ['Organising electrical & data cables', 'Home, office & workstation cable management', 'IT, AV & networking installations', 'Bundling power cords, leads & chargers', 'Workshops, studios & DIY'],
    specs: [['Size', '25 mm × 265 mm'], ['Pack', '20 straps per pack'], ['Colour', 'Black'], ['Fastening', 'Reusable hook & loop'], ['Reusability', 'Durable, long-lasting, re-openable']],
  },
  'heavy-duty-straps': {
    sku: 'HLSTRAP5005',
    applications: ['Securing cartons & boxes on pallets', 'Bundling goods for warehouse storage', 'Stabilising loads for internal transport', 'Load restraint for picking & packing', 'Reusable pallet strapping in logistics'],
    specs: [['Material', 'Thick nylon webbing'], ['Width', '50 mm'], ['Length', '5 m per strap'], ['Pack', 'Set of 5'], ['Colours', 'Orange · Black'], ['Load capacity', 'Up to 100 kg'], ['Reusability', 'Machine washable & reusable'], ['Tools', 'None — wrap, press & fasten']],
  },
  'double-sided': {
    sku: 'HL1W12B',
    applications: ['Bundling hoses, cords & ropes', 'Securing tools, equipment & accessories', 'Home, office, workshop & IT organisation', 'Temporary fastening & adjustable securing'],
    specs: [['Material', 'Nylon'], ['Backing', 'No adhesive — self-gripping (back-to-back)'], ['Width', '12 / 15 / 25 mm'], ['Length', '12.5 m per roll'], ['Colours', 'Black · White'], ['Reusability', 'Reused more than a thousand times']],
  },
  'fire-retardant-adhesive': {
    sku: 'BB25AABFB',
    applications: ['Securing acoustic & insulation panels', 'Cable management in data centres & electrical', 'Exhibition stands & display systems', 'Public transport interiors', 'Temporary mounting in offices & public buildings'],
    specs: [['Material', 'Flame-retardant nylon'], ['Adhesive', 'High-strength pressure-sensitive rubber'], ['Width', '25 / 50 mm'], ['Length', '25 m per roll'], ['Colour', 'Black'], ['Surface', 'Clean, dry, smooth indoor'], ['FR standard', 'On supplier TDS — request']],
  },
  'fire-retardant-sew-on': {
    sku: 'BB25BFB',
    applications: ['Protective & flame-resistant clothing', 'Industrial curtains & partitions', 'Transport seating & interiors', 'Military & tactical gear', 'Exhibition & stage installations', 'Equipment covers & insulation wraps'],
    specs: [['Material', 'Flame-retardant treated nylon/polyamide'], ['Type', 'Sew-on'], ['Width', '20 / 25 / 50 mm'], ['Length', '25 m per roll'], ['Colour', 'Black'], ['Flame property', 'Reduces fire spread'], ['FR standard', 'On supplier TDS — request']],
  },
}
export const productDetails = (handle) => PRODUCT_DETAILS[handle] || PRODUCT_DETAILS['self-adhesive-roll']

export const findProduct = (handle) => PRODUCTS.find((p) => p.handle === handle) || PRODUCTS[0]
export const catName = (slug) => (CATEGORIES.find((c) => c.slug === slug) || {}).name || 'All products'
export const FREE_SHIP = 200
