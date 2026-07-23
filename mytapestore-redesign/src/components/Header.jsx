import { useState, useEffect, useRef } from 'react'
import Icon from './Icon.jsx'
import { NAV_GROUPS, PRODUCT_CATEGORIES, INDUSTRIES } from '../data/catalog.js'
import { useCart, cartCount, navigate, useWish } from '../lib/cart.js'

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

  const submitSearch = (e) => { e.preventDefault(); const t = q.trim(); if (t) { navigate('search/' + encodeURIComponent(t)); setDrawer(false) } }

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

            <form className="hd-search" role="search" onSubmit={submitSearch}>
              <Icon name="search" size={19} className="hd-search__pre" />
              <input aria-label="Search products" value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Search 130+ tapes, brands or sizes…" />
              <button className="hd-search__btn" type="submit">Search</button>
            </form>

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
        <nav className="hd-nav" ref={navRef} onMouseLeave={() => setOpenMenu(null)} aria-label="Primary">
          <div className="wrap hd-nav__row">
            <ul className="hd-nav__list">
              <li className="hd-nav__item"><a className="hd-nav__link" href="#/" onClick={(e) => go(e, '/')}>Home</a></li>
              {['Double-Sided Tape', 'Single-Sided Tapes'].map((label) => (
                <li key={label} className={'hd-nav__item' + (label === 'Single-Sided Tapes' ? ' hd-nav__item--wide' : '') + (openMenu === label ? ' is-open' : '')}
                  onMouseEnter={() => setOpenMenu(label)}>
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
                onMouseEnter={() => setOpenMenu('Industries')}>
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
      {drawer && <MobileDrawer onClose={() => setDrawer(false)} q={q} setQ={setQ} submit={submitSearch} />}
    </header>
  )
}

function MobileDrawer({ onClose, q, setQ, submit }) {
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
        <form className="hd-drawer__search" role="search" onSubmit={submit}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tapes…" aria-label="Search products" />
          <button type="submit" aria-label="Search"><Icon name="search" size={20} /></button>
        </form>
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
