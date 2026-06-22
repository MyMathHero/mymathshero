import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter, usePathname } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../lib/themeContext'

type Tab = { key: string; label: string; emoji: string; route: string }

const TABS: Tab[] = [
  { key: 'home',     label: 'Home',     emoji: '🏠', route: '/parent/dashboard' },
  { key: 'progress', label: 'Progress', emoji: '📊', route: '/parent/progress' },
  { key: 'reports',  label: 'Reports',  emoji: '📄', route: '/parent/reports' },
  { key: 'account',  label: 'Account',  emoji: '👤', route: '/parent/account' },
]

/**
 * Parent floating bottom navigation — mirrors the student FloatingTabBar
 * (rounded blurred pill, gold active state, bottom fade, haptics). Routes
 * between the parent tabs. Place as the last child of a parent screen's root.
 *
 * Screens should pad their scroll content by ~120px at the bottom.
 */
export default function ParentTabBar() {
  const router = useRouter()
  const pathname = usePathname()
  const insets = useSafeAreaInsets()
  const { colors, themeId } = useTheme()
  const isDark = themeId === 'dark'

  const bg = colors.bgPrimary
  const bgTransparent = bg.length === 7 ? bg + '00' : 'transparent'

  return (
    <>
      <LinearGradient
        pointerEvents="none"
        colors={[bgTransparent, bg, bg]}
        locations={[0, 0.55, 1]}
        style={[styles.bottomFade, { height: insets.bottom + 60 }]}
      />

      <View
        pointerEvents="box-none"
        style={[styles.wrap, { bottom: insets.bottom }]}
      >
        <BlurView
          intensity={isDark ? 75 : 95}
          tint={isDark ? 'dark' : 'light'}
          style={[
            styles.bar,
            {
              backgroundColor: isDark ? 'rgba(20,20,20,0.45)' : 'rgba(255,255,255,0.45)',
              borderColor: colors.cardBorder,
            },
          ]}
        >
          {TABS.map(tab => {
            const isActive = pathname === tab.route ||
              (tab.key === 'home' && pathname === '/parent/dashboard')
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tab,
                  isActive && { backgroundColor: colors.accentGold + (isDark ? '26' : '1F') },
                ]}
                onPress={async () => {
                  try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
                  if (!isActive) router.push(tab.route as any)
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.emoji, isActive && styles.emojiActive]}>{tab.emoji}</Text>
                <Text
                  style={[
                    styles.label,
                    { color: isActive ? colors.navActive : colors.navInactive },
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
    </>
  )
}

const styles = StyleSheet.create({
  bottomFade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  wrap: { position: 'absolute', left: 8, right: 8, alignItems: 'center' },
  bar: {
    flexDirection: 'row', width: '100%', maxWidth: 560,
    borderRadius: 30, borderWidth: 1, padding: 8, gap: 4, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18, shadowRadius: 24, elevation: 12,
  },
  tab: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 2, paddingVertical: 8, borderRadius: 20,
  },
  emoji: { fontSize: 22 },
  emojiActive: { transform: [{ scale: 1.12 }] },
  label: { fontSize: 10, fontWeight: '600' },
  labelActive: { fontWeight: '800' },
})
