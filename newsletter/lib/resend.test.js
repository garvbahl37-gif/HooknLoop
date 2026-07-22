import { describe, it, expect, vi, beforeEach } from 'vitest'
const create = vi.fn(async () => ({ data: { id: 'c1' } }))
const update = vi.fn(async () => ({ data: {} }))
const list = vi.fn(async () => ({ data: { data: [{ email: 'a@b.com', unsubscribed: true, created_at: '2026-07-01' }] } }))
const bcreate = vi.fn(async () => ({ data: { id: 'b1' } }))
const send = vi.fn(async () => ({ data: { id: 'e1' } }))
vi.mock('resend', () => ({ Resend: class { contacts = { create, update, list }; broadcasts = { create: bcreate }; emails = { send } } }))
beforeEach(() => { vi.clearAllMocks(); process.env.RESEND_SEGMENT_ID = 'seg_1'; process.env.TEST_RECIPIENT = 'garvbahl37@gmail.com'; process.env.FROM_EMAIL = 'onboarding@resend.dev' })

const load = async () => await import('./resend.js?' + Math.random())
describe('resend wrapper', () => {
  it('addContact(active:false) marks the contact unsubscribed (pending)', async () => {
    const { addContact } = await load(); await addContact('a@b.com', { active: false })
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ email: 'a@b.com', unsubscribed: true, segments: ['seg_1'] }))
  })
  it('listContacts maps unsubscribed→pending', async () => {
    const { listContacts } = await load(); const rows = await listContacts()
    expect(rows[0]).toEqual({ email: 'a@b.com', status: 'pending', createdAt: '2026-07-01' })
  })
  it('sendBroadcast test-only sends a single email to TEST_RECIPIENT and never a broadcast', async () => {
    const { sendBroadcast } = await load()
    await sendBroadcast({ subject: 'S', html: '<b>h</b>', text: 't' }, { toTestOnly: true })
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: 'garvbahl37@gmail.com' }))
    expect(bcreate).not.toHaveBeenCalled()
  })
})
