import Icon from './Icon.jsx'
import Stars from './Stars.jsx'
import { money, hasRange, navigate, addToCart, defaultSelection, variantFor, toggleWish, useWish } from '../lib/cart.js'

/* Traditionally-premium catalogue card: matted product frame, refined type,
   display-face pricing, and a full-width CTA that fills brand-red on hover. */
export default function ProductCard({ p }) {
  const wish = useWish()
  const wished = wish.includes(p.handle)
  const sizeAxis = (p.axes || []).find((a) => /size/i.test(a.name))
  const sizeCount = sizeAxis ? new Set(sizeAxis.terms.map((t) => t.replace(/\s*(Hook|Loop)$/i, ''))).size : 0
  const variable = p.type === 'variable'
  const open = () => navigate('/product/' + p.handle)

  const addSimple = (e) => {
    e.stopPropagation()
    const sel = defaultSelection(p)
    const v = variantFor(p, sel)
    addToCart({
      key: p.handle + '|' + (v ? v.id : 'base'),
      handle: p.handle, name: p.name, img: p.img,
      price: v ? v.price : p.price, sku: v ? v.sku : p.sku,
      variant: v ? Object.values(v.attrs).join(' · ') : '', qty: 1,
    })
    navigate('/cart')
  }

  return (
    <article className="pc" onClick={open}>
      <div className="pc__media">
        <img src={p.img} alt={p.name} loading="lazy" width="300" height="300" />
        <div className="pc__badges">
          {p.onSale && <span className="tag tag--sale">Sale</span>}
          {!p.inStock && <span className="tag tag--out">Out of stock</span>}
        </div>
        <button className={'pc__wish' + (wished ? ' is-on' : '')} aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
          onClick={(e) => { e.stopPropagation(); toggleWish(p.handle) }}>
          <Icon name="heart" size={18} />
        </button>
      </div>

      <div className="pc__body">
        {p.cats[0] && <span className="pc__cat">{p.cats[0].name}</span>}
        <h3 className="pc__name"><a href={'#/product/' + p.handle} onClick={(e) => { e.preventDefault(); e.stopPropagation(); open() }}>{p.name}</a></h3>
        <div className="pc__rating">
          <Stars rating={p.rating} count={p.reviews} size={14} />
          {sizeCount > 1 && <span className="pc__sizes num">· {sizeCount} sizes</span>}
        </div>

        <div className="pc__foot">
          <div className="pc__price">
            {hasRange(p)
              ? <><span className="pc__from">From</span> <b className="num">{money(p.from)}</b></>
              : <b className="num">{money(p.price)}</b>}
            <span className="pc__gst">Inc GST</span>
          </div>
          {p.inStock
            ? <button className="pc__cta" onClick={variable ? (e) => { e.stopPropagation(); open() } : addSimple}>
                {variable ? 'Choose options' : 'Add to cart'} <Icon name="arrowRight" size={15} />
              </button>
            : <button className="pc__cta pc__cta--out" disabled>Sold out</button>}
        </div>
      </div>
    </article>
  )
}
