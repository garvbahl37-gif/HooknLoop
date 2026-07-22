import { ASSET_BASE, SHOP_BASE, BROWSE, APPLICATIONS, INDUSTRIES } from '../data/catalog.js'

const LOGO_WHITE = `${ASSET_BASE}/img/logo-footer.png`
const AR = 'Arial,Helvetica,sans-serif'
const SR = "Georgia,'Times New Roman',serif"

export const TIPS = [
  'Clean and dry the surface before applying self-adhesive hook & loop — adhesion nearly doubles on a degreased surface.',
  'Sew-on tape outlasts adhesive on anything that flexes or gets washed. Match the tape weight to the fabric.',
  'For outdoor or high-heat jobs, reach for the heavy-duty acrylic adhesive, not the standard rubber one.',
  'Dots and coins beat cutting a roll when you need hundreds of small, repeatable fixings.',
  'Reusable cable straps pay for themselves fast in a workshop — no more single-use zip ties.',
]

// Template catalogue — surfaced in the dashboard picker.
export const TEMPLATES = [
  { id: 'weekly', name: 'Weekly digest', desc: 'Pick, range & applications' },
  { id: 'specs', name: 'Product spotlight', desc: 'One product, full specs' },
  { id: 'industries', name: 'Industry & use cases', desc: 'A trade in focus' },
  { id: 'offers', name: 'This week’s offers', desc: 'Promo & discount' },
]

const byNewest = (a, b) => new Date(b.createdAt) - new Date(a.createdAt)

export function build(products, weekNumber) {
  const list = [...products]
  const spotlight = list[weekNumber % list.length]
  const newest = [...list].sort(byNewest)[0]
  return {
    template: 'weekly',
    subject: `HooknLoop weekly — ${spotlight?.title ?? 'trade tips & picks'}`,
    news: '',
    spotlightId: spotlight?.id ?? null,
    newArrivalId: newest?.id ?? null,
    tipId: weekNumber % TIPS.length,
    industrySlug: INDUSTRIES[0]?.slug ?? null,
    offerTitle: 'Trade Week — 15% off selected rolls',
    offerBody: 'Stock up on the rolls your jobs run through. Selected self-adhesive and VELCRO® Brand rolls are on special this week only.',
    offerCode: 'TRADE15',
    offerEnds: 'Ends Sunday',
  }
}

/* ── helpers ──────────────────────────────────────────────────────────────── */
const find = (products, id) => products.find(p => p.id === id)
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function weekLabel(iso) {
  if (!iso) return 'This week'
  const [, m, d] = iso.split('-').map(Number)
  return `Week of ${MONTHS[m - 1]} ${d}`
}

const button = (label, href, { solid = true, white = false } = {}) => `
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:0;"><tr>
    <td align="center" style="border-radius:10px;${solid ? 'background:#e8590c;' : `border:1.5px solid ${white ? '#ffffff' : '#0b2447'};`}">
      <a href="${href}" style="display:inline-block;padding:${solid ? '13px 26px' : '12px 24px'};font-family:${AR};font-size:14px;font-weight:700;line-height:1;letter-spacing:.2px;text-decoration:none;color:${solid ? '#ffffff' : white ? '#ffffff' : '#0b2447'};">${label}</a>
    </td>
  </tr></table>`

const sectionHead = (eyebrow, title) => `
  <tr><td style="padding:30px 32px 0;">
    <div style="font-family:${AR};font-size:11px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;color:#9aa0aa;">${eyebrow}</div>
    <div style="font-family:${SR};font-size:19px;font-weight:700;color:#0b2447;margin-top:5px;letter-spacing:-.2px;">${title}</div>
  </td></tr>`

const chips = (uses = [], label = 'Ideal for') => !uses.length ? '' : `
  <div style="margin-top:15px;">
    <div style="font-family:${AR};font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#9aa0aa;margin-bottom:9px;">${label}</div>
    ${uses.map(u => `<span style="display:inline-block;background:#f5f2ec;border:1px solid #e9e4db;border-radius:999px;padding:6px 12px;margin:0 6px 7px 0;font-family:${AR};font-size:12px;font-weight:600;color:#5b6472;">${u}</span>`).join('')}
  </div>`

const gridRows = (cells) => {
  let out = ''
  for (let i = 0; i < cells.length; i += 2) out += `<tr>${cells[i] || '<td width="50%"></td>'}${cells[i + 1] || '<td width="50%"></td>'}</tr>`
  return out
}

const productCell = (p, badge) => !p ? '<td width="50%"></td>' : `
  <td width="50%" valign="top" style="padding:6px;">
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border:1px solid #e9e4db;border-radius:12px;overflow:hidden;background:#ffffff;">
      <tr><td style="background:#f5f2ec;text-align:center;font-size:0;"><img src="${p.image}" alt="${p.title}" width="252" style="display:block;width:100%;max-width:252px;height:auto;border:0;"></td></tr>
      <tr><td style="padding:13px 14px 15px;">
        ${badge ? `<span style="display:inline-block;background:#e8590c;color:#fff;font-family:${AR};font-size:9.5px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:3px 7px;border-radius:5px;margin-bottom:7px;">${badge}</span><br>` : ''}
        <div style="font-family:${AR};font-size:14px;font-weight:700;line-height:1.3;color:#0b2447;">${p.title}</div>
        <div style="font-family:${AR};font-size:12px;color:#9aa0aa;margin:3px 0 7px;">${p.spec || p.category}</div>
        <div style="font-family:${AR};font-size:13px;font-weight:700;color:#101a2b;">from $${p.price}</div>
        <a href="${p.url}" style="font-family:${AR};font-size:12px;font-weight:700;color:#e8590c;text-decoration:none;display:inline-block;margin-top:9px;">Shop  →</a>
      </td></tr>
    </table>
  </td>`

const tipRow = (tip) => `
  <tr><td style="padding:30px 32px 0;">
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background:#0b2447;border-radius:14px;"><tr><td style="padding:20px 22px;">
      <div style="font-family:${AR};font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#f0a06a;">Trade tip</div>
      <p style="font-family:${AR};font-size:15px;line-height:1.6;color:#dfe6f2;margin:9px 0 0;">${tip}</p>
    </td></tr></table>
  </td></tr>`

const bulkCTArow = `
  <tr><td style="padding:26px 32px 30px;">
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr><td align="center" style="border-top:1px solid #e9e4db;padding-top:26px;">
      <div style="font-family:${AR};font-size:14px;color:#6a7180;margin-bottom:15px;">Need bulk quantities or a trade account?</div>
      ${button('Get a bulk quote', `${SHOP_BASE}/pages/bulk-orders`, { solid: false })}
    </td></tr></table>
  </td></tr>`

/* ── shared shell ─────────────────────────────────────────────────────────── */
const header = (eyebrow) => `
  <tr><td style="background:#0b2447;padding:22px 32px;">
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:middle;"><a href="${SHOP_BASE}" style="text-decoration:none;"><img src="${LOGO_WHITE}" alt="HooknLoop" width="172" height="30" style="display:block;border:0;height:auto;"></a></td>
      <td align="right" style="vertical-align:middle;font-family:${AR};font-size:10.5px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#8ea3c2;">${eyebrow}</td>
    </tr></table>
  </td></tr>
  <tr><td style="height:3px;line-height:3px;font-size:0;background:#e8590c;">&nbsp;</td></tr>`

const footer = `
  <tr><td style="background:#0b2447;padding:28px 32px;">
    <a href="${SHOP_BASE}" style="text-decoration:none;"><img src="${LOGO_WHITE}" alt="HooknLoop" width="150" height="27" style="display:block;border:0;height:auto;margin-bottom:14px;"></a>
    <p style="font-family:${AR};font-size:13px;line-height:1.7;color:#9fb0c9;margin:0 0 16px;">
      Industrial hook &amp; loop, dispatched fast across Australia.<br>
      <a href="tel:1300183481" style="color:#c7d3e6;text-decoration:none;">1300&nbsp;183&nbsp;481</a> &middot; Australian warehouse &middot; ABN 93 878 995 217
    </p>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td style="font-family:${AR};font-size:12px;font-weight:700;padding-top:15px;border-top:1px solid #1c3358;">
      <a href="${BROWSE}" style="color:#e8590c;text-decoration:none;">Shop all</a>
      <span style="color:#3a4d6b;">&nbsp;&nbsp;&middot;&nbsp;&nbsp;</span>
      <a href="${SHOP_BASE}/pages/bulk-orders" style="color:#c7d3e6;text-decoration:none;">Bulk quotes</a>
      <span style="color:#3a4d6b;">&nbsp;&nbsp;&middot;&nbsp;&nbsp;</span>
      <a href="${SHOP_BASE}/pages/contact" style="color:#c7d3e6;text-decoration:none;">Contact</a>
    </td></tr></table>
  </td></tr>`

function pageWrap(subject, cardInner, label, viewUrl) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#efece6;-webkit-text-size-adjust:100%;">
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background:#efece6;"><tr><td align="center" style="padding:26px 12px 0;">
  <table role="presentation" width="600" border="0" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;"><tr>
    <td style="padding:0 8px 11px;font-family:${AR};font-size:11px;color:#9aa0aa;letter-spacing:.3px;">HooknLoop &middot; ${label}</td>
    <td align="right" style="padding:0 8px 11px;"><a href="${viewUrl}" style="font-family:${AR};font-size:11px;color:#6a7180;text-decoration:underline;">View in browser</a></td>
  </tr></table>
  <table role="presentation" width="600" border="0" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 20px 48px -24px rgba(11,36,71,.35);">
    ${cardInner}
  </table>
  <table role="presentation" width="600" border="0" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;"><tr>
    <td style="padding:18px 20px 8px;text-align:center;font-family:${AR};font-size:12px;line-height:1.7;color:#9aa0aa;">
      You&rsquo;re receiving this because you subscribed at hooknloop.com.au.<br>
      <a href="{{unsubscribe}}" style="color:#6a7180;text-decoration:underline;">Unsubscribe</a> &nbsp;&middot;&nbsp; VELCRO&reg; is a registered trademark of Velcro IP Holdings LLC.
    </td></tr></table>
</td></tr></table>
</body></html>`
}

const introRow = (label, headline, news) => `
  <tr><td style="padding:30px 32px 6px;">
    <div style="font-family:${AR};font-size:11px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;color:#e8590c;">${label}</div>
    <div style="font-family:${SR};font-size:25px;font-weight:700;line-height:1.25;color:#0b2447;margin-top:9px;letter-spacing:-.3px;">${headline}</div>
    ${news && news.trim() ? `<p style="font-family:${AR};font-size:15px;line-height:1.65;color:#3a4152;margin:12px 0 0;">${news}</p>` : ''}
  </td></tr>`

/* ── template: weekly digest ──────────────────────────────────────────────── */
function bodyWeekly(f, products) {
  const spotlight = find(products, f.spotlightId)
  const range = products.filter(p => p.id !== f.spotlightId).slice(0, 4)
  const spot = !spotlight ? '' : `
    <tr><td style="padding:8px 32px 0;">
      <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border:1px solid #e9e4db;border-radius:16px;overflow:hidden;background:#ffffff;">
        <tr><td style="background:#f5f2ec;text-align:center;font-size:0;"><img src="${spotlight.image}" alt="${spotlight.title}" width="536" style="display:block;width:100%;max-width:536px;height:auto;border:0;"></td></tr>
        <tr><td style="padding:24px;">
          <div style="font-family:${AR};font-size:11px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:#e8590c;">This week&rsquo;s pick</div>
          <div style="font-family:${AR};font-size:21px;font-weight:700;line-height:1.3;color:#0b2447;margin:8px 0 4px;letter-spacing:-.3px;">${spotlight.title}</div>
          <div style="font-family:${AR};font-size:13px;color:#9aa0aa;">${spotlight.spec || spotlight.category} &nbsp;&middot;&nbsp; from <span style="color:#101a2b;font-weight:700;">$${spotlight.price}</span></div>
          ${spotlight.blurb ? `<p style="font-family:${AR};font-size:15px;line-height:1.65;color:#3a4152;margin:14px 0 0;">${spotlight.blurb}</p>` : ''}
          ${chips(spotlight.uses)}
          <div style="height:18px;line-height:18px;">&nbsp;</div>
          ${button('Shop now  →', spotlight.url)}
        </td></tr>
      </table>
    </td></tr>`
  const rangeSection = range.length ? sectionHead('Shop the range', 'More from this week&rsquo;s shelf') +
    `<tr><td style="padding:8px 26px 0;"><table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">${gridRows(range.map(p => productCell(p, p.id === f.newArrivalId ? 'Just in' : '')))}</table></td></tr>` : ''
  const appSection = sectionHead('Built for your trade', 'Where it earns its keep') +
    `<tr><td style="padding:8px 26px 0;"><table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">${gridRows(APPLICATIONS.map(a => `
      <td width="50%" valign="top" style="padding:6px;"><a href="${a.href}" style="text-decoration:none;display:block;">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border:1px solid #e9e4db;border-radius:12px;overflow:hidden;background:#fff;">
          <tr><td style="font-size:0;"><img src="${a.image}" alt="${a.name}" width="252" style="display:block;width:100%;max-width:252px;height:auto;border:0;"></td></tr>
          <tr><td style="padding:13px 14px 15px;"><div style="font-family:${AR};font-size:14px;font-weight:700;color:#0b2447;">${a.name}</div><div style="font-family:${AR};font-size:12px;line-height:1.5;color:#6a7180;margin-top:4px;">${a.line}</div></td></tr>
        </table></a></td>`))}</table></td></tr>`
  const rows = introRow(weekLabel(f.weekOf), 'Fresh from the workshop.', f.news) + spot + rangeSection + appSection + tipRow(TIPS[f.tipId] ?? TIPS[0]) + bulkCTArow
  return { eyebrow: 'Weekly&nbsp;dispatch', rows,
    text: `${f.news ? f.news + '\n\n' : ''}THIS WEEK'S PICK\n${spotlight ? `${spotlight.title} — from $${spotlight.price}\n${spotlight.url}` : ''}\n\nSHOP THE RANGE\n${range.map(p => `${p.title} — ${p.url}`).join('\n')}` }
}

/* ── template: product spotlight & specs ──────────────────────────────────── */
function specRow(k, v) {
  return `<tr>
    <td style="padding:11px 0;border-bottom:1px solid #eee7dc;font-family:${AR};font-size:12px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:#9aa0aa;width:120px;vertical-align:top;">${k}</td>
    <td style="padding:11px 0;border-bottom:1px solid #eee7dc;font-family:${AR};font-size:14px;color:#1b2432;">${v}</td>
  </tr>`
}
function bodySpecs(f, products) {
  const p = find(products, f.spotlightId) || products[0]
  const others = products.filter(x => x.id !== p.id).slice(0, 2)
  const spec = `
    <tr><td style="padding:8px 32px 0;text-align:center;font-size:0;">
      <img src="${p.image}" alt="${p.title}" width="536" style="display:block;width:100%;max-width:536px;height:auto;border:0;border-radius:16px;">
    </td></tr>
    <tr><td style="padding:22px 32px 0;">
      <div style="font-family:${AR};font-size:11px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:#e8590c;">${p.category}</div>
      <div style="font-family:${SR};font-size:24px;font-weight:700;line-height:1.25;color:#0b2447;margin:8px 0 6px;letter-spacing:-.3px;">${p.title}</div>
      <div style="font-family:${AR};font-size:15px;color:#6a7180;">from <span style="color:#101a2b;font-weight:700;font-size:17px;">$${p.price}</span></div>
      ${p.blurb ? `<p style="font-family:${AR};font-size:15px;line-height:1.65;color:#3a4152;margin:14px 0 0;">${p.blurb}</p>` : ''}
    </td></tr>
    <tr><td style="padding:18px 32px 0;">
      <div style="font-family:${AR};font-size:11px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;color:#9aa0aa;margin-bottom:4px;">Specifications</div>
      <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
        ${specRow('Type', p.category)}
        ${specRow('Format', p.spec || '—')}
        ${p.sizes?.length ? specRow('Sizes', p.sizes.join(' &nbsp;·&nbsp; ')) : ''}
        ${p.colours?.length ? specRow('Colours', p.colours.join(', ')) : ''}
        ${p.uses?.length ? specRow('Ideal for', p.uses.join(', ')) : ''}
      </table>
      <div style="height:20px;line-height:20px;">&nbsp;</div>
      ${button('Shop ' + p.title.split('(')[0].trim() + '  →', p.url)}
    </td></tr>
    ${others.length ? sectionHead('Pairs well with', 'Complete the job') +
      `<tr><td style="padding:8px 26px 0;"><table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">${gridRows(others.map(o => productCell(o)))}</table></td></tr>` : ''}`
  const rows = introRow(weekLabel(f.weekOf), 'In focus.', f.news) + spec + tipRow(TIPS[f.tipId] ?? TIPS[0]) + bulkCTArow
  return { eyebrow: 'Product&nbsp;focus', rows,
    text: `IN FOCUS: ${p.title} — from $${p.price}\n${p.blurb || ''}\nFormat: ${p.spec}\nSizes: ${(p.sizes || []).join(', ')}\nColours: ${(p.colours || []).join(', ')}\n${p.url}` }
}

/* ── template: industry & use cases ───────────────────────────────────────── */
function bodyIndustries(f, products) {
  const inFocus = INDUSTRIES.find(i => i.slug === f.industrySlug) || INDUSTRIES[0]
  const recs = (inFocus.recommended || []).map(id => find(products, id)).filter(Boolean)
  const cases = inFocus.useCases.map(([t, d], i) => `
    <tr><td style="padding:${i === 0 ? '0' : '10px'} 0 0;">
      <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border:1px solid #e9e4db;border-radius:12px;background:#fff;"><tr>
        <td width="42" valign="top" style="padding:16px 0 16px 16px;"><div style="width:30px;height:30px;border-radius:8px;background:#fff4ec;color:#e8590c;font-family:${AR};font-size:13px;font-weight:700;text-align:center;line-height:30px;">${i + 1}</div></td>
        <td style="padding:15px 18px 15px 12px;"><div style="font-family:${AR};font-size:15px;font-weight:700;color:#0b2447;">${t}</div><div style="font-family:${AR};font-size:13px;line-height:1.55;color:#5b6472;margin-top:3px;">${d}</div></td>
      </tr></table>
    </td></tr>`).join('')
  const body = `
    <tr><td style="padding:8px 32px 0;text-align:center;font-size:0;"><img src="${inFocus.image}" alt="${inFocus.name}" width="536" style="display:block;width:100%;max-width:536px;height:auto;border:0;border-radius:16px;"></td></tr>
    <tr><td style="padding:20px 32px 0;">
      <div style="font-family:${AR};font-size:11px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:#e8590c;">Industry spotlight</div>
      <div style="font-family:${SR};font-size:23px;font-weight:700;line-height:1.25;color:#0b2447;margin:8px 0 8px;letter-spacing:-.3px;">${inFocus.name}</div>
      <p style="font-family:${AR};font-size:15px;line-height:1.65;color:#3a4152;margin:0;">${inFocus.intro}</p>
    </td></tr>
    ${sectionHead('Common jobs', 'How the trade uses it')}
    <tr><td style="padding:10px 32px 0;"><table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">${cases}</table></td></tr>
    ${recs.length ? sectionHead('Recommended', 'Reach for these') +
      `<tr><td style="padding:8px 26px 0;"><table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">${gridRows(recs.map(r => productCell(r)))}</table></td></tr>` : ''}`
  const rows = (f.news && f.news.trim() ? introRow(weekLabel(f.weekOf), 'For your trade.', f.news) : '') + body + bulkCTArow
  return { eyebrow: 'Industry&nbsp;focus', rows,
    text: `INDUSTRY: ${inFocus.name}\n${inFocus.intro}\n\n${inFocus.useCases.map(([t, d]) => `• ${t}: ${d}`).join('\n')}\n\nRecommended: ${recs.map(r => r.title + ' — ' + r.url).join('; ')}` }
}

/* ── template: this week's offers ─────────────────────────────────────────── */
function bodyOffers(f, products) {
  const featured = products.slice(0, 4)
  const hero = `
    <tr><td style="padding:0;">
      <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background:#e8590c;background-image:linear-gradient(135deg,#f0732e 0%,#c2440a 100%);"><tr><td style="padding:34px 32px;">
        <div style="font-family:${AR};font-size:11px;font-weight:700;letter-spacing:2.4px;text-transform:uppercase;color:#ffd9c2;">Trade offer${f.offerEnds ? ' &middot; ' + f.offerEnds : ''}</div>
        <div style="font-family:${SR};font-size:30px;font-weight:700;line-height:1.15;color:#ffffff;margin:10px 0 8px;letter-spacing:-.5px;">${f.offerTitle || 'This week&rsquo;s offer'}</div>
        ${f.offerBody ? `<p style="font-family:${AR};font-size:15px;line-height:1.6;color:#ffe9dd;margin:0 0 18px;max-width:440px;">${f.offerBody}</p>` : '<div style="height:6px;"></div>'}
        ${f.offerCode ? `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="display:inline-block;"><tr><td style="border:1.5px dashed rgba(255,255,255,.6);border-radius:9px;padding:9px 15px;font-family:${AR};font-size:14px;font-weight:700;letter-spacing:1px;color:#fff;">Code&nbsp; ${f.offerCode}</td></tr></table>&nbsp;&nbsp;` : ''}
        <span style="display:inline-block;vertical-align:middle;">${button('Shop the offers  →', BROWSE, { solid: false, white: true })}</span>
      </td></tr></table>
    </td></tr>`
  const feat = sectionHead('On the shelf', 'Featured this week') +
    `<tr><td style="padding:8px 26px 0;"><table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">${gridRows(featured.map(p => productCell(p, 'Featured')))}</table></td></tr>`
  const urgency = `
    <tr><td style="padding:26px 32px 30px;text-align:center;">
      <div style="font-family:${AR};font-size:14px;color:#6a7180;margin-bottom:15px;">${f.offerEnds ? f.offerEnds + ' — don&rsquo;t miss it.' : 'While stocks last.'}</div>
      ${button('Browse all products  →', BROWSE)}
    </td></tr>`
  const rows = hero + feat + urgency
  return { eyebrow: 'Trade&nbsp;offer', rows,
    text: `${f.offerTitle}\n${f.offerBody || ''}\n${f.offerCode ? 'Code: ' + f.offerCode + '\n' : ''}${f.offerEnds || ''}\n\nFEATURED\n${featured.map(p => `${p.title} — ${p.url}`).join('\n')}\n\nShop: ${BROWSE}` }
}

const RENDERERS = { weekly: bodyWeekly, specs: bodySpecs, industries: bodyIndustries, offers: bodyOffers }

export function render(fields, products) {
  const fn = RENDERERS[fields.template] || bodyWeekly
  const { eyebrow, rows, text } = fn(fields, products)
  const label = weekLabel(fields.weekOf)
  const viewUrl = `${ASSET_BASE}/view`
  const cardInner = header(eyebrow) + rows + footer
  const html = pageWrap(fields.subject || 'HooknLoop', cardInner, label, viewUrl)
  const fullText = `${label} — HooknLoop\n\n${text}\n\nHooknLoop · 1300 183 481 · Australia-wide dispatch\nUnsubscribe: {{unsubscribe}}`
  return { subject: fields.subject, html, text: fullText }
}
