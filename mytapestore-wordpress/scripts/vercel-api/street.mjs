/**
 * Signing relay for the hosted preview's street-line autocomplete.
 *
 * Same reasoning as api/chat.js: the preview runs PHP inside the visitor's own
 * browser, so it has nowhere private to keep the Checkify token. This adds the
 * Authorization header and forwards the lookup; theme/inc/address-street.php
 * still does the parsing, the suburb split against the local G-NAF locality
 * index, and the caching.
 *
 * COST NOTE, because it is the reason this endpoint is safe to expose at all:
 * only /autocomplete is called, and autocomplete is UNMETERED on Checkify's free
 * plan — verified against the live account, where units_used stayed at 0 across
 * autocomplete calls and moved to 1 the moment /autocomplete-details was tried
 * once. So traffic here cannot spend the 250-unit monthly allowance. What it CAN
 * spend is the 30-requests-per-minute rate limit, which is shared site-wide,
 * hence the minimum query length below and the day-long cache in the theme.
 *
 * Generated into build/deploy/api/ by scripts/deploy-demo.sh. The token is read
 * from the Vercel environment and never written into any deployed file.
 */

const CHECKIFY = 'https://checkify.com.au/api/v1/autocomplete';

// Matches MTS_STREET_MIN_CHARS in the theme. Shorter than this matches most of
// the country and is not worth a request against a shared rate limit.
const MIN_CHARS = 5;
const MAX_CHARS = 120;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET only' });
  }

  const key = process.env.CHECKIFY_KEY;
  const query = (req.query?.query || req.query?.q || '').toString().trim();

  // An empty list is a valid answer everywhere in this feature: the field simply
  // shows no suggestions and stays a normal text input. Never an error a
  // customer has to read mid-checkout.
  if (!key || query.length < MIN_CHARS || query.length > MAX_CHARS) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({});
  }

  try {
    const upstream = await fetch(
      `${CHECKIFY}?query=${encodeURIComponent(query)}`,
      { headers: { Authorization: `Bearer ${key}` } }
    );

    if (!upstream.ok) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({});
    }

    const text = await upstream.text();

    /*
     * Cached at the edge for a day. Street data changes quarterly, and every
     * customer in a suburb types the same prefixes — so this is the single
     * cheapest way to stay clear of the shared 30-per-minute limit.
     */
    res.setHeader('Cache-Control', 'public, s-maxage=86400, max-age=3600');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(text);
  } catch {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({});
  }
}
