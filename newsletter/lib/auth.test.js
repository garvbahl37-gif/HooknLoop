import { describe, it, expect, beforeAll } from 'vitest'
import { sign, verify, isValidSession, sessionCookie, signToken, verifyToken } from './auth.js'
beforeAll(() => { process.env.NEWSLETTER_SECRET = 'test-secret' })
describe('auth', () => {
  it('verifies a valid signature and rejects a tampered one', () => {
    const s = sign('a@b.com'); expect(verify('a@b.com', s)).toBe(true)
    expect(verify('a@b.com', s + '0')).toBe(false)
    expect(verify('x@b.com', s)).toBe(false)
  })
  it('round-trips a session cookie', () => {
    const c = sessionCookie(); expect(isValidSession(c)).toBe(true)
    expect(isValidSession('nope')).toBe(false)
    expect(isValidSession('owner.garbage')).toBe(false)
  })
  it('signToken round-trips and rejects expired / tampered tokens', () => {
    const t = signToken('user@x.com', 60)
    expect(verifyToken('user@x.com', t)).toBe(true)
    expect(verifyToken('other@x.com', t)).toBe(false)          // wrong value
    expect(verifyToken('user@x.com', signToken('user@x.com', -1))).toBe(false) // expired
  })
  it('fails closed when NEWSLETTER_SECRET is unset', () => {
    const saved = process.env.NEWSLETTER_SECRET
    delete process.env.NEWSLETTER_SECRET
    expect(verify('a', 'deadbeef')).toBe(false)
    expect(isValidSession('owner.1.abc')).toBe(false)
    expect(() => sign('a')).toThrow()
    process.env.NEWSLETTER_SECRET = saved
  })
})
