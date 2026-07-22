import { getMarketingCustomers } from '../../../../lib/shopify.js'
import { addContact } from '../../../../lib/resend.js'
import { requireSession } from '../../../../lib/session.js'
export const runtime = 'nodejs'
export async function POST(request) {
  const denied = requireSession(request); if (denied) return denied
  let synced = 0, skipped = 0
  try {
    const customers = await getMarketingCustomers()
    for (const c of customers) {
      try { await addContact(c.email, { firstName: c.firstName, active: true }); synced++ } catch { skipped++ }
    }
  } catch (e) { console.error('shopify sync', e); return Response.json({ error: 'shopify unavailable' }, { status: 502 }) }
  return Response.json({ synced, skipped })
}
