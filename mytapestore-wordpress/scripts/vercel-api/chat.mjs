/**
 * Signing relay for the hosted preview's chat assistant.
 *
 * WHY THIS EXISTS
 *
 * The preview is WP Playground — WordPress compiled to WebAssembly, running
 * inside the visitor's own tab. There is no server: "wp-content" is a zip served
 * from a CDN, and anything defined in it is public. So the preview cannot hold
 * an API key, and the theme's normal arrangement (key in wp-config.php, PHP
 * calls Groq) has nowhere to put the secret.
 *
 * This is the smallest thing that closes that gap. It adds an Authorization
 * header and forwards the request. That is all it does.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 * No retrieval, no prompt, no price checking, no fallbacks. All of that stays in
 * the theme's chat-assistant.php and runs identically on a real WordPress and on
 * the preview. A relay that re-implemented any of it would be a second
 * assistant, and the two would drift apart the first time either was edited.
 *
 * IT IS PUBLIC, SO IT IS FENCED
 *
 * Anyone who finds this URL can spend the store's token allowance. There is no
 * user to authenticate — the preview is anonymous by design — so the limits here
 * are structural: only the two models the theme actually asks for, a hard token
 * ceiling, and a cap on how much text one call may carry. None of this stops a
 * determined abuser; it stops the request that costs 50x what a real one does,
 * which is what actually drains a free tier.
 *
 * Generated into build/deploy/api/ by scripts/deploy-demo.sh. The key is read
 * from the Vercel environment and never written into any deployed file.
 */

const GROQ = 'https://api.groq.com/openai/v1/chat/completions';

// Exactly the ladder in theme/inc/chat-assistant.php. An unlisted model is not
// a request this store makes.
const ALLOWED_MODELS = new Set(['openai/gpt-oss-120b', 'llama-3.1-8b-instant']);

const MAX_TOKENS = 500;      // matches the theme; a relay may lower, never raise
const MAX_MESSAGES = 12;     // system + 4 history turns + question, with slack
const MAX_CHARS = 12000;     // whole conversation, comfortably above a real one

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  // Never let a CDN or a browser reuse an answer for a different question.
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const key = process.env.GROQ_API_KEY;

  if (!key) {
    // The theme reads a failed call as "try the next rung, then fall back to the
    // scripted answers", so a missing key degrades instead of erroring at a
    // shopper.
    return res.status(503).json({ error: 'relay not configured' });
  }

  let body = req.body;

  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'malformed body' });
    }
  }

  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
    return res.status(400).json({ error: 'messages required' });
  }

  if (!ALLOWED_MODELS.has(body.model)) {
    return res.status(400).json({ error: 'model not allowed' });
  }

  if (body.messages.length > MAX_MESSAGES) {
    return res.status(400).json({ error: 'too many messages' });
  }

  const chars = body.messages.reduce(
    (n, m) => n + (typeof m?.content === 'string' ? m.content.length : 0),
    0
  );

  if (chars > MAX_CHARS) {
    return res.status(400).json({ error: 'conversation too large' });
  }

  try {
    const upstream = await fetch(GROQ, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: body.model,
        messages: body.messages,
        temperature: typeof body.temperature === 'number' ? body.temperature : 0.2,
        max_tokens: Math.min(Number(body.max_tokens) || MAX_TOKENS, MAX_TOKENS),
      }),
    });

    const text = await upstream.text();

    // Forwarded verbatim, status included. The theme already knows how to read
    // a Groq response and how to treat a non-200 — reshaping it here would mean
    // teaching it a second dialect.
    res.status(upstream.status);
    res.setHeader('Content-Type', 'application/json');
    return res.send(text);
  } catch {
    return res.status(502).json({ error: 'upstream unavailable' });
  }
}
