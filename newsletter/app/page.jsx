'use client'
import { useEffect, useState, useCallback } from 'react'
import './dashboard.css'
export default function Dashboard() {
  const [draft, setDraft] = useState(null); const [products, setProducts] = useState([])
  const [subs, setSubs] = useState({ count: 0, contacts: [] }); const [msg, setMsg] = useState('')
  const loadSubs = () => fetch('/api/subscribers').then(r => r.json()).then(setSubs).catch(() => {})
  useEffect(() => {
    fetch('/api/draft').then(r => r.json()).then(d => { setDraft(d.draft); setProducts(d.products || []) }).catch(() => {})
    loadSubs()
  }, [])
  const save = useCallback(async (patch) => {
    setDraft(prev => {
      const next = { ...prev, ...patch }
      fetch('/api/draft', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) })
      return next
    })
  }, [])
  async function send(mode) {
    if (mode === 'live' && !confirm('Send to ALL subscribers now?')) return
    const r = await fetch('/api/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode }) })
    const j = await r.json().catch(() => ({}))
    setMsg(r.ok ? (mode === 'live' ? 'Sent to subscribers ✓' : 'Test sent to you ✓') : (j.error || 'Failed'))
    if (r.ok && mode === 'live') setDraft(d => ({ ...d, status: 'sent' }))
  }
  async function importCsv(e) {
    const file = e.target.files[0]; if (!file) return
    const fd = new FormData(); fd.append('file', file)
    const r = await fetch('/api/import', { method: 'POST', body: fd }); const j = await r.json().catch(() => ({}))
    setMsg(r.ok ? `Imported: ${j.added} added, ${j.skipped} skipped, ${j.failed} failed` : 'Import failed')
    loadSubs()
  }
  async function syncShopify() {
    const r = await fetch('/api/shopify/sync-customers', { method: 'POST' }); const j = await r.json().catch(() => ({}))
    setMsg(r.ok ? `Shopify sync: ${j.synced} added` : 'Shopify not connected yet')
    loadSubs()
  }
  if (!draft) return <main className="wrap">Loading…</main>
  const preview = renderPreview(draft, products)
  return (<main className="wrap">
    <header className="top"><b>HooknLoop Newsletter</b><span>{subs.count} subscribers</span></header>
    {msg && <div className="msg">{msg}</div>}
    <div className="cols">
      <section className="editor">
        <label>Subject<input value={draft.subject || ''} onChange={e => save({ subject: e.target.value })} /></label>
        <label>This week&rsquo;s news<textarea rows={4} value={draft.news || ''} onChange={e => save({ news: e.target.value })} /></label>
        <label>Spotlight product
          <select value={draft.spotlightId || ''} onChange={e => save({ spotlightId: e.target.value })}>
            {products.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
        <div className="row">
          <button className="ghost" onClick={() => send('test')}>Send test to me</button>
          <button className="primary" onClick={() => send('live')} disabled={draft.status === 'sent'}>
            {draft.status === 'sent' ? 'Already sent' : 'Send to subscribers'}</button>
        </div>
        <div className="tools">
          <label className="upload">Import CSV<input type="file" accept=".csv" onChange={importCsv} hidden /></label>
          <button className="ghost" onClick={syncShopify}>Sync from Shopify</button>
        </div>
      </section>
      <section className="preview"><iframe title="preview" srcDoc={preview} /></section>
    </div>
    <section className="subs">
      <h3>Subscribers</h3>
      {subs.contacts.length === 0 ? <p className="muted">No subscribers yet. Import a CSV or share the signup form.</p> :
        <ul>{subs.contacts.map(c => <li key={c.email}>{c.email} <span className={c.status}>{c.status}</span></li>)}</ul>}
    </section>
  </main>)
}
function renderPreview(draft, products) {
  const p = products.find(x => x.id === draft.spotlightId)
  return `<div style="font-family:sans-serif;padding:16px">
    <div style="background:#0b2447;color:#fff;padding:12px;border-radius:10px">HooknLoop</div>
    <p>${draft.news || '<em>Add this week&rsquo;s news…</em>'}</p>
    ${p ? `<div style="border:1px solid #e3e7ee;border-radius:12px;padding:10px"><b>${p.title}</b><br>From $${p.price}</div>` : ''}</div>`
}
