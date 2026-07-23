import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import Breadcrumbs from '../components/Breadcrumbs.jsx'
import { useCart, cartTotal, cartCount, setQty, removeItem, clearCart, money, navigate } from '../lib/cart.js'

export default function CartPage() {
  const cart = useCart()
  const [placed, setPlaced] = useState(null)
  const subtotal = cartTotal(cart)
  const count = cartCount(cart)

  if (placed) {
    return (
      <main id="main" className="wrap cart-done">
        <span className="cart-done__tick"><Icon name="check" size={40} /></span>
        <h1>Thank you — your order is confirmed</h1>
        <p>Order <b className="num">{placed.id}</b> for <b className="num">{money(placed.total)}</b> has been received. We've emailed your confirmation — you'll get tracking as soon as it ships.</p>
        <div className="cart-done__cta">
          <a className="btn btn--brand btn--lg" href="#/shop" onClick={(e) => { e.preventDefault(); navigate('/shop') }}>Continue shopping</a>
          <a className="btn btn--ghost btn--lg" href="#/" onClick={(e) => { e.preventDefault(); navigate('/') }}>Back to home</a>
        </div>
      </main>
    )
  }

  if (!count) {
    return (
      <main id="main" className="wrap cart-empty">
        <span className="cart-empty__icon"><Icon name="cart" size={44} /></span>
        <h1>Your cart is empty</h1>
        <p>Browse our range of adhesive tapes, dispensers and fastening solutions.</p>
        <a className="btn btn--brand btn--lg" href="#/shop" onClick={(e) => { e.preventDefault(); navigate('/shop') }}>Shop the range <Icon name="arrowRight" size={18} /></a>
      </main>
    )
  }

  const checkout = () => {
    const id = 'MTS-' + Math.floor(100000 + (subtotal * 37 % 899999))
    setPlaced({ id, total: subtotal })
    clearCart()
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
        </div>

        <aside className="cart__summary">
          <h2>Order summary</h2>
          <dl className="cart__sum-rows">
            <div><dt>Subtotal <span>({count} item{count !== 1 ? 's' : ''})</span></dt><dd className="num">{money(subtotal)}</dd></div>
            <div><dt>Shipping</dt><dd>Calculated at checkout</dd></div>
            <div><dt>Estimated delivery</dt><dd>3–5 business days</dd></div>
            <div><dt>GST</dt><dd className="cart__sum-note">Included in prices</dd></div>
          </dl>
          <div className="cart__total"><span>Total</span><b className="num">{money(subtotal)}</b></div>
          <button className="btn btn--brand btn--lg btn--block cart__checkout" onClick={checkout}><Icon name="lock" size={18} /> Proceed to checkout</button>
          <ul className="cart__trust">
            <li><Icon name="lock" size={15} /> Secure, encrypted checkout</li>
            <li><Icon name="truck" size={15} /> Dispatch to 3,600+ AU postcodes</li>
            <li><Icon name="refresh" size={15} /> 30-day easy returns</li>
            <li><Icon name="tag" size={15} /> Volume discounts applied automatically</li>
          </ul>
          <div className="cart__pay">
            {['visa', 'mastercard', 'amex', 'paypal'].map((k) => <img key={k} src={'/img/pay/' + k + '.svg'} alt={k} height="22" />)}
          </div>
        </aside>
      </div>
    </main>
  )
}
