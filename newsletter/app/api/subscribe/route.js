import { Resend } from 'resend'
import { addContact } from '../../../lib/resend.js'
import { signToken } from '../../../lib/auth.js'
import { rateLimit } from '../../../lib/kv.js'
export const runtime = 'nodejs'
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const CONFIRM_TTL = 60 * 60 * 24 * 7 // confirm links valid for 7 days

// CORS: only the configured storefront origin — never '*' on a POST that sends mail.
function cors() {
  const origin = process.env.ALLOWED_ORIGIN || ''
  return { 'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin' }
}
function clientIp(request) {
  return (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
}
export async function OPTIONS() { return new Response(null, { status: 204, headers: cors() }) }
export async function POST(request) {
  const { email } = await request.json().catch(() => ({}))
  if (!email || !EMAIL_RE.test(email)) return Response.json({ error: 'invalid' }, { status: 400, headers: cors() })

  // Anti-abuse: cap per IP (a source can't blast many addresses) and per email
  // (a victim can't be repeatedly mailbombed). Generic 200 either way — no enumeration.
  const ip = clientIp(request)
  const ipOk = await rateLimit(`sub:ip:${ip}`, 5, 3600)          // 5 / hour / IP
  const emailOk = await rateLimit(`sub:em:${email.toLowerCase()}`, 1, 600) // 1 / 10 min / email
  if (!ipOk || !emailOk) return Response.json({ ok: true }, { headers: cors() })

  try {
    await addContact(email, { active: false })
    const link = `${process.env.PUBLIC_BASE_URL}/api/confirm?email=${encodeURIComponent(email)}&sig=${signToken(email, CONFIRM_TTL)}`
    await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: process.env.FROM_EMAIL || 'onboarding@resend.dev', to: email,
      subject: 'Confirm your HooknLoop subscription',
      html: `<p>Tap to confirm you want HooknLoop trade tips &amp; price drops:</p><p><a href="${link}">Confirm subscription</a></p>`,
    })
  } catch (e) { console.error('subscribe', e) /* still generic 200: no enumeration */ }
  return Response.json({ ok: true }, { headers: cors() })
}
