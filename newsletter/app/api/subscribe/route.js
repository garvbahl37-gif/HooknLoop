import { Resend } from 'resend'
import { addContact } from '../../../lib/resend.js'
import { sign } from '../../../lib/auth.js'
export const runtime = 'nodejs'
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
function cors() {
  return { 'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }
}
export async function OPTIONS() { return new Response(null, { status: 204, headers: cors() }) }
export async function POST(request) {
  const { email } = await request.json().catch(() => ({}))
  if (!email || !EMAIL_RE.test(email)) return Response.json({ error: 'invalid' }, { status: 400, headers: cors() })
  try {
    await addContact(email, { active: false })
    const link = `${process.env.PUBLIC_BASE_URL}/api/confirm?email=${encodeURIComponent(email)}&sig=${sign(email)}`
    await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: process.env.FROM_EMAIL || 'onboarding@resend.dev', to: email,
      subject: 'Confirm your HooknLoop subscription',
      html: `<p>Tap to confirm you want HooknLoop trade tips &amp; price drops:</p><p><a href="${link}">Confirm subscription</a></p>`,
    })
  } catch (e) { console.error('subscribe', e) /* still generic 200: no enumeration */ }
  return Response.json({ ok: true }, { headers: cors() })
}
