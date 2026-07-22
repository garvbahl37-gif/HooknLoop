import { getDraft } from '../../lib/kv.js'
import { getProducts } from '../../lib/shopify.js'
import { build, render } from '../../lib/newsletter.js'
import { isoWeek } from '../../lib/week.js'
export const runtime = 'nodejs'

// Public "View in browser" — a live, hosted web version of the current issue on the
// deployed app. No auth: this is the same marketing content subscribers receive.
export async function GET() {
  const products = await getProducts()
  let draft = await getDraft()
  if (!draft) draft = { ...build(products, isoWeek()), weekOf: new Date().toISOString().slice(0, 10) }
  const html = render(draft, products).html.replaceAll('{{unsubscribe}}', `${process.env.SHOP_BASE || 'https://hooknloop.com.au'}`)
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' } })
}
