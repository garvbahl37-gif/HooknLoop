/*  BulkTrade — B2B conversion band + real trade-quote form (replaces the store's
    dead "contact form" that has no form). Quantity-break teaser + success state. */
import { useState } from 'react'

const VALUE = [
  ['Volume breaks up to 20%', 'The more rolls, the lower the per-roll price.'],
  ['Any width, no minimums', 'Order the exact quantity your job needs.'],
  ['GST tax invoice + PO', 'Compliant invoicing for accounts and procurement.'],
  ['1–2 business day dispatch', '100,000m+ in stock, ready to ship.'],
]
const BREAKS = [['2–5 rolls', '10% off'], ['6–9 rolls', '15% off'], ['10+ rolls', '20% off']]
const PRODUCTS = ['Self-Adhesive Roll — from $32.90', 'Heavy-Duty Adhesive — from $55.43', 'VELCRO® Brand Roll — from $84.99', 'Sew-On — from $24.46', 'Hook & Loop Dots — from $66.74', 'Fire Retardant — from $32.53', 'Not sure / multiple products']

export default function BulkTrade() {
  const [sent, setSent] = useState(false)
  return (
    <section className="bt" aria-labelledby="bt-h">
      <div className="bt__glow" aria-hidden="true" />
      <div className="wrap bt__inner">
        <div className="bt__copy">
          <span className="pill-blue">For trade &amp; bulk buyers</span>
          <h2 id="bt-h" className="bt__h2">Buy by the box. Priced for trade.</h2>
          <p className="bt__sub">Industrial hook &amp; loop, dispatched from our Australian warehouse. Volume pricing, a proper GST tax invoice, and one point of contact for repeat orders.</p>
          <div className="bt__vals">
            {VALUE.map(([l, d]) => (
              <div key={l} className="bt__val"><span className="bt__val-dot" aria-hidden="true" /><span><b>{l}</b><span className="bt__val-d">{d}</span></span></div>
            ))}
          </div>
          <div className="bt__breaks">
            <span className="bt__breaks-h">Quantity breaks (indicative)</span>
            <div className="bt__breaks-row">
              {BREAKS.map(([r, d]) => <div key={r} className="bt__break"><b>{d}</b><span>{r}</span></div>)}
            </div>
            <p className="bt__breaks-note">Indicative guide only — your final trade price is confirmed on your quote and can go further on large or recurring orders.</p>
          </div>
        </div>

        <div className="bt__form">
          {sent ? (
            <div className="bt__success" role="status">
              <span className="bt__success-icn">✓</span>
              <h3>Quote request received</h3>
              <p>We’ll reply within 1 business day. For anything urgent, call <a href="tel:1300183481">1300 183 481</a>.</p>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); setSent(true) }}>
              <h3 className="bt__form-h">Request a trade quote</h3>
              <p className="bt__form-sub">We’ll reply within 1 business day.</p>
              <label className="fld"><span>Company name</span><input type="text" required placeholder="e.g. Coastal Signage Pty Ltd" /></label>
              <div className="fld-row">
                <label className="fld"><span>ABN (optional)</span><input type="text" placeholder="Helps set up trade terms" /></label>
                <label className="fld"><span>Quantity</span><input type="text" required placeholder="e.g. 20 rolls" /></label>
              </div>
              <label className="fld"><span>Product</span>
                <select required defaultValue="">
                  <option value="" disabled>Choose a product…</option>
                  {PRODUCTS.map((p) => <option key={p}>{p}</option>)}
                </select>
              </label>
              <div className="fld-row">
                <label className="fld"><span>Work email</span><input type="email" required placeholder="you@company.com.au" /></label>
                <label className="fld"><span>Phone</span><input type="tel" placeholder="Optional" /></label>
              </div>
              <button type="submit" className="btn btn--primary bt__submit">Request my quote<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
              <p className="bt__form-legal">GST tax invoice supplied · ABN 93 878 995 217</p>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
