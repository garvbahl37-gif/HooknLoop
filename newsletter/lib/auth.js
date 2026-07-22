import crypto from 'node:crypto'
const secret = () => process.env.NEWSLETTER_SECRET || ''
export function sign(value) {
  return crypto.createHmac('sha256', secret()).update(String(value)).digest('hex')
}
export function verify(value, sig) {
  if (!sig) return false
  const expected = sign(value)
  const a = Buffer.from(expected), b = Buffer.from(String(sig))
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
export function sessionCookie() { return `owner.${sign('owner')}` }
export function isValidSession(cookieValue) {
  if (!cookieValue?.startsWith('owner.')) return false
  return verify('owner', cookieValue.slice('owner.'.length))
}
