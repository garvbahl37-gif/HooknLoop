/*  TapeFinder — 3-step guided finder. Answers → one recommended product with the
    Hook/Loop/Both variant pre-selected (defaults to Both). The store's #1 CRO fix. */
import { useState } from 'react'

const Q = [
  { id: 'substrate', q: 'What are you fastening it to?', help: 'This decides adhesive, sew-on or strap.',
    opts: [
      { v: 'hard', t: 'A hard, smooth surface', s: 'Wall, glass, metal, tile, painted timber' },
      { v: 'fabric', t: 'Fabric or soft material', s: 'Clothing, upholstery, banners, canvas' },
      { v: 'bundle', t: 'Bundling or wrapping', s: 'Cables, hoses, poles — wraps on itself' },
      { v: 'spots', t: 'Small spots or fixings', s: 'Signage, display boards, point-of-sale' },
      { v: 'backtoback', t: 'A closable back-to-back strap', s: 'One tape that grips itself' },
    ] },
  { id: 'strength', q: 'How much holding power do you need?', help: 'Not sure? Medium suits most indoor jobs.',
    opts: [
      { v: 'light', t: 'Light', s: 'Everyday, low-load, indoors' },
      { v: 'medium', t: 'Medium', s: 'General-purpose, most jobs' },
      { v: 'heavy', t: 'Heavy-duty', s: 'High-load, heat, outdoor, vibration' },
    ] },
  { id: 'sides', q: 'Do you need both sides, or just one?', help: 'A working fastener needs a hook side and a loop side.',
    opts: [
      { v: 'both', t: 'Both — the complete set', s: 'Recommended · this is the pair that fastens' },
      { v: 'one', t: 'Just one side', s: 'Only if you already have the matching side' },
    ] },
]

function recommend(a) {
  const P = {
    backtoback: { name: 'Double-Sided (Back-to-Back)', from: '21.66', why: 'Grips itself — no adhesive, ideal for bundling.', img: '/img/p-doubleside.png', side: false },
    bundle: { name: 'Reusable Cable Straps', from: '25.00', why: 'Reusable self-gripping straps for cables and hoses.', img: '/img/p-strap.jpg', side: false },
    spots: { name: 'Hook & Loop Dots', from: '66.74', why: 'Coins for fast, repeatable fixings.', img: '/img/p-dots.jpg', side: true },
    fabric: { name: 'Sew-On (Non-Adhesive)', from: '24.46', why: 'Stitches to fabric — no adhesive to fail in the wash.', img: '/img/p-loop.jpg', side: true },
    hardLight: { name: 'Self-Adhesive Roll', from: '32.90', why: 'Peel-and-stick for smooth indoor surfaces.', img: '/img/p-hook.jpg', side: true },
    hardHeavy: { name: 'Heavy-Duty Adhesive', from: '55.43', why: 'High-tack acrylic for heat, weather and load.', img: '/img/p-heavyduty.webp', side: true },
  }
  if (a.substrate === 'backtoback') return P.backtoback
  if (a.substrate === 'bundle') return P.bundle
  if (a.substrate === 'spots') return P.spots
  if (a.substrate === 'fabric') return P.fabric
  return a.strength === 'heavy' ? P.hardHeavy : P.hardLight
}

export default function TapeFinder() {
  const [step, setStep] = useState(0)
  const [a, setA] = useState({})

  const pick = (id, v) => {
    const next = { ...a, [id]: v }
    setA(next)
    setTimeout(() => setStep((s) => Math.min(s + 1, 3)), 180)
  }
  const reset = () => { setA({}); setStep(0) }
  const done = step >= 3
  const rec = done ? recommend(a) : null
  const wantBoth = a.sides !== 'one'

  return (
    <section className="tf" id="tape-finder" aria-labelledby="tf-h">
      <div className="wrap">
        <div className="sec-head">
          <span className="sec-eyebrow">Guided finder · about 60 seconds</span>
          <h2 id="tf-h" className="sec-h2">Which tape do you actually need?</h2>
          <p className="sec-sub">Answer three quick questions and we’ll match you to the exact roll — with the right side pre-selected, so you don’t have to guess.</p>
        </div>

        <div className="tf__card">
          <div className="tf__progress">
            <div className="tf__steps">
              {[0, 1, 2].map((n) => <span key={n} className={`tf__step ${n <= step ? 'is-on' : ''}`} />)}
            </div>
            <span className="tf__step-lbl">{done ? 'Your match' : `Step ${step + 1} of 3`}</span>
            {step > 0 && !done && <button className="tf__back" onClick={() => setStep(step - 1)}>← Back</button>}
            {done && <button className="tf__back" onClick={reset}>↺ Start over</button>}
          </div>

          {!done && (
            <div className="tf__q" role="radiogroup" aria-label={Q[step].q}>
              <h3 className="tf__qh">{Q[step].q}</h3>
              <p className="tf__qhelp">{Q[step].help}</p>
              <div className="tf__opts">
                {Q[step].opts.map((o) => (
                  <button key={o.v} className={`tf__opt ${a[Q[step].id] === o.v ? 'is-sel' : ''}`}
                          role="radio" aria-checked={a[Q[step].id] === o.v} onClick={() => pick(Q[step].id, o.v)}>
                    <span className="tf__opt-t">{o.t}</span>
                    <span className="tf__opt-s">{o.s}</span>
                    <span className="tf__opt-check" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7"/></svg></span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {done && rec && (
            <div className="tf__result">
              <div className="tf__result-media"><img src={rec.img} alt={rec.name} /><span className="tf__ribbon">Best match</span></div>
              <div className="tf__result-body">
                <span className="tf__result-eyebrow">We recommend</span>
                <h3 className="tf__result-name">{rec.name}</h3>
                {rec.side && (
                  <span className="tf__variant">Pre-selected: <b>{wantBoth ? 'Both (Hook + Loop)' : 'Single side'}</b></span>
                )}
                <p className="tf__result-why">{rec.why}</p>
                <div className="tf__result-price">From <b>${rec.from}</b> <span>incl. GST</span></div>
                <div className="tf__result-cta">
                  <a href="#" className="btn btn--primary">Add to cart<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
                  <a href="#" className="btn btn--ghost btn--ghost-dark">View product</a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
