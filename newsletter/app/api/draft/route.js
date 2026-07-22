import { getDraft, saveDraft } from '../../../lib/kv.js'
import { getProducts } from '../../../lib/shopify.js'
import { build } from '../../../lib/newsletter.js'
import { isoWeek } from '../../../lib/week.js'
import { requireSession } from '../../../lib/session.js'
export const runtime = 'nodejs'
export async function GET(request) {
  const denied = requireSession(request); if (denied) return denied
  const products = await getProducts()
  let draft = await getDraft()
  if (!draft) { draft = { ...build(products, isoWeek()), weekOf: new Date().toISOString().slice(0,10), status: 'draft', updatedAt: Date.now() }; await saveDraft(draft) }
  return Response.json({ draft, products })
}
export async function PUT(request) {
  const denied = requireSession(request); if (denied) return denied
  const body = await request.json().catch(() => ({}))
  const current = (await getDraft()) || {}
  // The dashboard posts its full draft (template, product, offer fields, etc.).
  const next = { ...current, ...(body || {}), status: 'draft', updatedAt: Date.now() }
  await saveDraft(next)
  return Response.json({ ok: true, draft: next })
}
