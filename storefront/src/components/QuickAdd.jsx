/*  QuickAdd — the live store's "Quick Add" popup: pick size, colour and
    hook/loop, set quantity, then Add to cart or Buy with Shop Pay. Opened from
    a product card so shoppers configure the variant without leaving the page.   */
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { addToCart, navigate } from '../lib/cart.js'

export default function QuickAdd({ p, onClose }) {
  const [size, setSize] = useState(p.sizes[0])
  const [colour, setColour] = useState(p.colours[0])
  const [side, setSide] = useState(p.hookLoop ? 'hook' : 'single')
  const [qty, setQty] = useState(1)

  /* close on Escape; lock body scroll while open */
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  const unit = (p.hookLoop && side === 'both') ? size.single * 2 : size.single
  const price = unit * qty
  const sideLabel = side === 'both' ? 'Both' : side === 'loop' ? 'Loop' : 'Hook'

  const add = (goCart) => {
    addToCart({
      key: `${p.handle}|${size.label}|${colour}|${p.hookLoop ? side : 'single'}`,
      handle: p.handle, name: p.name, img: p.img,
      variant: `${size.label} · ${colour}${p.hookLoop ? ` · ${sideLabel}` : ''}`,
      price: unit, qty,
    })
    onClose()
    if (goCart) navigate('cart')
  }

  return createPortal(
    <div className="qa" role="dialog" aria-modal="true" aria-label={`Quick add: ${p.name}`} onClick={onClose}>
      <div className="qa__panel" onClick={(e) => e.stopPropagation()}>
        <button className="qa__close" onClick={onClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>

        <div className="qa__media"><img src={p.img} alt={p.name} /></div>

        <div className="qa__body">
          <h3 className="qa__title">{p.name}</h3>
          <div className="qa__price"><b>${price.toFixed(2)}</b> <span>incl. GST</span></div>

          <div className="qa__opt">
            <span className="qa__label">Size: <b>{size.label}</b></span>
            <div className="qa__pills">
              {p.sizes.map((s) => (
                <button key={s.label} className={`qa__pill ${size.label === s.label ? 'is-on' : ''}`} onClick={() => setSize(s)}>{s.label}</button>
              ))}
            </div>
          </div>

          <div className="qa__opt">
            <span className="qa__label">Colour: <b>{colour}</b></span>
            <div className="qa__swatches">
              {p.colours.map((c) => (
                <button key={c} className={`qa__swatch ${colour === c ? 'is-on' : ''}`} onClick={() => setColour(c)} aria-label={c}
                        style={{ background: c === 'Black' ? '#1a1a1a' : c === 'Orange' ? '#e8600a' : '#fff' }} />
              ))}
            </div>
          </div>

          {p.hookLoop && (
            <div className="qa__opt">
              <span className="qa__label">Hook or loop? <b>{sideLabel}</b></span>
              <div className="qa__pills">
                {['hook', 'loop', 'both'].map((s) => (
                  <button key={s} className={`qa__pill ${side === s ? 'is-on' : ''}`} onClick={() => setSide(s)}>
                    {s === 'both' ? 'Both' : s === 'loop' ? 'Loop' : 'Hook'}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="qa__buy">
            <div className="qa__qty">
              <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease quantity">−</button>
              <span>{qty}</span>
              <button onClick={() => setQty(qty + 1)} aria-label="Increase quantity">+</button>
            </div>
            <button className="btn btn--primary qa__add" onClick={() => add(false)}>Add to cart</button>
          </div>
          <button className="qa__shoppay" onClick={() => add(true)} aria-label="Buy with Shop Pay">Buy with <span className="qa__shoppay-logo">shop</span></button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
