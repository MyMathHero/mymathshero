import { useEffect, useRef } from 'react'
import { View, Text, Animated, Easing, StyleSheet, Dimensions } from 'react-native'

// Reward-collection animation (feedback report #2/#3): on a correct answer, a
// combo message + coin/XP particles burst from the answer area and fly up toward
// the header (where coins/Hero-Points live), then fade. Purely visual overlay.
//
// Render once: <RewardBurst burst={burst} />. Set `burst` to
// { id, xp, coins, message } to fire (id makes each trigger unique).

export type Burst = { id: number; xp: number; coins: number; message: string } | null

const { width } = Dimensions.get('window')
const COINS = 5
const XPS = 4

function Particle({ emoji, delay, targetX, targetY, startX }: {
  emoji: string; delay: number; targetX: number; targetY: number; startX: number
}) {
  const p = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(p, {
      toValue: 1, duration: 950, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start()
  }, [p, delay])
  const translateX = p.interpolate({ inputRange: [0, 1], outputRange: [startX, targetX] })
  const translateY = p.interpolate({ inputRange: [0, 1], outputRange: [0, targetY] })
  const opacity = p.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] })
  const scale = p.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.8] })
  return (
    <Animated.Text style={{ position: 'absolute', fontSize: 24, opacity, transform: [{ translateX }, { translateY }, { scale }] }}>
      {emoji}
    </Animated.Text>
  )
}

export default function RewardBurst({ burst }: { burst: Burst }) {
  const msg = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!burst) return
    msg.setValue(0)
    Animated.sequence([
      Animated.timing(msg, { toValue: 1, duration: 250, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }),
      Animated.delay(700),
      Animated.timing(msg, { toValue: 2, duration: 400, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start()
  }, [burst, msg])

  if (!burst) return null

  // Fly up and toward the top-right corner (header coins / Hero Points).
  const targetX = width * 0.38
  const targetY = -260

  const msgOpacity = msg.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 1, 0] })
  const msgScale = msg.interpolate({ inputRange: [0, 1, 2], outputRange: [0.6, 1.1, 1] })
  const msgY = msg.interpolate({ inputRange: [0, 1, 2], outputRange: [0, -10, -50] })

  return (
    <View pointerEvents="none" style={styles.overlay}>
      <View style={styles.center}>
        {Array.from({ length: COINS }).map((_, i) => (
          <Particle key={`c${i}`} emoji="🪙" delay={i * 50}
            startX={(Math.random() * 60 - 30)} targetX={targetX + (Math.random() * 30 - 15)} targetY={targetY + (Math.random() * 24 - 12)} />
        ))}
        {Array.from({ length: XPS }).map((_, i) => (
          <Particle key={`x${i}`} emoji="⚡" delay={80 + i * 50}
            startX={(Math.random() * 60 - 30)} targetX={targetX + (Math.random() * 30 - 15)} targetY={targetY + (Math.random() * 24 - 12)} />
        ))}
        <Animated.Text style={[styles.msg, { opacity: msgOpacity, transform: [{ scale: msgScale }, { translateY: msgY }] }]}>
          {burst.message}
        </Animated.Text>
        <Animated.View style={[styles.values, { opacity: msgOpacity }]}>
          {burst.xp > 0 && <Text style={styles.xpVal}>+{burst.xp} ⚡</Text>}
          {burst.coins > 0 && <Text style={styles.coinVal}>+{burst.coins} 🪙</Text>}
        </Animated.View>
      </View>
    </View>
  )
}

// Combo message for a run of consecutive correct answers (#2).
export function comboMessage(combo: number, opts: { fast?: boolean; newBest?: boolean } = {}): string {
  const { fast = false, newBest = false } = opts
  if (newBest && combo >= 3) return `🏆 New Best — ${combo} in a row!`
  if (combo >= 10) return `🌟 Unstoppable! ${combo} in a row!`
  if (combo >= 5) return `🔥 ${combo} in a row!`
  if (combo >= 3) return `🔥 ${combo} correct!`
  if (fast) return '⚡ Lightning fast!'
  if (combo === 2) return 'Nice — 2 in a row!'
  return 'Correct! ✅'
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 4000, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  msg: { fontSize: 22, fontWeight: '900', color: '#fff', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 8, textShadowOffset: { width: 0, height: 2 } },
  values: { flexDirection: 'row', gap: 14, marginTop: 6 },
  xpVal: { fontSize: 18, fontWeight: '900', color: '#FBBF24' },
  coinVal: { fontSize: 18, fontWeight: '900', color: '#FCD34D' },
})
