import crypto from 'node:crypto'
import { sessionCookie } from '../../../lib/auth.js'
import { COOKIE } from '../../../lib/session.js'
export const runtime = 'nodejs'

// Constant-time compare so login latency can't leak the password.
function safeEqual(a, b) {
  const ba = Buffer.from(String(a)), bb = Buffer.from(String(b))
  if (ba.length !== bb.length) return false
  return crypto.timingSafeEqual(ba, bb)
}

export async function POST(request) {
  const { password } = await request.json().catch(() => ({}))
  const expected = process.env.DASHBOARD_PASSWORD
  if (!expected || !password || !safeEqual(password, expected))
    return Response.json({ error: 'invalid' }, { status: 401 })
  const res = Response.json({ ok: true })
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  res.headers.append('Set-Cookie',
    `${COOKIE}=${sessionCookie()}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=2592000`)
  return res
}
