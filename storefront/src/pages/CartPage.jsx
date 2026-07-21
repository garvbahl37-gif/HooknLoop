/*  CartPage — real line items from localStorage, quantity, remove, totals,
    free-shipping progress bar. Checkout is a mock (needs Shopify to be real).   */
import { useCart, setQty, removeItem, cartTotal, navigate } from '../lib/cart.js'
import { FREE_SHIP } from '../data/catalog.js'

export default function CartPage() {
  const cart = useCart()
  const total = cartTotal(cart)
  const remaining = Math.max(0, FREE_SHIP - total)
  const pct = Math.min(100, (total / FREE_SHIP) * 100)

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

  return (
    <main id="main" className="page">
      <div className="wrap cart">
        <div className="cart__items">
          <h1 className="page__h1">Your cart</h1>

          <div className="cart__ship">
            {remaining > 0
              ? <span>You’re <b>${remaining.toFixed(2)}</b> away from <b>free shipping</b></span>
              : <span>🎉 You’ve unlocked <b>free shipping</b></span>}
            <div className="cart__ship-bar"><span style={{ width: `${pct}%` }} /></div>
          </div>

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
        </div>

        <aside className="cart__summary">
          <h2>Order summary</h2>
          <div className="cart__sumrow"><span>Subtotal</span><b>${total.toFixed(2)}</b></div>
          <div className="cart__sumrow"><span>Shipping</span><b>{remaining > 0 ? 'Calculated at checkout' : 'Free'}</b></div>
          <div className="cart__sumrow cart__sumrow--total"><span>Total</span><b>${total.toFixed(2)}</b><em>incl. GST</em></div>
          <button className="btn btn--primary cart__checkout" onClick={() => alert('Checkout is a prototype mock — this is where Shopify checkout would open.')}>Checkout →</button>
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
