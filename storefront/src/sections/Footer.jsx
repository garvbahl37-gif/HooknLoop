/*  Footer — premium newsletter (fills the store's dead empty blue band) + full
    footer with a facilities strip, real contact/ABN, and payment badges
    (Discover excluded — irrelevant in Australia).                               */
import { useState } from 'react'
import { navigate } from '../lib/cart.js'

const go = (to, fn) => (e) => { e.preventDefault(); if (fn) fn(); else navigate(to) }

const SHOP = [['Self-Adhesive Roll', 'product/self-adhesive-roll'], ['Heavy-Duty Adhesive', 'product/heavy-duty-adhesive'], ['VELCRO® Brand Roll', 'product/velcro-brand-roll'], ['Sew-On Hook & Loop', 'product/sew-on'], ['Hook & Loop Dots', 'product/hook-and-loop-dots'], ['Reusable Cable Straps', 'product/reusable-cable-straps']]
const HELP = [['Browse all products', 'collection'], ['Bulk & trade quotes', 'bulk'], ['Shipping & delivery', 'shipping'], ['Returns & exchanges', 'returns'], ['Contact us', 'contact'], ['About us', 'about']]

export default function Footer() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  async function handleSubscribe(e) {
    e.preventDefault()
    setError('')
    const email = e.target.querySelector('input[type=email]').value
    try {
      const base = import.meta.env.VITE_NEWSLETTER_API || ''
      const r = await fetch(`${base}/api/subscribe`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
      })
      if (r.ok) setSent(true); else setError('Please check your email and try again.')
    } catch { setError('Something went wrong — please try again.') }
  }
  return (
    <footer className="ft">
      {/*  Four columns, one heading each. The newsletter lives inside the footer as
          the "Stay in touch" column; payment marks sit with the legal copy, where
          trust marks belong, rather than competing with the navigation.          */}
      <div className="wrap ft__main">
        <div className="ft__brand">
          <img className="ft__logo-img" src="/img/logo-footer.svg" alt="HooknLoop" width="389" height="69" />
          <p className="ft__tag">Industrial hook &amp; loop, dispatched fast across Australia.</p>
          <a className="ft__phone" href="tel:1300183481"><b>1300 183 481</b><span>Call our Australian team</span></a>
          <p className="ft__addr">Australian warehouse · Australia-wide dispatch</p>
          <p className="ft__abn">ABN 93 878 995 217</p>
        </div>

        <div className="ft__col">
          <h4>Shop tape</h4>
          <ul>{SHOP.map(([label, to]) => <li key={label}><a href="#" onClick={go(to)}>{label}</a></li>)}</ul>
        </div>

        <div className="ft__col">
          <h4>Help</h4>
          <ul>{HELP.map(([label, to, fn]) => <li key={label}><a href="#" onClick={go(to, fn)}>{label}</a></li>)}</ul>
        </div>

        <div className="ft__col ft__col--connect">
          <h4>Stay in touch</h4>
          <form className="ft__signup" onSubmit={handleSubscribe}>
            <p className="ft__signup-blurb">Trade tips &amp; bulk price drops. No spam — unsubscribe any time.</p>
            {sent ? (
              <p className="ft__signup-ok">✓ You’re on the list — check your inbox.</p>
            ) : (
              <>
                <div className="ft__signup-row">
                  <input type="email" required placeholder="you@company.com.au" aria-label="Email address" />
                  <button type="submit">Notify me</button>
                </div>
                {error && <p className="ft__signup-err" role="alert">{error}</p>}
              </>
            )}
          </form>
          <div className="ft__social" aria-label="Social links">
            <a href="#" className="ft__soc" aria-label="Facebook"><svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M14 9h3V6h-3c-1.9 0-3 1.4-3 3.2V11H9v3h2v6h3v-6h2.5l.5-3H14V9.4c0-.3.2-.4.5-.4Z"/></svg></a>
            <a href="#" className="ft__soc" aria-label="Instagram"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg></a>
            <a href="#" className="ft__soc" aria-label="LinkedIn"><svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M6.5 8.5A1.5 1.5 0 1 0 6.5 5.5a1.5 1.5 0 0 0 0 3ZM5 10h3v9H5v-9Zm5 0h2.8v1.3c.4-.8 1.4-1.5 2.7-1.5 2.3 0 3.5 1.4 3.5 4V19h-3v-4.6c0-1.2-.5-1.9-1.5-1.9s-1.5.7-1.5 1.9V19h-3v-9Z"/></svg></a>
          </div>
        </div>
      </div>

      <div className="ft__legal">
        <div className="wrap ft__legal-row">
          <span>© 2026 HooknLoop Australia · All rights reserved</span>
          <div className="ft__pay" aria-label="Accepted payment methods">
            {[['Visa', 'visa'], ['Mastercard', 'mastercard'], ['American Express', 'amex'], ['PayPal', 'paypal'], ['Discover', 'discover'], ['Shop Pay', 'shop-pay']].map(([label, file]) => (
              <img key={file} className="ft__paymark" src={`/img/pay/${file}.svg`} alt={label} width="38" height="24" loading="lazy" />
            ))}
          </div>
          <span className="ft__legal-links"><a href="#" onClick={go('privacy')}>Privacy</a><a href="#" onClick={go('terms')}>Terms</a><a href="#" onClick={go('shipping')}>Shipping</a><a href="#" onClick={go('returns')}>Returns</a></span>
        </div>
        <p className="wrap ft__velcro">VELCRO® is a registered trademark of Velcro IP Holdings LLC. HooknLoop stocks genuine VELCRO® Brand product; other products are our own brand.</p>
      </div>
    </footer>
  )
}
