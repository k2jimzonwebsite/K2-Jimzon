import { useCallback, useEffect, useState } from 'react'

/**
 * A dimmed, pre-blurred clip sitting inside the storefront's wood canvas.
 *
 * The brand layer in index.css is marked non-negotiable, so this never replaces
 * the canvas — it blends into it. In light mode the clip multiplies into the
 * wood grain the way the grain itself does; in dark mode it lightens the ground
 * instead. Either way it stays behind a scrim, because the page's job is a form
 * and the backdrop's job is to be barely noticed.
 *
 * The blur is baked into the file rather than applied here: a CSS filter over a
 * playing video repaints every frame on the GPU, which is the cost a mid-range
 * phone cannot absorb. See scripts/prepare-ambient-video.mjs.
 *
 * Nothing loads until it is wanted. Phones and anyone asking for reduced motion
 * get the 5 KB poster and no video element at all, so the request is never made
 * rather than made and hidden.
 */
export default function AmbientBackdrop({ name }) {
  const [playsVideo, setPlaysVideo] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined

    // Wide enough to be a laptop, and not asking for stillness. Checked
    // together so a resize or an OS motion-preference change re-decides.
    const wide = window.matchMedia('(min-width: 768px)')
    const still = window.matchMedia('(prefers-reduced-motion: reduce)')
    const decide = () => setPlaysVideo(wide.matches && !still.matches)

    decide()
    wide.addEventListener('change', decide)
    still.addEventListener('change', decide)
    return () => {
      wide.removeEventListener('change', decide)
      still.removeEventListener('change', decide)
    }
  }, [])

  // React applies `muted` as a property after the element is attached, so the
  // browser evaluates its autoplay policy against a video that is still
  // unmuted at that instant and refuses to start. Setting it on the node before
  // asking it to play is what makes autoplay actually happen. The play() promise
  // is caught rather than left dangling: a browser is allowed to refuse anyway,
  // and the poster frame is already the right thing to show when it does.
  const attachVideo = useCallback((node) => {
    if (!node) return
    node.muted = true
    node.defaultMuted = true

    // Asking once on mount is not enough: at that moment readyState is often 0,
    // the play() promise rejects against an element with nothing buffered, and
    // a swallowed rejection leaves a permanently paused video showing its
    // poster. Ask again once there is data. `canplay` fires on every source
    // that becomes playable, so this also covers a WebM that fails over to the
    // MP4. The listener removes itself the moment playback actually starts.
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
    <div className="ambient-backdrop" aria-hidden="true">
      {playsVideo ? (
        <video
          ref={attachVideo}
          className="ambient-backdrop__media"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={poster}
          tabIndex={-1}
        >
          <source src={`/ambient/${name}.webm`} type="video/webm" />
          <source src={`/ambient/${name}.mp4`} type="video/mp4" />
        </video>
      ) : (
        <img className="ambient-backdrop__media" src={poster} alt="" loading="lazy" decoding="async" />
      )}
      <div className="ambient-backdrop__scrim" />
    </div>
  )
}
