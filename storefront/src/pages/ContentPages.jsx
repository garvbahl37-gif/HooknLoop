/*  Content pages — Contact · Bulk Order · About · Policies · Search · Blog.
    Share a PageHero shell. Real, compliant copy (no fabricated claims).         */
import { useState, useEffect } from 'react'
import { PRODUCTS } from '../data/catalog.js'
import { navigate } from '../lib/cart.js'
import { useWishlist, removeWish } from '../lib/wishlist.js'
import ProductCard from '../components/ProductCard.jsx'
import BulkTrade from '../sections/BulkTrade.jsx'

function PageHero({ eyebrow, title, lead, center }) {
  return (
    <div className={`page__hero ${center ? 'page__hero--center' : ''}`}>
      <div className="wrap">
        {eyebrow && <span className="sec-eyebrow sec-eyebrow--orange">{eyebrow}</span>}
        <h1 className="page__hero-h1">{title}</h1>
        {lead && <p className="page__hero-lead">{lead}</p>}
      </div>
    </div>
  )
}

/* ── Contact (real details from the live store) ── */
const MAP_SRC = 'https://maps.google.com/maps?q=Level%205%2C%20111%20Cecil%20St%2C%20South%20Melbourne%20VIC%203205&t=&z=15&ie=UTF8&iwloc=&output=embed'
const SOCIALS = [
  ['Facebook', 'https://www.facebook.com/profile.php?id=61587201524181', <path key="f" d="M13.5 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5H17V4c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4V10H8v3h2.6v8h2.9Z" />],
  ['Instagram', 'https://www.instagram.com/hooknloopshop', <path key="i" d="M16 3H8a5 5 0 0 0-5 5v8a5 5 0 0 0 5 5h8a5 5 0 0 0 5-5V8a5 5 0 0 0-5-5Zm-4 5.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7ZM17.5 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z" />],
  ['Pinterest', 'https://www.pinterest.com/hooknloopshop/', <path key="p" d="M12 2C6.5 2 4 5.6 4 8.9c0 2 .7 3.6 2.3 4.3.3.1.5 0 .5-.3l.2-.9c.1-.3 0-.4-.2-.6-.5-.5-.7-1.2-.7-2 0-2.5 1.9-4.7 4.9-4.7 2.7 0 4.1 1.6 4.1 3.8 0 2.8-1.2 5.2-3.1 5.2-1 0-1.8-.9-1.5-1.9.3-1.3.9-2.6.9-3.5 0-.8-.4-1.5-1.3-1.5-1.1 0-1.9 1.1-1.9 2.6 0 .9.3 1.5.3 1.5l-1.2 5.3c-.4 1.5-.1 3.4 0 3.6 0 .1.2.1.3 0 .1-.1 1.6-2 2.1-3.8l.7-2.8c.4.8 1.5 1.4 2.6 1.4 3.5 0 5.9-3.2 5.9-7.5C20 4.9 17 2 12 2Z" />],
  ['LinkedIn', 'https://www.linkedin.com/company/hooknloop/', <path key="l" d="M6.9 8.5H4.2V20h2.7V8.5ZM5.5 4a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2ZM20 13.4c0-2.6-1.4-3.8-3.3-3.8-1.5 0-2.2.8-2.6 1.4V8.5h-2.7V20h2.7v-6.4c0-.3 0-.7.1-.9.3-.7.9-1.4 1.9-1.4 1.3 0 1.9.9 1.9 2.3V20H20v-6.6Z" />],
]
export function ContactPage() {
  const [sent, setSent] = useState(false)
  return (
    <main id="main" className="page">
      <PageHero eyebrow="We’re here to help" title="Contact HooknLoop" lead="Talk to a real person in Australia about products, bulk pricing or an existing order." center />
      <div className="wrap page__two">
        <div className="page__prose">
          <div className="contact__cards">
            <a className="contact__card" href="tel:1300183481"><span>Call</span><b>1300 183 481</b><em>Mon–Fri, Australian business hours</em></a>
            <a className="contact__card" href="mailto:info@hooknloop.com.au"><span>Email</span><b>info@hooknloop.com.au</b><em>Replies within 1 business day</em></a>
            <a className="contact__card" href="https://maps.google.com/?q=Level+5,+111+Cecil+St,+South+Melbourne+VIC+3205" target="_blank" rel="noreferrer"><span>Visit us</span><b>Level 5, 111 Cecil St</b><em>South Melbourne VIC 3205</em></a>
            <div className="contact__card"><span>Business</span><b>ABN 93 878 995 217</b><em>GST tax invoice on every order</em></div>
          </div>
          <div className="contact__social">
            <span className="contact__social-lbl">Follow us</span>
            <div className="contact__social-row">
              {SOCIALS.map(([name, url, icon]) => (
                <a key={name} href={url} target="_blank" rel="noreferrer" className="contact__social-btn" aria-label={name}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">{icon}</svg>
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="page__card">
          {sent ? <div className="form__ok"><b>Message sent</b><span>We’ll get back to you within 1 business day.</span></div> : (
            <form onSubmit={(e) => { e.preventDefault(); setSent(true) }}>
              <h2>Send us a message</h2>
              <label className="fld"><span>Name</span><input required placeholder="Your name" /></label>
              <label className="fld"><span>Email</span><input type="email" required placeholder="you@email.com" /></label>
              <label className="fld"><span>Phone</span><input type="tel" required placeholder="Your phone number" /></label>
              <label className="fld"><span>Message</span><textarea rows="4" required placeholder="How can we help?" /></label>
              <button className="btn btn--primary" style={{ width: '100%' }}>Send message</button>
            </form>
          )}
        </div>
      </div>
      <div className="wrap contact__map">
        <iframe title="HooknLoop — Level 5, 111 Cecil St, South Melbourne VIC 3205" src={MAP_SRC} loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade"></iframe>
      </div>
    </main>
  )
}

/* ── Bulk order (reuses the trade band as a full page) ── */
export function BulkPage() {
  return (
    <main id="main" className="page">
      <PageHero eyebrow="For trade & bulk buyers" title="Bulk & trade pricing" lead="Industrial hook & loop at volume pricing, with a GST tax invoice and one contact for repeat orders." center />
      <BulkTrade />
    </main>
  )
}

/* ── About ── */
export function AboutPage() {
  return (
    <main id="main" className="page">
      <PageHero eyebrow="Australian owned" title="A real supplier, not a drop-shipper" lead="HooknLoop is an ABN-registered Australian business holding genuine hook & loop stock in Australia — held on the shelf and dispatched fast." center />
      <div className="wrap page__prose page__prose--narrow">
        <p>We stock industrial hook & loop fasteners — self-adhesive, sew-on, dots, straps, double-sided and fire-retardant grades — plus genuine VELCRO® Brand product. Everything is held on the shelf in our Australian warehouse and cut to the exact length your job needs, with no minimums.</p>
        <h2>What sets us apart</h2>
        <ul className="page__ul">
          <li><b>Real stock, real dispatch.</b> 100,000m+ on hand, shipped Australia-wide in 1–2 business days — not imported to order.</li>
          <li><b>Both halves, one item.</b> Most suppliers make you order hook and loop separately. We default to a complete set that actually fastens.</li>
          <li><b>Trade-ready.</b> GST tax invoice on every order, ABN 93 878 995 217, volume pricing and account terms for regular buyers.</li>
          <li><b>Any width, no minimums.</b> Order the exact quantity your job needs.</li>
        </ul>
        <div className="page__cta"><a href="#" className="btn btn--primary" onClick={(e) => { e.preventDefault(); navigate('collection') }}>Shop the range →</a></div>
      </div>
    </main>
  )
}

/* ── Policy pages (real content from the live store, premium layout) ── */
function PIcon({ n }) {
  const c = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' }
  const m = {
    truck: <svg {...c}><path d="M2 6h11v11H2zM13 9h4l3 3v5h-7"/><circle cx="6" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/></svg>,
    pin: <svg {...c}><path d="M12 22s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12Z"/><circle cx="12" cy="10" r="2.5"/></svg>,
    box: <svg {...c}><path d="M3 7l9-4 9 4-9 4-9-4Z"/><path d="M3 7v10l9 4 9-4V7"/></svg>,
    clock: <svg {...c}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
    route: <svg {...c}><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h7a4 4 0 0 0 0-8H9a4 4 0 0 1 0-8h7"/></svg>,
    trade: <svg {...c}><path d="M3 3h18v4H3zM5 7v14h14V7M9 11h6"/></svg>,
    check: <svg {...c}><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg>,
    x: <svg {...c}><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/></svg>,
    mail: <svg {...c}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>,
    card: <svg {...c}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>,
    alert: <svg {...c}><path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4M12 17h.01"/></svg>,
    lock: <svg {...c}><rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></svg>,
    shield: <svg {...c}><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z"/><path d="m9 12 2 2 4-4"/></svg>,
    doc: <svg {...c}><path d="M6 2h9l3 3v17H6V2Z"/><path d="M9 9h6M9 13h6M9 17h4"/></svg>,
  }
  return m[n]
}
const POLICIES = {
  shipping: {
    eyebrow: 'Delivery', title: 'Shipping & delivery',
    lead: 'Dispatched from our Australian warehouse and delivered Australia-wide by trusted couriers.',
    highlights: [['1–2 days', 'Dispatch time'], ['Free', 'Shipping over $200'], ['2–5 days', 'Metro delivery'], ['3–7 days', 'Regional delivery']],
    sections: [
      ['truck', 'Order processing', 'Orders take 1–2 business days to be processed. Orders made during weekends or on holidays are handled the following working day. Order confirmation and tracking details are sent after your order is dispatched.'],
      ['pin', 'Delivery locations', 'We ship Australia-wide, covering metro areas plus regional and rural locations.'],
      ['box', 'Shipping methods', 'Calculation of shipping methods and costs is done at checkout, depending on the delivery address and the parcel’s weight and size.'],
      ['clock', 'Estimated delivery time', 'Metro areas: within 2–5 business days. Regional areas: within 3–7 business days. This is only an estimate and may change due to courier delays or during peak times.'],
      ['route', 'Tracking your order', 'A tracking number is sent via email so you can monitor your delivery once your order is dispatched.'],
      ['trade', 'Bulk & wholesale orders', 'Large or bulk orders may be shipped separately or via freight. For any special arrangements, our team will contact you.'],
    ],
  },
  returns: {
    eyebrow: 'Returns & exchanges', title: 'Returns & exchanges',
    lead: 'Not right for the job? Here’s exactly how returns, refunds and faulty items work.',
    highlights: [['14 days', 'Return window'], ['Faulty', 'Always covered'], ['2 steps', 'Simple process']],
    sections: [
      ['check', 'Returns eligibility', 'You are eligible to ask for a return if:', ['The item is unused and in its original packaging', 'You request a return within 14 days of delivery', 'You received a faulty, damaged or incorrect item']],
      ['x', 'Non-returnable items', 'We can’t accept returns on:', ['Used or cut products', 'Clearance or custom orders (unless faulty)']],
      ['mail', 'How to request a return', null, ['Email support@hooknloop.com.au with your order number', 'Our team will review your request and provide return instructions']],
      ['card', 'Refunds', null, ['After approval, refunds are processed back to the original payment method', 'Shipping fees are non-refundable unless the item is faulty']],
      ['alert', 'Damaged or incorrect items', 'If your order is damaged or wrong, please contact us within 48 hours of delivery with photos for a fast solution.'],
    ],
  },
  privacy: {
    eyebrow: 'Your data', title: 'Privacy policy',
    lead: 'What we collect, how we use it, and the control you have over it.',
    sections: [
      ['lock', 'What we collect', 'Only what we need to process your order and provide support — your name, contact details, and delivery and payment information.'],
      ['shield', 'How we use it', 'To fulfil your orders, provide support, and — if you opt in — send occasional updates. We don’t sell your data.'],
      ['check', 'Your rights', 'Contact us any time to access or delete the information we hold about you.'],
    ],
  },
  terms: {
    eyebrow: 'The fine print', title: 'Terms & conditions',
    lead: 'By ordering on our site and placing an order, you accept the following terms and conditions.',
    highlights: [['AUD', 'All prices quoted'], ['Secure', 'Payments processed'], ['Victoria', 'Governing law']],
    sections: [
      ['doc', 'General', null, ['Every price is quoted in Australian Dollars (AUD).', 'Prices and the availability of products might vary without prior notice.', 'We may deny service to anyone at our own discretion.']],
      ['box', 'Product information', 'We attempt to be precise in product descriptions and images. There might, however, be slight differences because of manufacturing or display differences.'],
      ['card', 'Orders & payments', null, ['When payment is made successfully, the orders are confirmed.', 'The payments are safely processed through reliable payment services.']],
      ['truck', 'Shipping & delivery', 'Delivery times are approximations. HooknLoop.com.au does not deal with courier delays or external delays.'],
      ['shield', 'Limitation of liability', 'HooknLoop.com.au does not have to incur indirect or consequential losses caused by the usage of our products or website.'],
      ['pin', 'Governing law', 'Such terms are governed by the laws of Victoria, Australia.'],
    ],
  },
}
export function PolicyPage({ which }) {
  const key = POLICIES[which] ? which : 'shipping'
  const p = POLICIES[key]
  const others = Object.entries(POLICIES).filter(([k]) => k !== key)
  return (
    <main id="main" className="page">
      <PageHero eyebrow={p.eyebrow} title={p.title} lead={p.lead} center />
      <div className="wrap policy2">
        <div className="policy2__main">
          {p.highlights && (
            <div className="policy2__hls">
              {p.highlights.map(([v, l]) => <div key={l} className="policy2__hl"><b>{v}</b><span>{l}</span></div>)}
            </div>
          )}
          <div className="policy2__cards">
            {p.sections.map(([icn, h, b, bullets]) => (
              <div key={h} className="policy2__card">
                <span className="policy2__icn"><PIcon n={icn} /></span>
                <div className="policy2__body">
                  <h2>{h}</h2>
                  {b && <p>{b}</p>}
                  {bullets && <ul className="policy2__ul">{bullets.map((x) => <li key={x}>{x}</li>)}</ul>}
                </div>
              </div>
            ))}
          </div>
        </div>
        <aside className="policy2__side">
          <div className="policy2__help">
            <h3>Need a hand?</h3>
            <p>Talk to a real person in Australia about your order, delivery or a return.</p>
            <a className="btn btn--primary" href="mailto:support@hooknloop.com.au">Email support</a>
            <a className="policy2__call" href="tel:1300183481">or call 1300 183 481</a>
          </div>
          <div className="policy2__links">
            <span className="policy2__links-lbl">Other policies</span>
            {others.map(([k, o]) => (
              <a key={k} href="#" onClick={(e) => { e.preventDefault(); navigate(k) }}>{o.title}<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
            ))}
          </div>
        </aside>
      </div>
    </main>
  )
}

/* ── Search ── */
export function SearchPage({ query = '' }) {
  const [q, setQ] = useState(() => decodeURIComponent(query))
  /* a fresh search from the header must replace what's in the box */
  useEffect(() => { setQ(decodeURIComponent(query)) }, [query])

  const results = q.trim() ? PRODUCTS.filter((p) => (p.name + ' ' + p.spec + ' ' + p.cat).toLowerCase().includes(q.toLowerCase())) : PRODUCTS
  return (
    <main id="main" className="page">
      <PageHero title="Search products" />
      <div className="wrap">
        <div className="search__big">
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by product, width, or type…" aria-label="Search" />
        </div>
        <p className="page__lead" style={{ marginBottom: 24 }}>{results.length} result{results.length !== 1 ? 's' : ''}{q && <> for “{q}”</>}</p>
        <div className="coll__grid coll__grid--full">{results.map((p) => <ProductCard key={p.handle} p={p} />)}</div>
      </div>
    </main>
  )
}

/* ── Wishlist ── */
export function WishlistPage() {
  const list = useWishlist()
  const items = PRODUCTS.filter((p) => list.includes(p.handle))

  return (
    <main id="main" className="page">
      {items.length === 0 ? (
        <div className="wrap cart__empty">
          <div className="cart__empty-icn">♡</div>
          <h1 className="page__h1">Nothing saved yet</h1>
          <p className="page__lead">Tap the heart on any product to keep it here for later.</p>
          <a href="#" className="btn btn--primary" onClick={(e) => { e.preventDefault(); navigate('collection') }}>Shop all products →</a>
        </div>
      ) : (
        <div className="wrap">
          <div className="coll__head">
            <div>
              <span className="sec-eyebrow">Saved</span>
              <h1 className="page__h1">Your wishlist</h1>
              <p className="page__lead">{items.length} saved product{items.length !== 1 ? 's' : ''} · kept on this device</p>
            </div>
            <button className="coll__clear" onClick={() => items.forEach((p) => removeWish(p.handle))}>Clear all</button>
          </div>
          <div className="coll__grid coll__grid--full">{items.map((p) => <ProductCard key={p.handle} p={p} />)}</div>
        </div>
      )}
    </main>
  )
}

/* ── Blog (honest empty state — the real blog has no posts) ── */
export function BlogPage() {
  const PLANNED = ['Velcro vs hook & loop: what’s the difference?', 'Hook side vs loop side — which goes where', 'Sew-on vs self-adhesive', 'Fire-retardant hook & loop standards in Australia']
  return (
    <main id="main" className="page">
      <PageHero eyebrow="Guides & how-tos" title="The HooknLoop blog" lead="Practical guides for choosing and using hook & loop. First articles coming soon." />
      <div className="wrap page__prose page__prose--narrow">
        <h2>On the way</h2>
        <ul className="page__ul">{PLANNED.map((t) => <li key={t}>{t}</li>)}</ul>
        <p>Want these in your inbox as they land? Subscribe in the footer.</p>
      </div>
    </main>
  )
}
