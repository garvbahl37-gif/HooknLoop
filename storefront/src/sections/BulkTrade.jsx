/*  BulkTrade — the single B2B band for the Bulk page: trade-quote form + a
    premium volume-savings ladder ("bundle & save"). Mirrors the product page's
    Buy More & Save tiers (5/10/20/30%) in a distinct, elevated presentation.    */
import { useState } from 'react'

const VALUE = [
  ['Volume breaks up to 30%', 'The more rolls, the lower the per-roll price.'],
  ['Any width, no minimums', 'Order the exact quantity your job needs.'],
  ['GST tax invoice + PO', 'Compliant invoicing for accounts and procurement.'],
  ['1–2 business day dispatch', '100,000m+ in stock, ready to ship.'],
]
/* [quantity tier, % off per roll] — mirrors the product page's Buy More & Save */
const TIERS = [['5+ rolls', 5], ['10+ rolls', 10], ['20+ rolls', 20], ['50+ rolls', 30]]
const PRODUCTS = ['Self-Adhesive Roll — from $32.90', 'Heavy-Duty Adhesive — from $55.43', 'VELCRO® Brand Roll — from $84.99', 'Sew-On — from $24.46', 'Hook & Loop Dots — from $66.74', 'Fire Retardant — from $32.53', 'Not sure / multiple products']

export default function BulkTrade() {
  const [sent, setSent] = useState(false)
  return (
    <section className="bt" aria-labelledby="bt-h">
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

      {/* Bundle & save — premium volume-savings ladder */}
      <div className="wrap bt__save">
        <div className="bt__save-head">
          <span className="bt__save-eyebrow">Bundle &amp; save</span>
          <h3 className="bt__save-h">The more you order, the more you save</h3>
          <p className="bt__save-sub">Volume discounts scale with your order — no code needed. Large and recurring runs go further again, confirmed on your quote.</p>
        </div>
        <div className="bt__ladder">
          {TIERS.map(([q, pct], i) => (
            <div key={q} className={`bt__tier ${i === TIERS.length - 1 ? 'is-best' : ''}`}>
              {i === TIERS.length - 1 && <span className="bt__tier-tag">Best value</span>}
              <span className="bt__tier-qty">{q}</span>
              <span className="bt__tier-pct">{pct}<i>%</i></span>
              <span className="bt__tier-lbl">off per roll</span>
              <span className="bt__tier-meter" aria-hidden="true"><i style={{ width: `${(pct / 30) * 100}%` }} /></span>
            </div>
          ))}
        </div>
        <ul className="bt__save-strip">
          <li>Free shipping over $200</li>
          <li>GST tax invoice + PO</li>
          <li>Any width, no minimums</li>
          <li>1–2 day dispatch</li>
        </ul>
      </div>
    </section>
  )
}
