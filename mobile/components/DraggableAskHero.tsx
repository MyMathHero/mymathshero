import { useEffect, useRef, useState } from 'react'
import { Animated, PanResponder, useWindowDimensions } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import AskHeroIcon from './AskHeroIcon'

// Floating, DRAGGABLE Ask Hero launcher (mobile mirror of web DraggableAskHero).
// Kids can pick it up and drop it anywhere. A tap (no real movement) opens Hero;
// a drag repositions it. The spot is remembered (SecureStore) and clamped to the
// screen so it can never be lost off-screen. Uses built-in PanResponder/Animated
// (no extra gesture deps).

const STORE_KEY = 'askhero_launcher_pos'
const DRAG_THRESHOLD = 6 // px before a press becomes a drag (not a tap)

type Props = {
  size?: number
  onOpen: () => void
  // Fallback distance from the bottom (clears the docked nav) for the first-run
  // default position; matches the old fixed placement.
  defaultBottom?: number
}

export default function DraggableAskHero({ size = 56, onOpen, defaultBottom = 84 }: Props) {
  const { width: winW, height: winH } = useWindowDimensions()
  const margin = 12
  const box = size + 20 // the launcher badge draws slightly larger than `size`

  const clamp = (x: number, y: number) => ({
    x: Math.max(margin, Math.min(x, winW - box - margin)),
    y: Math.max(margin, Math.min(y, winH - box - margin)),
  })

  const pos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current
  const posValue = useRef({ x: 0, y: 0 })
  const moved = useRef(false)
  const [ready, setReady] = useState(false)

  // Track the live value so PanResponder can offset from it.
  useEffect(() => {
    const id = pos.addListener((v) => { posValue.current = v })
    return () => pos.removeListener(id)
  }, [pos])

  // Resolve the starting position: saved spot, else default bottom-right.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let start: { x: number; y: number } | null = null
      try {
        const raw = await SecureStore.getItemAsync(STORE_KEY)
        const saved = raw ? JSON.parse(raw) : null
        if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) start = saved
      } catch { /* ignore */ }
      if (!start) start = { x: winW - box - 18, y: winH - box - defaultBottom }
      const c = clamp(start.x, start.y)
      if (cancelled) return
      pos.setValue(c)
      posValue.current = c
      setReady(true)
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep on-screen when the window changes (rotation).
  useEffect(() => {
    if (!ready) return
    const c = clamp(posValue.current.x, posValue.current.y)
    pos.setValue(c)
    posValue.current = c
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winW, winH])

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g) => Math.hypot(g.dx, g.dy) > DRAG_THRESHOLD,
      onPanResponderGrant: () => {
        moved.current = false
        // Freeze the current position as the offset, then drag from zero.
        pos.setOffset({ x: posValue.current.x, y: posValue.current.y })
        pos.setValue({ x: 0, y: 0 })
      },
      onPanResponderMove: (e, g) => {
        if (!moved.current && Math.hypot(g.dx, g.dy) > DRAG_THRESHOLD) moved.current = true
        Animated.event([null, { dx: pos.x, dy: pos.y }], { useNativeDriver: false })(e, g)
      },
      onPanResponderRelease: () => {
        pos.flattenOffset()
        if (moved.current) {
          // Drag → clamp into view + persist.
          const c = clamp(posValue.current.x, posValue.current.y)
          Animated.spring(pos, { toValue: c, useNativeDriver: false, friction: 7 }).start()
          posValue.current = c
          SecureStore.setItemAsync(STORE_KEY, JSON.stringify(c)).catch(() => {})
        } else {
          // No real movement → tap → open Hero.
          onOpen()
        }
      },
    })
  ).current

  if (!ready) return null

  return (
    <Animated.View
      {...responder.panHandlers}
      style={{
        position: 'absolute',
        zIndex: 100,
        transform: pos.getTranslateTransform(),
      }}
      accessibilityRole="button"
      accessibilityLabel="Ask Hero (draggable)"
    >
      <AskHeroIcon size={size} badge />
    </Animated.View>
  )
}
