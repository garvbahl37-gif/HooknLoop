import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import Breadcrumbs from '../components/Breadcrumbs.jsx'
import { useCart, cartTotal, cartCount, clearCart, money, navigate } from '../lib/cart.js'
import { FREE_SHIP } from '../data/catalog.js'

const AU_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']
const PAY_METHODS = [
  ['card', 'Card', 'card'],
  ['paypal', 'PayPal', null],
  ['shop-pay', 'Shop Pay', null],
]

const formatCard = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
const formatExpiry = (v) => { const d = v.replace(/\D/g, '').slice(0, 4); return d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d }

function AddressFields({ prefix }) {
  return (
    <div className="chk-grid">
      <label className="chk-field">First name<input name={prefix + 'First'} required placeholder="Jane" /></label>
      <label className="chk-field">Last name<input name={prefix + 'Last'} required placeholder="Smith" /></label>
      <label className="chk-field chk-col-2">Address<input name={prefix + 'Addr'} required placeholder="Street address" /></label>
      <label className="chk-field chk-col-2">Apartment, suite, etc. <span>(optional)</span><input name={prefix + 'Addr2'} placeholder="Unit, floor, etc." /></label>
      <label className="chk-field chk-col-2">City / Suburb<input name={prefix + 'City'} required placeholder="Suburb" /></label>
      <label className="chk-field">
        State
        <div className="chk-select">
          <select name={prefix + 'State'} required defaultValue="">
            <option value="" disabled>Select</option>
            {AU_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <Icon name="chevronDown" size={15} />
        </div>
      </label>
      <label className="chk-field">Postcode<input name={prefix + 'Postcode'} required inputMode="numeric" maxLength={4} placeholder="2000" /></label>
    </div>
  )
}

function Confirmation({ placed }) {
  return (
    <main id="main" className="wrap cart-done">
      <span className="cart-done__tick"><Icon name="check" size={40} /></span>
      <h1>Thank you — your order is confirmed</h1>
      <p>Order <b className="num">{placed.id}</b> for <b className="num">{money(placed.total)}</b> has been received. We've emailed your confirmation to <b>{placed.email}</b> — you'll get tracking as soon as it ships.</p>
      <ul className="cart-done__steps">
        <li><span className="cart-done__step-ic"><Icon name="check" size={15} /></span>Order confirmed &amp; payment received</li>
        <li><span className="cart-done__step-ic"><Icon name="warehouse" size={15} /></span>Picked and packed at our warehouse</li>
        <li><span className="cart-done__step-ic"><Icon name="truck" size={15} /></span>On its way — tracking emailed on dispatch</li>
      </ul>
      <div className="cart-done__cta">
        <a className="btn btn--brand btn--lg" href="#/shop" onClick={(e) => { e.preventDefault(); navigate('/shop') }}>Continue shopping</a>
        <a className="btn btn--ghost btn--lg" href="#/" onClick={(e) => { e.preventDefault(); navigate('/') }}>Back to home</a>
      </div>
    </main>
  )
}

export default function CheckoutPage() {
  const cart = useCart()
  const count = cartCount(cart)
  const subtotal = cartTotal(cart)
  const [placed, setPlaced] = useState(null)
  const [billingSame, setBillingSame] = useState(true)
  const [shipMethod, setShipMethod] = useState('standard')
  const [payMethod, setPayMethod] = useState('card')
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvc, setCardCvc] = useState('')

  const freeShip = subtotal >= FREE_SHIP
  const SHIP_METHODS = [
    { id: 'standard', label: 'Standard shipping', eta: '3–5 business days', price: freeShip ? 0 : 9.95 },
    { id: 'express', label: 'Express shipping', eta: '1–2 business days', price: freeShip ? 12 : 18.95 },
  ]
  const shipCost = SHIP_METHODS.find((m) => m.id === shipMethod)?.price || 0
  const total = subtotal + shipCost

  if (placed) return <Confirmation placed={placed} />

  if (!count) {
    return (
      <main id="main" className="wrap cart-empty">
        <span className="cart-empty__icon"><Icon name="cart" size={44} /></span>
        <h1>Your cart is empty</h1>
        <p>Add something to your cart before checking out.</p>
        <a className="btn btn--brand btn--lg" href="#/shop" onClick={(e) => { e.preventDefault(); navigate('/shop') }}>Shop the range <Icon name="arrowRight" size={18} /></a>
      </main>
    )
  }

  const placeOrder = (e) => {
    e.preventDefault()
    const email = e.target.elements.email?.value || ''
    const id = 'MTS-' + Math.floor(100000 + (subtotal * 37 % 899999))
    setPlaced({ id, total, email })
    clearCart()
  }

  return (
    <main id="main" className="chk">
      <div className="wrap chk__crumbs"><Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Cart', href: '/cart' }, { label: 'Checkout' }]} /></div>

      <form className="wrap chk__layout" onSubmit={placeOrder}>
        <div className="chk__main">
          <section className="chk-section">
            <h2><span className="chk-num">1</span>Contact</h2>
            <div className="chk-grid">
              <label className="chk-field chk-col-2">Email<input name="email" type="email" required placeholder="you@email.com" /></label>
              <label className="chk-field chk-col-2">Phone<input name="phone" type="tel" required placeholder="04xx xxx xxx" /></label>
            </div>
          </section>

          <section className="chk-section">
            <h2><span className="chk-num">2</span>Shipping address</h2>
            <AddressFields prefix="ship" />
          </section>

          <section className="chk-section">
            <h2><span className="chk-num">3</span>Shipping method</h2>
            <div className="chk-ship-opts" role="radiogroup" aria-label="Shipping method">
              {SHIP_METHODS.map((m) => (
                <label key={m.id} className={'chk-ship-opt' + (shipMethod === m.id ? ' is-active' : '')}>
                  <input type="radio" name="shipMethod" checked={shipMethod === m.id} onChange={() => setShipMethod(m.id)} />
                  <span className="chk-ship-opt__info"><b>{m.label}</b><span>{m.eta}</span></span>
                  <b className="num chk-ship-opt__price">{m.price === 0 ? 'Free' : money(m.price)}</b>
                </label>
              ))}
            </div>
          </section>

          <section className="chk-section">
            <h2><span className="chk-num">4</span>Billing address</h2>
            <label className="chk-check"><input type="checkbox" checked={billingSame} onChange={(e) => setBillingSame(e.target.checked)} /> Same as shipping address</label>
            {!billingSame && <div className="chk-billing-fields"><AddressFields prefix="bill" /></div>}
          </section>

          <section className="chk-section">
            <h2><span className="chk-num">5</span>Payment</h2>
            <div className="chk-pay-tabs" role="radiogroup" aria-label="Payment method">
              {PAY_METHODS.map(([id, label, icon]) => (
                <button key={id} type="button" className={'chk-pay-tab' + (payMethod === id ? ' is-active' : '')} onClick={() => setPayMethod(id)}>
                  {icon ? <Icon name={icon} size={17} /> : <img src={'/img/pay/' + id + '.svg'} alt="" height="16" />}
                  {label}
                </button>
              ))}
            </div>

            {payMethod === 'card' ? (
              <div className="chk-grid chk-card">
                <label className="chk-field chk-col-2">
                  Card number
                  <div className="chk-card-input">
                    <input value={cardNumber} onChange={(e) => setCardNumber(formatCard(e.target.value))} required inputMode="numeric" placeholder="1234 1234 1234 1234" maxLength={19} />
                    <Icon name="card" size={18} />
                  </div>
                </label>
                <label className="chk-field chk-col-2">Name on card<input required placeholder="Jane Smith" /></label>
                <label className="chk-field">Expiry date<input value={cardExpiry} onChange={(e) => setCardExpiry(formatExpiry(e.target.value))} required inputMode="numeric" placeholder="MM/YY" maxLength={5} /></label>
                <label className="chk-field">Security code<input value={cardCvc} onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))} required inputMode="numeric" placeholder="CVC" maxLength={4} /></label>
              </div>
            ) : (
              <p className="chk-pay-note"><Icon name="lock" size={14} /> You'll be redirected to {payMethod === 'paypal' ? 'PayPal' : 'Shop Pay'} to complete payment securely.</p>
            )}
            <p className="chk-secure"><Icon name="lock" size={13} /> Your payment information is encrypted and never stored on our servers.</p>
          </section>
        </div>

        <aside className="chk__summary">
          <h2>Order summary</h2>
          <ul className="chk-lines">
            {cart.map((it) => (
              <li key={it.key} className="chk-line">
                <span className="chk-line__img"><img src={it.img} alt={it.name} width="52" height="52" /><em className="num">{it.qty}</em></span>
                <span className="chk-line__info"><b>{it.name}</b>{it.variant && <em>{it.variant}</em>}</span>
                <span className="num chk-line__price">{money(it.price * it.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="chk-sum-rows">
            <div><dt>Subtotal <span>({count} item{count !== 1 ? 's' : ''})</span></dt><dd className="num">{money(subtotal)}</dd></div>
            <div><dt>Shipping</dt><dd className="num">{shipCost === 0 ? 'Free' : money(shipCost)}</dd></div>
            <div><dt>GST</dt><dd className="cart__sum-note">Included in prices</dd></div>
          </dl>
          <div className="cart__total"><span>Total</span><b className="num">{money(total)}</b></div>
          <button className="btn btn--brand btn--lg btn--block cart__checkout" type="submit"><Icon name="lock" size={18} /> Place order</button>
          <ul className="cart__trust">
            <li><Icon name="lock" size={15} /> Secure, encrypted checkout</li>
            <li><Icon name="truck" size={15} /> Dispatch to 3,600+ AU postcodes</li>
            <li><Icon name="refresh" size={15} /> 30-day easy returns</li>
          </ul>
          <div className="cart__pay">
            {['visa', 'mastercard', 'amex', 'paypal'].map((k) => <img key={k} src={'/img/pay/' + k + '.svg'} alt={k} height="22" />)}
            <span className="cart__pay-badge"><Icon name="shieldCheck" size={13} /> SSL secured</span>
          </div>
        </aside>
      </form>
    </main>
  )
}
