import { useState, useMemo } from 'react'
import CategoryRail from '../components/CategoryRail.jsx'
import ProductCard from '../components/ProductCard.jsx'
import Breadcrumbs from '../components/Breadcrumbs.jsx'
import Icon from '../components/Icon.jsx'
import { PRODUCTS, PRODUCT_CATEGORIES, productsInCat, catName, NAV_GROUPS } from '../data/catalog.js'
import { CATEGORY_SEO } from '../data/categorySeo.js'
import { navigate } from '../lib/cart.js'

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
const sizeAxis = (p) => (p.axes || []).find((a) => /size/i.test(a.name))

const PRICE_OPTS = [
  ['all', 'All prices', () => true],
  ['u20', 'Under $20', (p) => p.from < 20],
  ['20-50', '$20 – $50', (p) => p.from >= 20 && p.from < 50],
  ['50-100', '$50 – $100', (p) => p.from >= 50 && p.from < 100],
  ['o100', 'Over $100', (p) => p.from >= 100],
]

function CollectionBanner({ slug, all, title, count, group, crumbs }) {
  const bg = all ? '/img/site/banners/banner-3.jpg' : (slug ? `/img/site/cat/${slug}.jpg` : null)
  const hasImg = !!bg
  return (
    <div className={'colban grain' + (hasImg ? ' colban--img' : '')} style={hasImg ? { backgroundImage: `url(${bg})` } : undefined}>
      <div className="colban__scrim" />
      <div className="wrap colban__inner">
        <Breadcrumbs items={crumbs} />
        {group && <span className="eyebrow eyebrow--onink">{group}</span>}
        <h1 className="colban__title">{title}</h1>
        <span className="colban__count num">{count} product{count !== 1 ? 's' : ''} available</span>
      </div>
    </div>
  )
}

function FilterPanel({ priceBucket, setPriceBucket, colours, availColours, toggleColour, sizeFilter, setSizeFilter, availSizes, inStockOnly, setInStockOnly, onClear, active }) {
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

      {availSizes.length > 0 && (
        <div className="filt">
          <h3 className="filt__title">Size</h3>
          <div className="filt__select">
            <select value={sizeFilter} onChange={(e) => setSizeFilter(e.target.value)} aria-label="Filter by size">
              <option value="all">All sizes</option>
              {availSizes.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <Icon name="chevronDown" size={15} />
          </div>
        </div>
      )}

      <div className="filt">
        <h3 className="filt__title">Price</h3>
        {PRICE_OPTS.map(([v, label]) => (
          <label key={v} className="filt__radio">
            <input type="radio" name="price" checked={priceBucket === v} onChange={() => setPriceBucket(v)} />
            <span>{label}</span>
          </label>
        ))}
      </div>

      {active && <button className="filt__clear" onClick={onClear}>Clear all filters</button>}
    </div>
  )
}

/* Renders one content block from the original category page verbatim, in the order it
   appeared — heading / paragraph / titled-item list / plain bullet list / FAQ accordion.
   Kept generic on purpose: forcing every category's content into a fixed set of named
   fields (benefits / perks / etc) silently dropped whatever didn't fit that shape. */
function CatBlock({ block, i, openFaq, setOpenFaq, faqBase }) {
  if (block.type === 'heading') return <h3 key={i} className="catseo__heading">{block.text}</h3>
  if (block.type === 'p') return <p key={i}>{block.text}</p>
  if (block.type === 'list') return (
    <ul key={i} className="catseo__list">
      {block.items.map((t, j) => <li key={j}><Icon name="check" size={14} /><span>{t}</span></li>)}
    </ul>
  )
  if (block.type === 'items') return (
    <ul key={i} className="catseo__items">
      {block.items.map((it, j) => (
        <li key={j}><Icon name="check" size={15} /><span>{it.title && <b>{it.title} </b>}{it.text}</span></li>
      ))}
    </ul>
  )
  if (block.type === 'faq' && block.qas?.length) return (
    <div key={i} className="catseo__faqs">
      <span className="catseo__faqs-eyebrow">Good to know</span>
      <h3>Frequently asked questions</h3>
      <ul className="faq__list">
        {block.qas.map((f, j) => {
          const id = faqBase + j
          return (
            <li key={j} className={'faq__item' + (openFaq === id ? ' is-open' : '')}>
              <button className="faq__q" aria-expanded={openFaq === id} onClick={() => setOpenFaq(openFaq === id ? -1 : id)}>
                <span>{f.q}</span><Icon name={openFaq === id ? 'minus' : 'plus'} size={18} />
              </button>
              {openFaq === id && <div className="faq__a"><p>{f.a}</p></div>}
            </li>
          )
        })}
      </ul>
    </div>
  )
  return null
}

function CategorySEO({ slug, cat }) {
  const [openFaq, setOpenFaq] = useState(0)
  const data = CATEGORY_SEO[slug]
  let introLines = (cat?.desc || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
  if (introLines.length > 1 && introLines[0].length < 62) introLines = introLines.slice(1)
  const blocks = data?.blocks || []
  if (!introLines.length && !blocks.length) return null

  let faqIndex = 0
  return (
    <section className="section catseo">
      <div className="wrap catseo__main">
        <div className="catseo__card">
          {introLines.length > 0 && (
            <div className="catseo__intro">
              <span className="catseo__intro-eyebrow">Overview</span>
              {introLines.map((p, i) => <p key={i}>{p}</p>)}
            </div>
          )}

          {blocks.map((b, i) => {
            const el = <CatBlock key={i} block={b} i={i} openFaq={openFaq} setOpenFaq={setOpenFaq} faqBase={faqIndex} />
            if (b.type === 'faq') faqIndex += (b.qas?.length || 0)
            return el
          })}

          <div className="catseo__close">
            <p>Still not sure which tape is right for the job?</p>
            <a href="#/contact" className="btn btn--brand catseo__contact" onClick={(e) => { e.preventDefault(); navigate('/contact') }}>Talk to our tape experts <Icon name="arrowRight" size={16} /></a>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function CollectionPage({ slug, all = false }) {
  const [sort, setSort] = useState('featured')
  const [inStockOnly, setInStockOnly] = useState(false)
  const [priceBucket, setPriceBucket] = useState('all')
  const [colours, setColours] = useState([])
  const [sizeFilter, setSizeFilter] = useState('all')
  const cat = all ? null : PRODUCT_CATEGORIES.find((c) => c.slug === slug)
  const title = all ? 'All products' : catName(slug)
  const group = all ? null : groupOf(slug)

  const baseList = useMemo(() => (all ? [...PRODUCTS] : productsInCat(slug)), [slug, all])
  const availColours = useMemo(() => {
    const set = new Set()
    for (const p of baseList) { const ca = colourAxis(p); if (ca) ca.terms.forEach((t) => set.add(t)) }
    return [...set]
  }, [baseList])
  const availSizes = useMemo(() => {
    const set = new Set()
    for (const p of baseList) { const sa = sizeAxis(p); if (sa) sa.terms.forEach((t) => set.add(t)) }
    return [...set]
  }, [baseList])

  const products = useMemo(() => {
    let list = [...baseList]
    if (inStockOnly) list = list.filter((p) => p.inStock)
    const priceFn = (PRICE_OPTS.find(([v]) => v === priceBucket) || [])[2]
    if (priceFn) list = list.filter(priceFn)
    if (colours.length) list = list.filter((p) => { const ca = colourAxis(p); return ca && ca.terms.some((t) => colours.includes(t)) })
    if (sizeFilter !== 'all') list = list.filter((p) => { const sa = sizeAxis(p); return sa && sa.terms.includes(sizeFilter) })
    const s = {
      'price-asc': (a, b) => a.from - b.from,
      'price-desc': (a, b) => b.from - a.from,
      rating: (a, b) => (b.rating - a.rating) || (b.reviews - a.reviews),
      name: (a, b) => a.name.localeCompare(b.name),
      featured: (a, b) => (b.reviews - a.reviews) || (b.rating - a.rating),
    }[sort]
    return list.sort(s)
  }, [baseList, sort, inStockOnly, priceBucket, colours, sizeFilter])

  const toggleColour = (c) => setColours((cs) => cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c])
  const filtersActive = inStockOnly || priceBucket !== 'all' || colours.length > 0 || sizeFilter !== 'all'
  const clearAll = () => { setInStockOnly(false); setPriceBucket('all'); setColours([]); setSizeFilter('all') }

  const crumbs = [{ label: 'Home', href: '/' }]
  if (all) crumbs.push({ label: 'All products' })
  else { if (group) crumbs.push({ label: group }); crumbs.push({ label: title }) }

  return (
    <main id="main" className="col">
      <CollectionBanner slug={slug} all={all} title={title} count={products.length} group={group} crumbs={crumbs} />

      <div className="wrap col__layout">
        <aside className="col__side">
          <CategoryRail activeSlug={slug} />
          <FilterPanel {...{ priceBucket, setPriceBucket, colours, availColours, toggleColour, sizeFilter, setSizeFilter, availSizes, inStockOnly, setInStockOnly, onClear: clearAll, active: filtersActive }} />
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

      {!all && <CategorySEO slug={slug} cat={cat} />}
    </main>
  )
}
