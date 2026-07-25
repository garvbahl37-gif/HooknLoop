/*  One flat, stroke-based icon set — 24×24, currentColor, 1.75 stroke.
    Utilitarian line icons suit the trade-supplier register.                    */
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round' }

const paths = {
  search: <><circle cx="11" cy="11" r="7" {...P} /><path d="M21 21l-4.3-4.3" {...P} /></>,
  cart: <><path d="M3 4h2l2.2 12.2a1.5 1.5 0 0 0 1.5 1.3h8.6a1.5 1.5 0 0 0 1.5-1.2L21 8H6" {...P} /><circle cx="9.5" cy="20.5" r="1.4" {...P} /><circle cx="18" cy="20.5" r="1.4" {...P} /></>,
  user: <><circle cx="12" cy="8" r="3.4" {...P} /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" {...P} /></>,
  heart: <path d="M12 20.5S3.5 15 3.5 8.9A4.4 4.4 0 0 1 12 6.9a4.4 4.4 0 0 1 8.5 2c0 6.1-8.5 11.6-8.5 11.6z" {...P} />,
  phone: <path d="M4 5c0 8.3 6.7 15 15 15l1.5-3.2-4-1.8-1.7 1.7a11.7 11.7 0 0 1-5.2-5.2l1.7-1.7-1.8-4L6 4A2 2 0 0 0 4 5z" {...P} />,
  truck: <><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" {...P} /><path d="M15 18H9" {...P} /><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" {...P} /><circle cx="17" cy="18" r="2" {...P} /><circle cx="7" cy="18" r="2" {...P} /></>,
  badgeCheck: <><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" {...P} /><path d="m9 12 2 2 4-4" {...P} /></>,
  mapPin: <><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" {...P} /><circle cx="12" cy="10" r="3" {...P} /></>,
  australia: <><path d="M2 11C2 8 4 6 7 5.3C9 4.8 10.5 5 11 6.5L13 10L14 5.5C15 5 16 5.5 16.5 7C19 8.5 21 11 21 14C21 16.5 19.5 18.5 17 19C13 19.8 9 19.5 6 17.5C3.5 16 2 13.5 2 11Z" {...P} /><circle cx="11.5" cy="12.3" r="1.1" fill="currentColor" stroke="none" /></>,
  card: <><rect x="2" y="5" width="20" height="14" rx="2" {...P} /><path d="M2 10h20" {...P} /></>,
  shield: <path d="M12 3l7 2.5v5c0 5-3.4 8.6-7 10-3.6-1.4-7-5-7-10v-5z" {...P} />,
  shieldCheck: <><path d="M12 3l7 2.5v5c0 5-3.4 8.6-7 10-3.6-1.4-7-5-7-10v-5z" {...P} /><path d="M9 11.5l2 2 4-4" {...P} /></>,
  warehouse: <><path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z" {...P} /><path d="M6 18h12" {...P} /><path d="M6 14h12" {...P} /><rect width="12" height="12" x="6" y="10" {...P} /></>,
  lock: <><rect x="5" y="10.5" width="14" height="9.5" rx="1.5" {...P} /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" {...P} /></>,
  medal: <><circle cx="12" cy="10" r="5" {...P} /><path d="M9 14l-2 7 5-3 5 3-2-7" {...P} /></>,
  flag: <><path d="M5 21V4" {...P} /><path d="M5 4h13l-3 4 3 4H5" {...P} /></>,
  ruler: <><rect x="2.5" y="8" width="19" height="8" rx="1" transform="rotate(0)" {...P} /><path d="M7 8v3M11 8v4M15 8v3M19 8v4" {...P} /></>,
  check: <path d="M4 12.5l5 5 11-11" {...P} />,
  chevronDown: <path d="M6 9l6 6 6-6" {...P} />,
  chevronRight: <path d="M9 6l6 6-6 6" {...P} />,
  arrowRight: <><path d="M4 12h16" {...P} /><path d="M14 6l6 6-6 6" {...P} /></>,
  menu: <path d="M3 6h18M3 12h18M3 18h18" {...P} />,
  close: <path d="M5 5l14 14M19 5L5 19" {...P} />,
  star: <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" fill="currentColor" stroke="none" />,
  starHalf: <><defs><linearGradient id="sh"><stop offset="50%" stopColor="currentColor" /><stop offset="50%" stopColor="transparent" /></linearGradient></defs><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" fill="url(#sh)" stroke="currentColor" strokeWidth="1" /></>,
  scissors: <><circle cx="6" cy="7" r="2.2" {...P} /><circle cx="6" cy="17" r="2.2" {...P} /><path d="M8 8.5L20 17M8 15.5L20 7M8.5 12l3 1.6" {...P} /></>,
  tag: <><path d="M3 11.5V4.5A1.5 1.5 0 0 1 4.5 3h7l9.5 9.5a1.5 1.5 0 0 1 0 2.1l-6.4 6.4a1.5 1.5 0 0 1-2.1 0z" {...P} /><circle cx="7.5" cy="7.5" r="1.3" fill="currentColor" stroke="none" /></>,
  layers: <><path d="M12 3l9 5-9 5-9-5z" {...P} /><path d="M3 13l9 5 9-5" {...P} /></>,
  grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="1" {...P} /><rect x="13.5" y="3.5" width="7" height="7" rx="1" {...P} /><rect x="3.5" y="13.5" width="7" height="7" rx="1" {...P} /><rect x="13.5" y="13.5" width="7" height="7" rx="1" {...P} /></>,
  factory: <><path d="M3 21V10l6 4V10l6 4V6l6 3v12z" {...P} /><path d="M3 21h18" {...P} /></>,
  refresh: <><path d="M4 12a8 8 0 0 1 13.7-5.6L21 9" {...P} /><path d="M21 4v5h-5" {...P} /><path d="M20 12a8 8 0 0 1-13.7 5.6L3 15" {...P} /><path d="M3 20v-5h5" {...P} /></>,
  pin: <><path d="M12 21s7-6.4 7-11a7 7 0 1 0-14 0c0 4.6 7 11 7 11z" {...P} /><circle cx="12" cy="10" r="2.5" {...P} /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="1.5" {...P} /><path d="M3.5 6.5L12 13l8.5-6.5" {...P} /></>,
  clock: <><circle cx="12" cy="12" r="8.5" {...P} /><path d="M12 7v5l3.5 2" {...P} /></>,
  minus: <path d="M5 12h14" {...P} />,
  plus: <path d="M12 5v14M5 12h14" {...P} />,
  spool: <><rect x="4" y="4" width="16" height="16" rx="2" {...P} /><circle cx="12" cy="12" r="4.5" {...P} /><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" /></>,
  facebook: <path d="M15 8.5h2.2V5.5H15c-2 0-3.2 1.3-3.2 3.3V10.5H9.6v3h2.2V21h3v-7.5h2.3l.4-3h-2.7V9c0-.4.2-.5.6-.5z" fill="currentColor" stroke="none" />,
  instagram: <><rect x="3.5" y="3.5" width="17" height="17" rx="4.5" {...P} /><circle cx="12" cy="12" r="4" {...P} /><circle cx="17" cy="7" r="1.05" fill="currentColor" stroke="none" /></>,
  youtube: <><rect x="2.5" y="5.5" width="19" height="13" rx="4" {...P} /><path d="M10.5 9.2l5 2.8-5 2.8z" fill="currentColor" stroke="none" /></>,
  x: <path d="M5 4l14 16M19 4 5 20" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />,
  chat: <path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" {...P} />,
  send: <><path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" {...P} /><path d="m21.854 2.147-10.94 10.939" {...P} /></>,
  linkedin: <><path d="M16 8.3a5.7 5.7 0 0 1 5.5 5.7V21h-3.2v-6.6a2.3 2.3 0 0 0-4.6 0V21h-3.2V8.7h3.2v1.5A4.6 4.6 0 0 1 16 8.3z" {...P} /><rect x="3.2" y="8.7" width="3.2" height="12.3" {...P} /><circle cx="4.8" cy="4.6" r="1.9" {...P} /></>,
}

export default function Icon({ name, size = 20, className = '', title }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}
      role={title ? 'img' : 'presentation'} aria-label={title} aria-hidden={title ? undefined : true}>
      {paths[name] || null}
    </svg>
  )
}
