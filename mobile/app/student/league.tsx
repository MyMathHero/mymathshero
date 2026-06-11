import { useState, useEffect, useMemo} from 'react'
import { View, Text, ScrollView, StyleSheet,
  ActivityIndicator, TouchableOpacity } from 'react-native'
import { useTheme, ThemeColors } from '../../lib/themeContext'
import { useRouter, usePathname } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import * as Haptics from 'expo-haptics'
import { studentAPI } from '../../lib/api'
import { SafeAreaView } from 'react-native-safe-area-context'
import HeroRobot from '../../components/HeroRobot'
import { theme } from '../../lib/theme'

export default function League() {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const router = useRouter()
  const pathname = usePathname()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [myId, setMyId] = useState('')
  const medals = ['🥇', '🥈', '🥉']

  useEffect(() => {
    async function load() {
      const id = await SecureStore.getItemAsync('user_id') || ''
      setMyId(id)
      try {
        const res = await studentAPI.leaderboard(id)
        setData(res.data)
      } catch {}
      finally { setLoading(false) }
    }
    load()
  }, [])

  // Find this student's rank in the leaderboard, 1-indexed. 999 if not found.
  const leaderboard: any[] = data?.leaderboard || []
  const userIndex = leaderboard.findIndex((e: any) => e.studentId === myId)
  const userRank = userIndex >= 0 ? userIndex + 1 : 999
  const topThree = userRank <= 3

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerTopRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <View style={{ width: 48 }} />
      </View>

      {/* Celebratory header with robot — celebrating if top 3 */}
      <View style={styles.heroHeader}>
        <HeroRobot mood={topThree ? 'celebrating' : 'waving'} size={70} containerStyle="circle" />
        <Text style={styles.heroHeaderTitle}>Hero League 🏆</Text>
        <Text style={styles.heroHeaderSub}>
          {topThree ? `You're #${userRank} this month — keep it up!` : 'Top heroes this month'}
        </Text>
      </View>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#C49A1A" size="large" />
        </View>
      ) : (
        <ScrollView style={styles.scroll}>
          <Text style={styles.resetText}>Resets monthly · Top 10 win prizes!</Text>
          {(data?.leaderboard || []).map((entry: any, i: number) => (
            <View key={i} style={[styles.row, entry.studentId === myId && styles.rowMe]}>
              <Text style={styles.rank}>{i < 3 ? medals[i] : `#${i + 1}`}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{entry.name}</Text>
                <Text style={styles.grade}>Grade {entry.grade} · Maths</Text>
              </View>
              <Text style={styles.points}>{entry.xp} pts</Text>
            </View>
          ))}
          {(!data?.leaderboard || data.leaderboard.length === 0) && (
            <Text style={styles.resetText}>No leaderboard data yet — start practising to climb!</Text>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Bottom tab bar — mirrors student/dashboard so navigation is
          consistent. SafeAreaView's bottom edge gives us safe-area padding
          automatically; the tabBar style adds extra room for the home
          indicator on devices without a bottom edge. */}
      <View style={styles.tabBar}>
        {[
          { key: 'home',    label: 'Home',    emoji: '🏠', route: '/student/dashboard' },
          { key: 'league',  label: 'League',  emoji: '🏆', route: '/student/league' },
          { key: 'arcade',  label: 'Arcade',  emoji: '🕹️', route: '/student/arcade' },
          { key: 'profile', label: 'Profile', emoji: '👤', route: '/student/profile' },
        ].map(tab => {
          const isActive = pathname === tab.route
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tab}
              onPress={async () => {
                try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
                if (!isActive) router.push(tab.route as any)
              }}
              activeOpacity={0.7}
            >
              {isActive && <View style={styles.tabIndicator} />}
              <Text style={styles.tabEmoji}>{tab.emoji}</Text>
              <Text style={[
                styles.tabLabel,
                isActive && { color: theme.colors.gold, fontWeight: '800' },
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </SafeAreaView>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bgPrimary },
  headerTopRow: { flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16,
    paddingTop: 12, backgroundColor: c.bgHeader },
  back: { color: c.accentGold, fontWeight: '700', fontSize: 15 },
  heroHeader: {
    backgroundColor: c.bgHeader,
    paddingTop: 8, paddingBottom: 24, paddingHorizontal: 20,
    alignItems: 'center',
  },
  heroHeaderTitle: { color: 'white', fontWeight: '800', fontSize: 20, marginTop: 8 },
  heroHeaderSub: { color: c.accentGold, fontSize: 13, marginTop: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1, padding: 16 },
  resetText: { color: c.textSecondary, fontSize: 13,
    textAlign: 'center', marginBottom: 16 },
  row: { backgroundColor: c.bgCard, borderRadius: 12, padding: 14,
    marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: c.borderColor },
  rowMe: { borderColor: '#C49A1A', backgroundColor: '#FFFBEB', borderWidth: 2 },
  rank: { fontSize: 22, width: 36, textAlign: 'center' },
  name: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
  grade: { fontSize: 12, color: c.textMuted },
  points: { fontSize: 15, fontWeight: '800', color: c.accentGold },

  // Bottom tab bar (mirrors dashboard.tsx so look and behaviour are identical)
  tabBar: {
    flexDirection: 'row', backgroundColor: c.bgCard,
    borderTopWidth: 1, borderTopColor: c.borderColor,
    paddingBottom: 20, paddingTop: 10,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  tabIndicator: {
    width: 32, height: 3,
    backgroundColor: c.accentGold,
    borderRadius: 2,
    marginBottom: 4,
  },
  tabEmoji: { fontSize: 22 },
  tabLabel: { fontSize: 11, color: c.textMuted, fontWeight: '600' },
})
