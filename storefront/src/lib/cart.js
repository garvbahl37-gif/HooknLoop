/*  Functional cart — persists to localStorage, notifies subscribers so the
    header count and cart page update live. No backend (checkout is a mock).    */
import { useState, useEffect } from 'react'

const KEY = 'hnl_cart_v1'
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
export function cartCount(cart = getCart()) { return cart.reduce((n, x) => n + x.qty, 0) }
export function cartTotal(cart = getCart()) { return cart.reduce((n, x) => n + x.price * x.qty, 0) }

export function useCart() {
  const [cart, setCart] = useState(getCart)
  useEffect(() => {
    const fn = (c) => setCart(c)
    listeners.push(fn)
    return () => { listeners = listeners.filter((l) => l !== fn) }
  }, [])
  return cart
}

/* mini-cart drawer — opens automatically right after Add to cart */
let drawerListeners = []
let drawerOpen = false
export function openCartDrawer() { drawerOpen = true; drawerListeners.forEach((l) => l(true)) }
export function closeCartDrawer() { drawerOpen = false; drawerListeners.forEach((l) => l(false)) }
export function useCartDrawer() {
  const [open, setOpen] = useState(drawerOpen)
  useEffect(() => {
    const fn = (v) => setOpen(v)
    drawerListeners.push(fn)
    return () => { drawerListeners = drawerListeners.filter((l) => l !== fn) }
  }, [])
  return open
}

/* tiny hash router helper */
export function navigate(hash) { window.location.hash = hash; window.scrollTo(0, 0) }
export function useRoute() {
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const fn = () => setHash(window.location.hash)
    window.addEventListener('hashchange', fn)
    return () => window.removeEventListener('hashchange', fn)
  }, [])
  const clean = hash.replace(/^#\/?/, '')
  const [route, param] = clean.split('/')
  return { route: route || 'home', param: param || '' }
}
