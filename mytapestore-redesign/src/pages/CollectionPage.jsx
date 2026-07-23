import { useState, useMemo } from 'react'
import CategoryRail from '../components/CategoryRail.jsx'
import ProductCard from '../components/ProductCard.jsx'
import Breadcrumbs from '../components/Breadcrumbs.jsx'
import Icon from '../components/Icon.jsx'
import { PRODUCTS, PRODUCT_CATEGORIES, productsInCat, catName, NAV_GROUPS } from '../data/catalog.js'

const SORTS = [
  ['featured', 'Featured'],
  ['price-asc', 'Price: low to high'],
  ['price-desc', 'Price: high to low'],
  ['rating', 'Top rated'],
  ['name', 'Name: A–Z'],
]
const groupOf = (slug) => Object.entries(NAV_GROUPS).find(([, ss]) => ss.includes(slug))?.[0]

function CollectionBanner({ slug, all, title, desc, count, group, crumbs }) {
  /* every category shows its genre photo; the all-products page uses a hero banner */
  const bg = all ? '/img/site/banners/banner-3.jpg' : (slug ? `/img/site/cat/${slug}.jpg` : null)
  const hasImg = !!bg
  const short = desc ? (() => {
    const t = desc.replace(/\s*\r?\n\s*/g, ' ').replace(/\s+/g, ' ').trim()
    return t.length > 150 ? t.slice(0, 147).replace(/\s+\S*$/, '') + '…' : t
  })() : ''
  return (
    <div className={'colban grain' + (hasImg ? ' colban--img' : '')}
      style={hasImg ? { backgroundImage: `url(${bg})` } : undefined}>
      <div className="colban__scrim" />
      <div className="wrap colban__inner">
        <Breadcrumbs items={crumbs} />
        {group && <span className="eyebrow eyebrow--onink">{group}</span>}
        <h1 className="colban__title">{title}</h1>
        {short && <p className="colban__desc">{short}</p>}
        <span className="colban__count num">{count} product{count !== 1 ? 's' : ''} available</span>
      </div>
    </div>
  )
}

export default function CollectionPage({ slug, all = false }) {
  const [sort, setSort] = useState('featured')
  const [inStockOnly, setInStockOnly] = useState(false)
  const cat = all ? null : PRODUCT_CATEGORIES.find((c) => c.slug === slug)
  const title = all ? 'All products' : catName(slug)
  const group = all ? null : groupOf(slug)

  const products = useMemo(() => {
    let list = all ? [...PRODUCTS] : productsInCat(slug)
    if (inStockOnly) list = list.filter((p) => p.inStock)
    const s = {
      'price-asc': (a, b) => a.from - b.from,
      'price-desc': (a, b) => b.from - a.from,
      rating: (a, b) => (b.rating - a.rating) || (b.reviews - a.reviews),
      name: (a, b) => a.name.localeCompare(b.name),
      featured: (a, b) => (b.reviews - a.reviews) || (b.rating - a.rating),
    }[sort]
    return list.sort(s)
  }, [slug, all, sort, inStockOnly])

  const crumbs = [{ label: 'Home', href: '/' }]
  if (all) crumbs.push({ label: 'All products' })
  else { if (group) crumbs.push({ label: group }); crumbs.push({ label: title }) }

  return (
    <main id="main" className="col">
      <CollectionBanner slug={slug} all={all} title={title} desc={all ? 'Browse our full range of adhesive tapes, dispensers and fastening solutions.' : cat?.desc} count={products.length} group={group} crumbs={crumbs} />

      <div className="wrap col__layout">
        <CategoryRail activeSlug={slug} />
        <div className="col__main">
          <div className="col__toolbar">
            <span className="col__count num">{products.length} product{products.length !== 1 ? 's' : ''}</span>
            <div className="col__tools">
              <label className="col__stock">
                <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} />
                <span>In stock only</span>
              </label>
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
              <button className="btn btn--ghost" onClick={() => setInStockOnly(false)}>Clear filters</button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
