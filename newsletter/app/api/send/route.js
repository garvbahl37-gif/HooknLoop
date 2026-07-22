import { saveDraft } from '../../../lib/kv.js'
import { getProducts } from '../../../lib/shopify.js'
import { render } from '../../../lib/newsletter.js'
import { sendBroadcast } from '../../../lib/resend.js'
import { requireSession } from '../../../lib/session.js'
export const runtime = 'nodejs'

// The dashboard posts the exact draft it's showing, so sending doesn't depend on
// server-side KV state (which is best-effort until a KV store is attached).
export async function POST(request) {
  const denied = requireSession(request); if (denied) return denied
  const { mode, draft } = await request.json().catch(() => ({}))
  if (!draft || !draft.subject) return Response.json({ error: 'no draft' }, { status: 400 })
  const rendered = render(draft, await getProducts())
  try {
    const { id } = await sendBroadcast(rendered, { toTestOnly: mode !== 'live' })
    if (mode === 'live') { try { await saveDraft({ ...draft, status: 'sent', updatedAt: Date.now() }) } catch { /* best-effort */ } }
    return Response.json({ ok: true, id })
  } catch (e) {
    console.error('send', e.message)
    return Response.json({ error: 'send failed' }, { status: 502 })
  }
}
