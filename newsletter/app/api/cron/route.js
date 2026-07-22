import { Resend } from 'resend'
import { getProducts } from '../../../lib/shopify.js'
import { build } from '../../../lib/newsletter.js'
import { getDraft, saveDraft } from '../../../lib/kv.js'
import { isoWeek } from '../../../lib/week.js'
export const runtime = 'nodejs'
export async function GET(request) {
  // Fail closed: with no CRON_SECRET, `Bearer undefined` would otherwise be accepted.
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`)
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  const weekOf = new Date().toISOString().slice(0, 10)
  const existing = await getDraft()
  if (existing && existing.weekOf === weekOf && existing.status !== 'sent')
    return Response.json({ ok: true, note: 'draft already exists' })
  const draft = { ...build(await getProducts(), isoWeek()), weekOf, status: 'draft', updatedAt: Date.now() }
  await saveDraft(draft)
  try {
    await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: process.env.FROM_EMAIL || 'onboarding@resend.dev', to: process.env.OWNER_EMAIL,
      subject: 'This week’s HooknLoop newsletter is ready',
      html: `<p>Your draft is built. <a href="${process.env.PUBLIC_BASE_URL}/">Open the dashboard</a> to review and send.</p>`,
    })
  } catch (e) { console.error('cron notice', e) }
  return Response.json({ ok: true, saved: true })
}
