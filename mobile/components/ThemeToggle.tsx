import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useTheme, THEMES, ThemeId } from '../lib/themeContext'
import * as Haptics from 'expo-haptics'

interface Props {
  compact?: boolean
}

export default function ThemeToggle({ compact = false }: Props) {
  const { themeId, setTheme, colors } = useTheme()

  async function handlePress(id: ThemeId) {
    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
    setTheme(id)
  }

  if (compact) {
    const currentIndex = THEMES.findIndex(t => t.id === themeId)
    const next = THEMES[(currentIndex + 1) % THEMES.length]
    const current = THEMES[currentIndex] || THEMES[0]
    return (
      <TouchableOpacity
        onPress={() => handlePress(next.id)}
        style={[s.compactBtn, {
          backgroundColor: colors.bgCard,
          borderColor: colors.borderColor,
        }]}
      >
        <Text style={s.compactEmoji}>{current.emoji}</Text>
        <Text style={[s.compactLabel, { color: colors.textPrimary }]}>
          {current.label}
        </Text>
      </TouchableOpacity>
    )
  }

  return (
    <View style={[s.container, {
      backgroundColor: colors.bgSecondary,
      borderColor: colors.borderColor,
    }]}>
      {THEMES.map(t => (
        <TouchableOpacity
          key={t.id}
          onPress={() => handlePress(t.id)}
          style={[
            s.themeBtn,
            themeId === t.id && {
              backgroundColor: colors.bgHeader,
              borderColor: colors.accentGold + '80',
            },
          ]}
        >
          <Text style={s.themeEmoji}>{t.emoji}</Text>
          <Text style={[
            s.themeLabel,
            { color: themeId === t.id
              ? colors.accentGold
              : colors.textSecondary }
          ]}>
            {t.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const s = StyleSheet.create({
  compactBtn: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1,
  },
  compactEmoji: { fontSize: 15 },
  compactLabel: { fontSize: 13, fontWeight: '700' },
  container: {
    flexDirection: 'row', borderRadius: 14,
    padding: 3, borderWidth: 1, gap: 3,
  },
  themeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 4,
    borderRadius: 10, paddingVertical: 8,
    paddingHorizontal: 6, borderWidth: 1,
    borderColor: 'transparent',
  },
  themeEmoji: { fontSize: 14 },
  themeLabel: { fontSize: 12, fontWeight: '600' },
})
