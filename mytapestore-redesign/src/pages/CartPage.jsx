import { useMemo } from 'react'
import Icon from '../components/Icon.jsx'
import Breadcrumbs from '../components/Breadcrumbs.jsx'
import ProductCard from '../components/ProductCard.jsx'
import { useCart, cartTotal, cartCount, setQty, removeItem, clearCart, money, navigate } from '../lib/cart.js'
import { PRODUCTS, BESTSELLER_HANDLES, FREE_SHIP } from '../data/catalog.js'

function pickUpsell(excludeHandles, n = 4) {
  const exclude = new Set(excludeHandles)
  return BESTSELLER_HANDLES.map((h) => PRODUCTS.find((p) => p.handle === h)).filter((p) => p && p.inStock && !exclude.has(p.handle)).slice(0, n)
}

function FreeShipBar({ subtotal }) {
  const remaining = Math.max(0, FREE_SHIP - subtotal)
  const pct = Math.min(100, (subtotal / FREE_SHIP) * 100)
  const done = remaining <= 0
  return (
    <div className={'cart-ship' + (done ? ' is-done' : '')}>
      <p className="cart-ship__msg">
        <Icon name={done ? 'check' : 'truck'} size={16} />
        {done
          ? <>You've unlocked <b>free shipping!</b></>
          : <>You're <b className="num">{money(remaining)}</b> away from <b>free shipping</b></>}
      </p>
      <div className="cart-ship__track"><div className="cart-ship__fill" style={{ width: pct + '%' }} /></div>
    </div>
  )
}

function DispatchCutoff() {
  const now = new Date()
  const cutoff = new Date(now); cutoff.setHours(14, 0, 0, 0)
  const before = now < cutoff
  const mins = Math.max(0, Math.round((cutoff - now) / 60000))
  const h = Math.floor(mins / 60), m = mins % 60
  return (
    <p className="cart__cutoff">
      <Icon name="clock" size={14} />
      {before
        ? <>Order in the next <b>{h > 0 ? `${h}h ` : ''}{m}m</b> for same-day dispatch</>
        : <>Order now — ships next business day</>}
    </p>
  )
}

function UpsellRail({ title, picks }) {
  if (!picks.length) return null
  return (
    <section className="cart-upsell">
      <h2>{title}</h2>
      <div className="grid-products grid-products--fit">
        {picks.map((p) => <ProductCard key={p.handle} p={p} />)}
      </div>
    </section>
  )
}

export default function CartPage() {
  const cart = useCart()
  const subtotal = cartTotal(cart)
  const count = cartCount(cart)
  const cartHandles = useMemo(() => cart.map((c) => c.handle), [cart])
  const upsell = useMemo(() => pickUpsell(cartHandles), [cartHandles])

  if (!count) {
    return (
      <main id="main" className="wrap cart-empty">
        <span className="cart-empty__icon"><Icon name="cart" size={44} /></span>
        <h1>Your cart is empty</h1>
        <p>Browse our range of adhesive tapes, dispensers and fastening solutions.</p>
        <a className="btn btn--brand btn--lg" href="#/shop" onClick={(e) => { e.preventDefault(); navigate('/shop') }}>Shop the range <Icon name="arrowRight" size={18} /></a>
        <UpsellRail title="Our bestsellers" picks={pickUpsell([])} />
      </main>
    )
  }

  return (
    <main id="main" className="cart">
      <div className="wrap cart__crumbs"><Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Cart' }]} /></div>
      <div className="wrap cart__layout">
        <div className="cart__items">
          <div className="cart__head">
            <h1>Your cart <span className="num">({count} item{count !== 1 ? 's' : ''})</span></h1>
            <button className="cart__clear" onClick={clearCart}>Clear cart</button>
          </div>
          <FreeShipBar subtotal={subtotal} />
          <ul className="cart__list">
            {cart.map((it) => (
              <li key={it.key} className="cart-line">
                <a href={'#/product/' + it.handle} className="cart-line__img" onClick={(e) => { e.preventDefault(); navigate('/product/' + it.handle) }}>
                  <img src={it.img} alt={it.name} width="90" height="90" />
                </a>
                <div className="cart-line__info">
                  <a href={'#/product/' + it.handle} className="cart-line__name" onClick={(e) => { e.preventDefault(); navigate('/product/' + it.handle) }}>{it.name}</a>
                  {it.variant && <span className="cart-line__variant">{it.variant}</span>}
                  {it.sku && <span className="cart-line__sku num">SKU: {it.sku}</span>}
                  <span className="cart-line__unit num">{money(it.price)} <em>Inc GST</em></span>
                </div>
                <div className="cart-line__qty">
                  <div className="qty" role="group" aria-label="Quantity">
                    <button onClick={() => setQty(it.key, it.qty - 1)} aria-label="Decrease"><Icon name="minus" size={15} /></button>
                    <input className="num" type="text" inputMode="numeric" value={it.qty} onChange={(e) => setQty(it.key, Math.max(1, parseInt(e.target.value) || 1))} aria-label="Quantity" />
                    <button onClick={() => setQty(it.key, it.qty + 1)} aria-label="Increase"><Icon name="plus" size={15} /></button>
                  </div>
                </div>
                <div className="cart-line__total num">{money(it.price * it.qty)}</div>
                <button className="cart-line__remove" onClick={() => removeItem(it.key)} aria-label={`Remove ${it.name}`}><Icon name="close" size={18} /></button>
              </li>
            ))}
          </ul>
          <a className="cart__continue" href="#/shop" onClick={(e) => { e.preventDefault(); navigate('/shop') }}><Icon name="chevronRight" size={15} className="cart__continue-icon" /> Continue shopping</a>

          <UpsellRail title="Frequently bought together" picks={upsell} />
        </div>

        <aside className="cart__summary">
          <h2>Order summary</h2>
          <dl className="cart__sum-rows">
            <div><dt>Subtotal <span>({count} item{count !== 1 ? 's' : ''})</span></dt><dd className="num">{money(subtotal)}</dd></div>
            <div><dt>Shipping</dt><dd>{subtotal >= FREE_SHIP ? <span className="cart__free-tag">Free</span> : 'Calculated at checkout'}</dd></div>
            <div><dt>Estimated delivery</dt><dd>3–5 business days</dd></div>
            <div><dt>GST</dt><dd className="cart__sum-note">Included in prices</dd></div>
          </dl>
          <div className="cart__total"><span>Total</span><b className="num">{money(subtotal)}</b></div>
          <a className="btn btn--brand btn--lg btn--block cart__checkout" href="#/checkout" onClick={(e) => { e.preventDefault(); navigate('/checkout') }}><Icon name="lock" size={18} /> Proceed to checkout</a>
          <DispatchCutoff />
          <ul className="cart__trust">
            <li><Icon name="lock" size={15} /> Secure, encrypted checkout</li>
            <li><Icon name="truck" size={15} /> Dispatch to 3,600+ AU postcodes</li>
            <li><Icon name="refresh" size={15} /> 30-day easy returns</li>
            <li><Icon name="tag" size={15} /> Volume discounts applied automatically</li>
          </ul>
          <div className="cart__pay">
            {['visa', 'mastercard', 'amex', 'paypal'].map((k) => <img key={k} src={'/img/pay/' + k + '.svg'} alt={k} height="22" />)}
            <span className="cart__pay-badge"><Icon name="shieldCheck" size={13} /> SSL secured</span>
          </div>
        </aside>
      </div>
    </main>
  )
}
