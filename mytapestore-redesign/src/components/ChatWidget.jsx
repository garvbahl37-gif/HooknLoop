import { useState, useEffect, useRef } from 'react'
import Icon from './Icon.jsx'
import { navigate } from '../lib/cart.js'

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
  const [teaser, setTeaser] = useState(true)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const listRef = useRef(null)

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
          <Icon name="chat" size={23} />
          {teaser && <span className="chatw__ping" />}
        </button>
      )}

      {open && (
        <div className="chatw__panel" role="dialog" aria-label="Chat with My Tape Store">
          <div className="chatw__head">
            <span className="chatw__avatar"><Icon name="chat" size={17} /></span>
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
