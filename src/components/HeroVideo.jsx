import { useCallback, useEffect, useState } from 'react'

/**
 * A silent looping clip in a band across the top of a page.
 *
 * This is meant to be watched, not felt. An earlier version blurred these into
 * an atmospheric backdrop, which made them cheap and pointless at the same
 * time: the footage is the reason they are here, so it stays sharp and gets a
 * band of its own rather than sitting behind the copy.
 *
 * The only thing overlaid is a fade at the bottom edge, so the band settles
 * into the page instead of ending on a hard line. Text goes below the video,
 * never on top of it — text over moving footage cannot hold a contrast ratio,
 * because the footage keeps changing underneath it.
 *
 * Reduced motion gets the poster and no video element at all, so the file is
 * never fetched rather than fetched and hidden.
 */
export default function HeroVideo({ name, label }) {
  const [playsVideo, setPlaysVideo] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined

    const still = window.matchMedia('(prefers-reduced-motion: reduce)')
    const decide = () => setPlaysVideo(!still.matches)

    decide()
    still.addEventListener('change', decide)
    return () => still.removeEventListener('change', decide)
  }, [])

  // React applies `muted` as a property after the element is attached, so the
  // browser evaluates its autoplay policy against a video that is still
  // unmuted at that instant and refuses to start. Setting it on the node before
  // asking it to play is what makes autoplay actually happen.
  //
  // Asking once is also not enough: at mount readyState is often 0, the play()
  // promise rejects against an element with nothing buffered, and a swallowed
  // rejection leaves a permanently paused video showing its poster. Ask again
  // once there is data. The listener removes itself when playback starts.
  const attachVideo = useCallback((node) => {
    if (!node) return
    node.muted = true
    node.defaultMuted = true

    const attempt = () => {
      const started = node.play()
      if (started && typeof started.catch === 'function') started.catch(() => {})
    }
    const onPlaying = () => {
      node.removeEventListener('canplay', attempt)
      node.removeEventListener('loadeddata', attempt)
      node.removeEventListener('playing', onPlaying)
    }

    node.addEventListener('canplay', attempt)
    node.addEventListener('loadeddata', attempt)
    node.addEventListener('playing', onPlaying)
    attempt()
  }, [])

  const poster = `/ambient/${name}.jpg`

  return (
    <div className="hero-video">
      {playsVideo ? (
        <video
          ref={attachVideo}
          className="hero-video__media"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={poster}
          tabIndex={-1}
          aria-label={label}
        >
          <source src={`/ambient/${name}.webm`} type="video/webm" />
          <source src={`/ambient/${name}.mp4`} type="video/mp4" />
        </video>
      ) : (
        <img className="hero-video__media" src={poster} alt={label} width="1280" height="720" decoding="async" />
      )}
      <div className="hero-video__fade" aria-hidden="true" />
    </div>
  )
}
