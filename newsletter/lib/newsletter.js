import { ASSET_BASE, SHOP_BASE, APPLICATIONS } from '../data/catalog.js'

const LOGO_WHITE = `${ASSET_BASE}/img/logo-footer.png` // white wordmark, 389×69, for navy bands

export const TIPS = [
  'Clean and dry the surface before applying self-adhesive hook & loop — adhesion nearly doubles on a degreased surface.',
  'Sew-on tape outlasts adhesive on anything that flexes or gets washed. Match the tape weight to the fabric.',
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

/* ── email rendering ──────────────────────────────────────────────────────── */
const find = (products, id) => products.find(p => p.id === id)
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function weekLabel(iso) {
  if (!iso) return 'This week'
  const [, m, d] = iso.split('-').map(Number)
  return `Week of ${MONTHS[m - 1]} ${d}`
}
const AR = 'Arial,Helvetica,sans-serif'
const SR = "Georgia,'Times New Roman',serif"

const button = (label, href, { solid = true } = {}) => `
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:0;"><tr>
    <td align="center" style="border-radius:10px;${solid ? 'background:#e8590c;' : 'border:1.5px solid #0b2447;'}">
      <a href="${href}" style="display:inline-block;padding:${solid ? '13px 26px' : '12px 24px'};font-family:${AR};font-size:14px;font-weight:700;line-height:1;letter-spacing:.2px;text-decoration:none;color:${solid ? '#ffffff' : '#0b2447'};">${label}</a>
    </td>
  </tr></table>`

const sectionHead = (eyebrow, title) => `
  <tr><td style="padding:30px 32px 0;">
    <div style="font-family:${AR};font-size:11px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;color:#9aa0aa;">${eyebrow}</div>
    <div style="font-family:${SR};font-size:19px;font-weight:700;color:#0b2447;margin-top:5px;letter-spacing:-.2px;">${title}</div>
  </td></tr>`

const chips = (uses = []) => !uses.length ? '' : `
  <div style="margin-top:15px;">
    <div style="font-family:${AR};font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#9aa0aa;margin-bottom:9px;">Ideal for</div>
    ${uses.map(u => `<span style="display:inline-block;background:#f5f2ec;border:1px solid #e9e4db;border-radius:999px;padding:6px 12px;margin:0 6px 7px 0;font-family:${AR};font-size:12px;font-weight:600;color:#5b6472;">${u}</span>`).join('')}
  </div>`

const spotlightCard = (p) => !p ? '' : `
  <tr><td style="padding:8px 32px 0;">
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border:1px solid #e9e4db;border-radius:16px;overflow:hidden;background:#ffffff;">
      <tr><td style="background:#f5f2ec;text-align:center;font-size:0;">
        <img src="${p.image}" alt="${p.title}" width="536" style="display:block;width:100%;max-width:536px;height:auto;border:0;">
      </td></tr>
      <tr><td style="padding:24px;">
        <div style="font-family:${AR};font-size:11px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:#e8590c;">This week&rsquo;s pick</div>
        <div style="font-family:${AR};font-size:21px;font-weight:700;line-height:1.3;color:#0b2447;margin:8px 0 4px;letter-spacing:-.3px;">${p.title}</div>
        <div style="font-family:${AR};font-size:13px;color:#9aa0aa;">${p.spec || p.category} &nbsp;&middot;&nbsp; from <span style="color:#101a2b;font-weight:700;">$${p.price}</span></div>
        ${p.blurb ? `<p style="font-family:${AR};font-size:15px;line-height:1.65;color:#3a4152;margin:14px 0 0;">${p.blurb}</p>` : ''}
        ${chips(p.uses)}
        <div style="height:18px;line-height:18px;">&nbsp;</div>
        ${button('Shop now  →', p.url)}
      </td></tr>
    </table>
  </td></tr>`

// Build 2-column grid rows from a list of cells (pads a trailing empty cell).
const gridRows = (cells) => {
  let out = ''
  for (let i = 0; i < cells.length; i += 2) {
    out += `<tr>${cells[i] || '<td width="50%"></td>'}${cells[i + 1] || '<td width="50%"></td>'}</tr>`
  }
  return out
}

const productCell = (p, isNew) => `
  <td width="50%" valign="top" style="padding:6px;">
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border:1px solid #e9e4db;border-radius:12px;overflow:hidden;background:#ffffff;">
      <tr><td style="background:#f5f2ec;text-align:center;font-size:0;position:relative;">
        <img src="${p.image}" alt="${p.title}" width="252" style="display:block;width:100%;max-width:252px;height:auto;border:0;">
      </td></tr>
      <tr><td style="padding:13px 14px 15px;">
        ${isNew ? `<span style="display:inline-block;background:#e8590c;color:#fff;font-family:${AR};font-size:9.5px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:3px 7px;border-radius:5px;margin-bottom:7px;">Just in</span><br>` : ''}
        <div style="font-family:${AR};font-size:14px;font-weight:700;line-height:1.3;color:#0b2447;">${p.title}</div>
        <div style="font-family:${AR};font-size:12px;color:#9aa0aa;margin:3px 0 7px;">${p.spec || p.category}</div>
        <div style="font-family:${AR};font-size:13px;font-weight:700;color:#101a2b;">from $${p.price}</div>
        <a href="${p.url}" style="font-family:${AR};font-size:12px;font-weight:700;color:#e8590c;text-decoration:none;display:inline-block;margin-top:9px;">Shop  →</a>
      </td></tr>
    </table>
  </td>`

const appCell = (a) => `
  <td width="50%" valign="top" style="padding:6px;">
    <a href="${a.href}" style="text-decoration:none;display:block;">
      <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border:1px solid #e9e4db;border-radius:12px;overflow:hidden;background:#ffffff;">
        <tr><td style="font-size:0;"><img src="${a.image}" alt="${a.name}" width="252" style="display:block;width:100%;max-width:252px;height:auto;border:0;"></td></tr>
        <tr><td style="padding:13px 14px 15px;">
          <div style="font-family:${AR};font-size:14px;font-weight:700;color:#0b2447;">${a.name}</div>
          <div style="font-family:${AR};font-size:12px;line-height:1.5;color:#6a7180;margin-top:4px;">${a.line}</div>
        </td></tr>
      </table>
    </a>
  </td>`

export function render(fields, products) {
  const spotlight = find(products, fields.spotlightId)
  const tip = TIPS[fields.tipId] ?? TIPS[0]
  const label = weekLabel(fields.weekOf)
  const range = products.filter(p => p.id !== fields.spotlightId).slice(0, 4)
  const preheader = (fields.news && fields.news.trim())
    || 'Your weekly pick, the full range, and where hook & loop earns its keep.'

  const rangeSection = range.length ? `
      ${sectionHead('Shop the range', 'More from this week&rsquo;s shelf')}
      <tr><td style="padding:8px 26px 0;">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
          ${gridRows(range.map(p => productCell(p, p.id === fields.newArrivalId)))}
        </table>
      </td></tr>` : ''

  const appSection = APPLICATIONS.length ? `
      ${sectionHead('Built for your trade', 'Where it earns its keep')}
      <tr><td style="padding:8px 26px 0;">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
          ${gridRows(APPLICATIONS.map(appCell))}
        </table>
      </td></tr>` : ''

  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><title>${fields.subject || 'HooknLoop weekly'}</title>
</head>
<body style="margin:0;padding:0;background:#efece6;-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#efece6;font-size:1px;line-height:1px;">${preheader}</div>
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background:#efece6;">
  <tr><td align="center" style="padding:30px 12px;">
    <table role="presentation" width="600" border="0" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 20px 48px -24px rgba(11,36,71,.35);">

      <!-- Header -->
      <tr><td style="background:#0b2447;padding:22px 32px;">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr>
          <td style="vertical-align:middle;"><img src="${LOGO_WHITE}" alt="HooknLoop" width="172" height="30" style="display:block;border:0;height:auto;"></td>
          <td align="right" style="vertical-align:middle;font-family:${AR};font-size:10.5px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#8ea3c2;">Weekly&nbsp;dispatch</td>
        </tr></table>
      </td></tr>
      <tr><td style="height:3px;line-height:3px;font-size:0;background:#e8590c;">&nbsp;</td></tr>

      <!-- Intro -->
      <tr><td style="padding:30px 32px 6px;">
        <div style="font-family:${AR};font-size:11px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;color:#e8590c;">${label}</div>
        <div style="font-family:${SR};font-size:25px;font-weight:700;line-height:1.25;color:#0b2447;margin-top:9px;letter-spacing:-.3px;">Fresh from the workshop.</div>
        ${fields.news && fields.news.trim() ? `<p style="font-family:${AR};font-size:15px;line-height:1.65;color:#3a4152;margin:12px 0 0;">${fields.news}</p>` : ''}
      </td></tr>

      ${spotlightCard(spotlight)}
      ${rangeSection}
      ${appSection}

      <!-- Trade tip -->
      <tr><td style="padding:30px 32px 0;">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background:#0b2447;border-radius:14px;">
          <tr><td style="padding:20px 22px;">
            <div style="font-family:${AR};font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#f0a06a;">Trade tip</div>
            <p style="font-family:${AR};font-size:15px;line-height:1.6;color:#dfe6f2;margin:9px 0 0;">${tip}</p>
          </td></tr>
        </table>
      </td></tr>

      <!-- Bulk CTA -->
      <tr><td style="padding:26px 32px 30px;">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr>
          <td align="center" style="border-top:1px solid #e9e4db;padding-top:26px;">
            <div style="font-family:${AR};font-size:14px;color:#6a7180;margin-bottom:15px;">Need bulk quantities or a trade account?</div>
            ${button('Get a bulk quote', `${SHOP_BASE}/pages/bulk`, { solid: false })}
          </td>
        </tr></table>
      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#0b2447;padding:26px 32px;">
        <img src="${LOGO_WHITE}" alt="HooknLoop" width="150" height="27" style="display:block;border:0;height:auto;margin-bottom:14px;">
        <p style="font-family:${AR};font-size:13px;line-height:1.7;color:#9fb0c9;margin:0;">
          Industrial hook &amp; loop, dispatched fast across Australia.<br>
          <a href="tel:1300183481" style="color:#c7d3e6;text-decoration:none;">1300&nbsp;183&nbsp;481</a> &middot; Australian warehouse &middot; ABN 93 878 995 217
        </p>
      </td></tr>
    </table>

    <!-- Sub-footer -->
    <table role="presentation" width="600" border="0" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;">
      <tr><td style="padding:18px 20px 8px;text-align:center;font-family:${AR};font-size:12px;line-height:1.7;color:#9aa0aa;">
        You&rsquo;re receiving this because you subscribed at hooknloop.com.au.<br>
        <a href="{{unsubscribe}}" style="color:#6a7180;text-decoration:underline;">Unsubscribe</a> &nbsp;&middot;&nbsp; VELCRO&reg; is a registered trademark of Velcro IP Holdings LLC.
      </td></tr>
    </table>

  </td></tr>
</table>
</body></html>`

  const applications = APPLICATIONS.map(a => `- ${a.name}: ${a.line}`).join('\n')
  const text = `${label} — HooknLoop weekly\n\n` +
    `${fields.news ? fields.news + '\n\n' : ''}` +
    `THIS WEEK'S PICK\n${spotlight ? `${spotlight.title} — from $${spotlight.price}\n${spotlight.blurb || ''}\n${spotlight.url}\n` : ''}\n` +
    `SHOP THE RANGE\n${range.map(p => `${p.title} — from $${p.price} — ${p.url}`).join('\n')}\n\n` +
    `BUILT FOR YOUR TRADE\n${applications}\n\n` +
    `TRADE TIP\n${tip}\n\n` +
    `Bulk quotes & trade accounts: ${SHOP_BASE}/pages/bulk\n\n` +
    `HooknLoop · 1300 183 481 · Australia-wide dispatch · ABN 93 878 995 217\n` +
    `Unsubscribe: {{unsubscribe}}`

  return { subject: fields.subject, html, text }
}
