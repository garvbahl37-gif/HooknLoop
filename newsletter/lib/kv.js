import { kv } from '@vercel/kv'
const KEY = 'draft:current'
export async function getDraft() { return (await kv.get(KEY)) ?? null }
export async function saveDraft(draft) { await kv.set(KEY, draft) }

// Fixed-window rate limit. Returns true if the action is allowed, false if the
// caller is over `limit` within `windowSeconds`. Fails OPEN if KV is unavailable
// (e.g. local demo with no KV configured) so subscriptions still work — logged.
export async function rateLimit(key, limit, windowSeconds) {
  try {
    const k = `rl:${key}`
    const n = await kv.incr(k)
    if (n === 1) await kv.expire(k, windowSeconds)
    return n <= limit
  } catch (e) {
    console.warn('rateLimit: KV unavailable, allowing', e?.message)
    return true
  }
}
