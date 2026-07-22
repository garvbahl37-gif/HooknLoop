'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { render } from '../lib/newsletter.js'
import './dashboard.css'

function Mark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="3" y="3.4" width="22" height="3" rx="1.5" fill="#0b2447" />
      <rect x="6" y="6.2" width="3" height="8" rx="1.2" fill="#0b2447" />
      <rect x="12.5" y="6.2" width="3" height="8" rx="1.2" fill="#0b2447" />
      <rect x="19" y="6.2" width="3" height="8" rx="1.2" fill="#0b2447" />
      <rect x="3" y="21.6" width="22" height="3" rx="1.5" fill="#e8590c" />
      <rect x="2.7" y="13.8" width="3" height="8" rx="1.2" fill="#e8590c" />
      <rect x="9.2" y="13.8" width="3" height="8" rx="1.2" fill="#e8590c" />
      <rect x="15.8" y="13.8" width="3" height="8" rx="1.2" fill="#e8590c" />
      <rect x="22.3" y="13.8" width="3" height="8" rx="1.2" fill="#e8590c" />
    </svg>
  )
}

function fmtWeek(iso) {
  if (!iso) return 'This week'
  const [y, m, d] = iso.split('-').map(Number)
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]
  return `Week of ${mon} ${d}`
}

export default function Dashboard() {
  const [draft, setDraft] = useState(null)
  const [products, setProducts] = useState([])
  const [subs, setSubs] = useState({ count: 0, contacts: [] })
  const [msg, setMsg] = useState(null)       // { kind: 'ok'|'err', text }
  const [armed, setArmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const disarmTimer = useRef(null)
  const iframeRef = useRef(null)

  // Grow the preview iframe to the email's real height so the whole thing is visible
  // (re-measures as product images finish loading, which changes the height).
  function fitPreview() {
    const f = iframeRef.current
    const doc = f && f.contentDocument
    if (!doc || !doc.documentElement) return
    const measure = () => { f.style.height = doc.documentElement.scrollHeight + 'px' }
    measure()
    Array.from(doc.images || []).forEach(img => { if (!img.complete) img.addEventListener('load', measure, { once: true }) })
  }
  function openFullPreview() {
    const url = URL.createObjectURL(new Blob([previewHtml], { type: 'text/html' }))
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  }

  const loadSubs = () => fetch('/api/subscribers').then(r => r.json()).then(setSubs).catch(() => {})
  useEffect(() => {
    fetch('/api/draft').then(r => r.json()).then(d => { setDraft(d.draft); setProducts(d.products || []) }).catch(() => setMsg({ kind: 'err', text: 'Could not load the draft.' }))
    loadSubs()
  }, [])

  const save = useCallback((patch) => {
    setArmed(false)
    setDraft(prev => {
      const next = { ...prev, ...patch }
      fetch('/api/draft', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) })
      return next
    })
  }, [])

  function flash(kind, text) { setMsg({ kind, text }) }

  async function sendTest() {
    setBusy(true)
    const r = await fetch('/api/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'test', draft }) })
    setBusy(false)
    flash(r.ok ? 'ok' : 'err', r.ok ? 'Test sent to your inbox.' : 'Test failed — check the Resend setup.')
  }

  async function sendLive() {
    if (!armed) {
      setArmed(true)
      clearTimeout(disarmTimer.current)
      disarmTimer.current = setTimeout(() => setArmed(false), 4000)
      return
    }
    setArmed(false); setBusy(true)
    const r = await fetch('/api/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'live', draft }) })
    const j = await r.json().catch(() => ({}))
    setBusy(false)
    if (r.ok) { setDraft(d => ({ ...d, status: 'sent' })); flash('ok', `Sent to ${subs.count} subscriber${subs.count === 1 ? '' : 's'}.`) }
    else flash('err', j.error === 'already sent' ? 'This draft was already sent.' : 'Send failed — try again.')
  }

  async function importCsv(e) {
    const file = e.target.files[0]; if (!file) return
    setBusy(true)
    const fd = new FormData(); fd.append('file', file)
    const r = await fetch('/api/import', { method: 'POST', body: fd }); const j = await r.json().catch(() => ({}))
    setBusy(false); e.target.value = ''
    flash(r.ok ? 'ok' : 'err', r.ok ? `Imported ${j.added} · skipped ${j.skipped} · failed ${j.failed}` : 'Import failed.')
    loadSubs()
  }

  async function syncShopify() {
    setBusy(true)
    const r = await fetch('/api/shopify/sync-customers', { method: 'POST' }); const j = await r.json().catch(() => ({}))
    setBusy(false)
    flash(r.ok ? 'ok' : 'err', r.ok ? `Synced ${j.synced} from Shopify.` : 'Shopify isn’t connected yet.')
    loadSubs()
  }

  async function generateAI() {
    setBusy(true)
    const r = await fetch('/api/generate-ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ spotlightId: draft.spotlightId, weekOf: draft.weekOf }) })
    const j = await r.json().catch(() => ({}))
    setBusy(false)
    if (r.ok) { setDraft(d => ({ ...d, subject: j.subject, news: j.news })); flash('ok', 'Fresh copy written by AI — review and tweak.') }
    else flash('err', 'AI couldn’t generate copy — try again.')
  }

  if (!draft) return <LoadingState />

  const sent = draft.status === 'sent'
  let previewHtml = ''
  try { previewHtml = render(draft, products).html.replaceAll('{{unsubscribe}}', '#') } catch { previewHtml = '' }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand"><Mark /><span className="brand__name">Hook<b>n</b>Loop</span></div>
        <div className="topbar__ctx">
          <span className="chip">{fmtWeek(draft.weekOf)}</span>
          <span className={`chip${sent ? ' chip--sent' : ''}`}>{sent ? 'Sent' : 'Draft'}</span>
        </div>
        <div className="topbar__spacer" />
        <div className="readout">
          <span className="readout__num">{subs.count}</span>
          <span className="readout__label">subscriber{subs.count === 1 ? '' : 's'}</span>
        </div>
      </header>

      {msg && <div className={`toast toast--${msg.kind === 'ok' ? 'ok' : 'err'}`}>{msg.text}</div>}

      <div className="grid">
        {/* Editor */}
        <section className="panel" aria-label="Newsletter editor">
          <div className="panel__hd">
            <span className="eyebrow">This week’s issue</span>
            <button type="button" className="btn--ai" onClick={generateAI} disabled={busy} title="Draft the subject & intro with Gemini">
              <span aria-hidden="true">✦</span> Generate with AI
            </button>
          </div>
          <div className="panel__body">
            <div className="field">
              <label className="eyebrow" htmlFor="subject">Subject line</label>
              <input id="subject" className="subject-input" value={draft.subject || ''} onChange={e => save({ subject: e.target.value })} placeholder="A subject that earns the open" />
            </div>
            <div className="field">
              <label className="eyebrow" htmlFor="news">This week’s note</label>
              <textarea id="news" value={draft.news || ''} onChange={e => save({ news: e.target.value })} placeholder="A line or two of real news — a price drop, a restock, a trade tip…" />
              <p className="field__hint">Sits at the top of the email, above the product picks.</p>
            </div>
            <div className="field">
              <label className="eyebrow" htmlFor="spot">Spotlight product</label>
              <select id="spot" value={draft.spotlightId || ''} onChange={e => save({ spotlightId: e.target.value })}>
                {products.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>

            <div className="deck">
              <div className="deck__row">
                <button className="btn btn--ghost" onClick={sendTest} disabled={busy}>Send test to me</button>
                {sent
                  ? <button className="btn btn--sent" disabled>Sent ✓</button>
                  : <button className={`btn btn--primary${armed ? ' btn--armed' : ''}`} onClick={sendLive} disabled={busy}>
                      {armed ? `Confirm — send to ${subs.count}` : 'Send to subscribers'}
                    </button>}
              </div>
              <div className="deck__status"><span className="dot" />Test sends reach <b>your inbox only</b> — never the list.</div>
            </div>
          </div>
        </section>

        {/* Preview */}
        <section className="preview" aria-label="Email preview">
          <div className="preview__frame">
            <div className="preview__bar">
              <span className="preview__dots"><i /><i /><i /></span>
              <span className="preview__addr">{draft.subject || 'HooknLoop weekly'}</span>
            </div>
            <iframe ref={iframeRef} title="Email preview" srcDoc={previewHtml} onLoad={fitPreview} style={{ height: 640 }} />
            <div className="preview__meta">
              <span className="eyebrow">Live preview — exactly what subscribers receive</span>
              <button type="button" className="preview__open" onClick={openFullPreview}>Open full ↗</button>
            </div>
          </div>
        </section>
      </div>

      {/* Audience */}
      <section className="panel audience" aria-label="Audience">
        <div className="panel__hd">
          <span className="panel__title">Subscribers</span>
          <div className="tools">
            <label className="upload">Import CSV<input type="file" accept=".csv" onChange={importCsv} hidden /></label>
            <button className="btn btn--ghost" onClick={syncShopify} disabled={busy}>Sync from Shopify</button>
          </div>
        </div>
        <div className="panel__body">
          {subs.contacts.length === 0
            ? <div className="empty"><div className="empty__mark"><Mark size={34} /></div><h4>No subscribers yet</h4><p>Import a CSV or add the signup form to your storefront to start the list.</p></div>
            : <ul className="subs-list">{subs.contacts.map(c => (
                <li key={c.email}><span className="email">{c.email}</span><span className={`status ${c.status}`}>{c.status}</span></li>
              ))}</ul>}
        </div>
      </section>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand"><Mark /><span className="brand__name">Hook<b>n</b>Loop</span></div>
        <div className="topbar__spacer" />
        <div className="sk" style={{ width: 90, height: 22 }} />
      </header>
      <div className="grid">
        <section className="panel"><div className="panel__body">
          <div className="sk" style={{ height: 16, width: 120, marginBottom: 18 }} />
          <div className="sk" style={{ height: 44, marginBottom: 16 }} />
          <div className="sk" style={{ height: 96, marginBottom: 16 }} />
          <div className="sk" style={{ height: 44, marginBottom: 22 }} />
          <div className="sk" style={{ height: 44 }} />
        </div></section>
        <section className="panel"><div className="sk" style={{ height: 560, borderRadius: 0 }} /></section>
      </div>
    </div>
  )
}
