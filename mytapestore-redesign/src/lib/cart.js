/*  Cart + wishlist + tiny hash router + money/variant helpers.
    Fully client-side: persists to localStorage, notifies subscribers so the
    header count and cart page stay live. Checkout is a faithful mock.          */
import { useState, useEffect } from 'react'

/* — money ------------------------------------------------------------------ */
export const money = (n) =>
  '$' + (Number(n) || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/* — variant helpers -------------------------------------------------------- */
// Find the variation whose attributes match the current selection on every axis.
export function variantFor(product, selection) {
  const vs = product.variations || []
  if (!vs.length) return null
  const axes = (product.axes || []).map((a) => a.name)
  return (
    vs.find((v) => axes.every((ax) => (v.attrs[ax] || '') === (selection[ax] || ''))) || null
  )
}
// Sensible default selection: the attributes of the first in-stock (or first) variation.
export function defaultSelection(product) {
  const vs = product.variations || []
  const v = vs.find((x) => x.inStock) || vs[0]
  return v ? { ...v.attrs } : {}
}
export const fromPrice = (p) => (p.from != null ? p.from : p.price)
export const hasRange = (p) => p.min != null && p.max != null && p.min !== p.max

/* — cart -------------------------------------------------------------------- */
const KEY = 'mts_cart_v1'
let listeners = []
export function getCart() {
  try { return JSON.parse(localStorage.getItem(KEY)) || [] } catch { return [] }
}
function save(cart) {
  localStorage.setItem(KEY, JSON.stringify(cart))
  listeners.forEach((l) => l(cart))
}
export function addToCart(item) {
  const cart = getCart()
  const i = cart.findIndex((x) => x.key === item.key)
  if (i >= 0) cart[i].qty += item.qty
  else cart.push({ ...item })
  save(cart)
}
export function setQty(key, qty) {
  save(getCart().map((x) => (x.key === key ? { ...x, qty } : x)).filter((x) => x.qty > 0))
}
export function removeItem(key) { save(getCart().filter((x) => x.key !== key)) }
export function clearCart() { save([]) }
export const cartCount = (cart = getCart()) => cart.reduce((n, x) => n + x.qty, 0)
export const cartTotal = (cart = getCart()) => cart.reduce((n, x) => n + x.price * x.qty, 0)
export function useCart() {
  const [cart, setCart] = useState(getCart)
  useEffect(() => {
    const fn = (c) => setCart(c)
    listeners.push(fn)
    return () => { listeners = listeners.filter((l) => l !== fn) }
  }, [])
  return cart
}

/* — wishlist (lightweight, same pattern) ----------------------------------- */
const WKEY = 'mts_wish_v1'
let wl = []
export function getWish() { try { return JSON.parse(localStorage.getItem(WKEY)) || [] } catch { return [] } }
function wsave(list) { localStorage.setItem(WKEY, JSON.stringify(list)); wl.forEach((l) => l(list)) }
export function toggleWish(handle) {
  const s = new Set(getWish())
  s.has(handle) ? s.delete(handle) : s.add(handle)
  wsave([...s])
}
export function useWish() {
  const [list, setList] = useState(getWish)
  useEffect(() => { const fn = (l) => setList(l); wl.push(fn); return () => { wl = wl.filter((x) => x !== fn) } }, [])
  return list
}

/* — hash router ------------------------------------------------------------- */
export function navigate(hash) {
  window.location.hash = hash
  window.scrollTo(0, 0)
}
export function useRoute() {
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const fn = () => setHash(window.location.hash)
    window.addEventListener('hashchange', fn)
    return () => window.removeEventListener('hashchange', fn)
  }, [])
  const clean = hash.replace(/^#\/?/, '')
  const [route, ...rest] = clean.split('/')
  return { route: route || 'home', param: decodeURIComponent(rest.join('/') || '') }
}
