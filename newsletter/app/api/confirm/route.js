import { setSubscribed } from '../../../lib/resend.js'
import { verify } from '../../../lib/auth.js'
export const runtime = 'nodejs'
const page = (title, body) => new Response(
  `<!doctype html><meta charset=utf-8><body style="font:16px sans-serif;max-width:420px;margin:80px auto;text-align:center;color:#1b1f24">
   <h1 style="color:#0b2447">${title}</h1><p>${body}</p></body>`,
  { headers: { 'Content-Type': 'text/html' }, status: title.includes('✓') ? 200 : 400 })
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email'), sig = searchParams.get('sig')
  if (!email || !verify(email, sig)) return page('Invalid link', 'This confirmation link is not valid.')
  try { await setSubscribed(email, true) } catch (e) { console.error('confirm', e); return page('Something went wrong', 'Please try again later.') }
  return page('You&rsquo;re confirmed ✓', 'You&rsquo;ll get the HooknLoop weekly newsletter. Welcome aboard.')
}
