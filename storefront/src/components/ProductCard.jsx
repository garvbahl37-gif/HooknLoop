/*  Reusable product card — links to the product page. "Quick Add" opens a popup
    to pick size/colour/side and add to cart (mirrors the live store).           */
import { useState } from 'react'
import { navigate } from '../lib/cart.js'
import { useWishlist, toggleWish } from '../lib/wishlist.js'
import { productRating } from '../data/catalog.js'
import Stars from './Stars.jsx'
import QuickAdd from './QuickAdd.jsx'

export default function ProductCard({ p }) {
  const [qa, setQa] = useState(false)
  const wished = useWishlist().includes(p.handle)
  const go = (e) => { e.preventDefault(); navigate(`product/${p.handle}`) }
  const [rating, reviews] = productRating(p.handle)

  return (
    <article className="pc">
      <a href="#" className="pc__media" onClick={go} aria-label={`View ${p.name}`}>
        {p.badge && <span className="pc__badge">{p.badge}</span>}
        <img className="pc__img" src={p.img} alt={p.name} loading="lazy" />
        {p.gallery?.[1] && p.gallery[1] !== p.img && (
          <img className="pc__img pc__img--alt" src={p.gallery[1]} alt="" aria-hidden="true" loading="lazy" />
        )}
      </a>
      <button className={`pc__wish ${wished ? 'is-on' : ''}`} onClick={() => toggleWish(p.handle)}
              aria-pressed={wished} aria-label={wished ? `Remove ${p.name} from wishlist` : `Save ${p.name} to wishlist`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill={wished ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8"><path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10Z"/></svg>
      </button>
      <div className="pc__body">
        <h3 className="pc__name"><a href="#" onClick={go}>{p.name}</a></h3>
        {reviews > 0 ? (
          <div className="pc__rating"><Stars v={rating} size={14} /><span>{rating.toFixed(1)} · {reviews} review{reviews > 1 ? 's' : ''}</span></div>
        ) : (
          <div className="pc__rating pc__rating--none"><span>No reviews yet</span></div>
        )}
        <p className="pc__spec">{p.spec}</p>
        <div className="pc__price">
          <span className="pc__set">From <b>${p.from.toFixed(2)}</b> <span className="pc__gst">incl. GST</span></span>
        </div>
        <button className="pc__add" onClick={(e) => { e.preventDefault(); setQa(true) }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6h15l-1.5 9h-12z"/><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M6 6 5 3H2"/></svg>
          Quick Add
        </button>
      </div>
      {qa && <QuickAdd p={p} onClose={() => setQa(false)} />}
    </article>
  )
}
