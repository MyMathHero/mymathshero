'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import AskHeroLauncher from './AskHeroLauncher'

// A floating, DRAGGABLE Ask Hero launcher — kids can pick it up and drop it
// anywhere on screen. A tap (no real movement) opens Hero; a drag repositions it.
// The chosen spot is remembered (localStorage) and clamped to the viewport so it
// can never be lost off-screen. Touch + mouse via Pointer Events.
//
// Position is stored as an {x, y} top-left in px. If none is saved yet we start
// from the default bottom-right corner (matching the old fixed placement).

const STORAGE_KEY = 'askhero_launcher_pos'
const DRAG_THRESHOLD = 6 // px of movement before a press becomes a drag (not a tap)

export default function DraggableAskHero({ size = 92, onOpen }) {
  const btnRef = useRef(null)
  // null until we've measured the viewport and resolved a starting position.
  const [pos, setPos] = useState(null)
  const [dragging, setDragging] = useState(false)

  // Pointer bookkeeping (refs so handlers stay stable and don't re-render mid-drag).
  const startRef = useRef({ px: 0, py: 0, ox: 0, oy: 0 })
  const movedRef = useRef(false)
  const marginRef = useRef(12) // keep this much gap from every edge

  // Clamp an {x,y} to the current viewport so the button stays fully visible.
  const clamp = useCallback((x, y) => {
    const m = marginRef.current
    const maxX = (typeof window !== 'undefined' ? window.innerWidth : 0) - size - m
    const maxY = (typeof window !== 'undefined' ? window.innerHeight : 0) - size - m
    return {
      x: Math.max(m, Math.min(x, Math.max(m, maxX))),
      y: Math.max(m, Math.min(y, Math.max(m, maxY))),
    }
  }, [size])

  // Resolve the initial position: saved spot, else default bottom-right (~where
  // the old fixed button sat: right:18, bottom:120).
  useEffect(() => {
    if (typeof window === 'undefined') return
    let start = null
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
      if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) start = saved
    } catch { /* ignore bad json */ }
    if (!start) {
      start = { x: window.innerWidth - size - 18, y: window.innerHeight - size - 120 }
    }
    setPos(clamp(start.x, start.y))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep it on-screen if the window is resized/rotated.
  useEffect(() => {
    if (!pos) return
    const onResize = () => setPos(p => (p ? clamp(p.x, p.y) : p))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [pos, clamp])

  const onPointerDown = (e) => {
    if (!pos) return
    movedRef.current = false
    startRef.current = { px: e.clientX, py: e.clientY, ox: pos.x, oy: pos.y }
    setDragging(true)
    try { btnRef.current?.setPointerCapture?.(e.pointerId) } catch {}
  }

  const onPointerMove = (e) => {
    if (!dragging) return
    const dx = e.clientX - startRef.current.px
    const dy = e.clientY - startRef.current.py
    if (!movedRef.current && Math.hypot(dx, dy) > DRAG_THRESHOLD) movedRef.current = true
    if (movedRef.current) {
      setPos(clamp(startRef.current.ox + dx, startRef.current.oy + dy))
    }
  }

  const endDrag = (e) => {
    if (!dragging) return
    setDragging(false)
    try { btnRef.current?.releasePointerCapture?.(e.pointerId) } catch {}
    if (movedRef.current) {
      // It was a DRAG → persist the new spot, swallow the click.
      setPos(p => {
        if (p) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)) } catch {} }
        return p
      })
    } else {
      // No real movement → treat as a TAP → open Hero.
      onOpen?.()
    }
  }

  if (!pos) return null

  return (
    <button
      ref={btnRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      // Prevent the browser's native drag/scroll while dragging the button.
      onContextMenu={(e) => e.preventDefault()}
      title="Ask Hero — drag me anywhere!"
      aria-label="Ask Hero (draggable)"
      style={{
        position: 'fixed',
        left: pos.x, top: pos.y,
        background: 'transparent', border: 'none', padding: 0,
        cursor: dragging ? 'grabbing' : 'grab',
        zIndex: 200,
        touchAction: 'none', // let us handle the drag, not the browser
        WebkitUserSelect: 'none', userSelect: 'none',
        transform: dragging ? 'scale(1.06)' : 'scale(1)',
        transition: dragging ? 'none' : 'transform 0.15s ease',
        filter: dragging ? 'drop-shadow(0 12px 24px rgba(0,0,0,0.35))' : 'none',
      }}
    >
      <AskHeroLauncher size={size} />
    </button>
  )
}
