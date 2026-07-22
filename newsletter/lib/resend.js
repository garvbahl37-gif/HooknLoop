import { Resend } from 'resend'
const client = () => new Resend(process.env.RESEND_API_KEY)
const seg = () => process.env.RESEND_SEGMENT_ID
const from = () => process.env.FROM_EMAIL || 'onboarding@resend.dev'

export async function addContact(email, { firstName = '', active = true } = {}) {
  await client().contacts.create({ email, firstName, unsubscribed: !active, segments: [seg()] })
}
export async function setSubscribed(email, value) {
  await client().contacts.update({ email, segments: [seg()], unsubscribed: !value })
}
export async function listContacts() {
  const res = await client().contacts.list({ segmentId: seg(), limit: 100 })
  const rows = res.data?.data ?? []
  return rows.map(c => ({ email: c.email, status: c.unsubscribed ? 'pending' : 'confirmed', createdAt: c.created_at }))
}
export async function sendBroadcast({ subject, html, text }, { toTestOnly } = {}) {
  if (toTestOnly) {
    const r = await client().emails.send({ from: from(), to: process.env.TEST_RECIPIENT, subject: `[TEST] ${subject}`, html, text })
    return { id: r.data?.id }
  }
  const r = await client().broadcasts.create({ name: subject, from: from(), subject, html, text, segmentId: seg(), send: true })
  return { id: r.data?.id }
}
