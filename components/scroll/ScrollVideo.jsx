'use client'

import { useEffect, useRef, useState } from 'react'

// ── ScrollVideo ──────────────────────────────────────────────────────────────
// A marketing video that plays while it's in view (and pauses when it leaves, to
// save battery/data).
//
// IMPORTANT: autoplay CANNOT be forced. Browsers block it in several common
// situations even for muted video — iOS Low Power Mode, Chrome Data Saver, some
// in-app browsers, and prefers-reduced-motion. When that happens the poster just
// sits there and looks broken. So we detect the rejected play() and surface a
// real Play button instead of failing silently.
//
//   <ScrollVideo src="/assets/robot/meetherovideo.MP4" poster="/…png" />

export default function ScrollVideo({
  src,
  poster,
  className = '',
  rounded = 24,
  loop = true,
  maxWidth = 860,
  // Stop (or loop back) at this many seconds — for trimming a tail you don't
  // want shown, without re-encoding the file.
  stopAt = null,
  ...rest
}) {
  const wrapRef = useRef(null)
  const videoRef = useRef(null)
  const [revealed, setRevealed] = useState(false)
  const [needsTap, setNeedsTap] = useState(false)   // autoplay was blocked
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const wrap = wrapRef.current
    const video = videoRef.current
    if (!wrap || !video) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    // Try to play, but only once the browser says it can. Calling play() before
    // the media is ready rejects — which is what made the poster + tap button
    // appear even though the file is fine. (This clip's moov atom sits at the
    // END of the file, i.e. not "faststart", so readiness arrives late.)
    const attempt = () => {
      if (video.readyState >= 3) {          // HAVE_FUTURE_DATA — safe to play
        video.play()
          .then(() => { setPlaying(true); setNeedsTap(false) })
          .catch(() => setNeedsTap(true))   // genuinely blocked → offer a tap
        return
      }
      // Not ready yet: nudge the download and retry when it becomes playable.
      video.preload = 'auto'
      try { video.load() } catch { /* ignore */ }
      const onReady = () => {
        video.play()
          .then(() => { setPlaying(true); setNeedsTap(false) })
          .catch(() => setNeedsTap(true))
      }
      video.addEventListener('canplay', onReady, { once: true })
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true)
          if (reduce) { setNeedsTap(true); return } // respect the pref, but let them opt in
          attempt()
        } else {
          video.pause()
          setPlaying(false)
        }
      },
      // Low threshold: on phones the video is often taller than the viewport, so
      // a high threshold (e.g. 0.4) may never be met and it would never start.
      { threshold: 0.15 }
    )
    io.observe(wrap)
    return () => io.disconnect()
  }, [])

  // Enforce `stopAt`: cut the clip short without re-encoding. If the video is
  // set to loop, restart from 0 at that point; otherwise pause on the last frame.
  useEffect(() => {
    const video = videoRef.current
    if (!video || !stopAt) return
    const onTime = () => {
      if (video.currentTime >= stopAt) {
        if (loop) {
          video.currentTime = 0
          video.play().catch(() => {})
        } else {
          video.pause()
          video.currentTime = stopAt
          setPlaying(false)
        }
      }
    }
    video.addEventListener('timeupdate', onTime)
    return () => video.removeEventListener('timeupdate', onTime)
  }, [stopAt, loop])

  function tapToPlay() {
    const video = videoRef.current
    if (!video) return
    // A user gesture satisfies every autoplay policy.
    video.play().then(() => { setPlaying(true); setNeedsTap(false) }).catch(() => {})
  }

  return (
    <div
      ref={wrapRef}
      className={className}
      style={{
        maxWidth, width: '100%', margin: '0 auto', position: 'relative',
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'none' : 'translateY(28px)',
        transition: 'opacity 0.8s cubic-bezier(0.22,1,0.36,1), transform 0.9s cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted
        loop={loop}
        playsInline
        controls={needsTap}          // if we can't autoplay, give them real controls
        preload="metadata"
        onPlay={() => { setPlaying(true); setNeedsTap(false) }}
        onPause={() => setPlaying(false)}
        style={{
          width: '100%', height: 'auto', display: 'block',
          borderRadius: rounded,
          boxShadow: '0 30px 70px rgba(27,43,75,0.22)',
          background: '#000',
        }}
        {...rest}
      />

      {/* Tap-to-play overlay — only when autoplay was actually blocked. */}
      {needsTap && !playing && (
        <button
          onClick={tapToPlay}
          aria-label="Play video"
          style={{
            position: 'absolute', inset: 0, margin: 'auto',
            width: 84, height: 84, borderRadius: '50%',
            background: 'rgba(255,255,255,0.92)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          }}
        >
          <span style={{
            display: 'block', width: 0, height: 0, marginLeft: 6,
            borderTop: '16px solid transparent', borderBottom: '16px solid transparent',
            borderLeft: '26px solid #1B2B4B',
          }} />
        </button>
      )}
    </div>
  )
}
