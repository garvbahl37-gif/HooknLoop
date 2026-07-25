import { useState, useEffect, useRef } from 'react'
import Icon from './Icon.jsx'
import { navigate } from '../lib/cart.js'

/* Tape-measure glyph (native 458×458 viewBox) — kept as its own inline SVG
   rather than forced into Icon.jsx's shared 24×24 grid, so it stays crisp
   and colours via currentColor like the rest of the chat widget's icons. */
function TapeMeasureIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 458.439 458.438" fill="currentColor" aria-hidden="true">
      <path d="M454.208,333.888V194.524c0-1.988-0.307-3.907-0.849-5.721c0.914-0.208,1.834-0.377,2.764-0.471
		c-11.59-64.657-65.992-113.609-131.399-113.609c-73.85,0-133.709,62.378-133.709,139.328v25.85v75.163H8.988v-22.479
		c0-2.471-2.011-4.492-4.493-4.492c-2.48,0-4.495,2.014-4.495,4.492v86.523c0,2.091,1.436,3.832,3.374,4.334v0.153h230.28
		c0.769,0.046,1.529,0.12,2.31,0.12h177.535c24.821,0,44.94-20.124,44.94-44.945v-4.5C457.01,334.276,455.6,334.14,454.208,333.888z
		 M12.355,374.61V324.05h15.729v24.831h3V324.05h5.572v14.245h2.875V324.05h6.832v14.245h2.873V324.05h7.302v14.245h2.873V324.05
		h6.832v14.245h2.876V324.05h5.406v24.831h2.999V324.05h6.465v14.245h2.875V324.05h6.829v14.245h2.876V324.05h7.295v14.245h2.875
		V324.05h6.83v14.245h2.875V324.05h6.77v24.831h2.998V324.05h5.593v14.245h2.872V324.05h6.833v14.245h2.872V324.05h7.302v14.245
		h2.874V324.05h6.832v14.245h2.875V324.05h5.396v24.831h2.998V324.05h18.35v14.725c0,14.653,7.048,27.639,17.903,35.842H12.355
		V374.61z M321.348,155.627c31.026,0,56.188,25.152,56.188,56.178c0,31.029-25.162,56.178-56.188,56.178
		s-56.174-25.149-56.174-56.178C265.174,180.779,290.322,155.627,321.348,155.627z M241.578,342.895h-6.367V324.05h6.367V342.895z
		 M404.5,342.895H250.565v-25.466H404.5V342.895z M365.627,105.459l6.577-14.29c2.06,0.95,50.534,23.674,63.406,65.51l-15.043,4.627
		C409.797,126.258,366.065,105.667,365.627,105.459z M447.467,331.54c-11.732-5.953-21.297-21.214-26.118-41.1V232.06
		c4.757-19.633,14.136-34.764,25.665-40.875c0.285,1.069,0.453,2.186,0.453,3.346V331.54z M434.095,234.648
		c-6.327,0-9.74,13.312-9.74,25.844c0,12.524,3.413,25.845,9.74,25.845c6.312,0,9.729-13.32,9.729-25.845
		C443.825,247.967,440.408,234.648,434.095,234.648z M434.095,284.087c-3.548,0-7.499-9.69-7.499-23.589
		c0-13.91,3.951-23.597,7.499-23.597c3.533,0,7.483,9.687,7.483,23.597C441.579,274.396,437.628,284.087,434.095,284.087z
		M435.178,242.439c0.239,0.23,2.441,2.496,3.577,11.07l-2.228,0.301c-1.022-7.704-2.895-9.729-2.905-9.739L435.178,242.439z
		M298.508,211.805c0-12.613,10.221-22.846,22.84-22.846c12.621,0,22.852,10.232,22.852,22.846c0,12.619-10.23,22.848-22.852,22.848
		C308.729,234.648,298.508,224.424,298.508,211.805z" />
    </svg>
  )
}

/* Lightweight, honest FAQ assistant — clearly automated, answers the real
   policies used across the site, and hands off to a human for anything else. */
const QUICK = [
  { id: 'shipping', label: 'Shipping & delivery' },
  { id: 'bulk', label: 'Bulk & trade pricing' },
  { id: 'returns', label: 'Returns policy' },
  { id: 'track', label: 'Track my order' },
  { id: 'human', label: 'Talk to a human' },
]

const RESPONSES = {
  shipping: { text: 'We dispatch in 1–2 business days and deliver to 3,600+ postcodes across Australia — most orders arrive within 3–5 business days. Orders over $100 ship free.', cta: { label: 'Shipping info', path: '/shipping' } },
  returns: { text: 'Easy 30-day returns on unused, unopened items. Faulty or damaged items are replaced free — just get in touch with photos within 2 days of delivery.', cta: { label: 'Returns policy', path: '/returns' } },
  bulk: { text: 'Volume discounts apply automatically — 5% off 2–5 units, 10% off 6–9, 15% off 10+. For larger trade orders our team can put together custom pricing.', cta: { label: 'Bulk & trade pricing', path: '/bulk' } },
  track: { text: "I can't pull live tracking in here, but you'll get a tracking link by email the moment your order ships — check your inbox (and spam folder!)." },
  human: { text: 'Of course! Call us on 1300 183 481 (Mon–Fri, 9am–5pm AEST) or email info@mytapestore.com.au — a real person will get back to you.', cta: { label: 'Contact us', path: '/contact' } },
  price: { text: "Found a stocked line cheaper elsewhere? We'll match it — just send us the link. That's our lowest-price guarantee." },
  hours: { text: "Our team's here Mon–Fri, 9am–5pm AEST. Outside those hours I'm still around for quick questions." },
  default: { text: "I might not have that one memorised. For anything specific, call 1300 183 481 or email info@mytapestore.com.au and our team will sort you out.", cta: { label: 'Contact us', path: '/contact' } },
}

function matchKeyword(text) {
  const t = text.toLowerCase()
  if (/ship|deliver|dispatch|postcode/.test(t)) return 'shipping'
  if (/return|refund|exchange|faulty|damage/.test(t)) return 'returns'
  if (/bulk|trade|wholesale|volume/.test(t)) return 'bulk'
  if (/track|order status|where.*order|my order/.test(t)) return 'track'
  if (/human|agent|person|call|phone|speak|real/.test(t)) return 'human'
  if (/price match|cheaper|lowest price|beat.*price|guarantee/.test(t)) return 'price'
  if (/hour|open|closed|when.*(open|available)/.test(t)) return 'hours'
  return 'default'
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [greeted, setGreeted] = useState(false)
  const [teaser, setTeaser] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const listRef = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => setTeaser(true), 7000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!open || greeted) return
    setGreeted(true)
    setTyping(true)
    const t = setTimeout(() => {
      setTyping(false)
      setMessages((m) => [...m, { id: 0, from: 'bot', text: "Hi, I'm the My Tape Store assistant 👋 I can help with shipping, returns, bulk pricing or finding the right tape. What do you need?" }])
    }, 650)
    return () => clearTimeout(t)
  }, [open, greeted])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  const respond = (key) => {
    setTyping(true)
    const delay = 500 + Math.random() * 500
    setTimeout(() => {
      setTyping(false)
      const r = RESPONSES[key] || RESPONSES.default
      setMessages((m) => [...m, { id: m.length, from: 'bot', text: r.text, cta: r.cta }])
    }, delay)
  }

  const openChat = () => { setOpen(true); setTeaser(false) }

  const sendQuick = (q) => {
    setMessages((m) => [...m, { id: m.length, from: 'user', text: q.label }])
    respond(q.id)
  }

  const sendText = (e) => {
    e.preventDefault()
    const t = input.trim()
    if (!t) return
    setMessages((m) => [...m, { id: m.length, from: 'user', text: t }])
    setInput('')
    respond(matchKeyword(t))
  }

  const goCta = (e, path) => { e.preventDefault(); setOpen(false); navigate(path) }

  return (
    <div className="chatw">
      {!open && teaser && (
        <div className="chatw__teaser" onClick={openChat} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && openChat()}>
          <span>👋 Need help choosing a tape?</span>
          <button className="chatw__teaser-x" aria-label="Dismiss" onClick={(e) => { e.stopPropagation(); setTeaser(false) }}>
            <Icon name="close" size={13} />
          </button>
        </div>
      )}

      {!open && (
        <button className="chatw__launch" onClick={openChat} aria-label="Open chat assistant">
          <TapeMeasureIcon size={25} />
          {teaser && <span className="chatw__ping" />}
        </button>
      )}

      {open && (
        <div className="chatw__panel" role="dialog" aria-label="Chat with My Tape Store">
          <div className="chatw__head">
            <span className="chatw__avatar"><TapeMeasureIcon size={18} /></span>
            <div className="chatw__head-info">
              <b>My Tape Store</b>
              <span><em className="chatw__dot" />Automated assistant · instant replies</span>
            </div>
            <button className="chatw__close" onClick={() => setOpen(false)} aria-label="Close chat"><Icon name="close" size={18} /></button>
          </div>

          <div className="chatw__list" ref={listRef}>
            {messages.map((m) => (
              <div key={m.id} className={'chatw__row chatw__row--' + m.from}>
                <div className="chatw__msg">
                  <p>{m.text}</p>
                  {m.cta && <a href={'#' + m.cta.path} className="chatw__cta" onClick={(e) => goCta(e, m.cta.path)}>{m.cta.label} <Icon name="arrowRight" size={13} /></a>}
                </div>
              </div>
            ))}
            {typing && (
              <div className="chatw__row chatw__row--bot">
                <div className="chatw__msg chatw__typing"><span /><span /><span /></div>
              </div>
            )}
          </div>

          {messages.length < 6 && (
            <div className="chatw__quick">
              {QUICK.map((q) => <button key={q.id} onClick={() => sendQuick(q)}>{q.label}</button>)}
            </div>
          )}

          <form className="chatw__form" onSubmit={sendText}>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message…" aria-label="Message" />
            <button type="submit" aria-label="Send message" disabled={!input.trim()}><Icon name="send" size={16} /></button>
          </form>
        </div>
      )}
    </div>
  )
}
