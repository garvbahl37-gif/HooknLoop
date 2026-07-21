/*  ShippingEstimator — the live store's cart "Estimate Shipping" calculator.
    Pick a state + enter a postcode → "Shipping calculator" returns the real
    rates the store charges: Standard $12.00 / Express $18.00, with free
    standard shipping once the cart subtotal passes the $200 threshold.          */
import { useState } from 'react'
import { FREE_SHIP } from '../data/catalog.js'

const STATES = [
  'Australian Capital Territory', 'New South Wales', 'Northern Territory',
  'Queensland', 'South Australia', 'Tasmania', 'Victoria', 'Western Australia',
]

export default function ShippingEstimator({ subtotal = 0 }) {
  const [state, setState] = useState('')
  const [pc, setPc] = useState('')
  const [res, setRes] = useState(null)
  const [err, setErr] = useState('')

  const reset = () => { setRes(null); setErr('') }

  const calc = (e) => {
    e.preventDefault()
    if (!state || pc.length !== 4) {
      setErr('Select your state and enter a 4-digit postcode.'); setRes(null); return
    }
    setErr('')
    setRes({ free: subtotal >= FREE_SHIP })
  }

  return (
    <form className="ship-est" onSubmit={calc}>
      <div className="ship-est__head">
        <span className="ship-est__ic" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6h11v11H2zM13 9h4l3 3v5h-7" /><circle cx="6" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></svg>
        </span>
        <b>Estimate Shipping</b>
      </div>
      <div className="ship-est__row">
        <select className="ship-est__sel" value={state} aria-label="State / territory"
                onChange={(e) => { setState(e.target.value); reset() }}>
          <option value="">---</option>
          {STATES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <input className="ship-est__zip" inputMode="numeric" maxLength={4} value={pc}
               onChange={(e) => { setPc(e.target.value.replace(/\D/g, '').slice(0, 4)); reset() }}
               placeholder="Postal/ZIP code" aria-label="Postal / ZIP code" />
        <button type="submit" className="ship-est__btn">Shipping calculator</button>
      </div>
      {err && <span className="ship-est__err">{err}</span>}
      {res && (
        <div className="ship-est__res">
          {res.free
            ? <span className="ship-est__rate is-free"><b>Free</b> — Standard Shipping</span>
            : <span className="ship-est__rate">Standard: <b>$12.00</b></span>}
          <span className="ship-est__rate">Express: <b>$18.00</b></span>
          <span className="ship-est__note">Dispatched in 1–2 business days · delivery Australia-wide. Free standard shipping on orders over ${FREE_SHIP}.</span>
        </div>
      )}
    </form>
  )
}
