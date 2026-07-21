/*  Per-product reviews — real reviews pulled from the live store's Judge.me
    widget, plus a working "Write a review" form. New reviews are added locally
    (prototype) and shown as "Pending" until moderated.                          */
import { useState, useEffect } from 'react'
import Stars from './Stars.jsx'
import { productReviews } from '../data/catalog.js'

function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0)
  return (
    <span className="rvw-form__stars" role="radiogroup" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button type="button" key={n} className={`rvw-form__star ${(hover || value) >= n ? 'is-on' : ''}`}
                onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => onChange(n)}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}>★</button>
      ))}
    </span>
  )
}

export default function ProductReviews({ handle }) {
  const [reviews, setReviews] = useState(() => productReviews(handle))
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const [form, setForm] = useState({ name: '', rating: 5, title: '', body: '' })

  useEffect(() => {
    setReviews(productReviews(handle)); setOpen(false); setDone(false)
    setForm({ name: '', rating: 5, title: '', body: '' })
  }, [handle])

  const count = reviews.length
  const avg = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0
  const hist = [5, 4, 3, 2, 1].map((n) => ({ n, c: reviews.filter((r) => Math.round(r.rating) === n).length }))

  const submit = (e) => {
    e.preventDefault()
    const r = {
      rating: form.rating, name: form.name.trim() || 'Anonymous', title: form.title.trim(),
      body: form.body.trim(), date: new Date().toISOString().slice(0, 10), verified: false, mine: true,
    }
    setReviews([r, ...reviews]); setDone(true); setOpen(false)
    setForm({ name: '', rating: 5, title: '', body: '' })
  }

  return (
    <section className="pdp__block rvw" id="reviews" aria-labelledby="rvw-h">
      <div className="rvw__top">
        <div className="rvw__sum">
          <span className="rvw__avg">{count ? avg.toFixed(1) : '—'}</span>
          <div>
            <Stars v={avg} size={18} />
            <span className="rvw__based">{count ? `Based on ${count} review${count > 1 ? 's' : ''}` : 'No reviews yet'}</span>
          </div>
        </div>
        {count > 0 && (
          <div className="rvw__hist">
            {hist.map((h) => (
              <div key={h.n} className="rvw__bar">
                <span className="rvw__bar-n">{h.n}★</span>
                <span className="rvw__bar-track"><span className="rvw__bar-fill" style={{ width: `${count ? (h.c / count) * 100 : 0}%` }} /></span>
                <span className="rvw__bar-c">{h.c}</span>
              </div>
            ))}
          </div>
        )}
        <button className="btn btn--primary rvw__write" onClick={() => { setOpen((o) => !o); setDone(false) }}>{open ? 'Close' : 'Write a review'}</button>
      </div>

      {done && <div className="rvw__thanks">✓ Thanks! Your review has been submitted and is pending moderation.</div>}

      {open && (
        <form className="rvw-form" onSubmit={submit}>
          <h3 id="rvw-h">Write a review</h3>
          <div className="rvw-form__rate"><span>Your rating</span><StarPicker value={form.rating} onChange={(v) => setForm({ ...form, rating: v })} /></div>
          <label className="fld"><span>Name</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" required /></label>
          <label className="fld"><span>Review title <em>(optional)</em></span><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Sum it up" /></label>
          <label className="fld"><span>Your review</span><textarea rows="4" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="What did you think of this product?" required /></label>
          <div className="rvw-form__actions">
            <button type="submit" className="btn btn--primary">Submit review</button>
            <button type="button" className="btn btn--ghost-dark" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </form>
      )}

      {count > 0 ? (
        <ul className="rvw__list">
          {reviews.map((r, i) => (
            <li key={i} className="rvw__card">
              <div className="rvw__card-head">
                <span className="rvw__avatar" aria-hidden="true">{(r.name || 'A').trim()[0].toUpperCase()}</span>
                <div className="rvw__who"><b>{r.name}</b><span>{r.location || 'Australia'}{r.date ? ` · ${r.date}` : ''}</span></div>
                {(r.verified || r.mine) && <span className={`rvw__vf ${r.mine ? 'is-pending' : ''}`}>{r.mine ? 'Pending' : 'Verified'}</span>}
              </div>
              <Stars v={r.rating} size={15} />
              {r.title && <b className="rvw__title">{r.title}</b>}
              {r.body && <p className="rvw__body">{r.body}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rvw__empty">No reviews yet — be the first to review this product.</p>
      )}
    </section>
  )
}
