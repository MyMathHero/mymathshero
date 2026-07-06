import { useState, useEffect, useMemo} from 'react'
import { View, Text, ScrollView, StyleSheet,
  ActivityIndicator, TouchableOpacity } from 'react-native'
import { useTheme, ThemeColors } from '../../lib/themeContext'
import { ScreenBackground } from '../../lib/ui'
import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { studentAPI } from '../../lib/api'
import { SafeAreaView } from 'react-native-safe-area-context'
import HeroRobot from '../../components/HeroRobot'
import FloatingTabBar from '../../components/FloatingTabBar'
import CharacterAvatar from '../../components/CharacterAvatar'
import ChallengeArena from '../../components/ChallengeArena'

export default function League() {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [myId, setMyId] = useState('')
  const [grade, setGrade] = useState(3)
  const [view, setView] = useState<'arena' | 'leaderboard'>('arena')
  const medals = ['🥇', '🥈', '🥉']

  useEffect(() => {
    async function load() {
      const id = await SecureStore.getItemAsync('user_id') || ''
      setMyId(id)
      try {
        const res = await studentAPI.leaderboard(id)
        setData(res.data)
        const mine = (res.data?.leaderboard || []).find((e: any) => e.studentId === id)
        if (mine?.grade != null) setGrade(mine.grade)
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
    <ScreenBackground>
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerTopRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <View style={{ width: 48 }} />
      </View>

      {/* Header with robot */}
      <View style={styles.heroHeader}>
        <HeroRobot mood={topThree ? 'celebrating' : 'waving'} size={70} containerStyle="circle" />
        <Text style={styles.heroHeaderTitle}>Hero Challenge ⚔️</Text>
        <Text style={styles.heroHeaderSub}>Race other Heroes · climb the leaderboard</Text>
      </View>

      {/* Sub-view toggle */}
      <View style={styles.toggleRow}>
        {([['arena', '⚔️ Challenge'], ['leaderboard', '🏆 Leaderboard']] as const).map(([id, label]) => (
          <TouchableOpacity key={id} onPress={() => setView(id)}
            style={[styles.togglePill, view === id && styles.togglePillActive]}>
            <Text style={[styles.toggleText, view === id && styles.toggleTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {view === 'arena' ? (
        <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 110 }}>
          <ChallengeArena grade={grade} />
        </ScrollView>
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#C49A1A" size="large" />
        </View>
      ) : (
        <ScrollView style={styles.scroll}>
          <Text style={styles.resetText}>Resets monthly · Top 10 win prizes!</Text>
          {(data?.leaderboard || []).map((entry: any, i: number) => (
            <View key={i} style={[styles.row, entry.studentId === myId && styles.rowMe]}>
              <Text style={styles.rank}>{i < 3 ? medals[i] : `#${i + 1}`}</Text>
              <CharacterAvatar id={entry.avatar} size={34} />
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
          <View style={{ height: 110 }} />
        </ScrollView>
      )}

      {/* Floating glassy bottom navigation */}
      <FloatingTabBar />
    </SafeAreaView>
    </ScreenBackground>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  headerTopRow: { flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16,
    paddingTop: 12, backgroundColor: 'transparent' },
  back: { color: c.accentGold, fontWeight: '700', fontSize: 15 },
  heroHeader: {
    backgroundColor: 'transparent',
    paddingTop: 8, paddingBottom: 24, paddingHorizontal: 20,
    alignItems: 'center',
  },
  heroHeaderTitle: { color: c.textPrimary, fontWeight: '800', fontSize: 20, marginTop: 8, letterSpacing: -0.3 },
  heroHeaderSub: { color: c.accentGold, fontSize: 13, marginTop: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  toggleRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', paddingBottom: 12 },
  togglePill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.cardBorder },
  togglePillActive: { backgroundColor: c.accentGold, borderColor: c.accentGold },
  toggleText: { color: c.textSecondary, fontWeight: '700', fontSize: 13 },
  toggleTextActive: { color: '#1B2B4B' },
  scroll: { flex: 1, padding: 16 },
  resetText: { color: c.textSecondary, fontSize: 13,
    textAlign: 'center', marginBottom: 16 },
  row: { backgroundColor: c.bgCard, borderRadius: 16, padding: 14,
    marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: c.cardBorder,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  rowMe: { borderColor: c.accentGold, backgroundColor: c.accentGoldLight, borderWidth: 2 },
  rank: { fontSize: 22, width: 36, textAlign: 'center' },
  name: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
  grade: { fontSize: 12, color: c.textMuted },
  points: { fontSize: 15, fontWeight: '800', color: c.accentGold },

})
