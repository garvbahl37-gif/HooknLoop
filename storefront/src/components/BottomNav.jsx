/*  BottomNav — app-style tab bar, phones only. Gives the mobile UI a native
    feel: primary browse nav lives at the thumb, not folded into a desktop bar.
    Cart/Saved carry live badges; the active tab lights up in brand orange.     */
import { useCart, cartCount, useRoute, navigate } from '../lib/cart.js'
import { useWishlist, wishCount } from '../lib/wishlist.js'

const TABS = [
  { key: 'home', to: '', label: 'Home', on: (r) => r === 'home',
    icon: <path d="M4 11.4 12 5l8 6.4V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" /> },
  { key: 'shop', to: 'collection/all', label: 'Shop', on: (r) => r === 'collection',
    icon: <><path d="M5.5 8h13l-1 11.5a1 1 0 0 1-1 .9H7.5a1 1 0 0 1-1-.9z" /><path d="M9 8a3 3 0 0 1 6 0" /></> },
  { key: 'search', to: 'search', label: 'Search', on: (r) => r === 'search',
    icon: <><circle cx="11" cy="11" r="7" /><path d="m20.5 20.5-4-4" /></> },
  { key: 'wishlist', to: 'wishlist', label: 'Saved', on: (r) => r === 'wishlist', badge: 'wish',
    icon: <path d="M12 20.5s-6.5-4.2-6.5-9.2A3.7 3.7 0 0 1 12 8.6a3.7 3.7 0 0 1 6.5 2.7c0 5-6.5 9.2-6.5 9.2Z" /> },
  { key: 'cart', to: 'cart', label: 'Cart', on: (r) => r === 'cart', badge: 'cart',
    icon: <><path d="M6 6h15l-1.5 9h-12z" /><circle cx="9" cy="20" r="1.3" /><circle cx="18" cy="20" r="1.3" /><path d="M6 6 5 3H2" /></> },
]

export default function BottomNav() {
  const { route } = useRoute()
  const cCount = cartCount(useCart())
  const wCount = wishCount(useWishlist())
  const badgeFor = (b) => (b === 'cart' ? cCount : b === 'wish' ? wCount : 0)

  return (
    <nav className="btabs" aria-label="Primary">
      {TABS.map((t) => {
        const active = t.on(route)
        const n = t.badge ? badgeFor(t.badge) : 0
        return (
          <button key={t.key} className={`btab ${active ? 'is-on' : ''}`} aria-label={t.label}
                  aria-current={active ? 'page' : undefined} onClick={() => navigate(t.to)}>
            <span className="btab__ic">
              <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{t.icon}</svg>
              {n > 0 && <span className="btab__badge">{n > 99 ? '99+' : n}</span>}
            </span>
            <span className="btab__label">{t.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
