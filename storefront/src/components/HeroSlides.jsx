/*  HeroSlides — the hero is now a SLIDESHOW: 4 complete hero slides, each a
    different buyer intent, auto-rotating every 5s. Consistent skeleton (pill →
    headline → bullets → CTAs → product) so rotation reads premium, not jarring.
    Pause on hover/focus; reduced-motion pins slide 1. Keyboard operable.        */
import { useEffect, useRef, useState } from 'react'

const SLIDES = [
  {
    key: 'range', pill: 'Australia’s Hook & Loop Specialist',
    h1: 'Hook & Loop Tape', accent: 'Strips & Fasteners',
    bullets: ['100,000+ metres in stock', 'Free shipping over $200', '1–2 day Australia-wide dispatch'],
    cta: 'Shop all products', img: '/img/p-hook.jpg', tag: 'BEST SELLER', priceFrom: '24.46',
  },
  {
    key: 'heavy', pill: 'Industrial Grade',
    h1: 'Heavy-Duty Hold', accent: 'That Won’t Quit',
    bullets: ['High-temp acrylic adhesive', 'Holds through heat, weather & vibration', 'Black or white · 25 m rolls'],
    cta: 'Shop heavy-duty', img: '/img/p-heavyduty.png', tag: 'INDUSTRIAL', priceFrom: '55.43',
  },
  {
    key: 'fr', pill: 'Trade & Compliance',
    h1: 'Fire-Retardant', accent: 'Hook & Loop',
    bullets: ['Flame-retardant treated fabric', 'For rail, transport, marine & PPE', 'Test certificate available on request'],
    cta: 'Explore fire-retardant', img: '/img/p-fr.png', tag: 'TRADE GRADE', priceFrom: '32.53',
  },
  {
    key: 'bulk', pill: 'Bulk & Trade',
    h1: 'Buy in Bulk.', accent: 'Save More.',
    bullets: ['Quantity breaks up to 20% off', 'Cut to your exact length', 'ABN accounts · GST tax invoice'],
    cta: 'Get trade pricing', img: '/img/p-strap2.png', tag: 'WHOLESALE', priceFrom: null,
  },
]

const DUR = 5000

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

  return (
    <section
      className="hs"
      aria-roledescription="carousel"
      aria-label="Featured ranges"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
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
                    <span className="hs__check" aria-hidden="true"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7"/></svg></span>
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
                <a href="#" className="btn btn--primary" onClick={(e) => { e.preventDefault(); window.location.hash = s.key === 'fr' ? 'collection/fire-retardant' : s.key === 'bulk' ? 'bulk' : 'collection'; window.scrollTo(0, 0) }}>{s.cta}<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
                <a href="#tape-finder" className="btn btn--ghost">Help me choose — 30 sec</a>
              </div>
            </div>

            <div className="hs__figure">
              <div className="hs__card">
                <span className="hs__tag">{s.tag}</span>
                <img src={s.img} alt={`${s.h1} ${s.accent}`} loading={n === 0 ? 'eager' : 'lazy'} draggable="false" />
              </div>
              {s.priceFrom && (
                <div className="hs__price"><span className="hs__price-from">FROM</span><span className="hs__price-amt">${s.priceFrom}</span></div>
              )}
            </div>
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
