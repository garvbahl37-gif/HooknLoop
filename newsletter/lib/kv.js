import { kv } from '@vercel/kv'
const KEY = 'draft:current'

// Fall back to an in-memory store when Vercel KV isn't configured yet, so the app
// deploys and the dashboard loads before a KV store is attached. NOTE: in-memory is
// per-instance and NOT durable across serverless invocations — attach Vercel KV
// (Storage → Redis) for real persistence. Detected via the KV connection env vars.
const configured = () => !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
const mem = new Map()

export async function getDraft() {
  if (!configured()) return mem.get(KEY) ?? null
  return (await kv.get(KEY)) ?? null
}
export async function saveDraft(draft) {
  if (!configured()) { mem.set(KEY, draft); return }
  await kv.set(KEY, draft)
}

// Fixed-window rate limit. True = allowed. Without KV there is no shared counter,
// so it fails open (logged) — attach KV to actually throttle abuse.
export async function rateLimit(key, limit, windowSeconds) {
  if (!configured()) return true
  try {
    const k = `rl:${key}`
    const n = await kv.incr(k)
    if (n === 1) await kv.expire(k, windowSeconds)
    return n <= limit
  } catch (e) {
    console.warn('rateLimit: KV error, allowing', e?.message)
    return true
  }
}
