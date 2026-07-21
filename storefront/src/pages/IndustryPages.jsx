/*  Industry / application pages — driven by src/data/industries.js.
    IndustryPage: one application's full guide. IndustriesPage: the index grid.  */
import { useEffect } from 'react'
import { INDUSTRIES, findIndustry } from '../data/industries.js'
import { findProduct } from '../data/catalog.js'
import { navigate } from '../lib/cart.js'

const Check = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7" /></svg>
)
const Arrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
)

/* image that quietly falls back to a branded gradient if the file isn't there yet */
function Img({ src, alt }) {
  return <img src={src} alt={alt} loading="lazy" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />
}

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

function RecommendedProduct({ handle }) {
  const p = findProduct(handle)
  if (!p) return null
  return (
    <a href="#" className="ind__prod" onClick={(e) => { e.preventDefault(); navigate(`product/${p.handle}`) }}>
      <span className="ind__prod-media"><Img src={p.img} alt={p.name} /></span>
      <span className="ind__prod-body">
        <b>{p.name}</b>
        <span className="ind__prod-price">From ${p.from.toFixed(2)}</span>
      </span>
      <span className="ind__prod-go"><Arrow /></span>
    </a>
  )
}

export function IndustryPage({ slug }) {
  const ind = findIndustry(slug) || INDUSTRIES[0]
  useMeta(ind.metaTitle, ind.metaDescription)

  return (
    <main id="main" className="page ind">
      <header className="ind__hero">
        <div className="wrap ind__hero-in">
          <div className="ind__hero-copy">
            <a href="#" className="ind__eyebrow" onClick={(e) => { e.preventDefault(); navigate('industries') }}>Industries &amp; applications</a>
            <h1 className="ind__h1">{ind.name}</h1>
            <p className="ind__lead">{ind.intro}</p>
            <div className="ind__hero-cta">
              <a href="#" className="btn btn--primary" onClick={(e) => { e.preventDefault(); navigate('collection') }}>Shop All Products<Arrow /></a>
              <a href="#" className="btn btn--ghost-dark" onClick={(e) => { e.preventDefault(); navigate('bulk') }}>Bulk &amp; trade quote</a>
            </div>
          </div>
          <div className="ind__hero-media"><Img src={`/img/industries/${ind.slug}-hero.jpg`} alt={ind.name} /></div>
        </div>
      </header>

      <section className="wrap ind__sec">
        <h2 className="ind__h2">Common use cases in {ind.short}</h2>
        <div className="ind__uc-grid">
          {ind.useCases.map(([title, body], i) => (
            <article key={title} className="ind__uc">
              <div className="ind__uc-media"><Img src={`/img/industries/${ind.slug}-${i + 1}.jpg`} alt={title} /></div>
              <div className="ind__uc-body">
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="ind__band">
        <div className="wrap ind__band-in">
          <h2 className="ind__h2">Key characteristics to look for</h2>
          <ul className="ind__chars">
            {ind.characteristics.map(([t, d]) => (
              <li key={t} className="ind__char">
                <span className="ind__char-ic"><Check /></span>
                <span><b>{t}</b>{d && <span className="ind__char-d">{d}</span>}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="wrap ind__sec">
        <h2 className="ind__h2">Recommended products for this application</h2>
        <div className="ind__rec">
          <div className="ind__rec-copy">
            {ind.recommended.map((para, i) => <p key={i}>{para}</p>)}
          </div>
          <div className="ind__prods">
            {ind.products.map((h) => <RecommendedProduct key={h} handle={h} />)}
          </div>
        </div>
      </section>

      <section className="wrap ind__sec ind__related-sec">
        <h2 className="ind__h2">Related application pages</h2>
        <div className="ind__related">
          {ind.related.map(([rslug, note]) => {
            const r = findIndustry(rslug)
            if (!r) return null
            return (
              <a key={rslug} href="#" className="ind__rel" onClick={(e) => { e.preventDefault(); navigate(`industry/${rslug}`) }}>
                <b>{r.name}</b>
                <span>{note}</span>
                <em>Explore <Arrow /></em>
              </a>
            )
          })}
        </div>
        <a href="#" className="btn btn--primary ind__shopall" onClick={(e) => { e.preventDefault(); navigate('collection') }}>Shop all hook &amp; loop products<Arrow /></a>
      </section>
    </main>
  )
}

export function IndustriesPage() {
  useMeta('Hook and Loop by Industry & Application | HooknLoop Australia',
    'Find the right hook and loop for your industry — clothing, upholstery, schools, signage, automotive, medical, warehousing and construction. Shop HooknLoop Australia.')
  return (
    <main id="main" className="page ind">
      <header className="ind__hero ind__hero--index">
        <div className="wrap">
          <span className="ind__eyebrow ind__eyebrow--static">Industries &amp; applications</span>
          <h1 className="ind__h1">Hook &amp; loop, matched to your industry</h1>
          <p className="ind__lead">Practical fastening guides for the trades and sectors we supply — the right product, the right width, and how it’s used, for each application.</p>
        </div>
      </header>
      <section className="wrap ind__sec">
        <div className="ind__index-grid">
          {INDUSTRIES.map((ind) => (
            <a key={ind.slug} href="#" className="ind__card" onClick={(e) => { e.preventDefault(); navigate(`industry/${ind.slug}`) }}>
              <div className="ind__card-media"><Img src={`/img/industries/${ind.slug}-hero.jpg`} alt={ind.short} /></div>
              <div className="ind__card-body">
                <h2>{ind.short}</h2>
                <p>{ind.intro.split('. ')[0]}.</p>
                <span className="ind__card-go">View guide <Arrow /></span>
              </div>
            </a>
          ))}
        </div>
      </section>
    </main>
  )
}
