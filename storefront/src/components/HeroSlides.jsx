/*  HeroSlides — a premium hero SLIDESHOW. Consistent copy skeleton (pill →
    headline → bullets → proof → CTAs) but each slide swaps the right-hand
    figure for a different story: the flagship range (product), the industries
    we serve (companies), what the tape does (features), and our facility
    (facilities). Auto-rotates every 6s; pauses on hover/focus; reduced-motion
    pins slide 1; keyboard operable.                                             */
import { useEffect, useRef, useState } from 'react'
import { navigate } from '../lib/cart.js'

const SLIDES = [
  {
    key: 'range', pill: 'Australia’s Hook & Loop Specialist',
    h1: 'Hook & Loop Tape', accent: 'Strips & Fasteners',
    bullets: ['100,000+ metres in stock', 'Free shipping over $200', '1–2 day Australia-wide dispatch'],
    cta: { label: 'Shop all products', to: 'collection' }, cta2: { label: 'Bulk & trade pricing', to: 'bulk' },
    fig: { type: 'product', img: '/img/products/self-adhesive-roll-1.jpg', tag: 'BEST SELLER', priceFrom: '24.46' },
  },
  {
    key: 'companies', pill: 'Trusted by Australian Industry',
    h1: 'From Workshops to', accent: 'Production Lines',
    bullets: ['B2C & B2B accounts, Australia-wide', 'Volume pricing & net terms for trade', 'One supplier for every fastener'],
    cta: { label: 'Open a trade account', to: 'bulk' }, cta2: { label: 'About HooknLoop', to: 'about' },
    fig: { type: 'chips', title: 'Trusted across Australian industry', items: ['Manufacturing', 'Marine & auto', 'Signage & display', 'Events & AV', 'Upholstery', 'Trade & OEM'] },
  },
  {
    key: 'features', pill: 'Built for Real-World Conditions',
    h1: 'Grip That', accent: 'Holds Its Own',
    bullets: ['Heat, weather & moisture resistant', 'Reusable up to 5,000 cycles', 'Genuine VELCRO® Brand stocked'],
    cta: { label: 'Shop the range', to: 'collection' }, cta2: { label: 'Fire-retardant grades', to: 'collection/fire-retardant' },
    fig: { type: 'feats', items: [['heat', '−10 to 70°C', 'Indoor & outdoor'], ['reuse', '5,000×', 'Reusable cycles'], ['shield', 'Genuine', 'VELCRO® Brand'], ['fire', 'FR grades', 'Trade & compliance']] },
  },
  {
    key: 'facilities', pill: 'Our Australian Facility',
    h1: 'Everything Under', accent: 'One Roof',
    bullets: ['100,000+ metres held in stock', 'Custom manufacturing on request', 'GST tax invoice on every order'],
    cta: { label: 'Get trade pricing', to: 'bulk' }, cta2: { label: 'Browse all products', to: 'collection' },
    fig: { type: 'stats', items: [['100,000m+', 'metres in stock'], ['1–2 day', 'AU-wide dispatch'], ['12', 'product ranges'], ['4.87★', 'from 15 reviews']] },
  },
]

const DUR = 6000

function HIcon({ n }) {
  const c = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' }
  const m = {
    heat: <svg {...c}><path d="M14 14V5a2 2 0 0 0-4 0v9a4 4 0 1 0 4 0Z" /></svg>,
    reuse: <svg {...c}><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" /></svg>,
    shield: <svg {...c}><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" /><path d="m9 12 2 2 4-4" /></svg>,
    fire: <svg {...c}><path d="M12 3s5 4 5 9a5 5 0 0 1-10 0c0-2 1-3 1-3s3 1 4-6Z" /></svg>,
  }
  return m[n]
}

function Figure({ fig, eager }) {
  if (fig.type === 'product') return (
    <div className="hs__figure">
      <div className="hs__card"><span className="hs__tag">{fig.tag}</span><img src={fig.img} alt="" loading={eager ? 'eager' : 'lazy'} draggable="false" /></div>
      {fig.priceFrom && <div className="hs__price"><span className="hs__price-from">FROM</span><span className="hs__price-amt">${fig.priceFrom}</span></div>}
    </div>
  )
  if (fig.type === 'chips') return (
    <div className="hs__figure"><div className="hs__panel">
      <span className="hs__panel-title">{fig.title}</span>
      <div className="hs__chips">{fig.items.map((t) => <span key={t} className="hs__chip"><i aria-hidden="true" />{t}</span>)}</div>
    </div></div>
  )
  if (fig.type === 'feats') return (
    <div className="hs__figure"><div className="hs__panel hs__panel--grid">
      {fig.items.map(([icn, big, small]) => (
        <div key={big} className="hs__feat"><span className="hs__feat-ic"><HIcon n={icn} /></span><b>{big}</b><span>{small}</span></div>
      ))}
    </div></div>
  )
  if (fig.type === 'stats') return (
    <div className="hs__figure"><div className="hs__panel hs__panel--grid">
      {fig.items.map(([big, small]) => <div key={small} className="hs__statc"><b>{big}</b><span>{small}</span></div>)}
    </div></div>
  )
  return null
}

export default function HeroSlides() {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const reduce = useRef(false)

  useEffect(() => { reduce.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches }, [])
  useEffect(() => {
    if (paused || reduce.current) return
    const t = setInterval(() => setI((n) => (n + 1) % SLIDES.length), DUR)
    return () => clearInterval(t)
  }, [paused, i])

  const go = (n) => setI((n + SLIDES.length) % SLIDES.length)
  const nav = (to) => (e) => { e.preventDefault(); navigate(to); window.scrollTo(0, 0) }

  return (
    <section className="hs" aria-roledescription="carousel" aria-label="Featured"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)}>
      <div className="hs__glow" aria-hidden="true" />

      <div className="wrap hs__stage">
        {SLIDES.map((s, n) => (
          <div key={s.key} className={`hs__slide ${n === i ? 'is-active' : ''}`} aria-hidden={n === i ? undefined : true}>
            <div className="hs__copy">
              <span className="hs__pill">{s.pill}</span>
              <h1 className="hs__title">{s.h1}<br /><span className="hs__accent">{s.accent}</span></h1>
              <ul className="hs__bullets">
                {s.bullets.map((b) => (
                  <li key={b} className="hs__bullet">
                    <span className="hs__check" aria-hidden="true"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7" /></svg></span>
                    {b}
                  </li>
                ))}
              </ul>
              <div className="hs__proof">
                <span className="hs__stars2" aria-hidden="true">★★★★★</span>
                <span><b>4.87</b> from 15 reviews</span>
                <span className="hs__proof-sep" aria-hidden="true">·</span>
                <span>Free shipping over $200</span>
              </div>
              <div className="hs__cta">
                <a href="#" className="btn btn--primary" onClick={nav(s.cta.to)}>{s.cta.label}<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M5 12h14M13 6l6 6-6 6" /></svg></a>
                <a href="#" className="btn btn--ghost" onClick={nav(s.cta2.to)}>{s.cta2.label}</a>
              </div>
            </div>

            <Figure fig={s.fig} eager={n === 0} />
          </div>
        ))}
      </div>

      <div className="wrap hs__nav">
        <div className="hs__dots" role="tablist" aria-label="Choose slide">
          {SLIDES.map((s, n) => (
            <button key={s.key} className={`hs__dot ${n === i ? 'is-active' : ''}`} onClick={() => go(n)}
              role="tab" aria-selected={n === i} aria-label={`${s.h1} ${s.accent} (${n + 1} of ${SLIDES.length})`}>
              {n === i && !paused && <span className="hs__dot-fill" style={{ animationDuration: `${DUR}ms` }} />}
            </button>
          ))}
        </div>
        <span className="hs__count">{String(i + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}</span>
      </div>
    </section>
  )
}
