/*  Industry / application pages — clean blog-article layout (no cards/boxes),
    driven by src/data/industries.js. IndustriesPage is the index of guides.    */
import { useEffect } from 'react'
import { INDUSTRIES, findIndustry } from '../data/industries.js'
import { findProduct } from '../data/catalog.js'
import { navigate } from '../lib/cart.js'

const Arrow = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
)

/* keep the document title + meta description in sync for SEO */
function useMeta(title, description) {
  useEffect(() => {
    const prevTitle = document.title
    document.title = title
    let meta = document.querySelector('meta[name="description"]')
    const created = !meta
    if (created) { meta = document.createElement('meta'); meta.setAttribute('name', 'description'); document.head.appendChild(meta) }
    const prevDesc = meta.getAttribute('content')
    meta.setAttribute('content', description)
    return () => { document.title = prevTitle; if (created) meta.remove(); else if (prevDesc != null) meta.setAttribute('content', prevDesc) }
  }, [title, description])
}

export function IndustryPage({ slug }) {
  const ind = findIndustry(slug) || INDUSTRIES[0]
  useMeta(ind.metaTitle, ind.metaDescription)

  return (
    <main id="main" className="page">
      <article className="wrap ind-art">
        <a href="#" className="ind-art__eyebrow" onClick={(e) => { e.preventDefault(); navigate('industries') }}>Industries &amp; applications</a>
        <h1 className="ind-art__h1">{ind.name}</h1>
        <p className="ind-art__intro">{ind.intro}</p>

        <figure className="ind-art__hero">
          <img src={`/img/industries/${ind.slug}-hero.jpg`} alt={ind.name} loading="lazy"
               onError={(e) => { const f = e.currentTarget.closest('.ind-art__hero'); if (f) f.style.display = 'none' }} />
        </figure>

        <h2 className="ind-art__h2">Common use cases in {ind.short}</h2>
        {ind.useCases.map(([title, body]) => (
          <div key={title} className="ind-art__block">
            <h3 className="ind-art__h3">{title}</h3>
            <p>{body}</p>
          </div>
        ))}

        <h2 className="ind-art__h2">Key characteristics to look for</h2>
        <ul className="ind-art__list">
          {ind.characteristics.map(([t, d]) => (
            <li key={t}>{d ? <><b>{t}</b> — {d}</> : t}</li>
          ))}
        </ul>

        <h2 className="ind-art__h2">Recommended products for this application</h2>
        {ind.recommended.map((para, i) => <p key={i} className="ind-art__p">{para}</p>)}
        <ul className="ind-art__plinks">
          {ind.products.map((h) => {
            const p = findProduct(h)
            if (!p) return null
            return (
              <li key={h}>
                <a href="#" onClick={(e) => { e.preventDefault(); navigate(`product/${p.handle}`) }}>{p.name}</a>
                <span> — from ${p.from.toFixed(2)}</span>
              </li>
            )
          })}
        </ul>

        <h2 className="ind-art__h2">Related application pages</h2>
        <ul className="ind-art__related">
          {ind.related.map(([rslug, note]) => {
            const r = findIndustry(rslug)
            if (!r) return null
            return (
              <li key={rslug}>
                <a href="#" onClick={(e) => { e.preventDefault(); navigate(`industry/${rslug}`) }}>{r.name}</a>
                <span> — {note}</span>
              </li>
            )
          })}
        </ul>

        <a href="#" className="btn btn--primary ind-art__cta" onClick={(e) => { e.preventDefault(); navigate('collection') }}>Shop all hook &amp; loop products<Arrow /></a>
      </article>
    </main>
  )
}

export function IndustriesPage() {
  useMeta('Hook and Loop by Industry & Application | HooknLoop Australia',
    'Find the right hook and loop for your industry — clothing, upholstery, schools, signage, automotive, medical, warehousing and construction. Shop HooknLoop Australia.')
  return (
    <main id="main" className="page">
      <div className="wrap ind-art ind-idx">
        <span className="ind-art__eyebrow">Industries &amp; applications</span>
        <h1 className="ind-art__h1">Hook &amp; loop, matched to your industry</h1>
        <p className="ind-art__intro">Practical fastening guides for the trades and sectors we supply — the right product, the right width, and how it’s used, for each application.</p>
        <ul className="ind-idx__list">
          {INDUSTRIES.map((ind) => (
            <li key={ind.slug}>
              <a href="#" onClick={(e) => { e.preventDefault(); navigate(`industry/${ind.slug}`) }}>
                <b>{ind.short}</b>
                <span>{ind.intro.split('. ')[0]}.</span>
                <em>Read guide <Arrow /></em>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
