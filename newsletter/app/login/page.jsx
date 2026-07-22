'use client'
import { useState } from 'react'
export default function Login() {
  const [pw, setPw] = useState(''); const [err, setErr] = useState('')
  async function submit(e) {
    e.preventDefault()
    const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) })
    if (r.ok) location.href = '/'; else setErr('Wrong password')
  }
  return (<main style={{maxWidth:320,margin:'80px auto',padding:24}}>
    <h1 style={{color:'#0b2447'}}>HooknLoop Newsletter</h1>
    <form onSubmit={submit}>
      <input type="password" placeholder="Dashboard password" value={pw} onChange={e=>setPw(e.target.value)} />
      <button style={{marginTop:12,background:'#e8590c',color:'#fff',border:0,padding:'10px 16px'}}>Sign in</button>
      {err && <p style={{color:'#c0392b'}}>{err}</p>}
    </form></main>)
}
