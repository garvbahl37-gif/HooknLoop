import { useState, useEffect, useRef } from 'react'
import Icon from '../components/Icon.jsx'
import ProductCard from '../components/ProductCard.jsx'
import { PRODUCTS, PRODUCT_CATEGORIES, INDUSTRIES, BESTSELLER_HANDLES } from '../data/catalog.js'
import { REVIEWS } from '../data/reviews.js'
import { navigate, money } from '../lib/cart.js'

const go = (e, h) => { e.preventDefault(); navigate(h) }

export const FEATURED = BESTSELLER_HANDLES.map((h) => PRODUCTS.find((p) => p.handle === h)).filter(Boolean)

const TILE_CATS = PRODUCT_CATEGORIES
  .filter((c) => c.img && c.count > 0 && c.slug !== 'double-sided-tape' && c.slug !== 'strapping-and-filament')
  .sort((a, b) => b.count - a.count).slice(0, 8)

const BRANDS = [
  ['FrogTape', '/img/brands/logo-6.png'],
  ['T-Rex', '/img/brands/logo-4.png'],
  ['Shurtape', '/img/brands/logo-2.png'],
  ['Husky Tape', '/img/brands/logo-3.png'],
  ['Kikusui', '/img/brands/logo-1.png'],
  ['Acribond', '/img/brands/logo-5.png'],
]

const nameOf = Object.fromEntries(PRODUCTS.map((p) => [p.handle, p.name]))
const TESTIMONIALS = Object.entries(REVIEWS)
  .flatMap(([h, rs]) => rs.map((r) => ({ ...r, product: nameOf[h] })))
  .filter((r) => r.rating >= 5 && r.text.length > 90 && r.text.length < 280)
  .sort((a, b) => (b.text.length - a.text.length))
  .filter((_, i) => i % 2 === 0).slice(0, 6)

const FAQS = [
  ['How quickly can I receive my tape order in Australia?', 'We dispatch Australia-wide to 3,600+ postcodes, and most orders arrive within 2–3 business days once dispatched, with express options available at checkout.'],
  ['Can you deliver adhesive tape all over Australia?', 'Yes — we deliver to Melbourne, Sydney, Brisbane, Perth, Adelaide, Darwin and more than 3,600 postcodes right across the country.'],
  ['What industries do you supply adhesive tape to?', 'From construction, automotive and marine to signage, packaging, electronics, HVAC and healthcare — browse our 26 industry pages to find the right tape for your sector.'],
  ['Do you offer bulk or wholesale pricing?', 'Yes. Volume discounts of up to 30% apply automatically at checkout, and trade accounts unlock further pricing and priority support.'],
  ['Can I track my adhesive tape order online?', "Absolutely — you'll receive tracking as soon as your order ships, so you can follow it right to your door."],
  ['What payment methods do you accept?', 'We accept all major cards (Visa, Mastercard, Amex), PayPal and Shop Pay through a secure, encrypted checkout.'],
  ['What types of adhesive tape can I buy online?', 'Double-sided, foam, foil, duct, hook & loop, packaging, safety, masking and specialty tapes — plus dispensers — over 130 lines held in stock.'],
]

/* ---------- HERO ---------- */
export function Hero() {
  return (
    <section className="hero">
      <div className="hero__media">
        <img src="/img/site/hero.jpg" alt="A wide range of adhesive tapes, rolls and tools" fetchpriority="high" />
      </div>
      <div className="wrap hero__wrap">
        <div className="hero__card">
          <span className="hero__eyebrow">My Tape Store</span>
          <h1 className="hero__title">Bringing Tapes Direct to Your Doorstep</h1>
          <p className="hero__lead">Our adhesive tapes deliver unmatched strength and reliability for all your binding needs.</p>
          <div className="hero__cta">
            <a href="#/shop" className="btn btn--brand btn--lg" onClick={(e) => go(e, '/shop')}>Shop the range <Icon name="arrowRight" size={18} /></a>
            <a href="#/contact" className="btn btn--dark btn--lg" onClick={(e) => go(e, '/contact')}>Get in Contact</a>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- INTRO ---------- */
export function IntroBand() {
  const brands = ['FrogTape®', 'T-Rex®', 'Shurtape', 'Husky Tape', 'Kikusui', 'Acribond']
  const stats = [
    [`${PRODUCTS.length}+`, 'Tape lines in stock'],
    [`${INDUSTRIES.length}`, 'Industries served'],
    ['3,600+', 'AU postcodes'],
    ['2–3', 'Day typical delivery'],
  ]
  return (
    <section className="section intro">
      <div className="wrap intro__grid">
        <div className="intro__head">
          <span className="eyebrow">Adhesive tape suppliers in Australia</span>
          <h2 className="intro__title">Buy tapes online from My Tape Store</h2>
          <a href="#/shop" className="btn btn--brand btn--lg intro__cta" onClick={(e) => go(e, '/shop')}>Shop the full range <Icon name="arrowRight" size={18} /></a>
        </div>
        <div className="intro__body">
          <p className="intro__lead">We bring a complete range of adhesive tapes to trade and DIY customers Australia-wide. Whether you work in construction, retail, packaging or transport, we've got you covered — with fast delivery at fair prices and bulk-order discounts.</p>
          <div className="intro__brands">
            <span className="intro__brands-label">Trusted brands we stock</span>
            <ul className="intro__chips">
              {brands.map((b) => <li key={b} className="intro__chip">{b}</li>)}
            </ul>
          </div>
        </div>
      </div>
      <div className="wrap">
        <div className="intro__stats">
          {stats.map(([n, l]) => <div key={l}><b className="num">{n}</b><span>{l}</span></div>)}
        </div>
      </div>
    </section>
  )
}

/* ---------- OUR ADHESIVE TAPES COLLECTION ---------- */
export function CategoryShowcase() {
  return (
    <section className="section section--paper">
      <div className="wrap">
        <div className="section-head">
          <span className="eyebrow">Our adhesive tapes collection</span>
          <h2>Discover the ideal tape for your job</h2>
          <p>Browse our most popular categories — from double-sided and foam to hook &amp; loop, safety and packaging.</p>
        </div>
        <div className="catx">
          {TILE_CATS.map((c) => (
            <a key={c.slug} href={'#/collection/' + c.slug} className="catx__card" onClick={(e) => go(e, '/collection/' + c.slug)}>
              <div className="catx__imgwrap"><img src={c.img} alt={c.name} loading="lazy" width="240" height="240" /></div>
              <div className="catx__body">
                <div className="catx__text">
                  <b>{c.name}</b>
                  <span className="num">{c.count} product{c.count !== 1 ? 's' : ''}</span>
                </div>
                <span className="catx__arrow"><Icon name="arrowRight" size={16} /></span>
              </div>
            </a>
          ))}
        </div>
        <div className="section-cta"><a href="#/shop" className="btn btn--ghost btn--lg" onClick={(e) => go(e, '/shop')}>View all categories <Icon name="arrowRight" size={18} /></a></div>
      </div>
    </section>
  )
}

/* ---------- POPULAR PRODUCTS ---------- */
export function FeaturedGrid() {
  return (
    <section className="section">
      <div className="wrap">
        <div className="section-head">
          <span className="eyebrow">Our bestsellers</span>
          <h2>Popular right now</h2>
        </div>
        <div className="grid-products grid-products--5">
          {FEATURED.slice(0, 4).map((p) => <ProductCard key={p.handle} p={p} />)}
        </div>
        <div className="section-cta"><a href="#/shop" className="btn btn--ghost btn--lg" onClick={(e) => go(e, '/shop')}>Shop all products <Icon name="arrowRight" size={18} /></a></div>
      </div>
    </section>
  )
}

/* ---------- BRAND WALL ---------- */
export function BrandWall() {
  return (
    <section className="brandx grain">
      <div className="wrap brandx__inner">
        <span className="eyebrow eyebrow--onink">Trusted brands</span>
        <h2 className="brandx__title">We partner with the best tape brands</h2>
        <p className="brandx__sub">Genuine, trade-grade products from the names professionals rely on — plus our own value lines.</p>
      </div>
      <div className="brandx__slider">
        <div className="brandx__track">
          {[...BRANDS, ...BRANDS].map(([name, logo], i) => (
            <div key={i} className="brandx__plate"><img src={logo} alt={i < BRANDS.length ? name : ''} aria-hidden={i >= BRANDS.length} className="brandx__logo" loading="lazy" /></div>
          ))}
        </div>
      </div>
      <div className="wrap brandx__stats">
        <div className="brandx__stat"><b className="num">{BRANDS.length}</b><span>Leading brands</span></div>
        <div className="brandx__stat"><b className="num">130+</b><span>Genuine lines</span></div>
        <div className="brandx__stat"><b className="num">100%</b><span>Trade-grade quality</span></div>
      </div>
    </section>
  )
}

/* ---------- COMPREHENSIVE RANGE ---------- */
export function RangeSection() {
  const blocks = [
    ['General-purpose adhesive tapes', 'Cost-effective, versatile tapes for everyday packaging, bundling and assembly — dependable hold across countless jobs.'],
    ['Specialty adhesive tapes', 'Engineered for specific applications: high-bond, glazing, thermal, fire-retardant and more, where a standard tape won\'t do.'],
    ['Construction & industrial tapes', 'Rugged tapes built for the site — flashing, cloth, foil and duct grades that stand up to demanding conditions.'],
  ]
  return (
    <section className="section range">
      <div className="wrap range__grid">
        <div className="range__copy">
          <span className="eyebrow">A more comprehensive range</span>
          <h2>Adhesive tapes for every purpose</h2>
          <div className="range__blocks">
            {blocks.map(([t, d]) => (
              <div key={t} className="range__block">
                <span className="range__ic"><Icon name="layers" size={20} /></span>
                <div><h3>{t}</h3><p>{d}</p></div>
              </div>
            ))}
          </div>
          <a href="#/shop" className="btn btn--brand btn--lg range__cta" onClick={(e) => go(e, '/shop')}>Explore the full range <Icon name="arrowRight" size={18} /></a>
        </div>
        <div className="range__media">
          <img src="/img/site/range.jpg?v=1" alt="A range of adhesive tapes — packaging, duct, masking, foil, cloth and electrical" loading="lazy" />
        </div>
      </div>
    </section>
  )
}

/* ---------- SEAL THE DEAL PROMO ---------- */
export function SealTheDeal() {
  return (
    <section className="seal grain">
      <div className="seal__media"><img src="/img/site/seal-deal.jpg" alt="" aria-hidden="true" /></div>
      <div className="wrap seal__inner">
        <span className="eyebrow eyebrow--onink">Ready when you are</span>
        <h2 className="seal__title">Seal the deal today</h2>
        <p className="seal__lead">Shop our wide range of tapes and elevate your projects — fast dispatch Australia-wide, with volume discounts up to 30%.</p>
        <div className="seal__cta">
          <a href="#/shop" className="btn btn--brand btn--lg" onClick={(e) => go(e, '/shop')}>Shop now <Icon name="arrowRight" size={18} /></a>
          <a href="#/bulk" className="btn btn--onink-ghost btn--lg" onClick={(e) => go(e, '/bulk')}>Bulk &amp; trade pricing</a>
        </div>
      </div>
    </section>
  )
}

/* ---------- COVERING DIVERSE INDUSTRIES ---------- */
function perPageFor(w) {
  if (w < 560) return 2
  if (w < 900) return 3
  if (w < 1220) return 4
  return 5
}

function IndustriesStrip() {
  const [perPage, setPerPage] = useState(() => perPageFor(typeof window !== 'undefined' ? window.innerWidth : 1280))
  const [page, setPage] = useState(0)
  const paused = useRef(false)
  const pages = Math.max(1, Math.ceil(INDUSTRIES.length / perPage))

  useEffect(() => {
    const onResize = () => setPerPage(perPageFor(window.innerWidth))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => { setPage((p) => (p >= pages ? 0 : p)) }, [pages])

  useEffect(() => {
    if (pages <= 1) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => { if (!paused.current) setPage((p) => (p + 1) % pages) }, 2800)
    return () => clearInterval(id)
  }, [pages])

  return (
    <div className="indx-strip" onMouseEnter={() => { paused.current = true }} onMouseLeave={() => { paused.current = false }}>
      <div className="indx-strip__viewport">
        <div className="indx-strip__track" style={{ transform: `translateX(-${page * 100}%)` }}>
          {Array.from({ length: pages }).map((_, pi) => (
            <div className="indx-strip__page" key={pi} style={{ gridTemplateColumns: `repeat(${perPage}, 1fr)` }}>
              {INDUSTRIES.slice(pi * perPage, pi * perPage + perPage).map((c) => (
                <a key={c.slug} href={'#/industry/' + c.slug} className="indx-tile" onClick={(e) => go(e, '/industry/' + c.slug)}>
                  <div className="indx-tile__media"><img src={c.img} alt={c.name} loading="lazy" /></div>
                  <div className="indx-tile__body">
                    <b className="indx-tile__name">{c.name}</b>
                    <span className="indx-tile__num num">{c.count} products <Icon name="arrowRight" size={14} /></span>
                  </div>
                </a>
              ))}
            </div>
          ))}
        </div>
      </div>
      {pages > 1 && (
        <div className="indx-strip__dots">
          {Array.from({ length: pages }).map((_, pi) => (
            <button key={pi} className={'indx-strip__dot' + (pi === page ? ' is-on' : '')} onClick={() => setPage(pi)} aria-label={`Show industries, set ${pi + 1} of ${pages}`} />
          ))}
        </div>
      )}
    </div>
  )
}

export function IndustriesShowcase() {
  return (
    <section className="section section--paper">
      <div className="wrap">
        <div className="indx-hero">
          <img className="indx-hero__img" src="/img/site/industries.jpg" alt="Adhesive tapes for every trade — hard hat, blueprints, packaging, foil and craft tapes on a workbench" loading="lazy" />
          <div className="indx-hero__panel">
            <span className="eyebrow">Covering diverse industries</span>
            <h2>From construction to crafting</h2>
            <p>The right adhesive for your trade — quality-checked tapes across {INDUSTRIES.length} industries.</p>
          </div>
        </div>
        <IndustriesStrip />
        <div className="section-cta"><a href="#/industries" className="btn btn--brand btn--lg" onClick={(e) => go(e, '/industries')}>Explore all {INDUSTRIES.length} industries <Icon name="arrowRight" size={18} /></a></div>
      </div>
    </section>
  )
}

/* ---------- TESTIMONIALS ---------- */
export function Testimonials() {
  return (
    <section className="tmx grain">
      <div className="wrap">
        <div className="section-head">
          <span className="eyebrow eyebrow--onink">Testimonials</span>
          <h2 className="tmx__title">Trusted by thousands of happy customers</h2>
          <p className="tmx__lead">Real reviews from Australian trade &amp; DIY buyers.</p>
        </div>
      </div>
      {/* single-row infinite review strip */}
      <div className="tmx__marquee">
        <div className="tmx__track">
          {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
            <figure key={i} className="tmx__card" aria-hidden={i >= TESTIMONIALS.length}>
              <div className="tmx__stars"><Stars rating={t.rating} /></div>
              <blockquote>{t.text}</blockquote>
              <figcaption>
                <span className="tmx__ava">{(t.name || '?').slice(0, 1).toUpperCase()}</span>
                <span className="tmx__who"><b>{t.name}</b><em>{t.product}</em></span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}

function Stars({ rating }) {
  return (
    <span className="tmx__starrow" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => <Icon key={i} name="star" size={16} className={i <= rating ? 'on' : 'off'} />)}
    </span>
  )
}

/* ---------- FAQ ---------- */
export function FAQ() {
  const [open, setOpen] = useState(0)
  return (
    <section className="section faq">
      <div className="wrap">
        <div className="section-head">
          <span className="eyebrow">Good to know</span>
          <h2>Frequently asked questions</h2>
        </div>
        <div className="faq__grid">
          <ul className="faq__list">
            {FAQS.map(([q, a], i) => (
              <li key={i} className={'faq__item' + (open === i ? ' is-open' : '')}>
                <button className="faq__q" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
                  <span>{q}</span><Icon name={open === i ? 'minus' : 'plus'} size={18} />
                </button>
                {open === i && <div className="faq__a"><p>{a}</p></div>}
              </li>
            ))}
          </ul>
          <aside className="faq__map">
            <img src="/img/site/australia-map.jpg?v=2" alt="Map of Australia showing our nationwide delivery coverage" loading="lazy" />
            <div className="faq__map-copy">
              <span className="faq__map-badge"><Icon name="pin" size={15} /> Australia-wide delivery</span>
              <b>We deliver to 3,600+ postcodes</b>
              <p>Sydney, Melbourne, Brisbane, Perth, Adelaide, Darwin and everywhere in between — most orders arrive in 2–3 business days.</p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  )
}

/* ---------- WHOLESALE / BULK ---------- */
export function Wholesale() {
  const perks = [
    ['tag', 'Significant discounts', 'Save more when you order in bulk — contact us for substantial reductions on large quantities.'],
    ['truck', 'Quick delivery across Australia', 'Fast, reliable shipping so your bulk tape orders arrive exactly when you need them.'],
    ['layers', 'Cost-effective stock management', 'Keep a well-stocked inventory without breaking the bank, even with high tape usage.'],
    ['factory', 'Tailored wholesale services', "Customised wholesale solutions built around your business's specific needs."],
    ['shield', 'Trusted tape suppliers', 'Consistent quality and after-sales service — all your adhesive needs, always covered.'],
  ]
  return (
    <section className="section wholesale">
      <div className="wrap wholesale__grid">
        <div className="wholesale__media">
          <img src="/img/site/bulk-wholesale.jpg" alt="Warehouse pallets stacked with adhesive tape stock" loading="lazy" />
        </div>
        <div className="wholesale__copy">
          <span className="eyebrow">Wholesale &amp; bulk</span>
          <h2 className="wholesale__title">Buy adhesive tape in bulk — wholesale pricing for Australia</h2>
          <p className="wholesale__intro">Australia's trusted tape experts. We're proud to supply thousands of individuals and businesses with tailored solutions and quality products.</p>
          <ul className="wholesale__perks">
            {perks.map(([ic, t, d]) => (
              <li key={t}><span className="wholesale__ic"><Icon name={ic} size={18} /></span><div><b>{t}</b><span>{d}</span></div></li>
            ))}
          </ul>
          <a href="#/bulk" className="btn btn--brand btn--lg" onClick={(e) => go(e, '/bulk')}>Bulk &amp; trade pricing <Icon name="arrowRight" size={18} /></a>
        </div>
      </div>
    </section>
  )
}

/* ---------- VALUE PROPS ---------- */
export function ValueProps() {
  const props = [
    ['/img/icons/fast-delivery.svg', 'Fast delivery Australia-wide', 'Dispatched in 1–2 business days to 3,600+ postcodes.', true],
    ['card', 'Secure payment', 'Checkout safely with major cards, PayPal and Shop Pay.', false],
    ['badgeCheck', 'Lowest-price guarantee', 'Find a stocked line cheaper and we’ll match it.', false],
    ['/img/icons/flag-australia.svg', 'Australian owned & operated', 'Local stock, local support and honest advice.', true],
  ]
  return (
    <section className="section vprops-sec">
      <div className="wrap">
        <div className="section-head">
          <span className="eyebrow">Why My Tape Store</span>
          <h2>Buy with confidence</h2>
        </div>
        <div className="vprops">
          {props.map(([icon, title, body, isImg]) => (
            <div key={title} className="vprop">
              <span className="vprop__icon">{isImg ? <img src={icon} alt="" width="44" height="44" loading="lazy" /> : <Icon name={icon} size={40} />}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
