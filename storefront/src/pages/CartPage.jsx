/*  CartPage — real line items from localStorage, quantity, remove, totals.
    Matches the live store's cart: a free-shipping progress bar, an "Apply a
    discount code" bar, and the "Estimate Shipping" calculator. Checkout is a
    mock (needs Shopify to be real).                                            */
import { useState } from 'react'
import { useCart, setQty, removeItem, cartTotal, navigate } from '../lib/cart.js'
import { FREE_SHIP } from '../data/catalog.js'
import ShippingEstimator from '../components/ShippingEstimator.jsx'

export default function CartPage() {
  const cart = useCart()
  const total = cartTotal(cart)
  const remaining = Math.max(0, FREE_SHIP - total)
  const pct = Math.min(100, (total / FREE_SHIP) * 100)
  const [code, setCode] = useState('')
  const [codeMsg, setCodeMsg] = useState('')

  if (cart.length === 0) {
    return (
      <main id="main" className="page">
        <div className="wrap cart__empty">
          <div className="cart__empty-icn">🛒</div>
          <h1 className="page__h1">Your cart is empty</h1>
          <p className="page__lead">Add some hook &amp; loop and it’ll show up here.</p>
          <a href="#" className="btn btn--primary" onClick={(e) => { e.preventDefault(); navigate('collection') }}>Shop all products →</a>
        </div>
      </main>
    )
  }

  const applyCode = (e) => {
    e.preventDefault()
    const c = code.trim().toUpperCase()
    setCodeMsg(c ? `Code “${c}” will be applied at checkout.` : '')
  }

  return (
    <main id="main" className="page">
      <div className="wrap cart">
        <div className="cart__items">
          <h1 className="page__h1">Your cart</h1>

          {cart.map((it) => (
            <div key={it.key} className="cart__row">
              <div className="cart__media"><img src={it.img} alt={it.name} /></div>
              <div className="cart__info">
                <h3><a href="#" onClick={(e) => { e.preventDefault(); navigate(`product/${it.handle}`) }}>{it.name}</a></h3>
                <span className="cart__variant">{it.variant}</span>
                <button className="cart__remove" onClick={() => removeItem(it.key)}>Remove</button>
              </div>
              <div className="cart__qty">
                <button onClick={() => setQty(it.key, it.qty - 1)} aria-label="Decrease">−</button>
                <span>{it.qty}</span>
                <button onClick={() => setQty(it.key, it.qty + 1)} aria-label="Increase">+</button>
              </div>
              <div className="cart__line">${(it.price * it.qty).toFixed(2)}</div>
            </div>
          ))}

          <div className="cart__tools">
            <form className="cart__disc" onSubmit={applyCode}>
              <label className="cart__disc-lbl" htmlFor="disc-code">Apply a discount code</label>
              <div className="cart__disc-row">
                <input id="disc-code" className="cart__disc-input" value={code}
                       onChange={(e) => { setCode(e.target.value); setCodeMsg('') }}
                       placeholder="Enter discount code here" aria-label="Discount code" />
                <button className="cart__disc-btn" type="submit">Apply</button>
              </div>
              {codeMsg && <span className="cart__disc-msg">{codeMsg}</span>}
            </form>

            <ShippingEstimator subtotal={total} />
          </div>
        </div>

        <aside className="cart__summary">
          <div className="cart__ship">
            {remaining > 0
              ? <span><b>${remaining.toFixed(2)} AUD</b> away from <b>Free Standard Shipping</b>.</span>
              : <span>🎉 You’ve unlocked <b>Free Standard Shipping</b>.</span>}
            <div className="cart__ship-bar" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${pct}%` }} />
              <i className="cart__ship-truck" style={{ left: `${pct}%` }} aria-hidden="true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6h11v11H2zM13 9h4l3 3v5h-7" /><circle cx="6" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></svg>
              </i>
            </div>
          </div>

          <div className="cart__sumrow cart__sumrow--total"><span>Subtotal</span><b>${total.toFixed(2)} AUD</b></div>
          <p className="cart__taxnote">Tax included. Shipping calculated at checkout.</p>

          <button className="btn btn--primary cart__checkout" onClick={() => alert('Checkout is a prototype mock — this is where Shopify checkout would open.')}>Checkout</button>

          <div className="cart__pay" aria-label="Accepted payment methods">
            <span className="pay pay--shop">shop<b>Pay</b></span>
            <span className="pay pay--pp"><i>Pay</i><b>Pal</b></span>
            <span className="pay pay--g"><i>G</i> Pay</span>
          </div>

          <a href="#" className="cart__cont" onClick={(e) => { e.preventDefault(); navigate('collection') }}>← Continue shopping</a>
          <ul className="cart__trust">
            <li>✓ GST tax invoice on every order</li>
            <li>✓ Dispatched 1–2 business days Australia-wide</li>
            <li>✓ Ordered the wrong side? We’ll sort it</li>
          </ul>
        </aside>
      </div>
    </main>
  )
}
