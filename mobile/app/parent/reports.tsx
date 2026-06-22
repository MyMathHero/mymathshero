import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, Alert,
} from 'react-native'
import * as SecureStore from 'expo-secure-store'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { SafeAreaView } from 'react-native-safe-area-context'
import { parentAPI } from '../../lib/api'
import { getSkillInfo } from '../../lib/skillNames'
import { useTheme, ThemeColors } from '../../lib/themeContext'
import { ScreenBackground, Card, GradientButton } from '../../lib/ui'
import ParentTabBar from '../../components/ParentTabBar'

// Reports tab — a formatted learning report the parent can read in-app and
// download as a PDF. Assembles the same data the emailed report uses, from the
// existing /api/student/progress + /api/parent/insights endpoints.
export default function ParentReports() {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])

  const [child, setChild] = useState<any>(null)
  const [progress, setProgress] = useState<any>(null)
  const [insight, setInsight] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const pid = (await SecureStore.getItemAsync('user_id')) || ''
      const childRes = await parentAPI.children(pid)
      const kids = childRes.data?.children || []
      const savedId = await SecureStore.getItemAsync('active_child_id')
      const active = kids.find((k: any) => k.id === savedId) || kids[0]
      setChild(active)
      if (active?.id) {
        const [pr, ins] = await Promise.all([
          parentAPI.progress(active.id, pid),
          parentAPI.insights(active.id, pid).catch(() => null),
        ])
        setProgress(pr.data)
        setInsight(ins?.data?.insight || null)
      }
    } catch { /* show empty */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Derived report data (mirrors /api/parent/send-report) ──────────────────
  const stats = progress?.stats || {}
  const skillTree: any[] = (progress?.skillTree || []).filter((sk: any) => (sk.id || '').startsWith('m_'))
  const mastered = stats.mastered ?? skillTree.filter(sk => sk.score >= 80).length
  const accuracy = stats.accuracy ?? 0
  const questions = stats.totalQuestionsThisWeek ?? 0
  const streak = child?.streak ?? progress?.student?.streak ?? 0
  const practised = skillTree.filter(sk => (sk.score || 0) > 0).slice(0, 6)
  const firstName = (child?.name || 'Your child').split(' ')[0]
  const dateStr = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const summary = insight || (
    accuracy >= 80 ? `${firstName} had a fantastic week! With ${accuracy}% accuracy, they're really nailing it. Keep the momentum going!`
    : accuracy >= 50 ? `${firstName} is making solid progress. With ${accuracy}% accuracy, there's a great foundation to build on.`
    : questions === 0 ? `${firstName} hasn't practised recently — a gentle reminder might help keep the streak alive!`
    : `${firstName} is working through some tricky material. ${accuracy}% accuracy shows they're trying hard — encourage them to keep going!`
  )

  function skillName(sk: any) {
    return getSkillInfo(sk.id || sk.skillId)?.name || sk.name || sk.id
  }

  // ── PDF export ─────────────────────────────────────────────────────────────
  async function exportPdf() {
    setExporting(true)
    try {
      const skillRows = practised.length > 0
        ? practised.map(sk => `<tr><td>${skillName(sk)}</td><td style="text-align:right">${Math.round(sk.score || 0)}/100</td></tr>`).join('')
        : `<tr><td colspan="2" style="color:#888">No skills practised yet.</td></tr>`

      const html = `
        <html><head><meta name="viewport" content="width=device-width, initial-scale=1"/>
        <style>
          body { font-family: -apple-system, Helvetica, sans-serif; color:#1B1B1B; padding:28px; }
          .head { text-align:center; border-bottom:3px solid #C49A1A; padding-bottom:16px; margin-bottom:20px; }
          .brand { font-size:26px; font-weight:800; color:#1B2B4B; }
          .brand span { color:#C49A1A; }
          h2 { font-size:18px; color:#1B2B4B; margin:24px 0 8px; }
          .sub { color:#6B6B6B; font-size:13px; }
          .grid { display:flex; gap:12px; margin:14px 0; }
          .stat { flex:1; border:1px solid #E7E2D6; border-radius:12px; padding:14px; text-align:center; }
          .stat .v { font-size:24px; font-weight:800; color:#C49A1A; }
          .stat .l { font-size:11px; color:#6B6B6B; }
          .insight { background:#FBF1D8; border:1px solid #E7C766; border-radius:12px; padding:16px; font-size:14px; line-height:1.5; }
          table { width:100%; border-collapse:collapse; margin-top:6px; }
          td { padding:8px 4px; border-bottom:1px solid #F0EBDF; font-size:14px; }
        </style></head><body>
          <div class="head">
            <div class="brand">MyMaths<span>Hero</span></div>
            <div class="sub">Learning Report · ${dateStr}</div>
          </div>
          <h2>${firstName} · Grade ${child?.grade ?? ''} · Maths</h2>
          <div class="grid">
            <div class="stat"><div class="v">${questions}</div><div class="l">Questions</div></div>
            <div class="stat"><div class="v">${accuracy}%</div><div class="l">Accuracy</div></div>
            <div class="stat"><div class="v">${mastered}</div><div class="l">Mastered</div></div>
            <div class="stat"><div class="v">${streak}🔥</div><div class="l">Streak</div></div>
          </div>
          <h2>Hero's Insight</h2>
          <div class="insight">${summary}</div>
          <h2>Skills Practised</h2>
          <table>${skillRows}</table>
        </body></html>`

      const { uri } = await Print.printToFileAsync({ html })
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `${firstName}'s Learning Report` })
      } else {
        Alert.alert('Saved', `Report saved to:\n${uri}`)
      }
    } catch (err: any) {
      Alert.alert('Could not create PDF', err?.message || 'Try again later.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <ScreenBackground>
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.topRow}>
        <Text style={s.title}>Reports 📄</Text>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={colors.accentGold} size="large" /></View>
      ) : !child ? (
        <View style={s.center}><Text style={s.empty}>Add a child to see their report.</Text></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 130 }}>
          {/* Report card */}
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <View style={s.reportHead}>
              <Text style={s.reportBrand}>Learning Report</Text>
              <Text style={s.reportDate}>{dateStr}</Text>
              <Text style={s.reportChild}>{firstName} · Grade {child.grade} · Maths</Text>
            </View>

            <View style={s.statGrid}>
              {[
                { v: `${questions}`, l: 'Questions' },
                { v: `${accuracy}%`, l: 'Accuracy' },
                { v: `${mastered}`, l: 'Mastered' },
                { v: `${streak}🔥`, l: 'Streak' },
              ].map((st, i) => (
                <View key={i} style={s.statCell}>
                  <Text style={s.statV}>{st.v}</Text>
                  <Text style={s.statL}>{st.l}</Text>
                </View>
              ))}
            </View>

            <View style={s.section}>
              <Text style={s.sectionTitle}>✦ Hero&apos;s Insight</Text>
              <View style={s.insightBox}><Text style={s.insightText}>{summary}</Text></View>
            </View>

            <View style={[s.section, { paddingBottom: 18 }]}>
              <Text style={s.sectionTitle}>Skills Practised</Text>
              {practised.length === 0 ? (
                <Text style={s.empty}>No skills practised yet.</Text>
              ) : practised.map((sk, i) => (
                <View key={i} style={[s.skillRow, i < practised.length - 1 && s.skillDivider]}>
                  <Text style={s.skillName} numberOfLines={1}>{skillName(sk)}</Text>
                  <Text style={s.skillScore}>{Math.round(sk.score || 0)}/100</Text>
                </View>
              ))}
            </View>
          </Card>

          {/* Download */}
          <GradientButton
            title={exporting ? 'Preparing PDF…' : '⬇  Download PDF'}
            onPress={exportPdf}
            disabled={exporting}
            style={{ marginTop: 18 }}
          />
          <Text style={s.note}>Weekly reports are also emailed to you automatically every Sunday.</Text>
        </ScrollView>
      )}

      <ParentTabBar />
    </SafeAreaView>
    </ScreenBackground>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  topRow: { padding: 16 },
  title: { color: c.textPrimary, fontWeight: '800', fontSize: 18, letterSpacing: -0.3 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  empty: { color: c.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 8 },

  reportHead: { backgroundColor: c.bgHeader, padding: 20, alignItems: 'center' },
  reportBrand: { color: c.accentGold, fontWeight: '800', fontSize: 18 },
  reportDate: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 3 },
  reportChild: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', marginTop: 10 },

  statGrid: { flexDirection: 'row', padding: 14, gap: 10 },
  statCell: { flex: 1, alignItems: 'center', backgroundColor: c.accentGoldLight, borderRadius: 12, paddingVertical: 12 },
  statV: { color: c.accentGold, fontWeight: '800', fontSize: 20 },
  statL: { color: c.textSecondary, fontSize: 11, marginTop: 2 },

  section: { paddingHorizontal: 16, paddingTop: 4 },
  sectionTitle: { color: c.textPrimary, fontWeight: '800', fontSize: 14, marginBottom: 8 },
  insightBox: { backgroundColor: c.challengeGradient[0], borderRadius: 12, padding: 14, borderWidth: 1, borderColor: c.cardBorder, marginBottom: 8 },
  insightText: { color: c.challengeText, fontSize: 14, lineHeight: 21 },

  skillRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  skillDivider: { borderBottomWidth: 1, borderBottomColor: c.borderLight },
  skillName: { color: c.textPrimary, fontSize: 14, fontWeight: '600', flex: 1 },
  skillScore: { color: c.accentGold, fontSize: 14, fontWeight: '800', marginLeft: 12 },

  note: { color: c.textMuted, fontSize: 12, textAlign: 'center', marginTop: 12 },
})
