/*  Wishlist — same shape as the cart: localStorage-backed, notifies subscribers
    so the header count and the wishlist page update live. Stores handles only;
    product detail is looked up from the catalog at render time.                 */
import { useState, useEffect } from 'react'

const KEY = 'hnl_wishlist_v1'
let listeners = []

export function getWishlist() {
  try { return JSON.parse(localStorage.getItem(KEY)) || [] } catch { return [] }
}
function save(list) {
  localStorage.setItem(KEY, JSON.stringify(list))
  listeners.forEach((l) => l(list))
}
export function toggleWish(handle) {
  const list = getWishlist()
  save(list.includes(handle) ? list.filter((h) => h !== handle) : [...list, handle])
}
export function removeWish(handle) { save(getWishlist().filter((h) => h !== handle)) }
export function wishCount(list = getWishlist()) { return list.length }

export function useWishlist() {
  const [list, setList] = useState(getWishlist)
  useEffect(() => {
    const fn = (l) => setList(l)
    listeners.push(fn)
    return () => { listeners = listeners.filter((l) => l !== fn) }
  }, [])
  return list
}
