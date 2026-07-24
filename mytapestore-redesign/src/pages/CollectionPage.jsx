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

/* colour name → swatch fill */
const SWATCH = {
  black: '#1a1a1a', white: '#ffffff', orange: '#df3c22', brown: '#6b4423', red: '#c0392b',
  blue: '#2b5cb8', navy: '#1f2d5a', green: '#2e7d32', yellow: '#e8b800', grey: '#8a8a8a', gray: '#8a8a8a',
  silver: '#c7c7c7', aluminium: '#c7c7c7', gold: '#c9a227', pink: '#e35b8f', purple: '#7b4bb8',
  clear: 'linear-gradient(135deg,#eee 25%,#fff 25% 50%,#eee 50% 75%,#fff 75%)',
  transparent: 'linear-gradient(135deg,#eee 25%,#fff 25% 50%,#eee 50% 75%,#fff 75%)',
}
const swatchFill = (n) => SWATCH[String(n).toLowerCase().trim()] || null
const colourAxis = (p) => (p.axes || []).find((a) => /colou?r/i.test(a.name))

const PRICE_OPTS = [
  ['all', 'All prices', () => true],
  ['u20', 'Under $20', (p) => p.from < 20],
  ['20-50', '$20 – $50', (p) => p.from >= 20 && p.from < 50],
  ['50-100', '$50 – $100', (p) => p.from >= 50 && p.from < 100],
  ['o100', 'Over $100', (p) => p.from >= 100],
]

function CollectionBanner({ slug, all, title, desc, count, group, crumbs }) {
  const bg = all ? '/img/site/banners/banner-3.jpg' : (slug ? `/img/site/cat/${slug}.jpg` : null)
  const hasImg = !!bg
  /* full original SEO copy — drop a short leading heading line that just repeats the title */
  let lines = (desc || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
  if (lines.length > 1 && lines[0].length < 62) lines = lines.slice(1)
  const trust = [['truck', 'Fast delivery'], ['badgeCheck', 'Lowest-price guarantee'], ['mapPin', 'Australian owned']]
  return (
    <div className={'colban grain' + (hasImg ? ' colban--img' : '')} style={hasImg ? { backgroundImage: `url(${bg})` } : undefined}>
      <div className="colban__scrim" />
      <div className="wrap colban__inner">
        <Breadcrumbs items={crumbs} />
        {group && <span className="eyebrow eyebrow--onink">{group}</span>}
        <h1 className="colban__title">{title}</h1>
        {lines.length > 0 && <div className="colban__desc">{lines.map((p, i) => <p key={i}>{p}</p>)}</div>}
        <span className="colban__count num">{count} product{count !== 1 ? 's' : ''} available</span>
        <ul className="colban__trust">
          {trust.map(([ic, label]) => (
            <li key={label}><span className="colban__trust-ic"><Icon name={ic} size={26} /></span>{label}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function FilterPanel({ priceBucket, setPriceBucket, colours, availColours, toggleColour, inStockOnly, setInStockOnly, onClear, active }) {
  return (
    <div className="filt-card">
      <div className="filt-card__head"><Icon name="ruler" size={15} /> Filter</div>

      <div className="filt">
        <h3 className="filt__title">Availability</h3>
        <label className="filt__check">
          <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} />
          <span>In stock only</span>
        </label>
      </div>

      <div className="filt">
        <h3 className="filt__title">Price</h3>
        {PRICE_OPTS.map(([v, label]) => (
          <label key={v} className="filt__radio">
            <input type="radio" name="price" checked={priceBucket === v} onChange={() => setPriceBucket(v)} />
            <span>{label}</span>
          </label>
        ))}
      </div>

      {availColours.length > 0 && (
        <div className="filt">
          <h3 className="filt__title">Colour</h3>
          <div className="filt__colours">
            {availColours.map((c) => {
              const on = colours.includes(c); const fill = swatchFill(c)
              return (
                <button key={c} className={'filt__colour' + (on ? ' is-on' : '')} onClick={() => toggleColour(c)} title={c} aria-pressed={on}>
                  {fill ? <span className="filt__colour-dot" style={{ background: fill }} /> : null}
                  <span className="filt__colour-lbl">{c}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {active && <button className="filt__clear" onClick={onClear}>Clear all filters</button>}
    </div>
  )
}

export default function CollectionPage({ slug, all = false }) {
  const [sort, setSort] = useState('featured')
  const [inStockOnly, setInStockOnly] = useState(false)
  const [priceBucket, setPriceBucket] = useState('all')
  const [colours, setColours] = useState([])
  const cat = all ? null : PRODUCT_CATEGORIES.find((c) => c.slug === slug)
  const title = all ? 'All products' : catName(slug)
  const group = all ? null : groupOf(slug)

  const baseList = useMemo(() => (all ? [...PRODUCTS] : productsInCat(slug)), [slug, all])
  const availColours = useMemo(() => {
    const set = new Set()
    for (const p of baseList) { const ca = colourAxis(p); if (ca) ca.terms.forEach((t) => set.add(t)) }
    return [...set]
  }, [baseList])

  const products = useMemo(() => {
    let list = [...baseList]
    if (inStockOnly) list = list.filter((p) => p.inStock)
    const priceFn = (PRICE_OPTS.find(([v]) => v === priceBucket) || [])[2]
    if (priceFn) list = list.filter(priceFn)
    if (colours.length) list = list.filter((p) => { const ca = colourAxis(p); return ca && ca.terms.some((t) => colours.includes(t)) })
    const s = {
      'price-asc': (a, b) => a.from - b.from,
      'price-desc': (a, b) => b.from - a.from,
      rating: (a, b) => (b.rating - a.rating) || (b.reviews - a.reviews),
      name: (a, b) => a.name.localeCompare(b.name),
      featured: (a, b) => (b.reviews - a.reviews) || (b.rating - a.rating),
    }[sort]
    return list.sort(s)
  }, [baseList, sort, inStockOnly, priceBucket, colours])

  const toggleColour = (c) => setColours((cs) => cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c])
  const filtersActive = inStockOnly || priceBucket !== 'all' || colours.length > 0
  const clearAll = () => { setInStockOnly(false); setPriceBucket('all'); setColours([]) }

  const crumbs = [{ label: 'Home', href: '/' }]
  if (all) crumbs.push({ label: 'All products' })
  else { if (group) crumbs.push({ label: group }); crumbs.push({ label: title }) }

  return (
    <main id="main" className="col">
      <CollectionBanner slug={slug} all={all} title={title} desc={all ? 'Buy adhesive tape online from My Tape Store — Australia’s tape specialists. From double-sided, foam and duct to foil, hook & loop, safety and packaging tapes plus dispensers, we stock the full range with fast delivery Australia-wide and a lowest-price guarantee.' : cat?.desc} count={products.length} group={group} crumbs={crumbs} />

      <div className="wrap col__layout">
        <aside className="col__side">
          <FilterPanel {...{ priceBucket, setPriceBucket, colours, availColours, toggleColour, inStockOnly, setInStockOnly, onClear: clearAll, active: filtersActive }} />
          <CategoryRail activeSlug={slug} />
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
