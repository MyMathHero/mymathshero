'use client'
import { useState, useEffect } from 'react'

export default function LoadingScreen() {
  const [show, setShow] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Only show the splash once per browser session — otherwise it would
    // re-appear on every client-side navigation and block clicks.
    let alreadyShown = false
    try { alreadyShown = sessionStorage.getItem('mmh_splash_shown') === '1' } catch {}
    if (alreadyShown) return
    setShow(true)
    const timer = setTimeout(() => {
      setShow(false)
      try { sessionStorage.setItem('mmh_splash_shown', '1') } catch {}
    }, 2500)
    return () => clearTimeout(timer)
  }, [])

  if (!mounted || !show) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: '#F0F4F8',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      pointerEvents: 'none',
    }}>
      <video
        src="/assets/robot/webloading.MP4"
        autoPlay
        muted
        playsInline
        style={{ width: 220, mixBlendMode: 'multiply' }}
      />
      <p style={{
        color: '#1B2B4B',
        fontWeight: 700,
        fontSize: 18,
        marginTop: 16,
      }}>
        MyMaths<span style={{ color: '#C49A1A' }}>Hero</span>
      </p>
    </div>
  )
}
