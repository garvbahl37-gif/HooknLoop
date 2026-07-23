import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import ProductCard from '../components/ProductCard.jsx'
import Breadcrumbs from '../components/Breadcrumbs.jsx'
import { PRODUCTS } from '../data/catalog.js'
import { navigate } from '../lib/cart.js'

function search(query) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (!terms.length) return []
  return PRODUCTS.map((p) => {
    const hay = [p.name, p.sku, ...p.cats.map((c) => c.name), ...p.industries.map((c) => c.name),
      ...(p.axes || []).flatMap((a) => a.terms)].join(' ').toLowerCase()
    let score = 0
    for (const t of terms) { if (hay.includes(t)) score += p.name.toLowerCase().includes(t) ? 3 : 1 }
    return { p, score }
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score || b.p.reviews - a.p.reviews).map((x) => x.p)
}

export default function SearchPage({ query }) {
  const [q, setQ] = useState(query || '')
  const results = search(query || '')
  const submit = (e) => { e.preventDefault(); const t = q.trim(); if (t) navigate('search/' + encodeURIComponent(t)) }

  return (
    <main id="main">
      <div className="wrap search__crumbs"><Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Search' }]} /></div>
      <div className="wrap search__head">
        <h1>Search{query ? <> results for “<span className="search__q">{query}</span>”</> : ''}</h1>
        <form className="search__box" role="search" onSubmit={submit}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tapes, brands or sizes…" aria-label="Search products" autoFocus />
          <button className="btn btn--brand" type="submit"><Icon name="search" size={18} /> Search</button>
        </form>
        {query && <p className="search__count num">{results.length} product{results.length !== 1 ? 's' : ''} found</p>}
      </div>
      <div className="wrap section--tight">
        {results.length ? (
          <div className="grid-products grid-products--5">{results.map((p) => <ProductCard key={p.handle} p={p} />)}</div>
        ) : query ? (
          <div className="col__empty">
            <Icon name="search" size={40} />
            <p>No products matched “{query}”. Try a broader term like “foam”, “duct”, “double sided” or “hook &amp; loop”.</p>
            <a className="btn btn--ghost" href="#/shop" onClick={(e) => { e.preventDefault(); navigate('/shop') }}>Browse all products</a>
          </div>
        ) : (
          <div className="col__empty"><Icon name="search" size={40} /><p>Type a product, brand or size to search our range.</p></div>
        )}
      </div>
    </main>
  )
}
