export const TIPS = [
  'Clean and dry the surface before applying self-adhesive hook & loop — adhesion doubles on a degreased surface.',
  'Sew-on tape outlasts adhesive on anything that flexes or gets washed. Match it to the fabric weight.',
  'For outdoor or high-heat jobs, reach for the heavy-duty acrylic adhesive, not the standard rubber one.',
  'Dots and coins beat cutting a roll when you need hundreds of small, repeatable fixings.',
  'Reusable cable straps pay for themselves fast in a workshop — no more single-use zip ties.',
]
const byNewest = (a, b) => new Date(b.createdAt) - new Date(a.createdAt)

export function build(products, weekNumber) {
  const list = [...products]
  const spotlight = list[weekNumber % list.length]
  const newest = [...list].sort(byNewest)[0]
  return {
    subject: `HooknLoop weekly — ${spotlight?.title ?? 'trade tips & picks'}`,
    news: '',
    spotlightId: spotlight?.id ?? null,
    newArrivalId: newest?.id ?? null,
    tipId: weekNumber % TIPS.length,
  }
}

const find = (products, id) => products.find(p => p.id === id)
const card = (p, label) => !p ? '' : `
  <table role="presentation" width="100%" style="border:1px solid #e3e7ee;border-radius:14px;margin:12px 0"><tr>
    <td width="120" style="padding:12px"><img src="${p.image}" width="108" alt="${p.title}" style="border-radius:10px;display:block"></td>
    <td style="padding:12px;vertical-align:top">
      <div style="font:12px sans-serif;color:#e8590c;text-transform:uppercase;letter-spacing:.04em">${label}</div>
      <div style="font:600 16px sans-serif;color:#0b2447;margin:4px 0">${p.title}</div>
      <div style="font:14px sans-serif;color:#5b6472">From $${p.price}</div>
      <a href="${p.url}" style="display:inline-block;margin-top:8px;background:#e8590c;color:#fff;text-decoration:none;padding:8px 14px;border-radius:10px;font:600 13px sans-serif">Shop now</a>
    </td></tr></table>`

export function render(fields, products) {
  const spotlight = find(products, fields.spotlightId)
  const arrival = find(products, fields.newArrivalId)
  const tip = TIPS[fields.tipId] ?? TIPS[0]
  const html = `<!doctype html><html><body style="margin:0;background:#f6f7f9;padding:24px">
    <table role="presentation" width="600" align="center" style="background:#fff;border-radius:14px;overflow:hidden">
      <tr><td style="background:#0b2447;color:#fff;padding:20px 24px;font:700 18px sans-serif">HooknLoop</td></tr>
      <tr><td style="padding:24px">
        ${fields.news ? `<p style="font:15px sans-serif;color:#1b1f24">${fields.news}</p>` : ''}
        ${card(spotlight, 'This week&rsquo;s pick')}
        ${arrival && arrival.id !== spotlight?.id ? card(arrival, 'New arrival') : ''}
        <div style="border:1px solid #e3e7ee;border-radius:14px;padding:14px;margin-top:12px">
          <div style="font:12px sans-serif;color:#e8590c;text-transform:uppercase;letter-spacing:.04em">Trade tip</div>
          <p style="font:14px sans-serif;color:#1b1f24;margin:6px 0 0">${tip}</p>
        </div>
      </td></tr>
      <tr><td style="padding:16px 24px;background:#f6f7f9;font:12px sans-serif;color:#5b6472">
        You&rsquo;re receiving this because you subscribed at hooknloop.com.au. <a href="{{unsubscribe}}">Unsubscribe</a>.
      </td></tr>
    </table></body></html>`
  const text = `${fields.news}\n\nThis week's pick: ${spotlight?.title ?? ''} — ${spotlight?.url ?? ''}\n` +
    `${arrival ? `New arrival: ${arrival.title} — ${arrival.url}\n` : ''}\nTrade tip: ${tip}\n\nUnsubscribe: {{unsubscribe}}`
  return { subject: fields.subject, html, text }
}
