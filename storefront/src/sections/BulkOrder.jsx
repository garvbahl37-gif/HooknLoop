/*  BulkOrder — a premium "create a bulk order" section for the Bulk page:
    how-it-works steps + why-bulk perks on the left, a working bulk-quote request
    form on the right, and an industries-served strip. Content mirrors the live
    store's bulk-orders page. Form submits locally (wire to your backend / email). */
import { useState } from 'react'

const STEPS = [
  ['Share your specs', 'Product type, width and quantity you need.'],
  ['One-time or recurring', 'A single run, or an ongoing monthly supply agreement.'],
  ['Get a custom quote', 'Volume pricing tailored to your order — multi-roll, carton or contract.'],
  ['Approve & we handle it', 'Priority dispatch, consistent quality, one point of contact.'],
]
const PERKS = ['Consistent quality every roll', 'Reliable stock for projects', 'Stable costs for quoting', 'Priority dispatch', 'Custom sizes & formats', 'Less admin, fewer POs']
const WHO = ['Clothing & footwear', 'Upholstery & display', 'Medical suppliers', 'Education', 'Marine & defence', 'Industrial manufacturers']
const PROD = ['Self-adhesive hook & loop', 'Sew-on hook & loop', 'Hook & loop dots & coins', 'Cable straps & ties', 'Heavy-duty industrial', 'Fire-retardant grades', 'Double-sided', 'Custom / not sure']

export default function BulkOrder() {
  const [sent, setSent] = useState(false)
  return (
    <section className="bo" aria-labelledby="bo-h">
      <div className="wrap">
        <div className="sec-head">
          <span className="sec-eyebrow">Bulk order support</span>
          <h2 id="bo-h" className="sec-h2">Create a bulk order</h2>
          <p className="sec-sub">Tell us what you need and we’ll send a customised quote — multi-roll discounts, carton pricing, or an ongoing monthly supply agreement.</p>
        </div>

        <div className="bo__grid">
          <div className="bo__info">
            <h3 className="bo__h3">How it works</h3>
            <ol className="bo__steps">
              {STEPS.map(([t, d], i) => (
                <li key={t} className="bo__step"><span className="bo__step-n">{i + 1}</span><div><b>{t}</b><span>{d}</span></div></li>
              ))}
            </ol>
            <h3 className="bo__h3 bo__h3--gap">Why buy in bulk</h3>
            <ul className="bo__perks">{PERKS.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>

          <div className="bo__form-card">
            {sent ? (
              <div className="form__ok"><b>Bulk quote requested</b><span>Thanks — our team will send your customised quote within 1 business day.</span></div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); setSent(true) }}>
                <h3 className="bo__h3">Request a bulk quote</h3>
                <label className="fld"><span>Product</span>
                  <select required defaultValue=""><option value="" disabled>Select a product…</option>{PROD.map((p) => <option key={p}>{p}</option>)}</select>
                </label>
                <div className="fld-row">
                  <label className="fld"><span>Width</span><input placeholder="e.g. 25 mm" /></label>
                  <label className="fld"><span>Quantity</span><input required placeholder="e.g. 50 rolls" /></label>
                </div>
                <label className="fld"><span>Order type</span>
                  <select defaultValue="One-time"><option>One-time</option><option>Recurring (monthly)</option></select>
                </label>
                <div className="fld-row">
                  <label className="fld"><span>Name</span><input required placeholder="Your name" /></label>
                  <label className="fld"><span>Email</span><input type="email" required placeholder="you@company.com" /></label>
                </div>
                <label className="fld"><span>Notes <em>(optional)</em></span><textarea rows="3" placeholder="Colours, timelines, special requirements…" /></label>
                <button className="btn btn--primary" style={{ width: '100%' }}>Request bulk quote<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" style={{ marginLeft: 8 }}><path d="M5 12h14M13 6l6 6-6 6" /></svg></button>
                <p className="bo__or">Prefer to talk? Call <a href="tel:1300183481">1300 183 481</a> or email <a href="mailto:info@hooknloop.com.au">info@hooknloop.com.au</a></p>
              </form>
            )}
          </div>
        </div>

        <div className="bo__who">
          <span className="bo__who-lbl">Trusted by</span>
          {WHO.map((w) => <span key={w} className="bo__who-chip">{w}</span>)}
        </div>
      </div>
    </section>
  )
}
