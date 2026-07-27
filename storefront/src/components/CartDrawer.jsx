/*  CartDrawer — slide-in mini-cart that opens automatically right after
    "Add to cart" (see ProductPage's add()). Reuses the real cart lib so it
    always matches CartPage's contents; closes on backdrop click, Escape, or
    navigating to the full cart / checkout.                                   */
import { useEffect } from 'react'
import { useCart, useCartDrawer, closeCartDrawer, setQty, removeItem, cartTotal, navigate } from '../lib/cart.js'
import { FREE_SHIP } from '../data/catalog.js'

export default function CartDrawer() {
  const open = useCartDrawer()
  const cart = useCart()
  const total = cartTotal(cart)
  const remaining = Math.max(0, FREE_SHIP - total)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') closeCartDrawer() }
    window.addEventListener('keydown', onKey)
    document.body.classList.add('drawer-open')
    return () => { window.removeEventListener('keydown', onKey); document.body.classList.remove('drawer-open') }
  }, [open])

  if (!open) return null

  const goCart = () => { closeCartDrawer(); navigate('cart') }

  return (
    <div className="cd" role="dialog" aria-label="Cart" aria-modal="true">
      <div className="cd__backdrop" onClick={closeCartDrawer} />
      <div className="cd__panel">
        <div className="cd__head">
          <h2>Added to cart</h2>
          <button className="cd__close" onClick={closeCartDrawer} aria-label="Close cart">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="cd__empty">
            <p>Your cart is empty.</p>
            <button className="btn btn--primary" onClick={() => { closeCartDrawer(); navigate('collection') }}>Shop all products →</button>
          </div>
        ) : (
          <>
            <div className="cd__items">
              {cart.map((it) => (
                <div key={it.key} className="cd__row">
                  <div className="cd__media"><img src={it.img} alt={it.name} /></div>
                  <div className="cd__info">
                    <h3>{it.name}</h3>
                    <span className="cd__variant">{it.variant}</span>
                    <div className="cd__row-bottom">
                      <div className="cd__qty">
                        <button onClick={() => setQty(it.key, it.qty - 1)} aria-label="Decrease">−</button>
                        <span>{it.qty}</span>
                        <button onClick={() => setQty(it.key, it.qty + 1)} aria-label="Increase">+</button>
                      </div>
                      <button className="cd__remove" onClick={() => removeItem(it.key)}>Remove</button>
                    </div>
                  </div>
                  <div className="cd__line">${(it.price * it.qty).toFixed(2)}</div>
                </div>
              ))}
            </div>

            <div className="cd__foot">
              <p className="cd__ship-msg">
                {remaining > 0
                  ? <>You’re <b>${remaining.toFixed(2)}</b> away from free shipping.</>
                  : <>🎉 You’ve unlocked free shipping.</>}
              </p>
              <div className="cd__sumrow"><span>Subtotal</span><b>${total.toFixed(2)} AUD</b></div>
              <p className="cd__taxnote">Tax included. Shipping calculated at checkout.</p>
              <button className="btn btn--primary cd__checkout" onClick={() => alert('Checkout is a prototype mock — this is where Shopify checkout would open.')}>Checkout</button>
              <button className="cd__viewcart" onClick={goCart}>View cart ({cart.reduce((n, x) => n + x.qty, 0)})</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
