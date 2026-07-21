/*  HeroSlides — a 4-banner hero slideshow, each sending a different buyer to the
    right products: main brand, heavy-duty industrial, cable management, and bulk
    & wholesale. Real product imagery on the right, copy on the left. Benefit
    labels / offer line per banner. Every button routes somewhere real. Auto-
    rotates every 6s; pauses on hover/focus; reduced-motion pins slide 1.         */
import { useEffect, useState } from 'react'
import { navigate } from '../lib/cart.js'

const SLIDES = [
  {
    /* content mirrors the live store's hero banner */
    key: 'brand', pill: 'Premium Australian Supplier',
    h1: 'Hook and Loop Tape,', accent: 'Strips & Fasteners',
    bullets: [
      'Trusted Australian distributor of premium products',
      '100,000+ metres in stock for fast delivery',
      'Custom cutting & manufacturing available',
      'Fast Australia-wide shipping',
    ],
    cta: { label: 'Shop All Products', to: 'collection' }, cta2: { label: 'Find the Right Product', to: 'collection' },
    fig: { img: '/img/products/self-adhesive-roll-1.jpg', tag: 'BEST SELLER', priceFrom: '24.46' },
  },
  {
    key: 'heavy', pill: 'Built for Demanding Applications',
    h1: 'Industrial Strength.', accent: 'Reliable Grip.',
    sub: 'High-performance hook & loop for metal, plastic, equipment, vehicles and outdoor applications.',
    spec: ['Heat-resistant', 'Moisture-proof', 'Heavy-duty'],
    cta: { label: 'Shop Heavy Duty', to: 'product/heavy-duty-adhesive' }, cta2: { label: 'View Industrial Solutions', to: 'collection/self-adhesive' },
    fig: { img: '/img/products/heavy-duty-adhesive-1.png', tag: 'INDUSTRIAL', gauge: '50', priceFrom: '55.43' },
  },
  {
    key: 'premium', pill: 'Tested for Real-World Use',
    h1: 'Premium Quality', accent: 'Products',
    sub: 'Every product is chosen for material quality, performance testing and long-term reliability — trade-grade hook & loop, held in stock in Australia.',
    spec: ['Performance-tested', 'Long-term hold', 'AU-stocked'],
    cta: { label: 'Shop the Range', to: 'collection' }, cta2: { label: 'Why Choose Us', to: 'about' },
    fig: { img: '/img/products/hook-and-loop-dots-1.jpg', tag: 'PREMIUM GRADE', gauge: '22', priceFrom: '66.74' },
  },
  {
    key: 'shipping', pill: 'Fast Australia-Wide Delivery',
    h1: 'Delivered Fast,', accent: 'Australia-Wide.',
    sub: 'Dispatched in 1–2 business days from our Australian warehouse — metro, regional and everywhere in between, with free shipping over $200.',
    spec: ['1–2 day dispatch', 'Metro & regional', 'Free over $200'],
    cta: { label: 'Shop the Range', to: 'collection' }, cta2: { label: 'Shipping & Delivery', to: 'shipping' },
    fig: { img: '/img/australia-network.jpg', tag: 'AUSTRALIA-WIDE', photo: true },
  },
  {
    key: 'bulk', pill: 'Trade, Commercial & Wholesale',
    h1: 'Order More.', accent: 'Save More.',
    sub: 'Bulk pricing, reliable stock, custom widths and tailored fastening solutions for Australian businesses.',
    spec: ['Custom widths', 'Volume pricing', 'Priority dispatch'],
    cta: { label: 'Request a Bulk Quote', to: 'bulk' }, cta2: { label: 'Explore Bulk Orders', to: 'bulk' },
    fig: { img: '/img/hooknloop-cartons.jpg', tag: 'BULK & WHOLESALE', photo: true },
  },
]

const DUR = 5000

function Figure({ fig, eager }) {
  return (
    <div className="hs__figure">
      <div className={`hs__card ${fig.photo ? 'hs__card--photo' : ''}`}>
        <span className="hs__tag">{fig.tag}</span>
        <img src={fig.img} alt="" loading={eager ? 'eager' : 'lazy'} draggable="false" />
      </div>
      {fig.priceFrom && <div className="hs__price"><span className="hs__price-from">FROM</span><span className="hs__price-amt">${fig.priceFrom}</span></div>}
    </div>
  )
}

export default function HeroSlides() {
  const [i, setI] = useState(0)

  /* infinite auto-advance every DUR — always sliding, never pauses (no hover/
     focus pause). Not gated on reduced-motion; the slide still changes, just
     with a quick fade (see the reduced-motion rule in slides.css). */
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % SLIDES.length), DUR)
    return () => clearInterval(t)
  }, [])
  const nav = (to) => (e) => { e.preventDefault(); navigate(to); window.scrollTo(0, 0) }

  return (
    <section className="hs" aria-roledescription="carousel" aria-label="Featured">
      <div className="hs__glow" aria-hidden="true" />

      <div className="wrap hs__stage">
        {SLIDES.map((s, n) => (
          <div key={s.key} className={`hs__slide ${n === i ? 'is-active' : ''}`} aria-hidden={n === i ? undefined : true}>
            <div className="hs__copy">
              <span className="hs__eyebrow"><i className="hs__eyebrow-line" aria-hidden="true" />{s.pill}</span>
              {/* only the first banner is the page's <h1> — the rest are styled
                  <p> so the homepage has exactly one H1 (SEO). */}
              {n === 0
                ? <h1 className="hs__title">{s.h1}<br /><span className="hs__accent">{s.accent}</span></h1>
                : <p className="hs__title">{s.h1}<br /><span className="hs__accent">{s.accent}</span></p>}
              {s.bullets ? (
                <ul className="hs__bullets">
                  {s.bullets.map((t) => (
                    <li key={t} className="hs__bullet">
                      <span className="hs__check" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7" /></svg></span>{t}
                    </li>
                  ))}
                </ul>
              ) : (
                <>
                  <p className="hs__sub">{s.sub}</p>
                  {s.spec && (
                    <div className="hs__spec" aria-hidden="true">
                      {s.spec.map((x, k) => (
                        <span key={x} className="hs__spec-part">{k > 0 && <span className="hs__spec-div">/</span>}{x}</span>
                      ))}
                    </div>
                  )}
                </>
              )}
              <div className="hs__cta">
                <a href="#" className="btn btn--primary" onClick={nav(s.cta.to)}>{s.cta.label}<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M5 12h14M13 6l6 6-6 6" /></svg></a>
                {s.cta2 && <a href="#" className="btn btn--ghost" onClick={nav(s.cta2.to)}>{s.cta2.label}</a>}
              </div>
            </div>

            <Figure fig={s.fig} eager={n === 0} />
          </div>
        ))}
      </div>

      <div className="wrap hs__trust" aria-label="Why shop with us">
        {['Fast Australia-wide delivery', 'Free shipping over $200', 'Best price in Australia', '5-star rated store'].map((t, idx) => (
          <span key={t} className="hs__trust-item">
            {idx === 3
              ? <span className="hs__trust-star" aria-hidden="true">★</span>
              : <svg className="hs__trust-ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7" /></svg>}
            {t}
          </span>
        ))}
      </div>

    </section>
  )
}
