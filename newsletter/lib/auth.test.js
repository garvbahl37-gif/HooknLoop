import { describe, it, expect, beforeAll } from 'vitest'
import { sign, verify, isValidSession, sessionCookie } from './auth.js'
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
  })
})
