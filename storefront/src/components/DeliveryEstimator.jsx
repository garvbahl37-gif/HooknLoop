/*  DeliveryEstimator — a postcode delivery calculator (like the live store).
    Enter a postcode → detects metro vs regional and shows an estimated arrival
    window: dispatch 1–2 business days + metro 2–5 / regional 3–7 (from the
    store's shipping policy). Dates computed live on the client.                 */
import { useState } from 'react'

/* Capital-city metro postcode ranges (approx.) — everything else = regional. */
const METRO = [[1000, 2249], [2555, 2574], [2740, 2786], [2600, 2620], [3000, 3207], [3800, 3810], [4000, 4207], [5000, 5199], [6000, 6199], [7000, 7099], [800, 832]]
const isMetro = (pc) => METRO.some(([a, b]) => pc >= a && pc <= b)
const addBiz = (d, n) => { const r = new Date(d); let a = 0; while (a < n) { r.setDate(r.getDate() + 1); const w = r.getDay(); if (w !== 0 && w !== 6) a++ } return r }
const fmt = (d) => d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })

export default function DeliveryEstimator() {
  const [pc, setPc] = useState('')
  const [res, setRes] = useState(null)

  const onChange = (v) => {
    const digits = v.replace(/\D/g, '').slice(0, 4)
    setPc(digits)
    if (digits.length === 4) {
      const metro = isMetro(parseInt(digits, 10))
      const [minD, maxD] = metro ? [2, 5] : [3, 7]
      const now = new Date()
      setRes({ metro, from: fmt(addBiz(now, 1 + minD)), to: fmt(addBiz(now, 2 + maxD)), min: 1 + minD, max: 2 + maxD })
    } else setRes(null)
  }

  return (
    <div className="pdp__eta">
      <span className="pdp__eta-ic" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6h11v11H2zM13 9h4l3 3v5h-7" /><circle cx="6" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></svg>
      </span>
      <div className="pdp__eta-body">
        <b>Estimate your delivery</b>
        <div className="eta__row">
          <input className="eta__input" inputMode="numeric" maxLength={4} value={pc}
                 onChange={(e) => onChange(e.target.value)} placeholder="Postcode" aria-label="Enter your postcode" />
          {res && <span className={`eta__badge ${res.metro ? 'is-metro' : ''}`}>{res.metro ? 'Metro' : 'Regional'}</span>}
        </div>
        {res
          ? <span className="eta__res">Arrives <b>{res.from} – {res.to}</b> · {res.min}–{res.max} business days, Australia-wide.</span>
          : <span className="eta__hint">Dispatched in 1–2 business days. Enter your postcode for an arrival estimate.</span>}
      </div>
    </div>
  )
}
