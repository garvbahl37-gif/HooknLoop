import Icon from './Icon.jsx'

/* Compact trust / capability bar. Sits under the hero. */
const items = [
  ['pin', '3,600+', 'AU postcodes served'],
  ['truck', '2–3 days', 'Typical delivery time'],
  ['medal', 'Lowest price', 'Price-match guarantee'],
  ['factory', 'Trade accounts', 'Volume pricing for business'],
]
export default function TrustStrip() {
  return (
    <div className="trust">
      <div className="wrap trust__row">
        {items.map(([icon, big, small]) => (
          <div key={small} className="trust__item">
            <Icon name={icon} size={24} />
            <div><b>{big}</b><span>{small}</span></div>
          </div>
        ))}
      </div>
    </div>
  )
}
