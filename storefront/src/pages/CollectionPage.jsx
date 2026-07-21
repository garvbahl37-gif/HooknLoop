/*  CollectionPage — the shop/browse page the live store lacks. Product grid with
    category + colour filters and sort. Reachable from nav and category cards.   */
import { useState, useEffect } from 'react'
import { PRODUCTS, CATEGORIES, catName } from '../data/catalog.js'
import { navigate } from '../lib/cart.js'
import ProductCard from '../components/ProductCard.jsx'

const SORTS = [['featured', 'Featured'], ['low', 'Price: low → high'], ['high', 'Price: high → low'], ['az', 'Name A–Z']]

export default function CollectionPage({ slug }) {
  const [cat, setCat] = useState(slug || 'all')
  const [colour, setColour] = useState('all')
  const [sort, setSort] = useState('featured')

  /* the page doesn't remount between collections, so follow the slug when the
     nav jumps straight from one category to another */
  useEffect(() => { setCat(slug || 'all') }, [slug])

  let items = PRODUCTS.filter((p) => (cat === 'all' || p.cat === cat) && (colour === 'all' || p.colours.includes(colour)))
  if (sort === 'low') items = [...items].sort((a, b) => a.from - b.from)
  if (sort === 'high') items = [...items].sort((a, b) => b.from - a.from)
  if (sort === 'az') items = [...items].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <main id="main" className="page">
      <div className="wrap coll__head">
        <div>
          <span className="sec-eyebrow">Shop</span>
          <h1 className="page__h1">{cat === 'all' ? 'All hook & loop' : catName(cat)}</h1>
          <p className="page__lead">{items.length} product{items.length !== 1 ? 's' : ''} · dispatched 1–2 days Australia-wide</p>
        </div>
        <label className="coll__sort">
          <span>Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      </div>

      <div className="wrap coll__body">
        <aside className="coll__filters">
          <div className="coll__filter">
            <h3>Category</h3>
            <button className={`coll__fbtn ${cat === 'all' ? 'is-on' : ''}`} onClick={() => setCat('all')}>All products <em>{PRODUCTS.length}</em></button>
            {CATEGORIES.map((c) => {
              const n = PRODUCTS.filter((p) => p.cat === c.slug).length
              return <button key={c.slug} className={`coll__fbtn ${cat === c.slug ? 'is-on' : ''}`} onClick={() => setCat(c.slug)}>{c.name} <em>{n}</em></button>
            })}
          </div>
          <div className="coll__filter">
            <h3>Colour</h3>
            {['all', 'Black', 'White', 'Orange'].map((c) => (
              <button key={c} className={`coll__fbtn ${colour === c ? 'is-on' : ''}`} onClick={() => setColour(c)}>{c === 'all' ? 'Any colour' : c}</button>
            ))}
          </div>
          <div className="coll__help">
            <b>Not sure which?</b>
            <p>Answer 3 quick questions and we’ll match your job.</p>
            <a href="#" className="btn btn--ghost-dark" onClick={(e) => { e.preventDefault(); navigate(''); setTimeout(() => { document.getElementById('tape-finder')?.scrollIntoView({ behavior: 'smooth' }) }, 100) }}>Find my fastener</a>
          </div>
        </aside>

        <div className="coll__grid">
          {items.map((p) => <ProductCard key={p.handle} p={p} />)}
          {items.length === 0 && <p className="coll__empty">No products match those filters. <button onClick={() => { setCat('all'); setColour('all') }}>Clear filters</button></p>}
        </div>
      </div>
    </main>
  )
}
