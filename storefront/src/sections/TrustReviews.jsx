/*  Reviews — "What our customers say". The store's own public testimonials
    (name · city/state · quote), led by trade voices, varied by theme (one
    durability story, not three), with the real 4.87 / 15 rating as the header.
    Clean 3×2 equal-height grid; stars carry an accessible label.                */
import { navigate } from '../lib/cart.js'

function Stars({ v = 5, label }) {
  return (
    <span className="rv__stars" role="img" aria-label={label || `Rated ${v} out of 5`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const pct = Math.max(0, Math.min(1, v - i)) * 100
        const solid = pct >= 100
        return (
          <svg key={i} width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            {!solid && <defs><linearGradient id={`str${i}`}><stop offset={`${pct}%`} stopColor="#b8460a" /><stop offset="0%" stopColor="#d7deea" /></linearGradient></defs>}
            <path d="M12 2l3 6.5 7 .6-5.3 4.6 1.6 6.8L12 17.5 5.7 20.5l1.6-6.8L2 9.1l7-.6L12 2Z" fill={solid ? '#b8460a' : `url(#str${i})`} />
          </svg>
        )
      })}
    </span>
  )
}

/* trade voices first; one durability story (not three); a DIY voice last */
const REVIEWS = [
  ['Sarah M.', 'Melbourne, VIC', 'Better than what we were getting from our previous supplier, and it turns up fast.'],
  ['Rachel K.', 'Perth, WA', 'Quality is spot on — exactly what we needed for our aged-care fit-out.'],
  ['Jessica L.', 'Sydney, NSW', 'Consistent every order, and cutting to length means almost no offcut waste for us.'],
  ['Tom W.', 'Hobart, TAS', 'Repaired a boat cover with it — eight months out in the weather and it’s still going strong.'],
  ['Dave T.', 'Brisbane, QLD', 'The cable straps still grip like new after six months of daily on-and-off.'],
  ['Linda P.', 'Canberra, ACT', 'The self-adhesive rolls are great — the kids can cut exactly what they need for their projects.'],
]

const initials = (name) => name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()

export default function TrustReviews() {
  return (
    <section className="rv" aria-labelledby="rv-h">
      <div className="wrap">
        <div className="sec-head rv__head">
          <span className="sec-eyebrow">Reviews</span>
          <h2 id="rv-h" className="sec-h2">What our customers say</h2>
          <div className="rv__rating">
            <Stars v={4.87} label="Rated 4.87 out of 5" />
            <span className="rv__rating-txt"><b>4.87</b> / 5 · <b>15 verified reviews</b> across Australia</span>
          </div>
        </div>

        <div className="rv__grid">
          {REVIEWS.map(([name, loc, quote]) => (
            <figure key={name} className="rv__card">
              <Stars v={5} />
              <blockquote className="rv__quote">“{quote}”</blockquote>
              <figcaption className="rv__by">
                <span className="rv__avatar" aria-hidden="true">{initials(name)}</span>
                <span className="rv__who"><b>{name}</b><span className="rv__loc">{loc}</span></span>
                <span className="rv__verified">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 13 4 4L19 7" /></svg>
                  Verified
                </span>
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="rv__foot">
          <a href="#" className="rv__all" onClick={(e) => { e.preventDefault(); navigate('') }}>Read all 15 reviews →</a>
        </div>
      </div>
    </section>
  )
}
