// Gemini draft-copy generator. Isolated here so the model/endpoint lives in one place.
const MODEL = 'gemini-2.5-flash'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

// Produces fresh, on-brand copy for the week's issue so no two newsletters read the same.
// Returns { subject, news }. Throws on auth/quota/network errors (caller maps to 502).
export async function generateDraftCopy({ product, weekLabel }) {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY not set')

  const p = product || {}
  const prompt = `You write the weekly email newsletter for HooknLoop, an Australian supplier of industrial
hook-and-loop (Velcro-style) tape, straps, dots and cable ties for trade and business customers.

Write copy for this week's issue (${weekLabel || 'this week'}). The spotlight product is:
"${p.title || 'hook & loop tape'}" — ${p.category || ''}, from $${p.price || ''}.${p.blurb ? ' ' + p.blurb : ''}
Common uses: ${(p.uses || []).join(', ') || 'mounting, bundling, fastening'}.

Return STRICT JSON only (no markdown fences, no extra text) with exactly these keys:
- "subject": an enticing email subject line under 58 characters, Australian English, no emoji,
  hinting at the value or the spotlight product. Vary it — make it feel fresh.
- "news": a warm, confident 2-3 sentence intro paragraph for the top of the email, in a practical
  trade voice. Reference something timely or useful about the spotlight product or the season.
  No greeting ("Hi there") and no sign-off. Plain text, no HTML.`

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 1.1, topP: 0.95, responseMimeType: 'application/json' },
    }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Gemini ${res.status}: ${detail.slice(0, 200)}`)
  }
  const data = await res.json()
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
  let parsed = {}
  try { parsed = JSON.parse(raw) } catch { /* leave empty; caller keeps existing copy */ }
  return { subject: (parsed.subject || '').trim(), news: (parsed.news || '').trim() }
}
