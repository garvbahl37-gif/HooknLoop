import Icon from './Icon.jsx'

/* Rating stars. rating 0–5; renders full/half/empty. count optional. */
export default function Stars({ rating = 0, count, size = 15, showCount = true }) {
  const r = Math.round(rating * 2) / 2
  return (
    <span className="stars" aria-label={`Rated ${rating} out of 5`}>
      <span className="stars__row" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => (
          <Icon key={i} name={r >= i ? 'star' : r >= i - 0.5 ? 'starHalf' : 'star'} size={size}
            className={r >= i - 0.5 ? 'stars__on' : 'stars__off'} />
        ))}
      </span>
      {showCount && count != null && (
        <span className="stars__count num">{count > 0 ? `(${count})` : 'No reviews yet'}</span>
      )}
    </span>
  )
}
