import crypto from 'node:crypto'

// Fail closed: with no secret the HMAC key would be empty/known and every token
// forgeable. Signing throws; verifying returns false. Never sign/verify with '' .
function secret() {
  const s = process.env.NEWSLETTER_SECRET
  if (!s) throw new Error('NEWSLETTER_SECRET is not configured')
  return s
}

export function sign(value) {
  return crypto.createHmac('sha256', secret()).update(String(value)).digest('hex')
}
export function verify(value, sig) {
  if (!sig || !process.env.NEWSLETTER_SECRET) return false
  let expected
  try { expected = sign(value) } catch { return false }
  const a = Buffer.from(expected), b = Buffer.from(String(sig))
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

// Expiring signed tokens: "<exp>.<hmac(value + '.' + exp)>". The expiry is part of
// the signed payload, so it is enforced server-side and cannot be extended by the
// client (unlike a cookie Max-Age).
export function signToken(value, ttlSeconds) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds
  return `${exp}.${sign(`${value}.${exp}`)}`
}
export function verifyToken(value, token) {
  if (typeof token !== 'string' || !token.includes('.')) return false
  const idx = token.indexOf('.')
  const exp = Number(token.slice(0, idx)), sig = token.slice(idx + 1)
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false
  return verify(`${value}.${exp}`, sig)
}

const SESSION_TTL = 60 * 60 * 24 * 30 // 30 days
export function sessionCookie() { return `owner.${signToken('owner', SESSION_TTL)}` }
export function isValidSession(cookieValue) {
  if (!cookieValue?.startsWith('owner.')) return false
  return verifyToken('owner', cookieValue.slice('owner.'.length))
}
