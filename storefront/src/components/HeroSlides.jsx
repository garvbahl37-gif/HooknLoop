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
    banner: { lg: '/img/banners/hero-1-range-1920.webp', sm: '/img/banners/hero-1-range-1280.webp' },
    /* Mobile only. On a phone the hero is the whole first screen, so it should
       be a way in rather than a poster — four taps to the four things people
       actually come for, plus the two brands they search by name. Desktop keeps
       the bullets, where there is room to read them. */
    /* Shown on mobile only, where the four bullets are hidden. One line, not
       four: it has to say what the business is before the tiles say where to
       go, without pushing the tiles below the fold. */
    mobileLead: 'Australia-wide trade supply — cut to length, dispatched in 1–2 days.',
    tiles: {
      brands: [
        { label: 'VELCRO\u00AE Brand', to: 'collection/velcro-brand' },
        { label: 'HooknLoop', to: 'collection/all' },
      ],
      cats: [
        { label: 'Self-Adhesive', to: 'collection/self-adhesive' },
        { label: 'Sew-On', to: 'collection/sew-on' },
        { label: 'Dots', to: 'collection/dots' },
        { label: 'Straps & Ties', to: 'collection/straps' },
      ],
      all: { label: 'Shop all products', to: 'collection/all' },
    },
  },
  {
    key: 'heavy', pill: 'Built for Demanding Applications',
    h1: 'Industrial Strength.', accent: 'Reliable Grip.',
    sub: 'High-performance hook & loop for metal, plastic, equipment, vehicles and outdoor applications.',
    spec: ['Heat-resistant', 'Moisture-proof', 'Heavy-duty'],
    cta: { label: 'Shop Heavy Duty', to: 'product/heavy-duty-adhesive' }, cta2: { label: 'View Industrial Solutions', to: 'collection/self-adhesive' },
    banner: { lg: '/img/banners/hero-2-industrial-1920.webp', sm: '/img/banners/hero-2-industrial-1280.webp' },
  },
  {
    key: 'premium', pill: 'Tested for Real-World Use',
    h1: 'Premium Quality', accent: 'Products',
    sub: 'Every product is chosen for material quality, performance testing and long-term reliability — trade-grade hook & loop, held in stock in Australia.',
    spec: ['Performance-tested', 'Long-term hold', 'AU-stocked'],
    cta: { label: 'Shop the Range', to: 'collection' }, cta2: { label: 'Why Choose Us', to: 'about' },
    banner: { lg: '/img/banners/hero-3-premium-1920.webp', sm: '/img/banners/hero-3-premium-1280.webp' },
  },
  {
    key: 'shipping', pill: 'Fast Australia-Wide Delivery',
    h1: 'Delivered Fast,', accent: 'Australia-Wide.',
    sub: 'Dispatched in 1–2 business days from our Australian warehouse — metro, regional and everywhere in between, with free shipping over $200.',
    spec: ['1–2 day dispatch', 'Metro & regional', 'Free over $200'],
    cta: { label: 'Shop the Range', to: 'collection' }, cta2: { label: 'Shipping & Delivery', to: 'shipping' },
    banner: { lg: '/img/banners/hero-4-australia-1920.webp', sm: '/img/banners/hero-4-australia-1280.webp' },
  },
  {
    key: 'bulk', pill: 'Trade, Commercial & Wholesale',
    h1: 'Order More.', accent: 'Save More.',
    sub: 'Bulk pricing, reliable stock, custom widths and tailored fastening solutions for Australian businesses.',
    spec: ['Custom widths', 'Volume pricing', 'Priority dispatch'],
    cta: { label: 'Request a Bulk Quote', to: 'bulk' }, cta2: { label: 'Explore Bulk Orders', to: 'bulk' },
    banner: { lg: '/img/banners/hero-5-bulk-1920.webp', sm: '/img/banners/hero-5-bulk-1280.webp' },
  },
]

const DUR = 5000

/*  A banner slide is a single full-bleed photograph with the copy laid over it,
    replacing the framed product card. The photographs are shot with the left
    45% deliberately empty, so the copy lands on clean background rather than
    on top of a product.

    The scrim is still required. "Deliberately empty" is not the same as
    "dark enough for white text at every viewport" — as the image is cropped by
    object-fit on narrower screens, brighter parts of the scene move leftward
    under the headline. The gradient guarantees contrast regardless of crop. */
function Banner({ banner, eager }) {
  return (
    <>
      <picture className="hs__bg">
        <source media="(max-width: 900px)" srcSet={banner.sm} />
        <img
          src={banner.lg}
          alt=""
          draggable="false"
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={eager ? 'high' : 'auto'}
        />
      </picture>
      <div className="hs__bg-scrim" aria-hidden="true" />
    </>
  )
}

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

  /*  Desktop auto-advances every DUR. MOBILE DOES NOT ROTATE AT ALL.

      On a phone the hero is the entire first screen, and slide 1 is the only
      one carrying the tile navigation — rotating away from it replaces a way
      into the catalogue with a poster the visitor cannot act on. A carousel
      that moves under a thumb mid-tap is also how people end up on a page they
      did not choose.

      So mobile pins slide 1 and never moves. The listener re-evaluates on
      breakpoint change, so rotating a phone or dragging a desktop window narrow
      stops the timer and returns to slide 1 rather than leaving it stranded
      mid-sequence.                                                          */
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 920px)')
    let t
    const apply = () => {
      clearInterval(t)
      if (mq.matches) { setI(0); return }
      t = setInterval(() => setI((n) => (n + 1) % SLIDES.length), DUR)
    }
    apply()
    mq.addEventListener('change', apply)
    return () => { clearInterval(t); mq.removeEventListener('change', apply) }
  }, [])
  const nav = (to) => (e) => { e.preventDefault(); navigate(to); window.scrollTo(0, 0) }

  return (
    <section className="hs" aria-roledescription="carousel" aria-label="Featured">
      <div className="hs__glow" aria-hidden="true" />

      <div className="wrap hs__stage">
        {SLIDES.map((s, n) => (
          <div key={s.key} className={`hs__slide ${s.banner ? 'hs__slide--banner' : ''} ${n === i ? 'is-active' : ''}`} aria-hidden={n === i ? undefined : true}>
            {s.banner && <Banner banner={s.banner} eager={n === 0} />}
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
              {s.mobileLead && <p className="hs__lead-m">{s.mobileLead}</p>}

              {s.tiles && (
                <nav className="hs__tiles" aria-label="Shop by brand or product type">
                  <div className="hs__tiles-grid hs__tiles-grid--brands">
                    {s.tiles.brands.map((t) => (
                      <a key={t.label} href="#" className="hs__tile hs__tile--brand" onClick={nav(t.to)}>{t.label}</a>
                    ))}
                  </div>
                  <div className="hs__tiles-grid">
                    {s.tiles.cats.map((t) => (
                      <a key={t.label} href="#" className="hs__tile" onClick={nav(t.to)}>{t.label}</a>
                    ))}
                  </div>
                  <a href="#" className="hs__tile hs__tile--all" onClick={nav(s.tiles.all.to)}>
                    {s.tiles.all.label}
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  </a>
                </nav>
              )}

              <div className="hs__cta">
                <a href="#" className="btn btn--primary" onClick={nav(s.cta.to)}>{s.cta.label}<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M5 12h14M13 6l6 6-6 6" /></svg></a>
                {s.cta2 && <a href="#" className="btn btn--ghost" onClick={nav(s.cta2.to)}>{s.cta2.label}</a>}
              </div>
            </div>

            {s.fig && <Figure fig={s.fig} eager={n === 0} />}
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
