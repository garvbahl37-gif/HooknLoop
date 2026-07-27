/*  BrandFilm — the finished 60s brand commercial ("The Things That Hold"),
    always playing (muted/looped, so autoplay is never blocked), with a visible
    sound toggle so the voiceover isn't permanently lost. Sits as the closing
    emotional beat right before the footer. Respects prefers-reduced-motion —
    those visitors get the poster frame, paused, with the same toggle to opt in. */
import { useEffect, useRef, useState } from 'react'

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
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l12-7L8 5Z" /></svg>
}

export default function BrandFilm() {
  const videoRef = useRef(null)
  const [muted, setMuted] = useState(true)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) { v.pause(); setPaused(true) }
  }, [])

  const toggleSound = () => {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
  }

  const resume = () => {
    const v = videoRef.current
    if (!v) return
    v.play()
    setPaused(false)
  }

  return (
    <section className="film" aria-labelledby="film-h">
      <div className="wrap film__wrap">
        <div className="sec-head">
          <span className="sec-eyebrow sec-eyebrow--orange">Our story · 60 seconds</span>
          <h2 id="film-h" className="sec-h2 sec-h2--light">Turns out the smallest connections hold the most.</h2>
        </div>

        <div className="film__frame">
          <video
            ref={videoRef}
            className="film__video"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/img/film-poster.jpg"
            aria-label="HooknLoop brand film — Made to connect"
          >
            <source src="/video/hooknloop-film.mp4" type="video/mp4" />
          </video>

          {paused && (
            <button className="film__resume" onClick={resume} aria-label="Play the film">
              <IconPlay />
            </button>
          )}

          <button className="film__sound" onClick={toggleSound} aria-label={muted ? 'Unmute the film' : 'Mute the film'}>
            <IconSound on={!muted} />
          </button>
        </div>

        <figure className="film__story">
          <span className="film__story-mark" aria-hidden="true">&ldquo;</span>
          <blockquote className="film__story-text">
            We started four years ago with a single garage warehouse and a simple promise: make sourcing hook and loop
            tape effortless. Today HooknLoop supplies premium hook and loop solutions right across Australia, trusted
            by more than 26 industries in both private and government sectors — retail and wholesale alike.
          </blockquote>
          <figcaption className="film__story-by">Founder, HooknLoop</figcaption>
        </figure>

        <p className="film__tag">HooknLoop. <span>Made to connect.</span></p>
      </div>
    </section>
  )
}
