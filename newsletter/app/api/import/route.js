import Papa from 'papaparse'
import { addContact } from '../../../lib/resend.js'
import { requireSession } from '../../../lib/session.js'
export const runtime = 'nodejs'
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
export async function POST(request) {
  const denied = requireSession(request); if (denied) return denied
  const form = await request.formData()
  const file = form.get('file')
  if (!file) return Response.json({ error: 'no file' }, { status: 400 })
  const text = await file.text()
  const { data } = Papa.parse(text, { header: true, skipEmptyLines: true })
  let added = 0, skipped = 0, failed = 0
  for (const row of data) {
    const email = (row.email || row.Email || '').trim()
    if (!EMAIL_RE.test(email)) { skipped++; continue }
    try { await addContact(email, { firstName: row.first_name || '', active: true }); added++ }
    catch { failed++ }
  }
  return Response.json({ added, skipped, failed })
}
