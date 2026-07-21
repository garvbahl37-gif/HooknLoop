/*  Shared fractional star rating. Burnt-ink fill (#b8460a) passes the 3:1 graphic
    contrast minimum on white; empty is a muted slate. Gradient ids are made unique
    per instance with useId so partial stars never collide across the page.        */
import { useId } from 'react'

export default function Stars({ v = 5, size = 15 }) {
  const uid = useId()
  return (
    <span className="stars" role="img" aria-label={`Rated ${v} out of 5`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const pct = Math.max(0, Math.min(1, v - i)) * 100
        const solid = pct >= 100
        const gid = `${uid}-${i}`
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            {!solid && pct > 0 && (
              <defs><linearGradient id={gid}><stop offset={`${pct}%`} stopColor="#b8460a" /><stop offset="0%" stopColor="#d7deea" /></linearGradient></defs>
            )}
            <path d="M12 2l3 6.5 7 .6-5.3 4.6 1.6 6.8L12 17.5 5.7 20.5l1.6-6.8L2 9.1l7-.6L12 2Z"
                  fill={solid ? '#b8460a' : pct > 0 ? `url(#${gid})` : '#d7deea'} />
          </svg>
        )
      })}
    </span>
  )
}
