import { useState, useEffect, useRef } from 'react'
import Icon from './Icon.jsx'
import { navigate } from '../lib/cart.js'

const go = (e, h) => { e.preventDefault(); navigate(h) }

/* Premium sliding hero. Backgrounds are AI-generated (Magnific); the copy is
   crisp HTML overlaid on top. Crossfade auto-advance, pause on hover, dots + arrows. */
const SLIDES = [
  {
    img: '/img/site/banner-australia.jpg?v=7',
    eyebrow: 'Express delivery',
    title: 'Fast delivery, right across Australia',
    text: 'Dispatch to 3,600+ postcodes — most orders arrive in 2–3 business days.',
    cta: ['Shop the range', '/shop'], alt: ['Track your order', '/shipping'],
  },
  {
    img: '/img/site/banners/banner-2.jpg',
    eyebrow: 'Premium quality',
    title: 'Industrial-grade tapes, built to last',
    text: 'Trusted brands and premium lines — quality-checked for every job.',
    cta: ['Shop premium tapes', '/shop'], alt: ['Our brands', '/about'],
  },
  {
    img: '/img/site/banners/banner-3.jpg',
    eyebrow: 'The widest range',
    title: 'Every tape, one supplier',
    text: '130+ lines across 35 categories — double-sided, foam, foil, safety and more.',
    cta: ['Browse all tapes', '/shop'], alt: ['Shop by industry', '/industries'],
  },
  {
    img: '/img/site/banners/banner-4.jpg?v=6',
    eyebrow: 'Bulk & trade',
    title: 'Save more when you buy more',
    text: 'Volume discounts up to 30% — with trade accounts for business buyers.',
    cta: ['Bulk & trade pricing', '/bulk'], alt: ['Get in contact', '/contact'],
  },
]

export default function HeroSlider() {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const timer = useRef(null)
  const n = SLIDES.length

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || paused) return
    timer.current = setInterval(() => setI((x) => (x + 1) % n), 6000)
    return () => clearInterval(timer.current)
  }, [paused, n])

  const goTo = (x) => setI((x + n) % n)

  return (
    <section className="hslide" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} aria-roledescription="carousel" aria-label="Featured">
      <div className="hslide__track">
        {SLIDES.map((s, x) => (
          <div key={x} className={'hslide__slide' + (x === i ? ' is-active' : '')} aria-hidden={x !== i}>
            <div className="hslide__media"><img src={s.img} alt="" loading={x === 0 ? 'eager' : 'lazy'} fetchpriority={x === 0 ? 'high' : 'auto'} /></div>
            <div className="wrap hslide__inner">
              <div className="hslide__content">
                <span className="hslide__eyebrow">{s.eyebrow}</span>
                <h1 className="hslide__title">{s.title}</h1>
                <p className="hslide__text">{s.text}</p>
                <div className="hslide__cta">
                  <a href={'#' + s.cta[1]} className="btn btn--brand btn--lg" onClick={(e) => go(e, s.cta[1])} tabIndex={x === i ? 0 : -1}>{s.cta[0]} <Icon name="arrowRight" size={18} /></a>
                  <a href={'#' + s.alt[1]} className="btn btn--onink-ghost btn--lg" onClick={(e) => go(e, s.alt[1])} tabIndex={x === i ? 0 : -1}>{s.alt[0]}</a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="hslide__arrow hslide__arrow--prev" onClick={() => goTo(i - 1)} aria-label="Previous slide"><Icon name="chevronRight" size={22} /></button>
      <button className="hslide__arrow hslide__arrow--next" onClick={() => goTo(i + 1)} aria-label="Next slide"><Icon name="chevronRight" size={22} /></button>

      <div className="hslide__dots" role="tablist" aria-label="Choose slide">
        {SLIDES.map((_, x) => (
          <button key={x} className={'hslide__dot' + (x === i ? ' is-active' : '')} onClick={() => goTo(x)} aria-label={`Slide ${x + 1}`} aria-selected={x === i} role="tab" />
        ))}
      </div>
    </section>
  )
}
