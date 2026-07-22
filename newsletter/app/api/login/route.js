import { sessionCookie } from '../../../lib/auth.js'
import { COOKIE } from '../../../lib/session.js'
export const runtime = 'nodejs'
export async function POST(request) {
  const { password } = await request.json().catch(() => ({}))
  if (!password || password !== process.env.DASHBOARD_PASSWORD)
    return Response.json({ error: 'invalid' }, { status: 401 })
  const res = Response.json({ ok: true })
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  res.headers.append('Set-Cookie',
    `${COOKIE}=${sessionCookie()}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=2592000`)
  return res
}
