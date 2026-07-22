'use client'
import { useState } from 'react'
import './login.css'

function Mark() {
  return (
    <svg width="40" height="40" viewBox="0 0 28 28" fill="none" aria-hidden="true">
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

export default function Login() {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(e) {
    e.preventDefault()
    setErr(''); setBusy(true)
    const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) })
    setBusy(false)
    if (r.ok) location.href = '/'; else setErr('That password didn’t match. Check for a stray space.')
  }
  return (
    <main className="login">
      <form className="login__card" onSubmit={submit}>
        <Mark />
        <h1 className="login__title">Hook<b>n</b>Loop</h1>
        <p className="login__sub">Newsletter control panel</p>
        <label className="eyebrow" htmlFor="pw">Dashboard password</label>
        <input id="pw" type="password" autoFocus value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••••" />
        <button className="btn btn--primary" disabled={busy}>{busy ? 'Checking…' : 'Sign in'}</button>
        {err && <p className="login__err" role="alert">{err}</p>}
      </form>
    </main>
  )
}
