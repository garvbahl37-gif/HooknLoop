/*  useInView — true while the element matching `selector` is on screen.
    Used to retire the floating actions and the PDP sticky bar once the footer
    arrives, so nothing fixed ever sits on top of the footer.                   */
import { useState, useEffect } from 'react'

export function useInView(selector, rootMargin = '0px') {
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = document.querySelector(selector)
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin })
    io.observe(el)
    return () => io.disconnect()
  }, [selector, rootMargin])

  return inView
}
