import { NextResponse } from 'next/server'
// Middleware runs on the Edge runtime (no node:crypto), so this is a cheap presence
// check only — the real HMAC verification happens in requireSession() on the Node
// API routes that actually return data.
const COOKIE = 'nl_session'
export function middleware(request) {
  const c = request.cookies.get(COOKIE)?.value
  if (request.nextUrl.pathname === '/' && (!c || !c.startsWith('owner.')))
    return NextResponse.redirect(new URL('/login', request.url))
  return NextResponse.next()
}
export const config = { matcher: ['/'] }
