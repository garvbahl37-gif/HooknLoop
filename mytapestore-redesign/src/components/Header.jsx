import { useState, useEffect, useRef, useMemo } from 'react'
import Icon from './Icon.jsx'
import { NAV_GROUPS, PRODUCT_CATEGORIES, INDUSTRIES } from '../data/catalog.js'
import { useCart, cartCount, navigate, useWish, money } from '../lib/cart.js'
import { searchProducts, searchCategories } from '../lib/search.js'

const catName = Object.fromEntries(PRODUCT_CATEGORIES.map((c) => [c.slug, c.name]))

/* Mega-menu column data derived once from the catalog. */
const MENUS = {
  'Double-Sided Tape': [{ items: NAV_GROUPS['Double-Sided Tape'].map((s) => ({ slug: s, name: catName[s] || s })) }],
  'Single-Sided Tapes': (() => {
    const all = NAV_GROUPS['Single-Sided Tapes'].map((s) => ({ slug: s, name: catName[s] || s }))
    const per = Math.ceil(all.length / 3)
    return [{ items: all.slice(0, per) }, { items: all.slice(per, per * 2) }, { items: all.slice(per * 2) }]
  })(),
  Industries: (() => {
    const all = INDUSTRIES.map((c) => ({ slug: 'industry/' + c.slug, name: c.name }))
    const per = Math.ceil(all.length / 3)
    return [{ items: all.slice(0, per) }, { items: all.slice(per, per * 2) }, { items: all.slice(per * 2) }]
  })(),
}

function go(e, hash) { e.preventDefault(); navigate(hash) }

/* Live search-as-you-type dropdown — matching categories first, then products,
   with a "view all" footer link. Full keyboard nav (arrows / enter / escape). */
function SearchBox({ q, setQ, onSearch, autoFocus, placeholder }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const boxRef = useRef(null)
  const term = q.trim()
  const catMatches = useMemo(() => (term.length > 1 ? searchCategories(term, 4) : []), [term])
  const productMatches = useMemo(() => (term.length > 1 ? searchProducts(term, 6) : []), [term])
  const flat = useMemo(() => [
    ...catMatches.map((c) => ({ type: 'cat', item: c })),
    ...productMatches.map((p) => ({ type: 'product', item: p })),
  ], [catMatches, productMatches])
  const showPanel = open && term.length > 1 && flat.length > 0

  useEffect(() => {
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])
  useEffect(() => { setActive(-1) }, [term])

  const pick = (entry) => {
    setOpen(false)
    if (entry.type === 'cat') navigate('/collection/' + entry.item.slug)
    else navigate('/product/' + entry.item.handle)
  }
  const doSearch = () => { setOpen(false); if (term) onSearch(term) }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' && flat.length) { e.preventDefault(); setOpen(true); setActive((a) => Math.min(flat.length - 1, a + 1)) }
    else if (e.key === 'ArrowUp' && flat.length) { e.preventDefault(); setActive((a) => Math.max(-1, a - 1)) }
    else if (e.key === 'Enter' && active >= 0 && flat[active]) { e.preventDefault(); pick(flat[active]) }
    else if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div className="search-ac" ref={boxRef}>
      <form className="hd-search" role="search" onSubmit={(e) => { e.preventDefault(); doSearch() }}>
        <Icon name="search" size={19} className="hd-search__pre" />
        <input aria-label="Search products" value={q} autoFocus={autoFocus}
          onChange={(e) => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)} onKeyDown={onKeyDown}
          placeholder={placeholder || 'Search 130+ tapes, brands or sizes…'}
          role="combobox" aria-expanded={showPanel} aria-autocomplete="list" autoComplete="off" />
        <button className="hd-search__btn" type="submit">Search</button>
      </form>

      {showPanel && (
        <div className="search-ac__panel" role="listbox">
          {catMatches.length > 0 && (
            <div className="search-ac__group">
              <span className="search-ac__label">Categories</span>
              {catMatches.map((c, i) => (
                <button key={c.slug} type="button" className={'search-ac__cat' + (active === i ? ' is-active' : '')}
                  onMouseDown={() => pick({ type: 'cat', item: c })} onMouseEnter={() => setActive(i)}>
                  <Icon name="layers" size={15} /><span>{c.name}</span><em className="num">{c.count}</em>
                </button>
              ))}
            </div>
          )}
          {productMatches.length > 0 && (
            <div className="search-ac__group">
              <span className="search-ac__label">Products</span>
              {productMatches.map((p, i) => {
                const idx = catMatches.length + i
                return (
                  <button key={p.handle} type="button" className={'search-ac__prod' + (active === idx ? ' is-active' : '')}
                    onMouseDown={() => pick({ type: 'product', item: p })} onMouseEnter={() => setActive(idx)}>
                    <img src={p.img} alt="" width="36" height="36" />
                    <span className="search-ac__prod-info"><b>{p.name}</b><em className="num">{money(p.from ?? p.price)}</em></span>
                  </button>
                )
              })}
            </div>
          )}
          <button type="button" className="search-ac__all" onMouseDown={doSearch}>
            View all results for &ldquo;{term}&rdquo; <Icon name="arrowRight" size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

export default function Header() {
  const cart = useCart()
  const count = cartCount(cart)
  const wish = useWish()
  const wishCount = wish.length
  const [openMenu, setOpenMenu] = useState(null)
  const [drawer, setDrawer] = useState(false)
  const [q, setQ] = useState('')
  const navRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { setOpenMenu(null); setDrawer(false) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  useEffect(() => { document.body.style.overflow = drawer ? 'hidden' : ''; return () => { document.body.style.overflow = '' } }, [drawer])

  const doSearch = (term) => { navigate('search/' + encodeURIComponent(term)); setDrawer(false) }

  return (
    <header className="hd">
      {/* branding strip (original red bar) — centred facilities */}
      <div className="hd-util">
        <div className="wrap hd-util__row">
          <ul className="hd-util__feats">
            <li className="hd-util__lead"><Icon name="truck" size={16} /> Fast delivery across Australia</li>
            <li className="hd-util__sep"><Icon name="shield" size={14} /> Australian owned &amp; operated</li>
            <li className="hd-util__sep"><Icon name="medal" size={14} /> Lowest-price guarantee</li>
            <li className="hd-util__sep"><Icon name="lock" size={14} /> Secure checkout</li>
          </ul>
        </div>
      </div>

      <div className="hd-stick">
        {/* masthead */}
        <div className="hd-mast">
          <div className="wrap hd-mast__row">
            <a href="#/" className="hd-logo" onClick={(e) => go(e, '/')} aria-label="My Tape Store — home">
              <img src="/img/site/logo.png" alt="My Tape Store" className="hd-logo__img" width="196" height="34" />
            </a>

            <SearchBox q={q} setQ={setQ} onSearch={doSearch} />

            <div className="hd-actions">
              <a href="#/account" onClick={(e) => go(e, '/account')} className="hd-act hd-act--account" aria-label="Sign in">
                <Icon name="user" size={22} /><span>Sign in</span>
              </a>
              <a href="#/wishlist" onClick={(e) => go(e, '/wishlist')} className="hd-act hd-act--wish" aria-label={`Wishlist, ${wishCount} item${wishCount !== 1 ? 's' : ''}`}>
                <span className="hd-act__cart-icon"><Icon name="heart" size={22} />{wishCount > 0 && <b className="hd-cart-badge num">{wishCount}</b>}</span>
                <span>Wishlist</span>
              </a>
              <a href="#/cart" onClick={(e) => go(e, '/cart')} className="hd-act hd-act--cart" aria-label={`Cart, ${count} items`}>
                <span className="hd-act__cart-icon"><Icon name="cart" size={22} />{count > 0 && <b className="hd-cart-badge num">{count}</b>}</span>
                <span>Cart</span>
              </a>
              <button className="hd-burger" onClick={() => setDrawer(true)} aria-label="Open menu"><Icon name="menu" size={24} /></button>
            </div>
          </div>
        </div>

        {/* mega-nav (desktop) */}
        <nav className="hd-nav" ref={navRef} onMouseLeave={() => setOpenMenu(null)}
          onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpenMenu(null) }} aria-label="Primary">
          <div className="wrap hd-nav__row">
            <ul className="hd-nav__list">
              <li className="hd-nav__item"><a className="hd-nav__link" href="#/" onClick={(e) => go(e, '/')}>Home</a></li>
              {['Double-Sided Tape', 'Single-Sided Tapes'].map((label) => (
                <li key={label} className={'hd-nav__item' + (label === 'Single-Sided Tapes' ? ' hd-nav__item--wide' : '') + (openMenu === label ? ' is-open' : '')}
                  onMouseEnter={() => setOpenMenu(label)} onFocus={() => setOpenMenu(label)}>
                  <button className="hd-nav__link" aria-expanded={openMenu === label}
                    onClick={() => setOpenMenu(openMenu === label ? null : label)}>
                    {label} <Icon name="chevronDown" size={15} />
                  </button>
                  <div className="hd-mega" role="menu">
                    <div className="hd-mega__cols">
                      {MENUS[label].map((col, i) => (
                        <ul key={i}>
                          {col.items.map((it) => (
                            <li key={it.slug}><a href={'#/collection/' + it.slug} role="menuitem"
                              onClick={(e) => { go(e, '/collection/' + it.slug); setOpenMenu(null) }}>{it.name}</a></li>
                          ))}
                        </ul>
                      ))}
                    </div>
                    <a className="hd-mega__all" href={label === 'Double-Sided Tape' ? '#/collection/double-sided-tape' : '#/shop'}
                      onClick={(e) => { go(e, label === 'Double-Sided Tape' ? '/collection/double-sided-tape' : '/shop'); setOpenMenu(null) }}>
                      View all {label.toLowerCase()} <Icon name="arrowRight" size={16} />
                    </a>
                  </div>
                </li>
              ))}
              <li className="hd-nav__item"><a className="hd-nav__link" href="#/collection/tapes-dispensers"
                onClick={(e) => go(e, '/collection/tapes-dispensers')}>Dispensers</a></li>
              <li className={'hd-nav__item hd-nav__item--right' + (openMenu === 'Industries' ? ' is-open' : '')}
                onMouseEnter={() => setOpenMenu('Industries')} onFocus={() => setOpenMenu('Industries')}>
                <button className="hd-nav__link" aria-expanded={openMenu === 'Industries'}
                  onClick={() => setOpenMenu(openMenu === 'Industries' ? null : 'Industries')}>
                  Industries <Icon name="chevronDown" size={15} />
                </button>
                <div className="hd-mega" role="menu">
                  <div className="hd-mega__cols">
                    {MENUS.Industries.map((col, i) => (
                      <ul key={i}>{col.items.map((it) => (
                        <li key={it.slug}><a href={'#/' + it.slug} role="menuitem"
                          onClick={(e) => { go(e, '/' + it.slug); setOpenMenu(null) }}>{it.name}</a></li>
                      ))}</ul>
                    ))}
                  </div>
                  <a className="hd-mega__all" href="#/industries" onClick={(e) => { go(e, '/industries'); setOpenMenu(null) }}>
                    All industries <Icon name="arrowRight" size={16} /></a>
                </div>
              </li>
              <li className="hd-nav__item"><a className="hd-nav__link" href="#/shop" onClick={(e) => go(e, '/shop')}>All Products</a></li>
            </ul>
          </div>
        </nav>
      </div>

      {/* mobile drawer */}
      {drawer && <MobileDrawer onClose={() => setDrawer(false)} q={q} setQ={setQ} onSearch={doSearch} />}
    </header>
  )
}

function MobileDrawer({ onClose, q, setQ, onSearch }) {
  const [open, setOpen] = useState(null)
  const groups = [
    ['Double-Sided Tape', NAV_GROUPS['Double-Sided Tape'].map((s) => ({ slug: 'collection/' + s, name: catName[s] || s }))],
    ['Single-Sided Tapes', NAV_GROUPS['Single-Sided Tapes'].map((s) => ({ slug: 'collection/' + s, name: catName[s] || s }))],
    ['Industries', INDUSTRIES.map((c) => ({ slug: 'industry/' + c.slug, name: c.name }))],
  ]
  return (
    <div className="hd-drawer" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="hd-drawer__scrim" onClick={onClose} />
      <div className="hd-drawer__panel">
        <div className="hd-drawer__top">
          <b>Browse</b>
          <button onClick={onClose} aria-label="Close menu"><Icon name="close" size={22} /></button>
        </div>
        <div className="hd-drawer__search">
          <SearchBox q={q} setQ={setQ} onSearch={(t) => { onSearch(t); onClose() }} placeholder="Search tapes…" />
        </div>
        <nav className="hd-drawer__nav">
          {groups.map(([label, items]) => (
            <div key={label} className="hd-drawer__group">
              <button className="hd-drawer__acc" aria-expanded={open === label}
                onClick={() => setOpen(open === label ? null : label)}>
                {label} <Icon name={open === label ? 'minus' : 'plus'} size={18} />
              </button>
              {open === label && (
                <ul className="hd-drawer__sub">
                  {items.map((it) => (
                    <li key={it.slug}><a href={'#/' + it.slug} onClick={(e) => { go(e, '/' + it.slug); onClose() }}>{it.name}</a></li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          <a className="hd-drawer__link" href="#/collection/tapes-dispensers" onClick={(e) => { go(e, '/collection/tapes-dispensers'); onClose() }}>Dispensers</a>
          <a className="hd-drawer__link" href="#/shop" onClick={(e) => { go(e, '/shop'); onClose() }}>All Products</a>
          <a className="hd-drawer__link" href="#/bulk" onClick={(e) => { go(e, '/bulk'); onClose() }}>Bulk &amp; Trade pricing</a>
          <a className="hd-drawer__link" href="#/contact" onClick={(e) => { go(e, '/contact'); onClose() }}>Contact us</a>
        </nav>
      </div>
    </div>
  )
}
