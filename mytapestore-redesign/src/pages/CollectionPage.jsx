import { useState, useMemo } from 'react'
import CategoryRail from '../components/CategoryRail.jsx'
import ProductCard from '../components/ProductCard.jsx'
import Breadcrumbs from '../components/Breadcrumbs.jsx'
import FilterPanel from '../components/FilterPanel.jsx'
import Icon from '../components/Icon.jsx'
import { PRODUCTS, PRODUCT_CATEGORIES, productsInCat, catName, NAV_GROUPS } from '../data/catalog.js'
import { CATEGORY_SEO } from '../data/categorySeo.js'
import { navigate } from '../lib/cart.js'
import { SORTS, useProductFilters } from '../lib/filters.js'

const groupOf = (slug) => Object.entries(NAV_GROUPS).find(([, ss]) => ss.includes(slug))?.[0]

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
  const cat = all ? null : PRODUCT_CATEGORIES.find((c) => c.slug === slug)
  const title = all ? 'All products' : catName(slug)
  const group = all ? null : groupOf(slug)

  const baseList = useMemo(() => (all ? [...PRODUCTS] : productsInCat(slug)), [slug, all])
  const {
    sort, setSort, products,
    inStockOnly, setInStockOnly, priceBucket, setPriceBucket,
    colours, availColours, toggleColour, sizeFilter, setSizeFilter, availSizes,
    categories, availCategories, toggleCategory,
    filtersActive, clearAll,
  } = useProductFilters(baseList)

  const crumbs = [{ label: 'Home', href: '/' }]
  if (all) crumbs.push({ label: 'All products' })
  else { if (group) crumbs.push({ label: group }); crumbs.push({ label: title }) }

  return (
    <main id="main" className="col">
      <CollectionBanner slug={slug} all={all} title={title} count={products.length} group={group} crumbs={crumbs} />

      <div className="wrap col__layout">
        <aside className="col__side">
          <CategoryRail activeSlug={slug} />
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

      {!all && <CategorySEO slug={slug} cat={cat} />}
    </main>
  )
}
