import { listContacts } from '../../../lib/resend.js'
import { requireSession } from '../../../lib/session.js'
export const runtime = 'nodejs'
export async function GET(request) {
  const denied = requireSession(request); if (denied) return denied
  const contacts = await listContacts()
  return Response.json({ count: contacts.length, contacts })
}
