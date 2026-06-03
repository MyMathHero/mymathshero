import { useState, useEffect, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
  Modal, Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { WebView } from 'react-native-webview'
import { SafeAreaView } from 'react-native-safe-area-context'
import { arcadeAPI } from '../../lib/api'
import { ARCADE_GAMES, ARCADE_CATEGORIES } from '../../lib/arcadeGames'

const BASE_URL = 'https://mymathshero.com.au'

export default function ArcadeScreen() {
  const router = useRouter()
  const [arcadeData, setArcadeData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [studentId, setStudentId] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [playingGame, setPlayingGame] = useState<any>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionMinutes, setSessionMinutes] = useState(0)
  const timerRef = useRef<any>(null)

  useEffect(() => {
    loadData()
    return () => clearInterval(timerRef.current)
  }, [])

  async function loadData() {
    try {
      const id = await SecureStore.getItemAsync('user_id') || ''
      setStudentId(id)
      const res = await arcadeAPI.getStatus(id)
      setArcadeData(res.data)
    } catch {
      Alert.alert('Error', 'Could not load arcade data')
    } finally {
      setLoading(false)
    }
  }

  async function handleUnlockAndPlay(game: any) {
    const unlocked = (arcadeData?.unlockedGames || []).includes(game.id)
    if (!unlocked) {
      if ((arcadeData?.xp || 0) < game.pointsCost) {
        Alert.alert(
          'Not enough Hero Points',
          `You need ${game.pointsCost} Hero Points to unlock ${game.title}. Keep practicing Maths to earn more!`,
          [{ text: 'OK' }, { text: 'Go Practice', onPress: () => router.back() }]
        )
        return
      }
      Alert.alert(
        `Unlock ${game.title}?`,
        `Spend ${game.pointsCost} Hero Points to unlock this game forever!`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: `Unlock (${game.pointsCost} pts)`, onPress: () => unlockGame(game) },
        ]
      )
      return
    }
    playGame(game)
  }

  async function unlockGame(game: any) {
    try {
      const res = await arcadeAPI.unlockGame(studentId, game.id)
      if (res.data.success) {
        setArcadeData((prev: any) => ({
          ...prev,
          xp: res.data.newXP ?? prev.xp,
          unlockedGames: [...(prev.unlockedGames || []), game.id],
        }))
        playGame(game)
      } else {
        Alert.alert('Error', res.data.error || 'Could not unlock game')
      }
    } catch {
      Alert.alert('Error', 'Connection error')
    }
  }

  async function playGame(game: any) {
    if (game.comingSoon || !game.embedUrl) {
      Alert.alert('Coming Soon!', `${game.title} is coming soon. Stay tuned! 🎮`)
      return
    }

    try {
      const res = await arcadeAPI.startGame(studentId, game.id)
      if (res.data.limitReached) {
        Alert.alert(
          'Daily Limit Reached',
          'You have used all your arcade time today. Come back tomorrow!',
          [{ text: 'OK' }, { text: 'More Maths', onPress: () => router.back() }]
        )
        return
      }
      if (res.data.success) {
        setSessionId(res.data.sessionId)
        setPlayingGame(game)
        setSessionMinutes(0)
        timerRef.current = setInterval(() =>
          setSessionMinutes((m: number) => m + 1), 60000
        )
      }
    } catch {
      Alert.alert('Error', 'Could not start game')
    }
  }

  function handleExitGame() {
    clearInterval(timerRef.current)
    if (sessionId && sessionMinutes > 0) {
      arcadeAPI.endGame(studentId, playingGame?.id || '',
        sessionId, sessionMinutes).catch(() => {})
    }
    setPlayingGame(null)
    setSessionId(null)
    setSessionMinutes(0)
  }

  const filteredGames = ARCADE_GAMES.filter(g =>
    activeCategory === 'all' || g.category === activeCategory
  )

  const isUnlocked = (gameId: string) =>
    (arcadeData?.unlockedGames || []).includes(gameId)

  if (loading) {
    return (
      <View style={s.loading}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🕹️</Text>
        <ActivityIndicator color="#C49A1A" size="large" />
        <Text style={s.loadingText}>Loading Arcade...</Text>
      </View>
    )
  }

  // Check XP gate
  if ((arcadeData?.xp || 0) < 20) {
    return (
      <SafeAreaView style={s.locked}>
        <Text style={{ fontSize: 64, marginBottom: 16 }}>🔒</Text>
        <Text style={s.lockedTitle}>Arcade Locked</Text>
        <Text style={s.lockedSub}>
          You need at least{' '}
          <Text style={{ color: '#C49A1A', fontWeight: '800' }}>
            20 Hero Points
          </Text>{' '}
          to enter the Arcade. Answer Maths questions to earn points!
        </Text>
        <View style={s.xpBox}>
          <Text style={{ color: '#C49A1A', fontSize: 13 }}>
            Your Hero Points
          </Text>
          <Text style={{ color: 'white', fontSize: 48,
            fontWeight: '900' }}>
            {arcadeData?.xp || 0}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
            Need 20 to unlock
          </Text>
        </View>
        <TouchableOpacity
          style={s.practiceBtn}
          onPress={() => router.back()}
        >
          <Text style={s.practiceBtnText}>✦ Go Practice Maths →</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A1A' }}>
      {/* Game Modal */}
      <Modal visible={!!playingGame} animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <View style={s.gameBar}>
            <View style={{ flexDirection: 'row',
              alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 18 }}>
                {playingGame?.emoji}
              </Text>
              <Text style={{ color: 'white', fontWeight: '700',
                fontSize: 14 }}>
                {playingGame?.title}
              </Text>
              <View style={s.minBadge}>
                <Text style={{ color: '#C49A1A', fontSize: 11,
                  fontWeight: '700' }}>
                  {sessionMinutes}m
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleExitGame}
              style={s.exitBtn}
            >
              <Text style={{ color: '#EF4444', fontWeight: '700',
                fontSize: 13 }}>
                ✕ Exit
              </Text>
            </TouchableOpacity>
          </View>
          {playingGame && (
            <WebView
              source={{
                uri: playingGame.embedUrl.startsWith('/')
                  ? `${BASE_URL}${playingGame.embedUrl}`
                  : playingGame.embedUrl
              }}
              style={{ flex: 1 }}
              allowsFullscreenVideo
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              domStorageEnabled
            />
          )}
        </View>
      </Modal>

      {/* Header */}
      <SafeAreaView>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: '#C49A1A', fontWeight: '700',
              fontSize: 15 }}>← HQ</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>
            Hero <Text style={{ color: '#C49A1A' }}>Arcade</Text> 🕹️
          </Text>
          <View>
            <Text style={{ color: '#C49A1A', fontWeight: '800',
              fontSize: 14 }}>
              ⚡ {arcadeData?.xp || 0}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      {/* Stats bar */}
      <View style={s.statsBar}>
        <Text style={s.statText}>
          🔓 {(arcadeData?.unlockedGames || []).length} unlocked
        </Text>
        <Text style={s.statText}>
          ⏱ {arcadeData?.minutesToday || 0}/
          {arcadeData?.arcadeSettings?.dailyMinutes || 30}m today
        </Text>
        <Text style={s.statText}>
          🎮 {ARCADE_GAMES.filter(g => !g.comingSoon).length} games
        </Text>
      </View>

      {/* Category pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ maxHeight: 50 }}
        contentContainerStyle={{ padding: 8, gap: 8 }}
      >
        {ARCADE_CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.id}
            onPress={() => setActiveCategory(cat.id)}
            style={[s.catPill,
              activeCategory === cat.id && s.catPillActive]}
          >
            <Text style={[s.catText,
              activeCategory === cat.id && s.catTextActive]}>
              {cat.emoji} {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Games list */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 12 }}
      >
        {filteredGames.map(game => {
          const unlocked = isUnlocked(game.id)
          const canAffordIt = (arcadeData?.xp || 0) >= game.pointsCost

          return (
            <TouchableOpacity
              key={game.id}
              onPress={() => handleUnlockAndPlay(game)}
              style={[s.gameCard,
                unlocked && s.gameCardUnlocked,
                game.comingSoon && s.gameCardSoon,
              ]}
              activeOpacity={0.8}
            >
              <View style={s.gameEmoji}>
                <Text style={{ fontSize: 36 }}>{game.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row',
                  alignItems: 'center', gap: 8,
                  marginBottom: 2 }}>
                  <Text style={s.gameTitle}>{game.title}</Text>
                  {game.comingSoon && (
                    <View style={s.soonBadge}>
                      <Text style={s.soonText}>SOON</Text>
                    </View>
                  )}
                  {unlocked && !game.comingSoon && (
                    <View style={s.unlockedBadge}>
                      <Text style={s.unlockedText}>✓</Text>
                    </View>
                  )}
                  {game.premiumOnly && (
                    <View style={s.premiumBadge}>
                      <Text style={s.premiumText}>PRO</Text>
                    </View>
                  )}
                </View>
                <Text style={s.gameDesc} numberOfLines={1}>
                  {game.description}
                </Text>
                <Text style={{ fontSize: 11,
                  color: 'rgba(255,255,255,0.35)' }}>
                  {game.category} · {game.ageRating}
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                {game.comingSoon ? (
                  <Text style={{ color: 'rgba(255,255,255,0.3)',
                    fontSize: 11 }}>🔜</Text>
                ) : unlocked ? (
                  <View style={s.playBtn}>
                    <Text style={s.playBtnText}>▶</Text>
                  </View>
                ) : (
                  <View style={[s.costBtn,
                    !canAffordIt && s.costBtnPoor]}>
                    <Text style={[s.costText,
                      !canAffordIt && s.costTextPoor]}>
                      ⚡{game.pointsCost}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )
        })}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  loading: { flex: 1, backgroundColor: '#0A0A1A',
    alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#C49A1A', fontWeight: '700',
    marginTop: 12, fontSize: 16 },
  locked: { flex: 1, backgroundColor: '#0A0A1A',
    alignItems: 'center', justifyContent: 'center', padding: 32 },
  lockedTitle: { color: 'white', fontSize: 28,
    fontWeight: '800', marginBottom: 12 },
  lockedSub: { color: 'rgba(255,255,255,0.6)', fontSize: 15,
    textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  xpBox: { backgroundColor: 'rgba(196,154,26,0.1)',
    borderWidth: 2, borderColor: '#C49A1A',
    borderRadius: 20, paddingVertical: 20, paddingHorizontal: 40,
    alignItems: 'center', marginBottom: 32 },
  practiceBtn: { backgroundColor: '#1B2B4B',
    borderWidth: 2, borderColor: '#C49A1A',
    borderRadius: 14, padding: 16, paddingHorizontal: 32 },
  practiceBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
  header: { flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 16,
    backgroundColor: '#0A0A1A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(196,154,26,0.2)' },
  headerTitle: { color: 'white', fontWeight: '900',
    fontSize: 18, textTransform: 'uppercase' },
  statsBar: { flexDirection: 'row', justifyContent: 'space-around',
    padding: 10, backgroundColor: 'rgba(255,255,255,0.03)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)' },
  statText: { color: 'rgba(255,255,255,0.5)', fontSize: 12,
    fontWeight: '600' },
  catPill: { paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)' },
  catPillActive: { backgroundColor: '#C49A1A',
    borderColor: '#C49A1A' },
  catText: { color: 'rgba(255,255,255,0.6)', fontSize: 12,
    fontWeight: '700' },
  catTextActive: { color: '#0A0A1A' },
  gameCard: { flexDirection: 'row', alignItems: 'center',
    gap: 14, backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16, padding: 14, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)' },
  gameCardUnlocked: { borderColor: 'rgba(34,197,94,0.4)' },
  gameCardSoon: { opacity: 0.6 },
  gameEmoji: { width: 56, height: 56, borderRadius: 14,
    backgroundColor: 'rgba(27,43,75,0.8)',
    alignItems: 'center', justifyContent: 'center' },
  gameTitle: { color: 'white', fontWeight: '700', fontSize: 15 },
  gameDesc: { color: 'rgba(255,255,255,0.4)',
    fontSize: 12, marginBottom: 2 },
  soonBadge: { backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  soonText: { color: 'rgba(255,255,255,0.4)',
    fontSize: 9, fontWeight: '800' },
  unlockedBadge: { backgroundColor: 'rgba(34,197,94,0.2)',
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  unlockedText: { color: '#22C55E', fontSize: 11,
    fontWeight: '800' },
  premiumBadge: { backgroundColor: 'rgba(196,154,26,0.2)',
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  premiumText: { color: '#C49A1A', fontSize: 9,
    fontWeight: '800' },
  playBtn: { backgroundColor: '#22C55E', borderRadius: 10,
    width: 36, height: 36, alignItems: 'center',
    justifyContent: 'center' },
  playBtnText: { color: 'white', fontSize: 14,
    fontWeight: '800' },
  costBtn: { backgroundColor: 'rgba(196,154,26,0.2)',
    borderRadius: 10, paddingHorizontal: 10,
    paddingVertical: 6 },
  costBtnPoor: { backgroundColor: 'rgba(255,255,255,0.05)' },
  costText: { color: '#C49A1A', fontSize: 12, fontWeight: '800' },
  costTextPoor: { color: 'rgba(255,255,255,0.3)' },
  gameBar: { flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 12,
    backgroundColor: '#0A0A1A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(196,154,26,0.3)',
    paddingTop: Platform.OS === 'ios' ? 52 : 12 },
  minBadge: { backgroundColor: 'rgba(196,154,26,0.2)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  exitBtn: { backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
})
