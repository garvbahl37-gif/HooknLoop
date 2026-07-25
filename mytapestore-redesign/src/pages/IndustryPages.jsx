import Icon from '../components/Icon.jsx'
import ProductCard from '../components/ProductCard.jsx'
import FilterPanel from '../components/FilterPanel.jsx'
import Breadcrumbs from '../components/Breadcrumbs.jsx'
import { INDUSTRIES, productsInIndustry } from '../data/catalog.js'
import { navigate } from '../lib/cart.js'
import { SORTS, useProductFilters } from '../lib/filters.js'

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
  const baseList = productsInIndustry(slug)
  const {
    sort, setSort, products,
    inStockOnly, setInStockOnly, priceBucket, setPriceBucket,
    colours, availColours, toggleColour, sizeFilter, setSizeFilter, availSizes,
    categories, availCategories, toggleCategory,
    filtersActive, clearAll,
  } = useProductFilters(baseList)

  if (!ind) return <main id="main" className="wrap pdp-missing"><h1>Industry not found</h1><a className="btn btn--brand" href="#/industries" onClick={(e) => go(e, '/industries')}>All industries</a></main>

  const bg = `/img/site/industry/${slug}.jpg`

  return (
    <main id="main" className="col">
      <div className={'colban grain colban--img'} style={{ backgroundImage: `url(${bg})` }}>
        <div className="colban__scrim" />
        <div className="wrap colban__inner">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Industries', href: '/industries' }, { label: ind.name }]} />
          <span className="eyebrow eyebrow--onink">Industry</span>
          <h1 className="colban__title">{ind.name}</h1>
          <p className="colban__desc">{ind.desc || `Adhesive tapes and fastening solutions selected for ${ind.name.toLowerCase()} applications.`}</p>
          <span className="colban__count num">{products.length} product{products.length !== 1 ? 's' : ''} available</span>
        </div>
      </div>

      <div className="wrap col__layout">
        <aside className="col__side">
          <FilterPanel {...{ priceBucket, setPriceBucket, colours, availColours, toggleColour, sizeFilter, setSizeFilter, availSizes, categories, availCategories, toggleCategory, inStockOnly, setInStockOnly, onClear: clearAll, active: filtersActive }} />
        </aside>

        <div className="col__main">
          <div className="col__toolbar">
            <span className="col__count num">{products.length} product{products.length !== 1 ? 's' : ''}</span>
            <div className="col__tools">
              <label className="col__sort">
                <span>Sort by</span>
                <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort products">
                  {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <Icon name="chevronDown" size={16} />
              </label>
            </div>
          </div>

          {products.length ? (
            <div className="grid-products col__grid">
              {products.map((p) => <ProductCard key={p.handle} p={p} />)}
            </div>
          ) : (
            <div className="col__empty">
              <Icon name="layers" size={40} />
              <p>No products match your filters here.</p>
              <button className="btn btn--ghost" onClick={clearAll}>Clear filters</button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
