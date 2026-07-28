/*  BrandFilm — the finished 60s brand commercial ("The Things That Hold"),
    sitting as the closing beat before the footer.

    Loading discipline matters more than anything else in this component. The
    first cut set autoPlay + preload="metadata" on a 16MB file, and browsers
    that honour autoplay fetch the whole thing regardless of `preload` — so
    every phone visitor downloaded 16MB before they had scrolled anywhere near
    it. That, more than any layout choice, is what made the site feel dead
    under the thumb. So:

      · the <source> is not attached until the section is actually near the
        viewport, so nothing downloads for someone who bounces off the hero;
      · phones get a 3.5MB encode instead of the 16MB one, and only after a
        deliberate tap — a phone on mobile data should never spend megabytes
        on a video it didn't ask for;
      · desktop still autoplays muted (silent motion is the point), but pauses
        the moment it scrolls out of view, so we're never decoding frames
        nobody is looking at;
      · prefers-reduced-motion never autoplays anywhere.                      */
import { useEffect, useRef, useState } from 'react'

const SRC_DESKTOP = '/video/hooknloop-film.mp4'
const SRC_MOBILE = '/video/hooknloop-film-mobile.mp4'

function IconSound({ on }) {
  const c = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }
  return (
    <svg {...c}>
      <path d="M4 9v6h4l5 4V5L8 9H4Z" />
      {on ? <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a9 9 0 0 1 0 12" /> : <path d="M22 9l-5 5M17 9l5 5" />}
    </svg>
  )
}
function IconPlay() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l12-7L8 5Z" /></svg>
}

export default function BrandFilm() {
  const frameRef = useRef(null)
  const videoRef = useRef(null)
  const wantsPlay = useRef(false)

  const [phone, setPhone] = useState(true)   // assume phone until measured — the
  const [reduce, setReduce] = useState(true) // safe default is "don't download"
  const [armed, setArmed] = useState(false)  // has a src been attached yet
  const [muted, setMuted] = useState(true)
  const [showPlay, setShowPlay] = useState(true)

  useEffect(() => {
    setPhone(window.matchMedia('(max-width: 640px)').matches)
    setReduce(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  /*  Desktop only: attach the source once the section is within 300px of the
      viewport. Phones stay unarmed until the visitor taps play.             */
  useEffect(() => {
    if (phone || reduce || armed) return
    const el = frameRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { wantsPlay.current = true; setArmed(true); io.disconnect() }
    }, { rootMargin: '300px' })
    io.observe(el)
    return () => io.disconnect()
  }, [phone, reduce, armed])

  /*  Once a source exists, tie playback to visibility so a video scrolled past
      stops costing decode time.                                              */
  useEffect(() => {
    if (!armed) return
    const el = frameRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => {
      const v = videoRef.current
      if (!v) return
      if (e.isIntersecting && wantsPlay.current) {
        v.play().then(() => setShowPlay(false)).catch(() => setShowPlay(true))
      } else {
        v.pause()
      }
    }, { threshold: 0.2 })
    io.observe(el)
    return () => io.disconnect()
  }, [armed])

  const start = () => {
    wantsPlay.current = true
    if (!armed) { setArmed(true); return }   // effect above starts it once mounted
    const v = videoRef.current
    if (!v) return
    v.play().then(() => setShowPlay(false)).catch(() => setShowPlay(true))
  }

  const toggleSound = () => {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
  }

  return (
    <section className="film" aria-labelledby="film-h">
      <div className="wrap film__wrap">
        <div className="sec-head">
          <span className="sec-eyebrow sec-eyebrow--orange">Our story · 60 seconds</span>
          <h2 id="film-h" className="sec-h2 sec-h2--light">Turns out the smallest connections hold the most.</h2>
        </div>

        <div className="film__frame" ref={frameRef}>
          <video
            ref={videoRef}
            className="film__video"
            muted
            loop
            playsInline
            preload="none"
            poster="/img/film-poster.webp"
            aria-label="HooknLoop brand film — Made to connect"
            onPlay={() => setShowPlay(false)}
            onPause={() => { if (!wantsPlay.current) setShowPlay(true) }}
          >
            {armed && <source src={phone ? SRC_MOBILE : SRC_DESKTOP} type="video/mp4" />}
          </video>

          {showPlay && (
            <button className="film__resume" onClick={start} aria-label="Play the film">
              <IconPlay />
            </button>
          )}

          {armed && !showPlay && (
            <button className="film__sound" onClick={toggleSound} aria-label={muted ? 'Unmute the film' : 'Mute the film'}>
              <IconSound on={!muted} />
            </button>
          )}
        </div>

        <figure className="film__story">
          <span className="film__story-mark" aria-hidden="true">&ldquo;</span>
          <blockquote className="film__story-text">
            <p>Four years ago, HooknLoop began in a single garage warehouse with one simple promise: to make sourcing hook and loop tape effortless.</p>
            <p>Since then, every order, every project and every customer relationship has helped shape who we are today. We’re proud to supply premium hook and loop solutions across Australia, supporting more than 26 industries—from construction to education—across both the public and private sectors, from small retail orders to large-scale wholesale requirements.</p>
            <p>No matter the size of the connection, we believe it matters. Thank you for trusting us to be part of yours.</p>
          </blockquote>
          <figcaption className="film__story-by">Founder, HooknLoop</figcaption>
        </figure>

        <p className="film__tag">HooknLoop. <span>Made to connect.</span></p>
      </div>
    </section>
  )
}
