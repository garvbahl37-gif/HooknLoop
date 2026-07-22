import { describe, it, expect, vi } from 'vitest'
const store = new Map()
vi.mock('@vercel/kv', () => ({ kv: { get: async k => store.get(k) ?? null, set: async (k, v) => { store.set(k, v) } } }))
describe('kv', () => {
  it('saves and reads back the draft', async () => {
    const { getDraft, saveDraft } = await import('./kv.js')
    expect(await getDraft()).toBeNull()
    await saveDraft({ subject: 'S', status: 'draft' })
    expect((await getDraft()).subject).toBe('S')
  })
})
