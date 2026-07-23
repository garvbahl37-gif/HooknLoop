import { useState, useEffect } from 'react'
import Icon from './Icon.jsx'

/* Floating call-us button, fixed bottom-left. Hidden at the very top of the page,
   slides in once you start scrolling; expands a small tag on hover. */
export default function CallButton() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 220)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <a className={'callbtn' + (show ? ' is-visible' : '')} href="tel:1300183481"
      aria-label="Call us on 1300 183 481" tabIndex={show ? 0 : -1} aria-hidden={!show}>
      <span className="callbtn__ic"><Icon name="phone" size={20} /></span>
      <span className="callbtn__txt">
        <em className="callbtn__tag">Free expert advice</em>
        <b>Call us</b>
        <em className="num callbtn__num">1300 183 481</em>
      </span>
    </a>
  )
}
