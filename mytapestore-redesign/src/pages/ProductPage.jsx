import { useState, useMemo, useRef, useEffect } from 'react'
import Icon from '../components/Icon.jsx'
import Stars from '../components/Stars.jsx'
import Breadcrumbs from '../components/Breadcrumbs.jsx'
import ProductCard from '../components/ProductCard.jsx'
import { findProduct, productsInCat, NAV_GROUPS } from '../data/catalog.js'
import { productReviews } from '../data/reviews.js'
import { money, hasRange, variantFor, defaultSelection, addToCart, navigate, toggleWish, useWish } from '../lib/cart.js'

const groupOf = (slug) => Object.entries(NAV_GROUPS).find(([, ss]) => ss.includes(slug))?.[0]

/* Reviews a visitor submits themselves — client-side only (no backend on this
   redesign), persisted to localStorage keyed by product handle so they survive
   a refresh and show up immediately alongside the seeded reviews. */
const MYREV_KEY = 'mts_my_reviews_v1'
function getMyReviews(handle) {
  try { return (JSON.parse(localStorage.getItem(MYREV_KEY)) || {})[handle] || [] } catch { return [] }
}
function addMyReview(handle, review) {
  let all = {}
  try { all = JSON.parse(localStorage.getItem(MYREV_KEY)) || {} } catch { /* ignore */ }
  all[handle] = [review, ...(all[handle] || [])]
  localStorage.setItem(MYREV_KEY, JSON.stringify(all))
}
const PAY = ['visa', 'mastercard', 'amex', 'paypal', 'shop-pay']

const TIERS = [
  { min: 1, off: 0, label: '1' },
  { min: 2, off: 0.05, label: '2–5' },
  { min: 6, off: 0.10, label: '6–9' },
  { min: 10, off: 0.15, label: '10+' },
]
const tierFor = (q) => TIERS.reduce((a, t) => (q >= t.min ? t : a), TIERS[0])

const SWATCH = {
  black: '#1a1a1a', white: '#ffffff', orange: '#df3c22', brown: '#6b4423', red: '#c0392b',
  blue: '#2b5cb8', green: '#2e7d32', yellow: '#e8b800', grey: '#8a8a8a', gray: '#8a8a8a',
  'dark grey': '#4d4d4d', 'dark gray': '#4d4d4d',
  silver: '#c7c7c7', aluminium: '#c7c7c7', gold: '#c9a227', clear: 'linear-gradient(135deg,#eee 25%,#fff 25% 50%,#eee 50% 75%,#fff 75%)',
  transparent: 'linear-gradient(135deg,#eee 25%,#fff 25% 50%,#eee 50% 75%,#fff 75%)',
}
/* Two-tone hazard/marking tapes ("B/Y Left", "Red/White Danger", "Fluro Orange / Black"...)
   don't have a single flat colour — render them as a real diagonal stripe swatch instead
   of falling back to a plain text box. */
const LETTER = { b: SWATCH.black, w: SWATCH.white, y: SWATCH.yellow, r: SWATCH.red, g: SWATCH.green, o: '#ff6a1a' }
const WORD = { black: 'b', white: 'w', yellow: 'y', red: 'r', green: 'g', orange: 'o', fluro: 'o', danger: null }
function resolvePart(raw) {
  const p = raw.trim()
  if (!p) return null
  if (SWATCH[p]) return SWATCH[p]
  if (p.length <= 2 && LETTER[p[0]]) return LETTER[p[0]]
  for (const w in WORD) { if (WORD[w] && p.includes(w)) return LETTER[WORD[w]] }
  return null
}
function swatchFill(name) {
  const n = String(name).toLowerCase().trim()
  if (SWATCH[n]) return SWATCH[n]
  const stripped = n.replace(/\b(left|right)\b/g, '').replace(/\s*\/\s*/g, '/').trim()
  if (stripped.includes('/')) {
    const [a, b] = stripped.split('/')
    const c1 = resolvePart(a), c2 = resolvePart(b)
    if (c1 && c2) return `repeating-linear-gradient(45deg, ${c1} 0 7px, ${c2} 7px 14px)`
  }
  return null
}
const isColourAxis = (n) => /colou?r/i.test(n)

function DescBlocks({ blocks }) {
  const [openFaq, setOpenFaq] = useState(0)
  return (
    <div className="pdp-desc">
      {blocks.map((b, i) => {
        if (b.type === 'h') return <h3 key={i}>{b.text}</h3>
        if (b.type === 'p') return <p key={i}>{b.text}</p>
        if (b.type === 'lines' || b.type === 'features') return (
          <ul key={i} className="pdp-desc__features">
            {b.items.map((it, j) => <li key={j}><Icon name="check" size={16} /><span>{it}</span></li>)}
          </ul>
        )
        if (b.type === 'table') return (
          <div key={i} className="pdp-desc__table-wrap"><table className="spec-table"><tbody>
            {b.rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}>{c}</td>)}</tr>)}
          </tbody></table></div>
        )
        if (b.type === 'img') return <img key={i} className="pdp-desc__img" src={b.src} alt={b.alt || ''} loading="lazy" />
        if (b.type === 'faq' && b.qas?.length) return (
          <div key={i} className="catseo__faqs pdp-desc__faqs">
            <span className="catseo__faqs-eyebrow">Good to know</span>
            <h3>Frequently asked questions</h3>
            <ul className="faq__list">
              {b.qas.map((f, j) => (
                <li key={j} className={'faq__item' + (openFaq === j ? ' is-open' : '')}>
                  <button className="faq__q" aria-expanded={openFaq === j} onClick={() => setOpenFaq(openFaq === j ? -1 : j)}>
                    <span>{f.q}</span><Icon name={openFaq === j ? 'minus' : 'plus'} size={18} />
                  </button>
                  {openFaq === j && <div className="faq__a"><p>{f.a}</p></div>}
                </li>
              ))}
            </ul>
          </div>
        )
        return null
      })}
    </div>
  )
}

function Reviews({ reviews, avg }) {
  if (!reviews.length) return (
    <div className="pdp-rev__empty"><Icon name="star" size={30} /><p>No reviews yet — be the first to review this product.</p></div>
  )
  const dist = [5, 4, 3, 2, 1].map((s) => reviews.filter((r) => Math.round(r.rating) === s).length)
  const total = reviews.length
  return (
    <div className="pdp-rev">
      <div className="pdp-rev__summary">
        <div className="pdp-rev__avg">
          <b className="num">{avg.toFixed(1)}</b>
          <Stars rating={avg} size={18} showCount={false} />
          <span className="num">{total} review{total !== 1 ? 's' : ''}</span>
        </div>
        <div className="pdp-rev__bars">
          {[5, 4, 3, 2, 1].map((s, i) => (
            <div key={s} className="pdp-rev__bar">
              <span className="num">{s}★</span>
              <div className="pdp-rev__track"><div className="pdp-rev__fill" style={{ width: (total ? dist[i] / total * 100 : 0) + '%' }} /></div>
              <span className="num pdp-rev__n">{dist[i]}</span>
            </div>
          ))}
        </div>
      </div>
      <ul className="pdp-rev__list">
        {reviews.map((r, i) => (
          <li key={i} className="pdp-rev__item">
            <div className="pdp-rev__meta">
              <span className="pdp-rev__who"><span className="pdp-rev__ava">{(r.name || '?').slice(0, 1).toUpperCase()}</span>{r.name}</span>
              {r.verified && <span className="pdp-rev__verified"><Icon name="check" size={12} /> Verified buyer</span>}
              {r.date && <span className="pdp-rev__date">{r.date}</span>}
            </div>
            <Stars rating={r.rating} size={14} showCount={false} />
            <p>{r.text}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function ProductPage({ handle }) {
  const p = findProduct(handle)
  const wish = useWish()
  if (!p) return <main id="main" className="wrap pdp-missing"><h1>Product not found</h1><a className="btn btn--brand" href="#/shop" onClick={(e) => { e.preventDefault(); navigate('/shop') }}>Back to shop</a></main>

  const [sel, setSel] = useState(() => defaultSelection(p))
  const [qty, setQty] = useState(1)
  const [img, setImg] = useState(p.gallery[0] || p.img)
  const [added, setAdded] = useState(false)
  const [tab, setTab] = useState('description')
  const [lightbox, setLightbox] = useState(false)
  const tabsRef = useRef(null)
  const addedTimer = useRef(null)
  useEffect(() => () => clearTimeout(addedTimer.current), [])

  const galleryImgs = p.gallery.length ? p.gallery : [p.img]
  const imgIndex = Math.max(0, galleryImgs.indexOf(img))
  const stepImg = (d) => setImg(galleryImgs[(imgIndex + d + galleryImgs.length) % galleryImgs.length])

  useEffect(() => {
    if (!lightbox) return
    const onKey = (e) => {
      if (e.key === 'Escape') setLightbox(false)
      if (e.key === 'ArrowRight') stepImg(1)
      if (e.key === 'ArrowLeft') stepImg(-1)
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [lightbox, imgIndex])

  const variant = useMemo(() => variantFor(p, sel), [p, sel])
  const price = variant ? variant.price : (hasRange(p) ? null : p.price)
  const unit = price != null ? price : p.from
  const sku = variant ? variant.sku : p.sku
  const inStock = variant ? variant.inStock : p.inStock
  const wished = wish.includes(p.handle)
  const tier = tierFor(qty)
  const reviews = productReviews(p.handle)
  const lineTotal = unit * (1 - tier.off) * qty
  const saved = unit * tier.off * qty

  const blurb = useMemo(() => {
    const b = p.desc.find((x) => x.type === 'p' && x.text.length > 40) || p.desc.find((x) => x.type === 'lines')
    let t = b ? (b.text || (b.items || []).join(' ')) : ''
    return t.length > 210 ? t.slice(0, 207).replace(/\s+\S*$/, '') + '…' : t
  }, [p])

  /* First short bullet-point block from the description, surfaced beside the
     gallery so key specs are scannable without a tab click — also gives the
     gallery column something useful to hold instead of trailing off into
     blank space under a short image. */
  const keySpecs = useMemo(() => {
    const b = p.desc.find((x) => (x.type === 'features' || x.type === 'lines') && x.items?.length)
    return (b?.items || []).slice(0, 4)
  }, [p])

  const setAxis = (axis, val) => { setSel((s) => ({ ...s, [axis]: val })); setAdded(false) }
  const related = productsInCat(p.cats[0]?.slug || '').filter((x) => x.handle !== p.handle).slice(0, 5)
  const goReviews = () => { setTab('reviews'); tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }

  const buildItem = () => ({
    key: p.handle + '|' + (variant ? variant.id : 'base'),
    handle: p.handle, name: p.name, img,
    price: +(unit * (1 - tier.off)).toFixed(2), sku,
    variant: variant ? Object.values(variant.attrs).join(' · ') : '', qty,
  })
  const canBuy = inStock && !(p.type === 'variable' && !variant)
  const add = () => {
    if (!canBuy) return
    addToCart(buildItem())
    setAdded(true)
    clearTimeout(addedTimer.current)
    addedTimer.current = setTimeout(() => setAdded(false), 2200)
  }
  const buyNow = () => { if (!canBuy) return; addToCart(buildItem()); navigate('/cart') }

  const grp = groupOf(p.cats[0]?.slug)
  const crumbs = [{ label: 'Home', href: '/' }]
  if (grp) crumbs.push({ label: grp })
  if (p.cats[0]) crumbs.push({ label: p.cats[0].name, href: '/collection/' + p.cats[0].slug })
  crumbs.push({ label: p.name })

  const TABS = [
    ['description', 'Description'],
    ['specs', 'Specifications'],
    ['reviews', `Reviews${reviews.length ? ` (${reviews.length})` : ''}`],
    ['shipping', 'Shipping & Returns'],
  ]

  const renderOption = (axis) => (
    <div key={axis.name} className="pdp-opt">
      <div className="pdp-opt__label"><span>{axis.name}</span><b>{sel[axis.name] || 'Select'}</b></div>
      {isColourAxis(axis.name) ? (
        <div className="pdp-opt__swatches">
          {axis.terms.map((t) => {
            const fill = swatchFill(t); const on = sel[axis.name] === t
            return (
              <button key={t} className={'pdp-swatch' + (on ? ' is-active' : '')} onClick={() => setAxis(axis.name, t)} title={t} aria-label={t} aria-pressed={on}>
                {fill ? <span className="pdp-swatch__dot" style={{ background: fill }} /> : <span className="pdp-swatch__txt">{t}</span>}
              </button>
            )
          })}
        </div>
      ) : (
        <div className="pdp-opt__select">
          <select value={sel[axis.name] || ''} onChange={(e) => setAxis(axis.name, e.target.value)} aria-label={axis.name}>
            {axis.terms.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <Icon name="chevronDown" size={16} />
        </div>
      )}
    </div>
  )

  return (
    <main id="main" className="pdp">
      <div className="wrap pdp__crumbs"><Breadcrumbs items={crumbs} /></div>

      <div className="wrap pdp__top">
        {/* gallery */}
        <div className="pdp-gallery">
          <div className="pdp-gallery__row">
            {p.gallery.length > 1 && (
              <div className="pdp-gallery__thumbs">
                {p.gallery.slice(0, 6).map((g) => (
                  <button key={g} className={'pdp-gallery__thumb' + (g === img ? ' is-active' : '')} onClick={() => setImg(g)} aria-label="View image">
                    <img src={g} alt="" width="72" height="72" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
            <button className="pdp-gallery__main" onClick={() => setLightbox(true)} aria-label="Zoom image">
              <img src={img} alt={p.name} width="600" height="600" />
              {p.onSale && <span className="tag tag--sale pdp-gallery__badge">Sale</span>}
              <span className="pdp-gallery__zoom"><Icon name="search" size={16} /></span>
            </button>
          </div>
          {keySpecs.length > 0 && (
            <ul className="pdp-gallery__specs">
              {keySpecs.map((s, i) => <li key={i}><Icon name="check" size={15} /><span>{s}</span></li>)}
            </ul>
          )}
        </div>

        {/* buy column — open, airy layout */}
        <div className="pdp-buy">
          {p.cats[0] && <a className="pdp-buy__cat" href={'#/collection/' + p.cats[0].slug} onClick={(e) => { e.preventDefault(); navigate('/collection/' + p.cats[0].slug) }}>{p.cats[0].name}</a>}
          <h1 className="pdp-buy__title">{p.name}</h1>

          <div className="pdp-buy__rating">
            <button className="pdp-buy__ratebtn" onClick={goReviews} aria-label="See reviews"><Stars rating={p.rating} size={16} showCount={false} /></button>
            <button className="pdp-buy__revlink" onClick={goReviews}>{p.reviews > 0 ? `${p.reviews} review${p.reviews !== 1 ? 's' : ''}` : 'No reviews yet'}</button>
          </div>

          <div className="pdp-buy__idline">
            <span className="pdp-buy__idchip"><b>Brand</b> {p.brand}</span>
            {sku && <span className="pdp-buy__idchip num"><b>SKU</b> {sku}</span>}
          </div>

          <div className="pdp-buy__pricerow">
            {price != null
              ? <span className="pdp-buy__price num">{money(price)}</span>
              : <><span className="pdp-buy__from">From</span> <span className="pdp-buy__price num">{money(p.from)}</span></>}
            <span className="pdp-buy__gst">Inc GST</span>
            {saved > 0.005 && <span className="pdp-buy__saved-tag num">You save {money(saved)}</span>}
          </div>
          <p className="pdp-buy__tax">Tax included · Shipping calculated at checkout{hasRange(p) && price == null ? ` · Range ${money(p.min)} – ${money(p.max)}` : ''}</p>

          {/* one cohesive buy card — options, volume pricing, stock and actions grouped together */}
          <div className="pdp-buybox">
            {(p.axes || []).length > 0 && (
              <div className="pdp-buy__section">
                {(p.axes || []).map(renderOption)}
              </div>
            )}

            <div className="pdp-buy__section pdp-vol">
              <div className="pdp-vol__head"><Icon name="tag" size={14} /> Buy more, save more <span>— applied automatically at checkout</span></div>
              <div className="pdp-vol__row" role="group" aria-label="Quantity price breaks">
                {TIERS.map((t) => {
                  const active = t.min === tier.min
                  return (
                    <button key={t.min} className={'pdp-vtier' + (active ? ' is-active' : '')} onClick={() => { setQty(t.min); setAdded(false) }}>
                      <span className="pdp-vtier__lbl">{t.label}{t.min === 1 ? ' unit' : ' units'}</span>
                      <b className="num">{money(unit * (1 - t.off))}</b>
                      <span className={'pdp-vtier__off' + (t.off ? '' : ' pdp-vtier__off--muted')}>{t.off ? `Save ${t.off * 100}%` : 'each'}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="pdp-buy__section">
              <div className="pdp-buy__stock">
                {inStock
                  ? <span className="pdp-buy__instock"><span className="pdp-buy__dot" /> In stock — dispatched in 1–2 business days</span>
                  : <span className="pdp-buy__oos">Currently out of stock</span>}
              </div>
              {canBuy && (
                <p className="pdp-buy__selected">
                  {variant && <span className="pdp-buy__selected-attrs">{Object.values(variant.attrs).join(' · ')}</span>}
                  <span className="num">{qty} unit{qty !== 1 ? 's' : ''}</span>
                </p>
              )}
              <div className="pdp-buy__actions">
                <div className="qty" role="group" aria-label="Quantity">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity"><Icon name="minus" size={16} /></button>
                  <input className="num" type="text" inputMode="numeric" value={qty} onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))} aria-label="Quantity" />
                  <button onClick={() => setQty((q) => q + 1)} aria-label="Increase quantity"><Icon name="plus" size={16} /></button>
                </div>
                <button className={'btn btn--brand btn--lg pdp-buy__add' + (added ? ' is-added' : '')} onClick={add} disabled={!canBuy}>
                  {added ? <><Icon name="check" size={19} /> Added to cart</> : <><Icon name="cart" size={19} /> Add to cart</>}
                </button>
                <button className={'pdp-buy__wish' + (wished ? ' is-on' : '')} onClick={() => toggleWish(p.handle)} aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}><Icon name="heart" size={20} /></button>
              </div>
              {canBuy && (
                <p className="pdp-buy__linetotal">Total <b className="num">{money(lineTotal)}</b>{saved > 0.005 && <span className="pdp-buy__linetotal-save num"> — you save {money(saved)}</span>}</p>
              )}
              <button className="btn btn--dark btn--lg btn--block pdp-buy__buynow" onClick={buyNow} disabled={!canBuy}><Icon name="lock" size={17} /> Buy it now</button>
              {added && (
                <div className="pdp-buy__added" role="status">
                  <Icon name="check" size={18} /> Added {qty} to your cart.
                  <a href="#/cart" onClick={(e) => { e.preventDefault(); navigate('/cart') }}>View cart &amp; checkout →</a>
                </div>
              )}
            </div>
          </div>

          {/* one calm trust band — replaces the three separate stacked clusters */}
          <div className="pdp-trust">
            <ul className="pdp-trust__row">
              <li><Icon name="truck" size={18} /><span>Fast AU dispatch</span></li>
              <li><Icon name="refresh" size={18} /><span>Easy returns</span></li>
              <li><Icon name="lock" size={18} /><span>Secure checkout</span></li>
              <li><Icon name="medal" size={18} /><span>Lowest-price guarantee</span></li>
            </ul>
            <div className="pdp-trust__pay">
              <span className="pdp-trust__pay-label">We accept</span>
              <div className="pdp-buy__pay-marks">{PAY.map((k) => <img key={k} src={'/img/pay/' + k + '.svg'} alt={k} height="20" />)}</div>
            </div>
            <div className="pdp-buy__meta">
              <a href="#/shipping" onClick={(e) => { e.preventDefault(); navigate('/shipping') }}>Shipping info <Icon name="chevronRight" size={14} /></a>
              <a href="#/returns" onClick={(e) => { e.preventDefault(); navigate('/returns') }}>Returns &amp; exchanges <Icon name="chevronRight" size={14} /></a>
            </div>
          </div>
        </div>
      </div>

      {/* tabbed details */}
      <div className="wrap pdp__tabs" ref={tabsRef}>
        <div className="pdp-tabnav" role="tablist">
          {TABS.map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={'pdp-tabnav__btn' + (tab === id ? ' is-active' : '')} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>

        <div className="pdp-tabpanel" role="tabpanel">
          {tab === 'description' && <DescBlocks blocks={p.desc} />}

          {tab === 'specs' && (
            <div className="pdp-specgrid">
              <table className="spec-table">
                <tbody>
                  {p.cats[0] && <tr><th>Category</th><td>{p.cats[0].name}</td></tr>}
                  {sku && <tr><th>SKU</th><td className="num">{sku}</td></tr>}
                  {(p.axes || []).map((a) => (
                    <tr key={a.name}><th>{a.name}</th><td>{[...new Set(a.terms)].join(', ')}</td></tr>
                  ))}
                  <tr><th>Price</th><td className="num">{hasRange(p) ? `${money(p.min)} – ${money(p.max)}` : money(p.price)} Inc GST</td></tr>
                  <tr><th>Availability</th><td>{p.inStock ? 'In stock' : 'Out of stock'}</td></tr>
                  <tr><th>Brand</th><td>{p.brand}</td></tr>
                </tbody>
              </table>
              {p.industries.length > 0 && (
                <div className="pdp-specgrid__ind">
                  <h4>Recommended for</h4>
                  <div className="pdp-specbox__chips">
                    {p.industries.map((c) => (
                      <a key={c.slug} href={'#/industry/' + c.slug} onClick={(e) => { e.preventDefault(); navigate('/industry/' + c.slug) }}>{c.name}</a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'reviews' && <Reviews reviews={reviews} avg={p.rating || 5} />}

          {tab === 'shipping' && (
            <div className="pdp-desc pdp-ship">
              <h3>Shipping &amp; delivery</h3>
              <p>We deliver to every part of Australia. Orders are processed within 1–2 business days — placed before our daily cut-off, they’re processed the same day. Every shipment includes tracking so you can follow your parcel in real time.</p>
              <ul className="pdp-desc__features">
                <li><Icon name="check" size={16} /><span>Standard shipping — delivered in 5–7 business days</span></li>
                <li><Icon name="check" size={16} /><span>Express shipping — delivered in 3–5 business days</span></li>
                <li><Icon name="check" size={16} /><span>Shipping fees shown before checkout</span></li>
              </ul>
              <h3>Returns &amp; exchanges</h3>
              <p>Incorrect items we send can be returned for exchange; items ordered by mistake can be returned at your expense. Faulty or damaged items are replaced free — file a claim within 2 days of delivery with photos. Items must be returned within 30 days of delivery, and refunds are processed within 7 days of receipt. To start a return, email <a href="mailto:info@mytapestore.com.au">info@mytapestore.com.au</a> with your order number.</p>
            </div>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="section section--paper">
          <div className="wrap">
            <div className="section-head"><div className="section-title-wrap"><span className="eyebrow">You might also need</span><h2>Related products</h2></div></div>
            <div className="grid-products grid-products--fit">{related.slice(0, 4).map((r) => <ProductCard key={r.handle} p={r} />)}</div>
          </div>
        </section>
      )}

      {lightbox && (
        <div className="pdp-lightbox" role="dialog" aria-modal="true" aria-label={`${p.name} — image viewer`} onClick={() => setLightbox(false)}>
          <button className="pdp-lightbox__close" aria-label="Close image viewer" onClick={() => setLightbox(false)}><Icon name="close" size={26} /></button>
          {galleryImgs.length > 1 && <button className="pdp-lightbox__nav pdp-lightbox__nav--prev" aria-label="Previous image" onClick={(e) => { e.stopPropagation(); stepImg(-1) }}><Icon name="chevronRight" size={28} /></button>}
          <figure className="pdp-lightbox__stage" onClick={(e) => e.stopPropagation()}>
            <img src={img} alt={p.name} />
            {galleryImgs.length > 1 && <figcaption className="num">{imgIndex + 1} / {galleryImgs.length}</figcaption>}
          </figure>
          {galleryImgs.length > 1 && <button className="pdp-lightbox__nav pdp-lightbox__nav--next" aria-label="Next image" onClick={(e) => { e.stopPropagation(); stepImg(1) }}><Icon name="chevronRight" size={28} /></button>}
        </div>
      )}
    </main>
  )
}
