import { kv } from '@vercel/kv'
const KEY = 'draft:current'
export async function getDraft() { return (await kv.get(KEY)) ?? null }
export async function saveDraft(draft) { await kv.set(KEY, draft) }
