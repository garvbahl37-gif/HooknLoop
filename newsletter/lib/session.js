import { isValidSession } from './auth.js'
export const COOKIE = 'nl_session'
export function requireSession(request) {
  const c = request.cookies?.get?.(COOKIE)?.value || parseCookie(request.headers.get('cookie'))[COOKIE]
  if (!isValidSession(c)) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  return null
}
function parseCookie(str) {
  return Object.fromEntries((str || '').split(';').map(p => p.trim().split('=').map(decodeURIComponent)).filter(a => a[0]))
}
