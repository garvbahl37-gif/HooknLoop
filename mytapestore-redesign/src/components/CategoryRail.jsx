import { useState } from 'react'
import { NAV_GROUPS, PRODUCT_CATEGORIES } from '../data/catalog.js'
import { navigate } from '../lib/cart.js'
import Icon from './Icon.jsx'

const byId = Object.fromEntries(PRODUCT_CATEGORIES.map((c) => [c.slug, c]))
const go = (e, h) => { e.preventDefault(); navigate(h) }

/* "Shop by category" — a search field over one clean scrollable list with sticky
   group labels. No accordions to fiddle with: type to filter, or scroll the tidy list. */
export default function CategoryRail({ activeSlug }) {
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()
  const groups = Object.entries(NAV_GROUPS)
    .map(([group, slugs]) => {
      const cats = slugs.map((s) => byId[s]).filter(Boolean)
      const matches = query ? cats.filter((c) => c.name.toLowerCase().includes(query)) : cats
      return { group, matches }
    })
    .filter((g) => g.matches.length)
  const total = groups.reduce((n, g) => n + g.matches.length, 0)

  return (
    <aside className="rail" aria-label="Shop by category">
      <div className="rail__head"><Icon name="grid" size={16} /> Shop by category</div>

      <div className="rail__search">
        <Icon name="search" size={16} />
        <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search categories…" aria-label="Search categories" />
        {q && <button type="button" className="rail__search-clear" onClick={() => setQ('')} aria-label="Clear search"><Icon name="close" size={13} /></button>}
      </div>

      <div className="rail__list">
        {total === 0 && <p className="rail__none">No categories match “{q}”.</p>}
        {groups.map(({ group, matches }) => (
          <div key={group} className="rail__sect">
            <div className="rail__sect-label">{group}</div>
            <ul>
              {matches.map((c) => {
                const active = c.slug === activeSlug
                return (
                  <li key={c.slug}>
                    <a href={'#/collection/' + c.slug} onClick={(e) => go(e, '/collection/' + c.slug)}
                      className={'rail__link' + (active ? ' is-active' : '')} aria-current={active ? 'true' : undefined}>
                      <span>{c.name}</span><b className="num">{c.count}</b>
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      <a className="rail__all" href="#/shop" onClick={(e) => go(e, '/shop')}>View all products <Icon name="arrowRight" size={15} /></a>
    </aside>
  )
}
