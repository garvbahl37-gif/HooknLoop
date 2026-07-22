import { generateDraftCopy } from '../../../lib/gemini.js'
import { getProducts } from '../../../lib/shopify.js'
import { requireSession } from '../../../lib/session.js'
export const runtime = 'nodejs'

// Generates fresh subject + intro copy for the given spotlight product. The dashboard
// holds the draft, so no server-side draft state is required (works without KV).
export async function POST(request) {
  const denied = requireSession(request); if (denied) return denied
  const body = await request.json().catch(() => ({}))
  const products = await getProducts()
  const product = products.find(p => p.id === body.spotlightId) || products[0]
  try {
    const { subject, news } = await generateDraftCopy({ product, weekLabel: body.weekOf })
    if (!subject && !news) return Response.json({ error: 'empty' }, { status: 502 })
    return Response.json({ ok: true, subject, news })
  } catch (e) {
    console.error('generate-ai', e.message)
    return Response.json({ error: 'AI generation failed' }, { status: 502 })
  }
}
