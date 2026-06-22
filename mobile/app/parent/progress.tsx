import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, RefreshControl,
} from 'react-native'
import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { SafeAreaView } from 'react-native-safe-area-context'
import { parentAPI } from '../../lib/api'
import { useTheme, ThemeColors } from '../../lib/themeContext'
import { ScreenBackground, Card, SectionHeader } from '../../lib/ui'
import ParentTabBar from '../../components/ParentTabBar'

// Parent Progress tab — full analytics for the selected child:
//   • Skill heatmap (every Maths skill, colour-coded by mastery score)
//   • Weekly activity chart (questions per day, last 7 days)
//   • Recent sessions list (days with activity + accuracy)
// Reuses the same /api/student/progress data the dashboard fetches.
export default function ParentProgress() {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])
  const router = useRouter()

  const [parentId, setParentId] = useState('')
  const [child, setChild] = useState<any>(null)
  const [progress, setProgress] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const pid = (await SecureStore.getItemAsync('user_id')) || ''
      setParentId(pid)
      const childRes = await parentAPI.children(pid)
      const kids = childRes.data?.children || []
      const savedId = await SecureStore.getItemAsync('active_child_id')
      const active = kids.find((k: any) => k.id === savedId) || kids[0]
      setChild(active)
      if (active?.id) {
        const res = await parentAPI.progress(active.id, pid)
        setProgress(res.data)
      }
    } catch { /* show empty */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function onRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const skillTree: any[] = (progress?.skillTree || []).filter((sk: any) => (sk.id || '').startsWith('m_'))
  const weekly: any[] = progress?.weeklyActivity || []
  const avg = skillTree.length > 0
    ? Math.round(skillTree.reduce((sum, sk) => sum + (sk.score || 0), 0) / skillTree.length)
    : 0
  const maxQ = Math.max(1, ...weekly.map(w => w.questions || 0))
  const firstName = (child?.name || 'Your child').split(' ')[0]

  // Colour ramp for a skill score (matches the web heatmap intent).
  function barColor(score: number) {
    if (score >= 80) return colors.correct
    if (score >= 50) return colors.accentGold
    if (score >= 25) return colors.wrong
    return colors.error
  }

  // Recent sessions: last 5 days with any activity, newest first.
  const recent = [...weekly].filter(w => (w.questions || 0) > 0).reverse().slice(0, 5)

  return (
    <ScreenBackground>
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.topRow}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>Progress 📊</Text>
        <View style={{ width: 48 }} />
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={colors.accentGold} size="large" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 130 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentGold} />}
        >
          {child && (
            <Text style={s.childLine}>{firstName} · Grade {child.grade} · Maths</Text>
          )}

          {/* Skill heatmap */}
          <SectionHeader title={`${firstName}'s Skill Heatmap`} subtitle={`Overall mastery: ${avg}/100`} />
          {/* Legend */}
          <View style={s.legend}>
            {[
              { c: colors.correct, t: '80+' },
              { c: colors.accentGold, t: '50+' },
              { c: colors.wrong, t: '25+' },
              { c: colors.error, t: '<25' },
            ].map((l, i) => (
              <View key={i} style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: l.c }]} />
                <Text style={s.legendText}>{l.t}</Text>
              </View>
            ))}
          </View>
          <Card style={{ padding: 14, marginBottom: 20 }}>
            {skillTree.length === 0 ? (
              <Text style={s.empty}>No skill data yet — practice will fill this in.</Text>
            ) : skillTree.map((sk, i) => {
              const score = Math.round(sk.score || 0)
              return (
                <View key={sk.id || i} style={s.skillRow}>
                  <Text style={s.skillName} numberOfLines={1}>
                    {score >= 80 ? '🏆 ' : ''}{sk.name}
                  </Text>
                  <View style={s.skillBarWrap}>
                    <View style={s.skillBarOuter}>
                      <View style={[s.skillBarInner, { width: `${score}%` as any, backgroundColor: barColor(score) }]} />
                    </View>
                    <Text style={[s.skillScore, { color: barColor(score) }]}>{score}</Text>
                  </View>
                </View>
              )
            })}
          </Card>

          {/* Weekly activity chart */}
          <SectionHeader title="Weekly Activity" subtitle="Questions answered each day" />
          <Card style={{ padding: 16, marginBottom: 20 }}>
            {weekly.length === 0 ? (
              <Text style={s.empty}>No activity recorded this week yet.</Text>
            ) : (
              <View style={s.chart}>
                {weekly.map((d, i) => {
                  const q = d.questions || 0
                  const h = q === 0 ? 4 : Math.max(6, (q / maxQ) * 110)
                  const col = q >= 10 ? colors.correct : q >= 5 ? colors.accentGold : q > 0 ? colors.wrong : colors.borderColor
                  return (
                    <View key={i} style={s.chartCol}>
                      <Text style={s.chartVal}>{q || ''}</Text>
                      <View style={[s.chartBar, { height: h, backgroundColor: col }]} />
                      <Text style={s.chartDay}>{(d.day || '').slice(0, 1)}</Text>
                    </View>
                  )
                })}
              </View>
            )}
          </Card>

          {/* Recent sessions */}
          <SectionHeader title="Recent Sessions" />
          <Card style={{ padding: 6, marginBottom: 8 }}>
            {recent.length === 0 ? (
              <Text style={[s.empty, { padding: 12 }]}>No sessions logged this week.</Text>
            ) : recent.map((d, i) => {
              const q = d.questions || 0
              const acc = q > 0 ? Math.round(((d.correct || 0) / q) * 100) : 0
              return (
                <View key={i} style={[s.sessionRow, i < recent.length - 1 && s.sessionDivider]}>
                  <Text style={s.sessionDay}>{d.day}</Text>
                  <Text style={s.sessionMeta}>{q} questions · {acc}% correct</Text>
                </View>
              )
            })}
          </Card>
        </ScrollView>
      )}

      <ParentTabBar />
    </SafeAreaView>
    </ScreenBackground>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  back: { color: c.accentGold, fontWeight: '700', fontSize: 15 },
  title: { color: c.textPrimary, fontWeight: '800', fontSize: 18, letterSpacing: -0.3 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  childLine: { color: c.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 16 },
  empty: { color: c.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 8 },

  legend: { flexDirection: 'row', gap: 14, marginBottom: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: c.textSecondary, fontSize: 11, fontWeight: '600' },

  skillRow: { paddingVertical: 7 },
  skillName: { color: c.textPrimary, fontSize: 13, fontWeight: '700', marginBottom: 5 },
  skillBarWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  skillBarOuter: { flex: 1, height: 8, borderRadius: 4, backgroundColor: c.borderColor, overflow: 'hidden' },
  skillBarInner: { height: '100%', borderRadius: 4 },
  skillScore: { fontSize: 12, fontWeight: '800', width: 28, textAlign: 'right' },

  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 150 },
  chartCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  chartVal: { color: c.textSecondary, fontSize: 10, fontWeight: '700', marginBottom: 4 },
  chartBar: { width: 20, borderRadius: 6 },
  chartDay: { color: c.textMuted, fontSize: 11, fontWeight: '600', marginTop: 6 },

  sessionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 12 },
  sessionDivider: { borderBottomWidth: 1, borderBottomColor: c.borderLight },
  sessionDay: { color: c.textPrimary, fontSize: 14, fontWeight: '700' },
  sessionMeta: { color: c.textSecondary, fontSize: 13 },
})
