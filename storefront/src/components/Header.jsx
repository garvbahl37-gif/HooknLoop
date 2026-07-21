/*  Header — live-store layout, real routing. Blue promo bar · white logo/search ·
    navy nav whose dropdowns are curated to clone the live store · live cart count. */
import { useState, useEffect, useRef } from 'react'
import { PRODUCTS } from '../data/catalog.js'
import { useCart, cartCount, navigate } from '../lib/cart.js'
import { useWishlist, wishCount } from '../lib/wishlist.js'

const go = (to) => (e) => { e.preventDefault(); navigate(to) }

/*  Touch taps emit an emulated mouseenter before the click, so hover-driven
    opening must be gated on the device actually having a hover pointer —
    otherwise the tap opens the menu and its own click closes it again.         */
const canHover = () => window.matchMedia('(hover: hover)').matches

/*  Nav dropdowns cloned 1:1 from the live hooknloop.com.au top nav (fetched
    2026-07). Products is the store's curated set of 8 flagship products under
    its own short, category-style labels — deliberately NOT the full 12-product
    list, which read as "too long". VELCRO® Brand and Fire Retardant mirror the
    live store's two-item menus. Each row is [visible label, product handle];
    handles resolve against the catalog below and a typo is surfaced loudly.    */
const MENU_SPEC = [
  { label: 'Products', items: [
    ['Self Adhesive Hook and Loop', 'self-adhesive-roll'],
    ['Sew On Hook and Loop', 'sew-on'],
    ['Dots, Coins', 'hook-and-loop-dots'],
    ['Adjustable Straps', 'reusable-cable-straps'],
    ['Back to Back / Double Sided', 'double-sided'],
    ['Material Handling Straps', 'heavy-duty-straps'],
    ['Heavy Duty', 'heavy-duty-adhesive'],
    ['For Fabric', 'hook-and-loop-for-fabric'],
  ] },
  { label: 'VELCRO® Brand', items: [
    ['VELCRO® Adhesive Hook and Loop', 'velcro-brand-roll'],
    ['VELCRO® Dots (VELCOIN®)', 'velcoin-dots'],
  ] },
  { label: 'Fire Retardant', items: [
    ['Adhesive', 'fire-retardant-adhesive'],
    ['Sew On', 'fire-retardant-sew-on'],
  ] },
]

const MENUS = MENU_SPEC.map((m) => ({
  label: m.label,
  items: m.items.map(([label, handle]) => {
    if (!PRODUCTS.some((p) => p.handle === handle)) console.error(`nav: unknown product handle "${handle}"`)
    return [label, `product/${handle}`]
  }),
}))

export default function Header() {
  const cart = useCart()
  const count = cartCount(cart)
  const wishes = wishCount(useWishlist())
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(null)   // label of the open dropdown, or null
  const wasOpen = useRef(false)            // open state sampled before the press began

  /* dismiss the open menu on Escape or a click outside it */
  useEffect(() => {
    if (open === null) return
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(null); document.activeElement?.blur() } }
    const onDown = (e) => { if (!e.target.closest('.nav__item--has')) setOpen(null) }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown) }
  }, [open])

  /* blur too, so the just-clicked link's focus can't re-open the menu */
  const pick = (to) => (e) => { e.preventDefault(); e.currentTarget.blur(); setOpen(null); navigate(to) }

  /* carry the typed query through to the search page instead of dropping it */
  const search = (e) => {
    e.preventDefault()
    navigate(q.trim() ? `search/${encodeURIComponent(q.trim())}` : 'search')
  }

  return (
    <header className="hdr">
      <div className="promo">
        <div className="wrap promo__row">
          <span>Fast Australia-wide delivery</span><span className="promo__sep" aria-hidden="true">•</span>
          <span className="promo__hl">Premium-Grade Hook &amp; Loop Products</span>
        </div>
      </div>

      <div className="bar">
        <div className="wrap bar__row">
          <a href="#" className="logo" aria-label="HooknLoop home" onClick={go('')}>
            <img className="logo__img" src="/img/logo-header.svg" alt="HooknLoop" width="389" height="69" />
          </a>
          <form className="search" role="search" onSubmit={search}>
            <input className="search__input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search our store" aria-label="Search products" />
            <button className="search__btn" aria-label="Search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg></button>
          </form>
          <div className="bar__actions">
            <button className="icn icn--searchlink" aria-label="Search" onClick={go('search')}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg></button>
            <button className="icn" aria-label="Account and orders" onClick={go('contact')}><svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg></button>
            <button className="icn icn--wish" aria-label={`Wishlist, ${wishes} saved`} onClick={go('wishlist')}>
              <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10Z"/></svg>
              <span className={`icn__count ${wishes > 0 ? 'is-on' : ''}`}>{wishes}</span>
            </button>
            <button className="icn icn--cart" aria-label={`Cart, ${count} items`} onClick={go('cart')}>
              <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M6 6h15l-1.5 9h-12z"/><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M6 6 5 3H2"/></svg>
              <span className={`icn__count ${count > 0 ? 'is-on' : ''}`}>{count}</span>
            </button>
          </div>
        </div>
      </div>

      <nav className="nav" aria-label="Primary">
        <div className="wrap nav__row">
          <ul className="nav__list">
            <li className="nav__item"><a href="#" className="nav__link" onClick={go('')}>Home</a></li>
            {/*  The parent only opens the menu — it never navigates (it used to link
                to a collection, which dumped you on a listing before you could pick
                a product). Each dropdown is a curated set of product links, cloned
                from the live store.                                                */}
            {MENUS.map((m) => (
              <li key={m.label} className={`nav__item nav__item--has ${open === m.label ? 'is-open' : ''}`}
                  onMouseEnter={() => { if (canHover()) setOpen(m.label) }}
                  onMouseLeave={() => { if (canHover()) setOpen(null) }}
                  onFocus={() => setOpen(m.label)}
                  onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(null) }}>
                {/*  By the time a click lands the menu is already open — hover opened
                    it on a mouse, focus opened it on a tap — so a naive toggle would
                    slam it shut under the user. On hover devices the click only ever
                    opens (mouse-leave/Escape/outside close it). On touch it toggles
                    against the state sampled at pointerdown, before focus fires.  */}
                <button className="nav__link" aria-expanded={open === m.label} aria-haspopup="true"
                        onPointerDown={() => { wasOpen.current = open === m.label }}
                        onClick={() => setOpen(canHover() ? m.label : (wasOpen.current ? null : m.label))}>
                  {m.label}<svg className="nav__chev" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="m6 9 6 6 6-6"/></svg>
                </button>
                <div className="nav__drop">
                  {m.items.map(([label, to]) => <a key={to} href="#" onClick={pick(to)}>{label}</a>)}
                </div>
              </li>
            ))}
            <li className="nav__item"><a href="#" className="nav__link" onClick={go('bulk')}>Bulk Order</a></li>
          </ul>
        </div>
      </nav>
    </header>
  )
}
