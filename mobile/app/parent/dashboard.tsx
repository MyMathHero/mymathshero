import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator, Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { parentAPI } from '../../lib/api'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function ParentDashboard() {
  const router = useRouter()
  const [parentId, setParentId] = useState('')
  const [parentName, setParentName] = useState('')
  const [children, setChildren] = useState<any[]>([])
  const [activeChild, setActiveChild] = useState<any>(null)
  const [progress, setProgress] = useState<any>(null)
  const [insight, setInsight] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => { loadParent() }, [])

  useEffect(() => {
    if (activeChild?.id && parentId) loadChildData(activeChild.id)
  }, [activeChild?.id, parentId])

  async function loadParent() {
    try {
      const id = await SecureStore.getItemAsync('user_id') || ''
      const name = await SecureStore.getItemAsync('user_name') || 'Parent'
      if (!id) { router.replace('/login'); return }
      setParentId(id)
      setParentName(name)
      const res = await parentAPI.children(id)
      const kids = res.data.children || []
      setChildren(kids)
      if (kids.length > 0) setActiveChild(kids[0])
      else setLoading(false)
    } catch {
      router.replace('/login')
    }
  }

  async function loadChildData(studentId: string) {
    setLoading(true)
    try {
      const [progRes, insRes] = await Promise.all([
        parentAPI.progress(studentId, parentId),
        parentAPI.insights(studentId, parentId).catch(() => null),
      ])
      setProgress(progRes.data)
      setInsight(insRes?.data?.insight || '')
    } catch {
      // leave previous data on transient failure
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    if (activeChild?.id) loadChildData(activeChild.id)
    else setRefreshing(false)
  }, [activeChild?.id, parentId])

  async function handleLogout() {
    Alert.alert('Log Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: async () => {
        await SecureStore.deleteItemAsync('auth_token')
        await SecureStore.deleteItemAsync('user_role')
        await SecureStore.deleteItemAsync('user_id')
        await SecureStore.deleteItemAsync('user_name')
        router.replace('/login')
      }}
    ])
  }

  const student = progress?.student
  const stats = progress?.stats || {}
  const skillTree = progress?.skillTree || []
  const mathsSkills = skillTree.filter(
    (s: any) => s.subject === 'Maths' || s.subject === 'Mathematics'
  )
  const totalWeek = (progress?.weeklyActivity || [])
    .reduce((a: number, d: any) => a + d.questions, 0)

  function heatColor(score: number) {
    if (score >= 80) return '#22C55E'
    if (score >= 50) return '#C49A1A'
    return '#CBD5E1'
  }

  if (loading && !progress) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingLogo}>
          MyMaths<Text style={{ color: '#C49A1A' }}>Hero</Text>
        </Text>
        <ActivityIndicator color="#C49A1A" size="large" style={{ marginTop: 20 }} />
        <Text style={styles.loadingText}>Loading Parent Hub...</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Parent Hub</Text>
          <Text style={styles.subTitle}>Welcome back, {parentName}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>

      {/* Child selector */}
      {children.length > 0 && (
        <View style={styles.childRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}>
            {children.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[styles.childChip, activeChild?.id === c.id && styles.childChipActive]}
                onPress={() => setActiveChild(c)}
              >
                <Text style={styles.childEmoji}>{c.avatar || '🦊'}</Text>
                <View>
                  <Text style={[styles.childName, activeChild?.id === c.id && { color: 'white' }]}>{c.name}</Text>
                  <Text style={[styles.childGrade, activeChild?.id === c.id && { color: 'rgba(255,255,255,0.8)' }]}>Grade {c.grade}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {children.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 48 }}>👨‍👩‍👧</Text>
          <Text style={styles.emptyText}>No children added yet.</Text>
          <Text style={styles.emptySub}>Visit mymathshero.com.au to add a child to your account.</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C49A1A" />}
        >
          {/* Stats */}
          <View style={styles.statsGrid}>
            {[
              { label: 'Questions This Week', value: totalWeek },
              { label: 'Accuracy', value: `${stats.accuracy || 0}%` },
              { label: 'Skills Mastered', value: stats.mastered || 0 },
              { label: 'Streak', value: `${student?.streak || 0} 🔥` },
            ].map((s, i) => (
              <View key={i} style={styles.statCard}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* AI Insight */}
          <View style={styles.insightCard}>
            <Text style={styles.insightTitle}>🤖 Hero&apos;s Daily Insight</Text>
            <Text style={styles.insightText}>
              {insight || `${student?.name || 'Your child'} is making great progress! Keep encouraging daily practice.`}
            </Text>
          </View>

          {/* Skills Heatmap */}
          <Text style={styles.sectionTitle}>Maths Skills</Text>
          {mathsSkills.length === 0 ? (
            <Text style={styles.emptySub}>No skill data yet — once your child practises, progress appears here.</Text>
          ) : (
            mathsSkills.map((skill: any) => (
              <View key={skill.id} style={styles.skillRow}>
                <Text style={styles.skillName} numberOfLines={1}>{skill.name}</Text>
                <View style={styles.skillBarOuter}>
                  <View style={[styles.skillBarInner, {
                    width: `${Math.min(100, skill.score || 0)}%` as any,
                    backgroundColor: heatColor(skill.score || 0),
                  }]} />
                </View>
                <Text style={styles.skillScore}>{skill.score || 0}</Text>
              </View>
            ))
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8' },
  loading: { flex: 1, backgroundColor: '#1B2B4B',
    alignItems: 'center', justifyContent: 'center' },
  loadingLogo: { fontSize: 32, fontWeight: '800', color: 'white' },
  loadingText: { color: '#C49A1A', marginTop: 12, fontWeight: '600' },
  header: { flexDirection: 'row', alignItems: 'center',
    padding: 20, paddingBottom: 14, backgroundColor: '#1B2B4B' },
  title: { fontSize: 24, fontWeight: '800', color: 'white' },
  subTitle: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  logoutBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  logoutText: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  childRow: { backgroundColor: '#1B2B4B', paddingBottom: 12 },
  childChip: { flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1,
    borderColor: 'transparent' },
  childChipActive: { borderColor: '#C49A1A', backgroundColor: 'rgba(196,154,26,0.25)' },
  childEmoji: { fontSize: 22 },
  childName: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  childGrade: { fontSize: 10, color: 'rgba(255,255,255,0.5)' },
  scroll: { flex: 1, padding: 16 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { fontSize: 17, fontWeight: '700', color: '#1B2B4B', marginTop: 12 },
  emptySub: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 6 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: { width: '47%', backgroundColor: 'white', borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  statValue: { fontSize: 24, fontWeight: '800', color: '#1B2B4B' },
  statLabel: { fontSize: 11, color: '#64748B', marginTop: 2 },
  insightCard: { backgroundColor: '#1B2B4B', borderRadius: 16, padding: 18,
    marginBottom: 20, borderWidth: 2, borderColor: '#C49A1A' },
  insightTitle: { color: '#C49A1A', fontWeight: '800', fontSize: 15, marginBottom: 8 },
  insightText: { color: 'white', fontSize: 14, lineHeight: 21 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1B2B4B', marginBottom: 12 },
  skillRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  skillName: { width: 130, fontSize: 13, fontWeight: '600', color: '#1B2B4B' },
  skillBarOuter: { flex: 1, height: 18, backgroundColor: '#E2E8F0',
    borderRadius: 9, overflow: 'hidden' },
  skillBarInner: { height: '100%', borderRadius: 9 },
  skillScore: { width: 32, textAlign: 'right', fontSize: 13,
    fontWeight: '700', color: '#1B2B4B' },
})
