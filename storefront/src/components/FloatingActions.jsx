/*  FloatingActions — clean icon buttons: call (bottom-left) · chat (bottom-right).
    Chat opens a branded panel; both are circular icon-only with a hover tooltip.
    Both retire once the footer is on screen so they never cover it.             */
import { useState } from 'react'
import { navigate } from '../lib/cart.js'
import { useInView } from '../lib/useInView.js'

const finder = () => { navigate(''); setTimeout(() => document.getElementById('tape-finder')?.scrollIntoView({ behavior: 'smooth' }), 100) }

/* each quick reply does something real rather than sitting dead */
const QUICK = [
  ['Which tape do I need?', finder],
  ['Bulk & trade pricing', () => navigate('bulk')],
  ['Track my order', () => navigate('contact')],
  ['Fire-retardant specs', () => navigate('collection/fire-retardant')],
]

export default function FloatingActions() {
  const [chat, setChat] = useState(false)
  const [msg, setMsg] = useState('')
  const [sent, setSent] = useState(false)
  const atFooter = useInView('.ft')
  const parked = atFooter && !chat

  const send = (e) => {
    e.preventDefault()
    if (!msg.trim()) return
    setSent(true); setMsg('')
  }

  return (
    <>
      {/* bottom-left: call — clean icon */}
      <a className={`fab fab--call ${parked ? 'is-parked' : ''}`} href="tel:1300183481" aria-label="Call us on 1300 183 481" tabIndex={parked ? -1 : 0}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 12l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 2 6a2 2 0 0 1 2-2Z"/></svg>
        <span className="fab__tip fab__tip--left">Call 1300 183 481</span>
      </a>

      {/* bottom-right: chat — clean icon */}
      <div className={`fabchat ${parked ? 'is-parked' : ''}`}>
        {chat && (
          <div className="chatp" role="dialog" aria-label="Chat with HooknLoop">
            <div className="chatp__head">
              <div className="chatp__id">
                <span className="chatp__logo">HL</span>
                <div>
                  <span className="chatp__name">HooknLoop Support</span>
                  <span className="chatp__status"><span className="chatp__dot" aria-hidden="true" /> Online · replies in minutes</span>
                </div>
              </div>
              <button className="chatp__close" onClick={() => setChat(false)} aria-label="Close chat">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 6l12 12M18 6 6 18"/></svg>
              </button>
            </div>
            <div className="chatp__body">
              <div className="chatp__msg">G’day! Not sure which hook &amp; loop you need, or after bulk pricing? Ask us — we hold stock and ship Australia-wide.</div>
              {sent
                ? <div className="chatp__msg chatp__msg--ok">Thanks — we’ve got your message. A real person in Australia will reply shortly. In a hurry? Call <a href="tel:1300183481">1300 183 481</a>.</div>
                : <div className="chatp__quick">{QUICK.map(([label, fn]) => (
                    <button key={label} className="chatp__chip" onClick={() => { fn(); setChat(false) }}>{label}</button>
                  ))}</div>}
            </div>
            <form className="chatp__input" onSubmit={send}>
              <input type="text" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Type your message…" aria-label="Type your message" />
              <button type="submit" className="chatp__send" aria-label="Send"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M4 12 20 4l-6 16-2.5-6.5L4 12Z"/></svg></button>
            </form>
          </div>
        )}
        <button className={`fab fab--chat ${chat ? 'is-open' : ''}`} onClick={() => setChat((v) => !v)} aria-expanded={chat} aria-label={chat ? 'Close chat' : 'Chat with us'}>
          {chat
            ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 6l12 12M18 6 6 18"/></svg>
            : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.5A8 8 0 1 1 21 12Z"/></svg>}
          {!chat && <span className="fab__online" aria-hidden="true" />}
          {!chat && <span className="fab__tip fab__tip--right">Chat with us</span>}
        </button>
      </div>
    </>
  )
}
