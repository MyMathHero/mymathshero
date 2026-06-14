import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { BlurView } from 'expo-blur'
import { useRouter, usePathname } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../lib/themeContext'

type Tab = { key: string; label: string; emoji: string; route: string }

const TABS: Tab[] = [
  { key: 'home',    label: 'Home',    emoji: '🏠', route: '/student/dashboard' },
  { key: 'league',  label: 'League',  emoji: '🏆', route: '/student/league' },
  { key: 'arcade',  label: 'Arcade',  emoji: '🕹️', route: '/student/arcade' },
  { key: 'profile', label: 'Profile', emoji: '👤', route: '/student/profile' },
]

/**
 * Floating glassy bottom navigation. Renders as an absolutely-positioned pill
 * that hovers above the screen content (detached from all edges), mirroring the
 * web student dashboard. Place it as the last child of a screen's root view.
 *
 * Screens should pad their scroll content by ~110px at the bottom so the last
 * items aren't hidden behind the floating bar.
 */
export default function FloatingTabBar() {
  const router = useRouter()
  const pathname = usePathname()
  const insets = useSafeAreaInsets()
  const { colors, themeId } = useTheme()
  const isDark = themeId === 'dark'

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: insets.bottom + 12 }]}
    >
      <BlurView
        intensity={isDark ? 40 : 60}
        tint={isDark ? 'dark' : 'light'}
        style={[
          styles.bar,
          {
            backgroundColor: isDark
              ? 'rgba(30,45,66,0.55)'
              : 'rgba(255,255,255,0.55)',
            borderColor: isDark
              ? 'rgba(255,255,255,0.12)'
              : 'rgba(255,255,255,0.6)',
          },
        ]}
      >
        {TABS.map(tab => {
          const isActive =
            pathname === tab.route ||
            (tab.key === 'home' &&
              (pathname === '/student/dashboard' || pathname === '/'))
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                isActive && {
                  backgroundColor: isDark
                    ? 'rgba(196,154,26,0.22)'
                    : 'rgba(196,154,26,0.16)',
                },
              ]}
              onPress={async () => {
                try {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                } catch {}
                if (!isActive) router.push(tab.route as any)
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.emoji, isActive && styles.emojiActive]}>
                {tab.emoji}
              </Text>
              <Text
                style={[
                  styles.label,
                  { color: isActive ? colors.accentGold : colors.textMuted },
                  isActive && styles.labelActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </BlurView>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 480,
    borderRadius: 28,
    borderWidth: 1,
    padding: 8,
    gap: 4,
    overflow: 'hidden',
    // soft floating shadow
    shadowColor: '#0F1620',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 8,
    borderRadius: 20,
  },
  emoji: { fontSize: 22 },
  emojiActive: { transform: [{ scale: 1.12 }] },
  label: { fontSize: 10, fontWeight: '600' },
  labelActive: { fontWeight: '800' },
})
