import Icon from '../components/Icon.jsx'
import ProductCard from '../components/ProductCard.jsx'
import Breadcrumbs from '../components/Breadcrumbs.jsx'
import { INDUSTRIES, productsInIndustry, catName } from '../data/catalog.js'
import { navigate } from '../lib/cart.js'

const go = (e, h) => { e.preventDefault(); navigate(h) }

export function IndustriesPage() {
  return (
    <main id="main">
      <div className="wrap ind-page__crumbs"><Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Industries' }]} /></div>
      <div className="wrap ind-page__intro">
        <span className="eyebrow">The right tape for the job</span>
        <h1>Tapes by industry</h1>
        <p>From construction and marine to signage, manufacturing and healthcare — find the adhesive tapes trusted in your line of work. Browse {INDUSTRIES.length} industries below.</p>
      </div>
      <div className="wrap section--tight">
        <div className="ind-grid">
          {INDUSTRIES.map((c) => (
            <a key={c.slug} href={'#/industry/' + c.slug} className="ind-card" onClick={(e) => go(e, '/industry/' + c.slug)}>
              {c.img ? <div className="ind-card__img"><img src={c.img} alt={c.name} loading="lazy" width="120" height="120" /></div>
                : <div className="ind-card__img ind-card__img--icon"><Icon name="factory" size={30} /></div>}
              <div className="ind-card__body">
                <b>{c.name}</b>
                <span className="num">{c.count} product{c.count !== 1 ? 's' : ''} <Icon name="arrowRight" size={14} /></span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </main>
  )
}

export function IndustryPage({ slug }) {
  const ind = INDUSTRIES.find((c) => c.slug === slug)
  const products = productsInIndustry(slug)
  const others = INDUSTRIES.filter((c) => c.slug !== slug).slice(0, 10)
  if (!ind) return <main id="main" className="wrap pdp-missing"><h1>Industry not found</h1><a className="btn btn--brand" href="#/industries" onClick={(e) => go(e, '/industries')}>All industries</a></main>

  return (
    <main id="main">
      <div className="wrap ind-page__crumbs"><Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Industries', href: '/industries' }, { label: ind.name }]} /></div>
      <div className="ind-hero">
        <div className="wrap ind-hero__row">
          <div>
            <span className="eyebrow eyebrow--onink">Industry</span>
            <h1>{ind.name}</h1>
            <p>{ind.desc || `Adhesive tapes and fastening solutions selected for ${ind.name.toLowerCase()} applications. ${products.length} product${products.length !== 1 ? 's' : ''} recommended for this sector.`}</p>
          </div>
          <div className="ind-hero__count"><b className="num">{products.length}</b><span>Products for<br />{ind.name}</span></div>
        </div>
      </div>
      <div className="wrap section">
        {products.length ? (
          <div className="grid-products grid-products--5">{products.map((p) => <ProductCard key={p.handle} p={p} />)}</div>
        ) : (
          <div className="col__empty"><Icon name="layers" size={40} /><p>No products are tagged for this industry yet.</p><a className="btn btn--ghost" href="#/shop" onClick={(e) => go(e, '/shop')}>Browse all products</a></div>
        )}
      </div>
      <section className="section section--paper">
        <div className="wrap">
          <div className="section-head"><div className="section-title-wrap"><span className="eyebrow">Explore more</span><h2>Other industries</h2></div></div>
          <div className="ind-strip">
            {others.map((c) => <a key={c.slug} href={'#/industry/' + c.slug} className="ind-chip" onClick={(e) => go(e, '/industry/' + c.slug)}><Icon name="factory" size={16} /><span>{c.name}</span></a>)}
          </div>
        </div>
      </section>
    </main>
  )
}
