/*  Presentational homepage sections, real copy/data from the section-analysis.
    TrustStats · CategoryGrid · WhyUs · FireRetardant                           */
import { navigate } from '../lib/cart.js'
export function goProduct(e) { if (e) e.preventDefault(); navigate('collection') }
const goCat = (slug) => (e) => { e.preventDefault(); navigate(`collection/${slug}`) }

/* ── Trust stat row (sits under the facilities marquee) ─────────────── */
const STATS = [
  ['100,000m+', 'metres in stock, ready to ship'],
  ['1–2 day', 'dispatch, Australia-wide'],
  ['12', 'product ranges in stock'],
  ['4.87★', 'from 15 verified reviews'],
  ['Australian', 'warehouse · genuine VELCRO® stocked'],
]
export function TrustStats() {
  return (
    <section className="tstats" aria-label="Why buy from HooknLoop">
      <div className="wrap tstats__row">
        {STATS.map(([n, l]) => (
          <div key={l} className="tstat">
            <span className="tstat__n">{n}</span>
            <span className="tstat__l">{l}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ── Shop by type (category grid) ──────────────────────────────────── */
const CATS = [
  { name: 'Self-Adhesive', slug: 'self-adhesive', sub: 'Peel & stick · industrial', from: '32.90', img: '/img/p-hook.jpg' },
  { name: 'Sew-On', slug: 'sew-on', sub: 'Non-adhesive · for fabric', from: '24.46', img: '/img/p-loop.jpg' },
  { name: 'Dots & Coins', slug: 'dots', sub: '1,000–5,000 per reel', from: '66.74', img: '/img/p-dots.jpg' },
  { name: 'Straps & Cable Ties', slug: 'straps', sub: 'Reusable · self-gripping', from: '25.00', img: '/img/p-strap.jpg' },
  { name: 'Fire Retardant', slug: 'fire-retardant', sub: 'Trade & compliance', from: '32.53', img: '/img/p-fr.png' },
  { name: 'VELCRO® Brand', slug: 'velcro-brand', sub: 'Genuine, stocked in AU', from: '84.99', img: '/img/p-loop.jpg' },
]
export function CategoryGrid() {
  return (
    <section className="cats" aria-labelledby="cats-h">
      <div className="wrap">
        <div className="sec-head">
          <span className="sec-eyebrow">Shop by type</span>
          <h2 id="cats-h" className="sec-h2">Find your fastener, fast</h2>
          <p className="sec-sub">Six families, every width — all cut to the length your job needs.</p>
        </div>
        <div className="cats__grid">
          {CATS.map((c) => (
            <a key={c.name} href="#" className="cat" onClick={goCat(c.slug)}>
              <div className="cat__media"><img src={c.img} alt={c.name} loading="lazy" /></div>
              <div className="cat__body">
                <h3 className="cat__name">{c.name}</h3>
                <p className="cat__sub">{c.sub}</p>
                <span className="cat__from">From <b>${c.from}</b><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── One-Stop Shop — lifestyle category bento (from the live store, elevated) ── */
const ONESTOP = [
  { slug: 'dots',          title: 'Dots & Coins',        sub: 'Peel & stick',              img: '/img/lifestyle/ls-dots.png',     cls: 'os__tile--a' },
  { slug: 'self-adhesive', title: 'Self-Adhesive',       sub: 'Peel & stick · industrial', img: '/img/lifestyle/ls-adhesive.png', cls: 'os__tile--b' },
  { slug: 'sew-on',        title: 'Sew-On',              sub: 'For fabric & garments',     img: '/img/lifestyle/ls-sew-on.png',   cls: 'os__tile--c' },
  { slug: 'straps',        title: 'Straps & Cable Ties', sub: 'Reusable · self-gripping',  img: '/img/lifestyle/ls-straps.png',   cls: 'os__tile--d' },
]
export function OneStop() {
  return (
    <section className="os" aria-labelledby="os-h">
      <div className="wrap">
        <div className="sec-head">
          <span className="sec-eyebrow">Shop by category</span>
          <h2 id="os-h" className="sec-h2">Australia’s One-Stop Shop for Hook and Loop Tapes</h2>
        </div>
        <div className="os__grid">
          {ONESTOP.map((t) => (
            <a key={t.slug} href="#" className={`os__tile ${t.cls}`} onClick={goCat(t.slug)} aria-label={`Shop ${t.title}`}>
              <img src={t.img} alt={t.title} loading="lazy" />
              <span className="os__scrim" aria-hidden="true" />
              <span className="os__body">
                <span className="os__meta"><b className="os__title">{t.title}</b><span className="os__sub">{t.sub}</span></span>
                <span className="os__shop">Shop now<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Trusted Supplier — B2C & B2B / wholesale (from the live store, elevated) ── */
export function TrustedSupplier() {
  const goRead = (e) => { e.preventDefault(); navigate('about') }
  return (
    <section className="ts" aria-labelledby="ts-h">
      <div className="wrap ts__grid">
        <div className="ts__copy">
          <span className="sec-eyebrow">B2C &amp; B2B · Australia-wide</span>
          <div className="ts__block">
            <span className="ts__icn"><VIcon n="shield" /></span>
            <div>
              <h2 id="ts-h" className="ts__h">Trusted Hook and Loop Supplier for B2C &amp; B2B Customers</h2>
              <p className="ts__p">Proudly serving both B2C and B2B customers across Australia, we focus on quality products that work in real-world conditions. No cheap alternatives are available — every product offered at HooknLoop.com.au is carefully selected based on material quality, performance testing, and long-term reliability.</p>
            </div>
          </div>
          <div className="ts__block">
            <span className="ts__icn"><VIcon n="trade" /></span>
            <div>
              <h3 className="ts__h">Wholesale, Bulk &amp; Discounted Hook and Loop Supplies</h3>
              <p className="ts__p">With a large range of fasteners, tapes, straps and accessories held in stock, we offer competitive pricing for retail, trade and commercial buyers. Buy hook and loop tape by the roll, in bulk, or at wholesale rates — with volume discounts on larger orders. Sourcing fastening solutions is simple, cost-effective and reliable.</p>
            </div>
          </div>
          <a href="#" className="btn btn--primary ts__cta" onClick={goRead}>Read more<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
        </div>
        <div className="ts__media">
          <div className="ts__frame"><img src="/img/b2b-hero.jpg" alt="A hand holding hook-and-loop tape beside a glowing map of Australia and HooknLoop delivery boxes on a pallet" loading="lazy" /></div>
          <div className="ts__proof">
            <span className="ts__proof-stars" aria-hidden="true">★★★★★</span>
            <div><b>4.87 / 5</b><span>Serving B2C &amp; B2B across Australia</span></div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Why HooknLoop (value tiles) ───────────────────────────────────── */
function VIcon({ n }) {
  const c = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
  const m = {
    cut: <svg {...c}><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.1 8.1 21 18M8.1 15.9 21 6"/></svg>,
    stock: <svg {...c}><path d="M3 7l9-4 9 4-9 4-9-4Z"/><path d="M3 7v10l9 4 9-4V7"/></svg>,
    trade: <svg {...c}><path d="M3 3h18v4H3zM5 7v14h14V7M9 11h6"/></svg>,
    fire: <svg {...c}><path d="M12 3s5 4 5 9a5 5 0 0 1-10 0c0-2 1-3 1-3s3 1 4-6Z"/></svg>,
    invoice: <svg {...c}><path d="M6 2h9l3 3v17l-3-2-3 2-3-2-3 2V2Z"/><path d="M9 8h6M9 12h6"/></svg>,
    pin: <svg {...c}><path d="M12 22s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12Z"/><circle cx="12" cy="10" r="2.5"/></svg>,
    truck: <svg {...c}><path d="M2 6h11v11H2zM13 9h4l3 3v5h-7"/><circle cx="6" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/></svg>,
    shield: <svg {...c}><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z"/><path d="m9 12 2 2 4-4"/></svg>,
    returns: <svg {...c}><path d="M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5"/></svg>,
    lock: <svg {...c}><rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></svg>,
  }
  return m[n]
}
const WHY = [
  ['truck', 'Fast Australian shipping', 'Speedy delivery Australia-wide, dispatched in 1–2 business days.'],
  ['lock', 'Secure payment', 'Safe checkout with SSL encryption — Shop Pay, PayPal, Visa & Amex.'],
  ['trade', 'Bulk & trade pricing', 'Volume breaks and account terms for tradies and OEMs.'],
  ['stock', 'Huge range in stock', 'Twelve product ranges held in our Australian warehouse — self-adhesive, sew-on, dots, straps, double-sided and genuine VELCRO® Brand.'],
  ['invoice', 'GST tax invoice', 'A compliant Australian tax invoice on every order. ABN 93 878 995 217.'],
  ['pin', 'Australian owned', 'Australian warehouse, dispatched Australia-wide in 1–2 business days.'],
]
export function WhyUs() {
  return (
    <section className="why" aria-labelledby="why-h">
      <div className="wrap">
        <div className="sec-head">
          <span className="sec-eyebrow">Why HooknLoop</span>
          <h2 id="why-h" className="sec-h2">Six reasons trade buyers reorder</h2>
        </div>
        <div className="why__grid">
          {WHY.map(([icn, t, b]) => (
            <div key={t} className="why__tile">
              <span className="why__icn"><VIcon n={icn} /></span>
              <h3 className="why__t">{t}</h3>
              <p className="why__b">{b}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Fire Retardant highlight band ─────────────────────────────────── */
const FR_ROWS = [
  ['Treated FR backing', 'Fire-retardant treatment per the supplier’s technical data sheet — [from supplier TDS].'],
  ['Two formats, one range', 'Self-adhesive for fast fit-out; sew-on for upholstery, seating and fabric work.'],
  ['Trade-priced & in stock', 'From 100,000m+ in stock, with bulk & trade pricing on request.'],
]
export function FireRetardant() {
  return (
    <section className="fr" aria-labelledby="fr-h">
      <div className="fr__glow" aria-hidden="true" />
      <div className="wrap fr__inner">
        <div className="fr__copy">
          <span className="pill-blue">Fire Retardant Range</span>
          <h2 id="fr-h" className="fr__h2">Fire-retardant hook &amp; loop, stocked in Australia</h2>
          <p className="fr__lead">One of the few Australian suppliers holding fire-retardant hook &amp; loop in stock — in both self-adhesive and sew-on formats, dispatched in 1–2 business days.</p>
          <ul className="fr__rows">
            {FR_ROWS.map(([l, s]) => (
              <li key={l} className="fr__row">
                <span className="fr__row-icn"><VIcon n="fire" /></span>
                <span><b>{l}</b><span className="fr__row-sub">{s}</span></span>
              </li>
            ))}
          </ul>
          <div className="fr__cta">
            <a href="#" className="btn btn--primary">Shop the Fire Retardant range<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
            <a href="#" className="btn btn--ghost">Request the technical data sheet</a>
          </div>
          <p className="fr__micro">Fire-retardant properties are as stated on the manufacturer’s technical data sheet, supplied on request — we don’t publish a performance rating we can’t certify.</p>
        </div>
        <div className="fr__figure">
          <div className="fr__card"><img src="/img/p-fr.png" alt="Fire retardant hook and loop tape roll" loading="lazy" /></div>
          <div className="fr__chips">
            <div className="fr__chip"><b>Fire Retardant Adhesive</b><span>from $55.43 · incl. GST</span></div>
            <div className="fr__chip"><b>Fire Retardant Sew-On</b><span>from $32.53 · incl. GST</span></div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Trust bar (shipping · payment · returns) — reassurance above the footer ── */
const TRUST = [
  ['truck', 'Fast Australian Shipping', 'Speedy delivery Australia-wide'],
  ['shield', 'Secured Payment', 'Safe transactions with SSL encryption'],
  ['returns', 'Easy Returns', '30-day returns & free exchanges'],
]
export function TrustBar() {
  return (
    <section className="trust" aria-label="Shipping, payment and returns">
      <div className="wrap">
        <div className="trust__bar">
          {TRUST.map(([icn, t, s]) => (
            <div key={t} className="trust__item">
              <span className="trust__icn"><VIcon n={icn} /></span>
              <div className="trust__copy"><b>{t}</b><span>{s}</span></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
