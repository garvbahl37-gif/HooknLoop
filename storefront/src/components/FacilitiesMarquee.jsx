/*  FacilitiesMarquee — a premium, seamless infinite ticker of what the store
    offers: capabilities interleaved with the product range so the strip shows
    capability + range + variety at a glance. Two identical rows translate -50%
    for a gapless loop; pauses on hover; range chips link to their collection;
    falls back to a static scrollable row under prefers-reduced-motion.          */
import { navigate } from '../lib/cart.js'

const CAP = [
  { icon: 'cut',     label: 'Cut to any length' },
  { icon: 'stock',   label: '100,000 m+ in stock' },
  { icon: 'trade',   label: 'Bulk & trade pricing' },
  { icon: 'fire',    label: 'Fire-retardant grades' },
  { icon: 'invoice', label: 'GST tax invoice' },
  { icon: 'truck',   label: '1–2 day AU dispatch' },
  { icon: 'factory', label: 'Custom manufacturing' },
  { icon: 'pin',     label: 'Melbourne warehouse' },
]
const RANGE = [
  { label: 'Self-Adhesive',       to: 'collection/self-adhesive' },
  { label: 'Sew-On',              to: 'collection/sew-on' },
  { label: 'Dots & Coins',        to: 'collection/dots' },
  { label: 'Straps & Cable Ties', to: 'collection/straps' },
  { label: 'Double-Sided',        to: 'collection/double-sided' },
  { label: 'VELCRO® Brand',       to: 'collection/velcro-brand' },
]

/* interleave capability, range, capability, range … */
const ITEMS = []
for (let i = 0; i < Math.max(CAP.length, RANGE.length); i++) {
  if (CAP[i]) ITEMS.push({ ...CAP[i], kind: 'cap' })
  if (RANGE[i]) ITEMS.push({ ...RANGE[i], icon: 'tag', kind: 'range' })
}

function Icon({ name }) {
  const c = { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (name) {
    case 'cut':     return <svg {...c}><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.1 8.1 21 18M8.1 15.9 21 6"/></svg>
    case 'stock':   return <svg {...c}><path d="M3 7l9-4 9 4-9 4-9-4Z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/></svg>
    case 'trade':   return <svg {...c}><path d="M3 3h18v4H3zM5 7v14h14V7M9 11h6"/></svg>
    case 'fire':    return <svg {...c}><path d="M12 3s5 4 5 9a5 5 0 0 1-10 0c0-2 1-3 1-3s3 1 4-6Z"/></svg>
    case 'invoice': return <svg {...c}><path d="M6 2h9l3 3v17l-3-2-3 2-3-2-3 2V2Z"/><path d="M9 8h6M9 12h6"/></svg>
    case 'truck':   return <svg {...c}><path d="M2 6h11v11H2zM13 9h4l3 3v5h-7"/><circle cx="6" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/></svg>
    case 'factory': return <svg {...c}><path d="M3 21V9l6 4V9l6 4V4h3v17H3Z"/></svg>
    case 'pin':     return <svg {...c}><path d="M12 22s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12Z"/><circle cx="12" cy="10" r="2.5"/></svg>
    case 'tag':     return <svg {...c}><path d="M4 4h7l9 9-7 7-9-9V4Z"/><circle cx="8" cy="8" r="1.4"/></svg>
    default:        return null
  }
}

function Chip({ item, hidden }) {
  const inner = <><span className="marq__icn"><Icon name={item.icon} /></span><span className="marq__label">{item.label}</span></>
  return item.kind === 'range'
    ? <a className="marq__item marq__item--link" href="#" tabIndex={hidden ? -1 : 0} onClick={(e) => { e.preventDefault(); navigate(item.to) }}>{inner}</a>
    : <span className="marq__item">{inner}</span>
}

function Row({ hidden }) {
  return (
    <div className="marq__row" aria-hidden={hidden || undefined}>
      {ITEMS.map((it, i) => <Chip key={i} item={it} hidden={hidden} />)}
    </div>
  )
}

export default function FacilitiesMarquee() {
  return (
    <div className="marq" role="group" aria-label="What we offer and the product range">
      <div className="marq__hazard" role="presentation" />
      <div className="marq__viewport">
        <div className="marq__track">
          <Row />
          <Row hidden />
        </div>
      </div>
    </div>
  )
}
