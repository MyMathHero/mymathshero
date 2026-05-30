import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { studentAPI } from '../../lib/api'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function StudentDashboard() {
  const router = useRouter()
  const [student, setStudent] = useState<any>(null)
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const id = await SecureStore.getItemAsync('user_id')
      if (!id) {
        router.replace('/login')
        return
      }

      const res = await studentAPI.progress(id)
      const data = res?.data || {}
      setStudent(data.student || null)

      const mathsRecs = (data.recommendations || []).filter(
        (s: any) => s?.subject === 'Maths' || s?.subject === 'Mathematics'
      )
      setRecommendations(mathsRecs)
      setStats(data.stats || null)
    } catch (err) {
      // Don't redirect to /login on transient network errors — only on missing auth.
      console.error('Dashboard load error:', err)
      setStudent(null)
      setRecommendations([])
      setStats(null)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    loadData()
  }, [])

  async function handleLogout() {
    await SecureStore.deleteItemAsync('auth_token')
    await SecureStore.deleteItemAsync('user_role')
    await SecureStore.deleteItemAsync('user_id')
    await SecureStore.deleteItemAsync('user_name')
    router.replace('/login')
  }

  const weakestSkill = recommendations
    .filter(s => s.currentScore > 0)
    .sort((a, b) => a.currentScore - b.currentScore)[0] || null

  if (loading) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingLogo}>
          MyMaths<Text style={{ color: '#C49A1A' }}>Hero</Text>
        </Text>
        <ActivityIndicator color="#C49A1A" size="large" style={{ marginTop: 20 }} />
        <Text style={styles.loadingText}>Loading Hero HQ...</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Hi {student?.name?.split(' ')[0] || 'Hero'}! 👋
          </Text>
          <Text style={styles.subGreeting}>Hero HQ — Maths</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { emoji: '⚡', value: student?.xp || 0, label: 'Hero Points' },
          { emoji: '🔥', value: student?.streak || 0, label: 'Streak' },
          { emoji: '🏆', value: stats?.mastered || 0, label: 'Mastered' },
          { emoji: '🎯', value: `${stats?.accuracy || 0}%`, label: 'Accuracy' },
        ].map((s, i) => (
          <View key={i} style={styles.statCard}>
            <Text style={styles.statEmoji}>{s.emoji}</Text>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
            tintColor="#C49A1A" />
        }
      >
        {/* Today's Hero Challenges */}
        <Text style={styles.sectionTitle}>Today&apos;s Hero Challenges ✦</Text>
        <Text style={styles.sectionSub}>Special activities just for you</Text>

        {/* Daily Maths Puzzle */}
        <TouchableOpacity
          style={styles.challengeCardDark}
          onPress={() => {
            const hardSkill = [...recommendations]
              .sort((a, b) => (b.difficulty || 0) - (a.difficulty || 0))[0]
            if (hardSkill) router.push({
              pathname: '/student/practice',
              params: { skillId: hardSkill.id, skillName: hardSkill.name,
                grade: String(student?.grade || 3) }
            })
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.challengeEmoji}>🧩</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.challengeTitleDark}>Daily Maths Puzzle</Text>
            <Text style={styles.challengeSubDark}>New puzzle every day — can you solve it?</Text>
          </View>
          <Text style={styles.challengeArrowDark}>→</Text>
        </TouchableOpacity>

        {/* Speed Round */}
        <TouchableOpacity
          style={styles.challengeCard}
          onPress={() => {
            const skill = recommendations[0]
            if (skill) router.push({
              pathname: '/student/practice',
              params: { skillId: skill.id, skillName: skill.name,
                grade: String(student?.grade || 3), speedRound: 'true' }
            })
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.challengeEmoji}>⚡</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.challengeTitle}>Speed Round</Text>
            <Text style={styles.challengeSub}>5 questions — beat your best time!</Text>
          </View>
          <Text style={styles.challengeArrow}>→</Text>
        </TouchableOpacity>

        {/* Weak Spot Trainer */}
        {weakestSkill && (
          <TouchableOpacity
            style={styles.challengeCard}
            onPress={() => router.push({
              pathname: '/student/practice',
              params: { skillId: weakestSkill.id, skillName: weakestSkill.name,
                grade: String(student?.grade || 3) }
            })}
            activeOpacity={0.85}
          >
            <Text style={styles.challengeEmoji}>🎯</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.challengeTitle}>Weak Spot Trainer</Text>
              <Text style={styles.challengeSub}>Level up your weakest skill</Text>
              <Text style={styles.weakScore}>
                {weakestSkill.name} — {Math.round(weakestSkill.currentScore)}/100
              </Text>
            </View>
            <Text style={styles.challengeArrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* Recommended Skills */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
          Hero Missions for You ✦
        </Text>
        <Text style={styles.sectionSub}>AI-selected Maths skills just for you</Text>

        {recommendations.slice(0, 5).map((skill: any, i: number) => (
          <TouchableOpacity
            key={i}
            style={styles.skillCard}
            onPress={() => router.push({
              pathname: '/student/practice',
              params: { skillId: skill.id, skillName: skill.name,
                grade: String(student?.grade || 3) }
            })}
            activeOpacity={0.8}
          >
            <View style={styles.skillHeader}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.skillName}>{skill.name}</Text>
                <Text style={styles.skillMeta}>Maths · Grade {skill.grade}</Text>
              </View>
              <View style={[styles.scoreTag,
                skill.currentScore >= 80 && styles.scoreTagGreen]}>
                <Text style={styles.scoreText}>
                  {Math.round(skill.currentScore || 0)}/100
                </Text>
              </View>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, {
                width: `${Math.min(100, Math.round(skill.currentScore || 0))}%` as any
              }]} />
            </View>
            <View style={styles.practiceBtn}>
              <Text style={styles.practiceBtnText}>
                {(skill.currentScore || 0) > 0 ? 'Continue Mission →' : 'Start Mission →'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tab}>
          <Text style={styles.tabEmoji}>🏠</Text>
          <Text style={[styles.tabLabel, { color: '#C49A1A' }]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}
          onPress={() => router.push('/student/league')}>
          <Text style={styles.tabEmoji}>🏆</Text>
          <Text style={styles.tabLabel}>League</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}
          onPress={() => router.push('/student/profile')}>
          <Text style={styles.tabEmoji}>👤</Text>
          <Text style={styles.tabLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8' },
  loading: { flex: 1, backgroundColor: '#1B2B4B',
    alignItems: 'center', justifyContent: 'center' },
  loadingLogo: { fontSize: 32, fontWeight: '800', color: 'white' },
  loadingText: { color: '#C49A1A', marginTop: 12, fontWeight: '600' },
  header: { flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 20, paddingBottom: 12,
    backgroundColor: '#1B2B4B' },
  greeting: { fontSize: 24, fontWeight: '800', color: 'white' },
  subGreeting: { fontSize: 13, color: '#C49A1A', fontWeight: '600', marginTop: 2 },
  logoutBtn: { paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 8, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)' },
  logoutText: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  statsRow: { flexDirection: 'row', padding: 12, gap: 8,
    backgroundColor: '#1B2B4B' },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  statEmoji: { fontSize: 18, marginBottom: 2 },
  statValue: { fontSize: 16, fontWeight: '800', color: 'white' },
  statLabel: { fontSize: 9, color: 'rgba(255,255,255,0.55)', marginTop: 1 },
  scroll: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '800',
    color: '#1B2B4B', marginBottom: 4 },
  sectionSub: { fontSize: 13, color: '#64748B', marginBottom: 14 },
  challengeCardDark: { backgroundColor: '#1B2B4B', borderRadius: 16,
    padding: 16, marginBottom: 10, flexDirection: 'row',
    alignItems: 'center', gap: 12,
    borderWidth: 2, borderColor: '#C49A1A' },
  challengeCard: { backgroundColor: 'white', borderRadius: 16,
    padding: 16, marginBottom: 10, flexDirection: 'row',
    alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 6, elevation: 1 },
  challengeEmoji: { fontSize: 30 },
  challengeTitleDark: { fontSize: 16, fontWeight: '800', color: '#C49A1A' },
  challengeSubDark: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  challengeArrowDark: { color: '#C49A1A', fontSize: 20, fontWeight: '700' },
  challengeTitle: { fontSize: 16, fontWeight: '800', color: '#1B2B4B' },
  challengeSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  challengeArrow: { color: '#C49A1A', fontSize: 20, fontWeight: '700' },
  weakScore: { fontSize: 11, color: '#EF4444', fontWeight: '700', marginTop: 2 },
  skillCard: { backgroundColor: 'white', borderRadius: 16,
    padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  skillHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  skillName: { fontSize: 15, fontWeight: '700', color: '#1B2B4B' },
  skillMeta: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  scoreTag: { backgroundColor: '#F0F4F8', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4 },
  scoreTagGreen: { backgroundColor: '#DCFCE7' },
  scoreText: { fontSize: 12, fontWeight: '700', color: '#1B2B4B' },
  progressBar: { height: 6, backgroundColor: '#F0F4F8',
    borderRadius: 3, overflow: 'hidden', marginBottom: 12 },
  progressFill: { height: '100%', backgroundColor: '#C49A1A', borderRadius: 3 },
  practiceBtn: { backgroundColor: '#1B2B4B', borderRadius: 10,
    padding: 12, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#C49A1A' },
  practiceBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },
  tabBar: { flexDirection: 'row', backgroundColor: 'white',
    borderTopWidth: 1, borderTopColor: '#E2E8F0',
    paddingBottom: 20, paddingTop: 10 },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  tabEmoji: { fontSize: 22 },
  tabLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
})
