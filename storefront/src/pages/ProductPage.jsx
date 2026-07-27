/*  ProductPage — premium PDP, data-driven from the catalog, wired to the real
    cart. Defaults the Hook/Loop/Both selector to BOTH (a working fastener) with
    a plain-English explainer + nudge; shows price-per-metre; spec table with
    [TDS] gaps; trust; sticky add-to-cart; FAQ; cross-sell.                      */
import { useState, useEffect } from 'react'
import { PRODUCTS, findProduct, productDetails, productRating, productFaqs, productCopy, BRAND } from '../data/catalog.js'
import { addToCart, openCartDrawer, navigate } from '../lib/cart.js'
import { useInView } from '../lib/useInView.js'
import Stars from '../components/Stars.jsx'
import ProductCard from '../components/ProductCard.jsx'
import ProductReviews from '../components/ProductReviews.jsx'

/*  Volume pricing mirrors the live store's "Buy More & Save" ladder. */
const QTY_BREAKS = [['Buy 5+', 'Save 5%'], ['Buy 10+', 'Save 10%'], ['Buy 20+', 'Save 20%'], ['Buy 50+', 'Save 30%']]

/*  Swatch fill for a colour option. Some products (e.g. Heavy-Duty Straps) ship
    as a single SKU that's inherently two-tone — one real choice, not two — so
    the catalog encodes that as "Orange/Black" and the swatch renders as one
    split circle instead of two separate solid buttons.                        */
const SWATCH_HEX = { Black: '#1a1a1a', White: '#fff', Orange: '#e8600a' }
function swatchFill(c) {
  if (c.includes('/')) {
    const [a, b] = c.split('/').map((s) => s.trim())
    return `linear-gradient(90deg, ${SWATCH_HEX[a] || '#ccc'} 50%, ${SWATCH_HEX[b] || '#ccc'} 50%)`
  }
  return SWATCH_HEX[c] || '#fff'
}
const PDP_TRUST = [
  ['truck', 'Fast Australian shipping', 'Speedy delivery Australia-wide'],
  ['lock', 'Secured payment', 'Safe checkout with SSL encryption'],
  ['return', 'Easy returns', '14-day returns policy'],
]

export default function ProductPage({ handle }) {
  const p = findProduct(handle)
  const d = productDetails(p.handle)   // real SKU · applications · specs (from the live store)
  const [rating, reviews] = productRating(p.handle)   // real rating · count from the live store
  const [size, setSize] = useState(p.sizes[0])
  const [colour, setColour] = useState(p.colours[0])
  const [side, setSide] = useState(p.hookLoop ? 'hook' : 'single')
  const [qty, setQty] = useState(1)
  const [img, setImg] = useState(0)
  const [paused, setPaused] = useState(false)
  const [openFaq, setOpenFaq] = useState(0)
  const [scrolledPast, setScrolledPast] = useState(false)
  const [added, setAdded] = useState(false)

  useEffect(() => { setSize(p.sizes[0]); setColour(p.colours[0]); setSide(p.hookLoop ? 'hook' : 'single'); setQty(1); setImg(0) }, [handle])
  /* auto-advance the gallery (pauses on hover); only when there's more than one image */
  useEffect(() => {
    if (p.gallery.length < 2 || paused) return
    const id = setInterval(() => setImg((n) => (n + 1) % p.gallery.length), 3500)
    return () => clearInterval(id)
  }, [handle, paused, p.gallery.length])
  useEffect(() => {
    const s = () => setScrolledPast(window.scrollY > 620)
    s()
    window.addEventListener('scroll', s, { passive: true }); return () => window.removeEventListener('scroll', s)
  }, [])

  /* the dock rides along only between the real CTA and the footer — never over it */
  const atFooter = useInView('.ft')
  const showSticky = scrolledPast && !atFooter

  /* while the dock is up, tell the floating call/chat buttons to stand down on
     mobile (where they'd collide); on desktop the centred dock clears them */
  useEffect(() => {
    document.body.classList.toggle('dock-open', showSticky)
    return () => document.body.classList.remove('dock-open')
  }, [showSticky])

  const unit = (p.hookLoop && side === 'both') ? size.single * 2 : size.single
  const price = unit * qty
  const lenM = parseFloat((size.label.match(/(\d+(?:\.\d+)?)\s*m\b/) || [])[1]) || 25
  const perMetre = p.hookLoop ? ((size.single * 2) / lenM).toFixed(2) : (size.single / lenM).toFixed(2)

  const SPECS = d.specs   // real specifications fetched from the live store
  const related = [
    ...PRODUCTS.filter((x) => x.handle !== p.handle && x.cat === p.cat),
    ...PRODUCTS.filter((x) => x.handle !== p.handle && x.cat !== p.cat),
  ].slice(0, 4)
  const faqs = productFaqs(p.handle)   // the store's real, product-specific FAQs
  const copy = productCopy(p.handle)   // real description + Key Features from the live store

  const addOnly = () => {
    addToCart({
      key: `${p.handle}|${size.label}|${colour}|${side}`,
      handle: p.handle, name: p.name, img: p.img,
      variant: `${size.label} · ${colour}${p.hookLoop ? ` · ${side === 'both' ? 'Both' : side}` : ''}`,
      price: unit, qty,
    })
  }
  const add = () => {
    addOnly()
    setAdded(true); setTimeout(() => setAdded(false), 1800)
    openCartDrawer()
  }

  return (
    <main id="main" className="pdp">
      <div className="wrap pdp__grid">
        <div className="pdp__gallery">
          <div className="pdp__stage" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
            <span className="pdp__flag">In stock · ships in 1–2 days</span>
            <img key={img} src={p.gallery[img]} alt={p.name} />
          </div>
          <div className="pdp__thumbs">
            {p.gallery.map((g, n) => (
              <button key={g + n} className={`pdp__thumb ${n === img ? 'is-on' : ''}`} onClick={() => setImg(n)} aria-label={`Image ${n + 1}`}><img src={g} alt="" /></button>
            ))}
          </div>
        </div>

        <div className="pdp__buy">
          <span className="pdp__eyebrow">Australian stock · fast dispatch</span>
          <span className="pdp__brand">{BRAND} <span className="pdp__brand-sku">· SKU <b>{d.sku}</b></span></span>
          <h1 className="pdp__title">{p.name}</h1>
          <div className="pdp__rating">
            {reviews > 0 ? (
              <><Stars v={rating} size={16} /><button type="button" className="pdp__rating-link" onClick={() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' })}>{rating.toFixed(1)} · {reviews} review{reviews > 1 ? 's' : ''}</button></>
            ) : (
              <span className="pdp__rating-none">No reviews yet</span>
            )}
          </div>

          <div className="pdp__price">
            <div>
              <span className="pdp__price-now">${unit.toFixed(2)}</span>
              <span className="pdp__price-unit">{p.hookLoop && side === 'both' ? 'complete set' : p.hookLoop ? 'per side' : ''} · incl. GST</span>
            </div>
          </div>

          <div className="pdp__opt">
            <span className="pdp__opt-label">Size <b>{size.label}</b></span>
            <div className="pdp__pills">
              {p.sizes.map((s) => <button key={s.label} className={`pdp__pill ${size.label === s.label ? 'is-on' : ''}`} onClick={() => setSize(s)}>{s.label}</button>)}
            </div>
          </div>

          <div className="pdp__opt">
            <span className="pdp__opt-label">Colour <b>{colour}</b></span>
            <div className="pdp__swatches">
              {p.colours.map((c) => (
                <button key={c} className={`pdp__swatch ${colour === c ? 'is-on' : ''}`} onClick={() => setColour(c)} aria-label={c}
                        style={{ background: swatchFill(c) }} />
              ))}
            </div>
          </div>

          {p.hookLoop && (
            <div className="pdp__opt">
              <span className="pdp__opt-label">Hook, loop or both? <b>{side === 'both' ? 'Both — complete set' : side === 'hook' ? 'Hook only' : 'Loop only'}</b></span>
              <div className="pdp__seg" role="radiogroup" aria-label="Choose hook, loop or both">
                <button type="button" className={`pdp__seg-btn ${side === 'both' ? 'is-on' : ''}`} role="radio" aria-checked={side === 'both'} onClick={() => setSide('both')}>
                  <span className="pdp__seg-rec">Recommended</span>
                  <span className="pdp__seg-t">Both</span>
                  <span className="pdp__seg-s">Complete set</span>
                </button>
                <button type="button" className={`pdp__seg-btn ${side === 'hook' ? 'is-on' : ''}`} role="radio" aria-checked={side === 'hook'} onClick={() => setSide('hook')}>
                  <span className="pdp__seg-t">Hook</span>
                  <span className="pdp__seg-s">Stiff side</span>
                </button>
                <button type="button" className={`pdp__seg-btn ${side === 'loop' ? 'is-on' : ''}`} role="radio" aria-checked={side === 'loop'} onClick={() => setSide('loop')}>
                  <span className="pdp__seg-t">Loop</span>
                  <span className="pdp__seg-s">Soft side</span>
                </button>
              </div>
              {side !== 'both' && (
                <p className="pdp__nudge">A single side can’t fasten on its own. <button onClick={() => setSide('both')}>Switch to Both (${(size.single * 2).toFixed(2)}) →</button></p>
              )}
            </div>
          )}

          <div className="pdp__cta">
            <div className="pdp__cta-row">
              <div className="pdp__qty" role="group" aria-label="Quantity">
                <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease quantity">−</button>
                <span aria-live="polite">{qty}</span>
                <button onClick={() => setQty(qty + 1)} aria-label="Increase quantity">+</button>
              </div>
              <button className={`btn btn--primary pdp__add ${added ? 'is-added' : ''}`} onClick={add}>{added ? '✓ Added to cart' : <>Add to cart — ${price.toFixed(2)}</>}</button>
            </div>
            <button className="pdp__buynow" onClick={() => { addOnly(); navigate('cart') }} aria-label="Buy it now with Shop Pay">Buy with <span className="pdp__buynow-logo">shop</span></button>
          </div>

          <div className="pdp__policies">
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('shipping') }}><Ico n="truck" />Shipping</a>
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('returns') }}><Ico n="return" />Returns &amp; Exchanges</a>
          </div>

        </div>
      </div>

      {/* Buy More & Save — volume pricing ladder (from the live store, elevated) */}
      <section className="pdp__bulk" aria-labelledby="bms-h">
        <div className="wrap">
          <div className="bms">
            <div className="bms__top">
              <span className="bms__eyebrow">Trade &amp; bulk pricing</span>
              <h2 id="bms-h" className="bms__h">Buy more &amp; save</h2>
              <p className="bms__sub">The more you order, the less you pay — volume discounts apply automatically at checkout, no code needed.</p>
            </div>
            <div className="bms__tiers">
              {QTY_BREAKS.map(([q, s], i) => (
                <div key={q} className={`bms__tier ${i === QTY_BREAKS.length - 1 ? 'is-best' : ''}`} style={{ '--i': i }}>
                  {i === QTY_BREAKS.length - 1 && <span className="bms__ribbon">Best value</span>}
                  <span className="bms__qty">{q}</span>
                  <span className="bms__pct">{s.replace('Save ', '')}</span>
                  <span className="bms__lbl">off</span>
                </div>
              ))}
            </div>
          </div>
          <ul className="bms__trust">
            {PDP_TRUST.map(([icn, t, sub]) => (
              <li key={t}><span className="bms__tico"><Ico n={icn} /></span><span className="bms__tcopy"><b>{t}</b><em>{sub}</em></span></li>
            ))}
          </ul>
        </div>
      </section>

      <div className="pdp__lower">
        <div className="wrap pdp__cols pdp__cols--single">
          <div className="pdp__main-col">
            <section className="pdp__block">
              <h2>Description</h2>
              {copy.heading && <p className="pdp__desc-lead">{copy.heading}</p>}
              {copy.paras.length
                ? copy.paras.map((t, i) => <p key={i}>{t}</p>)
                : <p>A versatile {p.name.toLowerCase()} from the HooknLoop range. {p.spec}. One roll covers dozens of jobs.{p.hookLoop ? ' Choose Both to get a working fastener, or a single side to match tape you already own.' : ''}</p>}
            </section>
            {copy.features.length > 0 && (
              <section className="pdp__block">
                <h2>Key features</h2>
                <ul className="pdp__features">{copy.features.map((f) => <li key={f}>{f}</li>)}</ul>
              </section>
            )}
            <section className="pdp__block">
              <h2>Key applications</h2>
              <ul className="pdp__apps">{d.applications.map((a) => <li key={a}>{a}</li>)}</ul>
            </section>
            <section className="pdp__block">
              <h2>Specifications</h2>
              <table className="pdp__spec"><tbody><tr><th>Brand</th><td>{BRAND}</td></tr>{SPECS.map(([k, v]) => <tr key={k}><th>{k}</th><td className={/TDS|request/i.test(String(v)) ? 'pdp__tds' : ''}>{v}</td></tr>)}</tbody></table>
              <p className="pdp__spec-note">Specifications are from the manufacturer’s data. Fire-retardant standards are on the supplier’s technical data sheet, supplied on request — we don’t publish a rating we can’t certify.</p>
            </section>
            <section className="pdp__block">
              <h2>Questions, answered</h2>
              <div className="pdp__faq">{faqs.map((f, i) => (
                <div key={f.q} className={`pdp__faq-item ${openFaq === i ? 'is-open' : ''}`}>
                  <button onClick={() => setOpenFaq(openFaq === i ? -1 : i)} aria-expanded={openFaq === i}>{f.q}<span aria-hidden="true">{openFaq === i ? '−' : '+'}</span></button>
                  {openFaq === i && <p>{f.a}</p>}
                </div>))}
              </div>
            </section>
            <ProductReviews handle={p.handle} />
          </div>
        </div>

        <div className="wrap pdp__related">
          <div className="pdp__related-head">
            <h2>Related products</h2>
            <a href="#" className="pdp__related-all" onClick={(e) => { e.preventDefault(); navigate('collection') }}>Shop all products →</a>
          </div>
          <div className="pdp__related-grid">
            {related.map((c) => <ProductCard key={c.handle} p={c} />)}
          </div>
        </div>
      </div>

      {/* floating glass add-to-cart dock — contained + centred so it clears the FABs */}
      <div className={`pdp__dock ${showSticky ? 'is-shown' : ''}`} role="region" aria-label="Add to cart">
        <div className="pdp__dock-inner">
          <div className="pdp__dock-info">
            <span className="pdp__dock-thumb"><img src={p.gallery[0]} alt="" /></span>
            <span className="pdp__dock-meta">
              <b className="pdp__dock-name">{p.name}</b>
              <span className="pdp__dock-variant">{size.label} · {colour}{p.hookLoop ? ` · ${side === 'both' ? 'Both' : side === 'hook' ? 'Hook' : 'Loop'}` : ''}</span>
              <span className="pdp__dock-mprice"><b>${price.toFixed(2)}</b> incl. GST</span>
            </span>
          </div>

          <div className="pdp__dock-actions">
            <span className="pdp__dock-price">
              <b>${price.toFixed(2)}</b><em>incl. GST</em>
            </span>
            <div className="pdp__dock-qty" role="group" aria-label="Quantity">
              <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease quantity">−</button>
              <span aria-live="polite">{qty}</span>
              <button onClick={() => setQty(qty + 1)} aria-label="Increase quantity">+</button>
            </div>
            <button className={`btn btn--primary pdp__dock-add ${added ? 'is-added' : ''}`} onClick={add}>
              {added ? '✓ Added' : <><svg className="pdp__dock-cart" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 6h15l-1.5 9h-12z"/><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M6 6 5 3H2"/></svg>Add to cart</>}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}

function Ico({ n }) {
  const c = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' }
  const m = {
    cut: <svg {...c}><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.1 8.1 21 18M8.1 15.9 21 6"/></svg>,
    truck: <svg {...c}><path d="M2 6h11v11H2zM13 9h4l3 3v5h-7"/><circle cx="6" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/></svg>,
    invoice: <svg {...c}><path d="M6 2h9l3 3v17l-3-2-3 2-3-2-3 2V2Z"/><path d="M9 8h6M9 12h6"/></svg>,
    return: <svg {...c}><path d="M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5"/></svg>,
    lock: <svg {...c}><rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></svg>,
  }
  return <span className="pdp__tico">{m[n]}</span>
}
