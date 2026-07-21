/*  Reusable product card — links to the product page and adds a functional
    "complete set" (or single item) to the real cart.                          */
import { useState } from 'react'
import { addToCart, navigate } from '../lib/cart.js'
import { useWishlist, toggleWish } from '../lib/wishlist.js'
import { productRating, BRAND } from '../data/catalog.js'
import Stars from './Stars.jsx'

export default function ProductCard({ p }) {
  const [added, setAdded] = useState(false)
  const wished = useWishlist().includes(p.handle)
  const go = (e) => { e.preventDefault(); navigate(`product/${p.handle}`) }
  const [rating, reviews] = productRating(p.handle)

  const add = (e) => {
    e.preventDefault()
    addToCart({
      key: `${p.handle}|${p.sizes[0].label}|${p.colours[0]}|${p.hookLoop ? 'hook' : 'single'}`,
      handle: p.handle, name: p.name, img: p.img,
      variant: `${p.sizes[0].label} · ${p.colours[0]}${p.hookLoop ? ' · Hook' : ''}`,
      price: p.from, qty: 1,
    })
    setAdded(true); setTimeout(() => setAdded(false), 1600)
  }

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
        <span className="pc__brand">{BRAND}</span>
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
        <button className={`pc__add ${added ? 'is-added' : ''}`} onClick={add}>
          {added ? '✓ Added' : 'Add to cart'}
        </button>
      </div>
    </article>
  )
}
