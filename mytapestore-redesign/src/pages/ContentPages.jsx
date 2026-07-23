import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import ProductCard from '../components/ProductCard.jsx'
import Breadcrumbs from '../components/Breadcrumbs.jsx'
import { PRODUCTS, INDUSTRIES } from '../data/catalog.js'
import { navigate, useWish } from '../lib/cart.js'

const go = (e, h) => { e.preventDefault(); navigate(h) }
const Page = ({ crumbs, children }) => (
  <main id="main">
    <div className="wrap page__crumbs"><Breadcrumbs items={crumbs} /></div>
    {children}
  </main>
)

/* ---------- ABOUT ---------- */
export function AboutPage() {
  return (
    <Page crumbs={[{ label: 'Home', href: '/' }, { label: 'About us' }]}>
      <section className="page-hero">
        <div className="wrap">
          <span className="eyebrow eyebrow--onink">About</span>
          <h1>Australia's adhesive tape specialists</h1>
          <p>My Tape Store brings a complete range of industrial and everyday tapes direct to your doorstep — one supplier for double-sided, foam, foil, duct, hook &amp; loop, safety, packaging and specialty tapes, plus the dispensers to apply them.</p>
        </div>
      </section>
      <div className="wrap page-prose">
        <p>We're Australian owned and operated, and we keep a deep range in stock so you can order the exact tape your job needs — with volume discounts that apply automatically as your order grows.</p>
        <p>We stock trusted brands alongside our own value lines, back every stocked product with a lowest-price guarantee, and dispatch quickly to more than 3,600 postcodes across the country.</p>
        <div className="page-stats">
          <div><b className="num">{PRODUCTS.length}+</b><span>Tape lines in stock</span></div>
          <div><b className="num">{INDUSTRIES.length}</b><span>Industries served</span></div>
          <div><b className="num">3,600+</b><span>AU postcodes</span></div>
          <div><b className="num">2–3</b><span>Day typical delivery</span></div>
        </div>
      </div>
    </Page>
  )
}

/* ---------- CONTACT ---------- */
export function ContactPage() {
  const [sent, setSent] = useState(false)
  return (
    <Page crumbs={[{ label: 'Home', href: '/' }, { label: 'Contact us' }]}>
      <section className="page-hero"><div className="wrap"><span className="eyebrow eyebrow--onink">Get in touch</span><h1>Contact My Tape Store</h1><p>Questions about a product, a bulk order or a trade account? Talk to a real person — we're happy to help you find the right tape.</p></div></section>
      <div className="wrap contact">
        <div className="contact__info">
          <ul>
            <li><span className="contact__ic"><Icon name="phone" size={20} /></span><div><b>Phone</b><a href="tel:1300183481">1300 183 481</a></div></li>
            <li><span className="contact__ic"><Icon name="mail" size={20} /></span><div><b>Email</b><a href="mailto:info@mytapestore.com.au">info@mytapestore.com.au</a></div></li>
            <li><span className="contact__ic"><Icon name="clock" size={20} /></span><div><b>Hours</b><span>Mon–Fri · 9:00 AM – 5:00 PM AEST</span></div></li>
            <li><span className="contact__ic"><Icon name="shield" size={20} /></span><div><b>Business</b><span className="num">ABN 93 878 995 217 · Australian owned</span></div></li>
          </ul>
          <div className="contact__ship"><Icon name="truck" size={20} /><p>We dispatch to Melbourne, Sydney, Brisbane, Perth, Adelaide, Darwin and 3,600+ postcodes Australia-wide — most orders arrive in 2–3 business days.</p></div>
        </div>
        <form className="contact__form" onSubmit={(e) => { e.preventDefault(); setSent(true) }}>
          <h2>Send us a message</h2>
          {sent ? (
            <div className="contact__sent" role="status"><Icon name="check" size={22} /><div><b>Thanks — message received.</b><span>Our team will get back to you within one business day.</span></div></div>
          ) : <>
            <div className="contact__row"><label>Name<input required placeholder="Your name" /></label><label>Email<input required type="email" placeholder="you@email.com" /></label></div>
            <label>Subject<input placeholder="What's it about?" /></label>
            <label>Message<textarea rows="5" required placeholder="How can we help?" /></label>
            <button className="btn btn--brand btn--lg" type="submit">Send message <Icon name="arrowRight" size={18} /></button>
          </>}
        </form>
      </div>
    </Page>
  )
}

/* ---------- BULK / TRADE ---------- */
export function BulkPage() {
  const tiers = [['5 rolls', '5% off'], ['10 rolls', '10% off'], ['25 rolls', '20% off'], ['50 rolls +', '30% off']]
  return (
    <Page crumbs={[{ label: 'Home', href: '/' }, { label: 'Bulk & trade' }]}>
      <section className="page-hero"><div className="wrap"><span className="eyebrow eyebrow--onink">For business</span><h1>Bulk &amp; trade pricing</h1><p>Buying by the carton or fitting out a site? Volume discounts of up to 30% apply automatically at checkout, and trade accounts unlock further pricing and priority support.</p><div className="page-hero__cta"><a className="btn btn--brand btn--lg" href="tel:1300183481"><Icon name="phone" size={18} /> 1300 183 481</a><a className="btn btn--ghost btn--lg" href="#/contact" onClick={(e) => go(e, '/contact')}>Open a trade account</a></div></div></section>
      <div className="wrap section">
        <div className="section-head"><div className="section-title-wrap"><span className="eyebrow">Automatic at checkout</span><h2>Volume discount tiers</h2></div></div>
        <div className="bulk-tiers">
          {tiers.map(([q, d]) => <div key={q} className="bulk-tier"><b className="num">{d}</b><span>{q}</span></div>)}
        </div>
        <p className="bulk-note">Discounts shown are indicative and apply per eligible line; exact tiers vary by product and are calculated automatically at checkout. For pallet quantities or a standing trade account, call us on 1300 183 481.</p>
      </div>
    </Page>
  )
}

/* ---------- POLICIES ---------- (content mirrors mytapestore.com.au) */
const POLICIES = {
  shipping: {
    title: 'Shipping & delivery', eyebrow: 'Customer care',
    intro: 'My Tape Store is committed to fast, easy shipping for every customer in Australia. Here’s what to expect when your order is on its way.',
    body: [
      { h: 'Shipping locations', p: 'We deliver to every single part of Australia — no exceptions. Whether you’re in a busy city or a remote area, we deliver direct to your door.' },
      { h: 'Shipping options', list: [
        'Standard shipping — the cost-effective option when you don’t need express speed. Delivered within 5–7 business days.',
        'Express shipping — need your tapes fast? Express orders arrive within 3–5 business days.',
      ] },
      { h: 'Order processing', p: 'We process orders quickly during business hours, within 1–2 days. Orders placed before our daily cut-off are processed the same business day.' },
      { h: 'Order tracking', p: 'Every shipment includes tracking so you can follow your parcel in real time — on our website or through the carrier’s online tracking system.' },
      { h: 'Shipping fees', p: 'Fees depend on your chosen shipping option, the weight of your order and the delivery location. All charges are shown before checkout so you can confirm the total before you pay.' },
    ],
  },
  returns: {
    title: 'Return & exchange policy', eyebrow: 'Customer care',
    intro: 'We strive to provide you with the best product and service. If you need to return a product, kindly follow our guidelines below.',
    body: [
      { h: 'Eligibility for returns', list: [
        'Incorrect items sent by My Tape Store can be returned for exchange.',
        'Items ordered by mistake can be returned, at the customer’s expense.',
      ] },
      { h: 'Faulty or damaged items', p: 'We’ll replace any defective or damaged product if you file a claim within 2 days of the parcel’s signature date. We ask for photographs as proof of damage; once we verify the evidence, we send a free replacement.' },
      { h: 'Return timeframe', p: 'Items must be returned within 30 days from the date of delivery.' },
      { h: 'Refund processing', p: 'We guarantee full refunds within 7 days of receiving the returned item. Refunds apply to undamaged products that maintain proper resale quality.' },
      { h: 'Return authorisation', p: 'Email info@mytapestore.com.au to start a return — include your order number and a few sentences explaining the reason. We’ll reply with return instructions and authorisation.' },
      { h: 'Packaging & documentation', p: 'Please pack returned goods carefully so they arrive in good condition — use the original packaging where possible — and include your original invoice with any authorised return documentation.' },
      { h: 'Damaged goods', p: 'Items damaged in shipping because of poor packaging or transport can’t be returned.' },
    ],
  },
  privacy: {
    title: 'Privacy policy', eyebrow: 'Customer care',
    intro: 'We collect only the information needed to process your order and support you.',
    body: [
      'We collect your name, contact details, delivery address and order history to fulfil orders and provide support. We don’t sell your personal information.',
      'Payment details are handled by trusted, encrypted payment providers and are never stored on our servers. You can contact us any time to access or remove your information.',
    ],
  },
  terms: {
    title: 'Terms & conditions', eyebrow: 'Customer care',
    intro: 'By ordering from My Tape Store you agree to these terms.',
    body: [
      'Prices are in Australian dollars and include GST. We aim for accuracy in product descriptions and pricing but reserve the right to correct errors.',
      'Title passes on full payment. Nothing in these terms limits the rights you have under the Australian Consumer Law.',
    ],
  },
}

function PolicyBlock({ block }) {
  if (typeof block === 'string') return <p>{block}</p>
  return (
    <div className="policy-block">
      {block.h && <h2 className="policy-block__h">{block.h}</h2>}
      {block.p && <p>{block.p}</p>}
      {block.list && <ul className="policy-list">{block.list.map((li, i) => <li key={i}><Icon name="check" size={16} />{li}</li>)}</ul>}
    </div>
  )
}

export function PolicyPage({ which }) {
  const p = POLICIES[which] || POLICIES.shipping
  return (
    <Page crumbs={[{ label: 'Home', href: '/' }, { label: p.title }]}>
      <section className="page-hero"><div className="wrap"><span className="eyebrow eyebrow--onink">{p.eyebrow}</span><h1>{p.title}</h1>{p.intro && <p className="page-hero__intro">{p.intro}</p>}</div></section>
      <div className="wrap page-prose page-prose--policy">
        {p.body.map((block, i) => <PolicyBlock key={i} block={block} />)}
        <div className="policy-help">
          <div>
            <b>Need a hand?</b>
            <span>Call <a href="tel:1300183481">1300 183 481</a> or email <a href="mailto:info@mytapestore.com.au">info@mytapestore.com.au</a></span>
          </div>
          <a className="btn btn--brand" href="#/contact" onClick={(e) => go(e, '/contact')}>Contact us <Icon name="arrowRight" size={16} /></a>
        </div>
      </div>
    </Page>
  )
}

/* ---------- WISHLIST ---------- */
export function AccountPage() {
  const [mode, setMode] = useState('signin')
  const [done, setDone] = useState(false)
  const swap = (m) => { setMode(m); setDone(false) }
  return (
    <Page crumbs={[{ label: 'Home', href: '/' }, { label: mode === 'signin' ? 'Sign in' : 'Create account' }]}>
      <div className="wrap page-hero page-hero--plain">
        <span className="eyebrow">Your account</span>
        <h1>{mode === 'signin' ? 'Sign in to My Tape Store' : 'Create your account'}</h1>
      </div>
      <div className="wrap auth">
        <div className="auth__card">
          <div className="auth__tabs" role="tablist">
            <button role="tab" aria-selected={mode === 'signin'} className={'auth__tab' + (mode === 'signin' ? ' is-active' : '')} onClick={() => swap('signin')}>Sign in</button>
            <button role="tab" aria-selected={mode === 'register'} className={'auth__tab' + (mode === 'register' ? ' is-active' : '')} onClick={() => swap('register')}>Create account</button>
          </div>
          {done ? (
            <div className="auth__done" role="status">
              <span className="auth__done-ic"><Icon name="check" size={26} /></span>
              <b>{mode === 'signin' ? 'Welcome back!' : 'Your account is ready.'}</b>
              <p>You're all set — start browsing the range or head to your cart.</p>
              <a className="btn btn--brand btn--lg" href="#/shop" onClick={(e) => go(e, '/shop')}>Continue shopping <Icon name="arrowRight" size={18} /></a>
            </div>
          ) : (
            <form className="auth__form" onSubmit={(e) => { e.preventDefault(); setDone(true) }}>
              {mode === 'register' && (
                <label className="auth__field"><span>Full name</span><input type="text" required placeholder="Your name" /></label>
              )}
              <label className="auth__field"><span>Email address</span><input type="email" required placeholder="you@company.com.au" /></label>
              <label className="auth__field">
                <span>Password{mode === 'signin' && <a className="auth__forgot" href="#/account" onClick={(e) => e.preventDefault()}>Forgot?</a>}</span>
                <input type="password" required placeholder="••••••••" />
              </label>
              <button className="btn btn--brand btn--lg btn--block" type="submit">{mode === 'signin' ? 'Sign in' : 'Create account'}</button>
            </form>
          )}
          <p className="auth__alt">
            {mode === 'signin'
              ? <>New to My Tape Store? <button onClick={() => swap('register')}>Create an account</button></>
              : <>Already registered? <button onClick={() => swap('signin')}>Sign in</button></>}
          </p>
        </div>
        <ul className="auth__perks">
          <li><Icon name="truck" size={18} /><span>Track orders and reorder in a click</span></li>
          <li><Icon name="tag" size={18} /><span>See trade pricing and volume discounts</span></li>
          <li><Icon name="heart" size={18} /><span>Save products to your wishlist</span></li>
          <li><Icon name="lock" size={18} /><span>Faster, secure checkout every time</span></li>
        </ul>
      </div>
    </Page>
  )
}

export function WishlistPage() {
  const wish = useWish()
  const items = PRODUCTS.filter((p) => wish.includes(p.handle))
  return (
    <Page crumbs={[{ label: 'Home', href: '/' }, { label: 'Wishlist' }]}>
      <div className="wrap page-hero page-hero--plain">
        <span className="eyebrow">Saved for later</span>
        <h1>Your wishlist</h1>
        <p className="wishlist__count">{items.length ? `${items.length} item${items.length !== 1 ? 's' : ''} saved — tap the heart again to remove.` : 'Nothing saved yet.'}</p>
      </div>
      <div className="wrap section--tight">
        {items.length ? (
          <>
            <div className="grid-products grid-products--5">{items.map((p) => <ProductCard key={p.handle} p={p} />)}</div>
            <div className="wishlist__foot">
              <a className="btn btn--ghost" href="#/shop" onClick={(e) => go(e, '/shop')}><Icon name="chevronRight" size={15} className="wishlist__back" /> Continue shopping</a>
            </div>
          </>
        ) : (
          <div className="col__empty">
            <span className="wishlist__empty-ic"><Icon name="heart" size={34} /></span>
            <p>Your wishlist is empty. Tap the heart on any product to save it here for later.</p>
            <a className="btn btn--brand btn--lg" href="#/shop" onClick={(e) => go(e, '/shop')}>Browse products <Icon name="arrowRight" size={18} /></a>
          </div>
        )}
      </div>
    </Page>
  )
}
