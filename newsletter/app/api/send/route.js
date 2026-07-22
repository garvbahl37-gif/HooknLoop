import { getDraft, saveDraft } from '../../../lib/kv.js'
import { getProducts } from '../../../lib/shopify.js'
import { render } from '../../../lib/newsletter.js'
import { sendBroadcast } from '../../../lib/resend.js'
import { requireSession } from '../../../lib/session.js'
export const runtime = 'nodejs'
export async function POST(request) {
  const denied = requireSession(request); if (denied) return denied
  const { mode } = await request.json().catch(() => ({}))
  const draft = await getDraft()
  if (!draft) return Response.json({ error: 'no draft' }, { status: 404 })
  if (mode === 'live' && draft.status === 'sent') return Response.json({ error: 'already sent' }, { status: 409 })
  const rendered = render(draft, await getProducts())
  try {
    const { id } = await sendBroadcast(rendered, { toTestOnly: mode !== 'live' })
    if (mode === 'live') await saveDraft({ ...draft, status: 'sent', updatedAt: Date.now() })
    return Response.json({ ok: true, id })
  } catch (e) { console.error('send', e); return Response.json({ error: 'send failed' }, { status: 502 }) }
}
