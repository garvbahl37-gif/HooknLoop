/*  Best Sellers & Offers — the store's featured product showcase (mirrors the
    live home page's "Best Sellers & Offers" section). Real products, real
    ratings, wired to the cart. Replaces the old category grid + workhorse grid. */
import { PRODUCTS } from '../data/catalog.js'
import { navigate } from '../lib/cart.js'
import ProductCard from '../components/ProductCard.jsx'

/* Exact product order from the live store's "Best Sellers & Offers" section. */
const ORDER = ['self-adhesive-roll', 'sew-on', 'reusable-cable-straps', 'double-sided', 'heavy-duty-straps', 'hook-and-loop-dots', 'velcro-brand-roll', 'velcoin-dots', 'fire-retardant-adhesive', 'fire-retardant-sew-on', 'heavy-duty-adhesive', 'hook-and-loop-for-fabric']
const ITEMS = ORDER.map((h) => PRODUCTS.find((p) => p.handle === h)).filter(Boolean)

export default function BestSellers() {
  return (
    <section className="bs" aria-labelledby="bs-h">
      <div className="wrap">
        <div className="sec-head">
          <span className="sec-eyebrow">Shop the range</span>
          <h2 id="bs-h" className="sec-h2">Best sellers &amp; offers</h2>
          <p className="sec-sub">Our most-ordered hook &amp; loop — dispatched Australia-wide, with volume discounts on bulk orders.</p>
          <a href="#" className="bs__all" style={{ display: 'inline-block', marginTop: 8 }} onClick={(e) => { e.preventDefault(); navigate('collection') }}>Shop all products →</a>
        </div>
        <div className="bs__grid">
          {ITEMS.map((p) => <ProductCard key={p.handle} p={p} />)}
        </div>
      </div>
    </section>
  )
}
