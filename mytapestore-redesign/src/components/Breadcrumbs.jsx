import Icon from './Icon.jsx'
import { navigate } from '../lib/cart.js'

/* items: [{label, href}] — last item is the current page (no link). */
export default function Breadcrumbs({ items }) {
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      <ol>
        {items.map((it, i) => {
          const last = i === items.length - 1
          return (
            <li key={i}>
              {last || !it.href
                ? <span aria-current="page">{it.label}</span>
                : <a href={'#' + it.href} onClick={(e) => { e.preventDefault(); navigate(it.href) }}>{it.label}</a>}
              {!last && <Icon name="chevronRight" size={13} className="crumbs__sep" />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
