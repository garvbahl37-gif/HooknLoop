import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import ProductCard from '../components/ProductCard.jsx'
import Breadcrumbs from '../components/Breadcrumbs.jsx'
import { PRODUCTS, INDUSTRIES, findProduct } from '../data/catalog.js'
import { navigate, useWish, money, addToCart } from '../lib/cart.js'

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
        <p>We're Australian owned, and we keep a deep range in stock so you can order the exact tape your job needs — with volume discounts that apply automatically as your order grows.</p>
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

/* ---------- ACCOUNT: sign-in/register + dashboard ---------- */
/* Session persists client-side, same localStorage pattern as cart/wishlist.
   No backend on this redesign, so "signing in" is honest about being a demo:
   a returning-customer sign-in gets a small set of realistic past orders
   (real catalogue products/prices), a fresh registration starts with none. */
const ACCT_KEY = 'mts_account_v1'
const getAccount = () => { try { return JSON.parse(localStorage.getItem(ACCT_KEY)) } catch { return null } }
const saveAccount = (acc) => localStorage.setItem(ACCT_KEY, JSON.stringify(acc))
const clearAccount = () => localStorage.removeItem(ACCT_KEY)

const ORDER_STATUS = {
  completed: { label: 'Completed', cls: 'tag--stock' },
  shipped: { label: 'Shipped', cls: 'tag--processing' },
  processing: { label: 'Processing', cls: 'tag--processing' },
  cancelled: { label: 'Cancelled', cls: 'tag--out' },
}
const DEMO_ORDERS = [
  { id: '10241', date: 'Jul 14, 2026', status: 'completed', items: [{ handle: 'hook-loop-roll-adhesive-backed', qty: 2 }, { handle: 'general-purpose-masking-tape', qty: 1 }] },
  { id: '10198', date: 'Jun 28, 2026', status: 'shipped', items: [{ handle: 'gaffer-tape', qty: 3 }] },
  { id: '10122', date: 'Jun 2, 2026', status: 'completed', items: [{ handle: 'clear-packaging-tape', qty: 4 }, { handle: 'black-electrical-tape', qty: 2 }] },
  { id: '10077', date: 'May 11, 2026', status: 'cancelled', items: [{ handle: 'danger-tape', qty: 1 }] },
  { id: '9958', date: 'Mar 30, 2026', status: 'completed', items: [{ handle: 'frog-tapes-multi-surface', qty: 1 }, { handle: 'anti-slip-tread-tape', qty: 2 }] },
]
const orderTotal = (order) => order.items.reduce((sum, it) => {
  const p = findProduct(it.handle)
  return sum + (p ? (p.price ?? p.from ?? 0) * it.qty : 0)
}, 0)
const reorder = (order) => {
  order.items.forEach((it) => {
    const p = findProduct(it.handle)
    if (!p) return
    addToCart({ key: p.handle + '|reorder-' + order.id, handle: p.handle, name: p.name, img: p.img, price: p.price ?? p.from, sku: p.sku, variant: '', qty: it.qty })
  })
  navigate('/cart')
}

function AcctOrdersTable({ orders }) {
  const [open, setOpen] = useState(null)
  if (!orders.length) return (
    <div className="col__empty">
      <Icon name="layers" size={34} />
      <p>No orders yet — once you place one, it'll show up here.</p>
      <a className="btn btn--brand btn--lg" href="#/shop" onClick={(e) => go(e, '/shop')}>Start shopping <Icon name="arrowRight" size={18} /></a>
    </div>
  )
  return (
    <div className="acct-orders">
      {orders.map((o) => {
        const status = ORDER_STATUS[o.status]
        const isOpen = open === o.id
        return (
          <div key={o.id} className={'acct-order' + (isOpen ? ' is-open' : '')}>
            <button className="acct-order__row" onClick={() => setOpen(isOpen ? null : o.id)} aria-expanded={isOpen}>
              <span className="acct-order__id num">#{o.id}</span>
              <span className="acct-order__date">{o.date}</span>
              <span className={'tag ' + status.cls}>{status.label}</span>
              <span className="acct-order__total num">{money(orderTotal(o))}</span>
              <Icon name="chevronDown" size={16} className="acct-order__chev" />
            </button>
            {isOpen && (
              <div className="acct-order__detail">
                <ul className="acct-order__items">
                  {o.items.map((it) => {
                    const p = findProduct(it.handle)
                    if (!p) return null
                    return (
                      <li key={it.handle}>
                        <img src={p.img} alt="" width="44" height="44" />
                        <a className="acct-order__item-name" href={'#/product/' + p.handle} onClick={(e) => go(e, '/product/' + p.handle)}>{p.name}</a>
                        <span className="num acct-order__item-qty">× {it.qty}</span>
                        <span className="num">{money((p.price ?? p.from) * it.qty)}</span>
                      </li>
                    )
                  })}
                </ul>
                {o.status !== 'cancelled' && (
                  <button className="btn btn--ghost" onClick={() => reorder(o)}><Icon name="refresh" size={15} /> Reorder these items</button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function AcctOverview({ account, orders, wishCount, setTab }) {
  const totalSpent = orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + orderTotal(o), 0)
  return (
    <div className="acct__panel">
      <h2>Welcome back{account.name ? `, ${account.name}` : ''}</h2>
      <p className="acct__lede">Here's what's happening with your account.</p>
      <div className="page-stats acct__stats">
        <div><b className="num">{orders.length}</b><span>Orders placed</span></div>
        <div><b className="num">{money(totalSpent)}</b><span>Total spent</span></div>
        <div><b className="num">{wishCount}</b><span>Items saved</span></div>
      </div>
      {orders.length > 0 && (
        <div className="acct__panel-head">
          <h3>Recent orders</h3>
          <button type="button" className="acct__viewall" onClick={() => setTab('orders')}>View all <Icon name="chevronRight" size={14} /></button>
        </div>
      )}
      <AcctOrdersTable orders={orders.slice(0, 3)} />
    </div>
  )
}

function AcctAddresses() {
  return (
    <div className="acct__panel">
      <h2>Addresses</h2>
      <div className="col__empty">
        <Icon name="mapPin" size={34} />
        <p>No saved addresses yet — add one at checkout and we'll remember it here next time.</p>
        <a className="btn btn--brand btn--lg" href="#/checkout" onClick={(e) => go(e, '/checkout')}>Go to checkout <Icon name="arrowRight" size={18} /></a>
      </div>
    </div>
  )
}

function AcctDetails({ account, onSave }) {
  const [name, setName] = useState(account.name || '')
  const [email, setEmail] = useState(account.email || '')
  const [saved, setSaved] = useState(false)
  const submit = (e) => {
    e.preventDefault()
    onSave({ ...account, name: name.trim(), email: email.trim() })
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }
  return (
    <div className="acct__panel">
      <h2>Account details</h2>
      <form className="auth__form acct__form" onSubmit={submit}>
        <label className="auth__field"><span>Full name</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /></label>
        <label className="auth__field"><span>Email address</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com.au" /></label>
        <div className="acct__form-actions">
          <button className="btn btn--brand" type="submit">Save changes</button>
          {saved && <span className="acct__saved"><Icon name="check" size={15} /> Saved</span>}
        </div>
      </form>
    </div>
  )
}

function AcctSidebar({ account, tab, setTab, onSignOut }) {
  const initial = (account.name || account.email || 'A').trim().slice(0, 1).toUpperCase()
  const NAV = [
    ['overview', 'Dashboard', 'grid'],
    ['orders', 'Orders', 'layers'],
    ['addresses', 'Addresses', 'mapPin'],
    ['details', 'Account details', 'user'],
  ]
  return (
    <aside className="acct__side">
      <div className="acct__profile">
        <span className="acct__avatar">{initial}</span>
        <b>{account.name || 'Your account'}</b>
        {account.email && <span className="num">{account.email}</span>}
      </div>
      <nav className="acct__nav">
        {NAV.map(([id, label, ic]) => (
          <button key={id} type="button" className={'acct__nav-item' + (tab === id ? ' is-active' : '')} onClick={() => setTab(id)}>
            <Icon name={ic} size={17} /><span>{label}</span>
          </button>
        ))}
        <a className="acct__nav-item" href="#/wishlist" onClick={(e) => go(e, '/wishlist')}><Icon name="heart" size={17} /><span>Wishlist</span></a>
        <button type="button" className="acct__nav-item acct__nav-item--out" onClick={onSignOut}><Icon name="close" size={17} /><span>Sign out</span></button>
      </nav>
    </aside>
  )
}

export function AccountPage() {
  const [account, setAccountState] = useState(getAccount)
  const [mode, setMode] = useState('signin')
  const [tab, setTab] = useState('overview')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const wish = useWish()

  const swap = (m) => setMode(m)

  const submit = (e) => {
    e.preventDefault()
    const isRegister = mode === 'register'
    const acc = { name: name.trim(), email: email.trim(), isNew: isRegister }
    saveAccount(acc)
    setAccountState(acc)
    setTab('overview')
  }

  const signOut = () => { clearAccount(); setAccountState(null); setMode('signin'); setName(''); setEmail('') }
  const updateAccount = (acc) => { saveAccount(acc); setAccountState(acc) }

  if (!account) {
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
            <form className="auth__form" onSubmit={submit}>
              {mode === 'register' && (
                <label className="auth__field"><span>Full name</span><input type="text" required placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} /></label>
              )}
              <label className="auth__field"><span>Email address</span><input type="email" required placeholder="you@company.com.au" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
              <label className="auth__field">
                <span>Password{mode === 'signin' && <a className="auth__forgot" href="#/account" onClick={(e) => e.preventDefault()}>Forgot?</a>}</span>
                <input type="password" required placeholder="••••••••" />
              </label>
              <button className="btn btn--brand btn--lg btn--block" type="submit">{mode === 'signin' ? 'Sign in' : 'Create account'}</button>
            </form>
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

  const orders = account.isNew ? [] : DEMO_ORDERS
  const TITLES = { overview: 'Dashboard', orders: 'Orders', addresses: 'Addresses', details: 'Account details' }

  return (
    <Page crumbs={[{ label: 'Home', href: '/' }, { label: 'My account' }, { label: TITLES[tab] }]}>
      <div className="wrap acct">
        <AcctSidebar account={account} tab={tab} setTab={setTab} onSignOut={signOut} />
        <div className="acct__main">
          {tab === 'overview' && <AcctOverview account={account} orders={orders} wishCount={wish.length} setTab={setTab} />}
          {tab === 'orders' && (
            <div className="acct__panel">
              <h2>My orders</h2>
              <AcctOrdersTable orders={orders} />
            </div>
          )}
          {tab === 'addresses' && <AcctAddresses />}
          {tab === 'details' && <AcctDetails account={account} onSave={updateAccount} />}
        </div>
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
