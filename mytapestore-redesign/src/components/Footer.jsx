import { useState } from 'react'
import Icon from './Icon.jsx'
import { NAV_GROUPS, PRODUCT_CATEGORIES } from '../data/catalog.js'
import { navigate } from '../lib/cart.js'

const catName = Object.fromEntries(PRODUCT_CATEGORIES.map((c) => [c.slug, c.name]))
const go = (e, h) => { e.preventDefault(); navigate(h) }
const pay = ['visa', 'mastercard', 'amex', 'paypal', 'shop-pay', 'discover']
const social = [['Facebook', 'facebook'], ['Instagram', 'instagram'], ['YouTube', 'youtube'], ['X', 'x'], ['LinkedIn', 'linkedin']]

export default function Footer() {
  const popular = NAV_GROUPS['Single-Sided Tapes'].slice(0, 7)
  const [subscribed, setSubscribed] = useState(false)

  return (
    <footer className="ft grain">
      {/* main columns */}
      <div className="wrap ft-main">
        <div className="ft-col ft-col--brand">
          <a href="#/" onClick={(e) => go(e, '/')} className="ft-logo">
            <img src="/img/site/logo-light.png" alt="My Tape Store" className="ft-logo__img" width="188" height="32" />
          </a>
          <p className="ft-blurb">Australia's adhesive tape specialists. Double-sided, foam, duct, foil, hook &amp; loop, safety and packaging tapes — plus dispensers — direct to your doorstep, Australia-wide.</p>
          <ul className="ft-contact">
            <li><span className="ft-contact__ic"><Icon name="phone" size={16} /></span><a href="tel:1300183481">1300 183 481</a></li>
            <li><span className="ft-contact__ic"><Icon name="mail" size={16} /></span><a href="mailto:info@mytapestore.com.au">info@mytapestore.com.au</a></li>
            <li><span className="ft-contact__ic"><Icon name="clock" size={16} /></span><span>Mon–Fri · 9:00 AM – 5:00 PM AEST</span></li>
          </ul>
          <ul className="ft-social">
            {social.map(([label, icon]) => (
              <li key={label}><a href="#/" onClick={(e) => e.preventDefault()} aria-label={label}><Icon name={icon} size={18} /></a></li>
            ))}
          </ul>
        </div>

        <div className="ft-col">
          <h4>Shop tapes</h4>
          <ul>
            {popular.map((s) => <li key={s}><a href={'#/collection/' + s} onClick={(e) => go(e, '/collection/' + s)}>{catName[s]}</a></li>)}
            <li><a href="#/shop" onClick={(e) => go(e, '/shop')} className="ft-more">All products →</a></li>
          </ul>
        </div>

        <div className="ft-col">
          <h4>Information</h4>
          <ul>
            <li><a href="#/about" onClick={(e) => go(e, '/about')}>About us</a></li>
            <li><a href="#/shop" onClick={(e) => go(e, '/shop')}>Shop</a></li>
            <li><a href="#/collection/tapes-dispensers" onClick={(e) => go(e, '/collection/tapes-dispensers')}>Tape dispensers</a></li>
            <li><a href="#/industries" onClick={(e) => go(e, '/industries')}>Industries</a></li>
            <li><a href="#/bulk" onClick={(e) => go(e, '/bulk')}>Bulk &amp; trade</a></li>
            <li><a href="#/contact" onClick={(e) => go(e, '/contact')}>Contact us</a></li>
          </ul>
        </div>

        <div className="ft-col">
          <h4>Customer care</h4>
          <ul>
            <li><a href="#/shipping" onClick={(e) => go(e, '/shipping')}>Shipping &amp; delivery</a></li>
            <li><a href="#/returns" onClick={(e) => go(e, '/returns')}>Return policy</a></li>
            <li><a href="#/privacy" onClick={(e) => go(e, '/privacy')}>Privacy policy</a></li>
            <li><a href="#/terms" onClick={(e) => go(e, '/terms')}>Terms &amp; conditions</a></li>
            <li><a href="#/contact" onClick={(e) => go(e, '/contact')}>Customer service</a></li>
          </ul>
        </div>
      </div>

      {/* newsletter — compact box at the foot */}
      <div className="ft-signup">
        <div className="wrap">
          <div className="ft-signup__box">
            <div className="ft-signup__copy">
              <span className="ft-signup__badge"><Icon name="mail" size={14} /> Newsletter</span>
              <p className="ft-signup__title">Trade tips &amp; tape deals — no spam.</p>
            </div>
            {subscribed ? (
              <p className="ft-signup__done"><Icon name="check" size={17} /> You're subscribed!</p>
            ) : (
              <form className="ft-signup__form" onSubmit={(e) => { e.preventDefault(); setSubscribed(true) }}>
                <input type="email" required placeholder="Your email" aria-label="Email address" />
                <button className="btn btn--brand" type="submit">Subscribe</button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* payment + bottom */}
      <div className="ft-bottom">
        <div className="wrap ft-bottom__row">
          <p className="num">My Tape Store © {new Date().getFullYear()} · All rights reserved · ABN 93 878 995 217</p>
          <div className="ft-pay__marks">
            {pay.map((k) => <img key={k} src={'/img/pay/' + k + '.svg'} alt={k} height="24" />)}
          </div>
        </div>
      </div>
    </footer>
  )
}
