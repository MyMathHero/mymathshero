import { useState, useEffect, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
  Modal, Platform, Animated, Dimensions,
  Image,
} from 'react-native'
import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { WebView } from 'react-native-webview'
import { useVideoPlayer, VideoView } from 'expo-video'
import { SafeAreaView } from 'react-native-safe-area-context'
import { arcadeAPI } from '../../lib/api'
import { ARCADE_GAMES, ARCADE_CATEGORIES } from '../../lib/arcadeGames'

const { width, height } = Dimensions.get('window')
const BASE_URL = 'https://mymathshero.com.au'

// Build the full game URL for WebView
function getGameUrl(embedUrl: string | null | undefined): string {
  if (!embedUrl) return ''
  // Self-hosted games — prepend main site URL
  if (embedUrl.startsWith('/games/')) {
    return `${BASE_URL}${embedUrl}`
  }
  // Already absolute URL
  return embedUrl
}

export default function ArcadeScreen() {
  const router = useRouter()
  const [arcadeData, setArcadeData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [studentId, setStudentId] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [playingGame, setPlayingGame] = useState<any>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionMinutes, setSessionMinutes] = useState(0)
  const [showEntrance, setShowEntrance] = useState(true)
  const [entranceDone, setEntranceDone] = useState(false)
  const [webViewError, setWebViewError] = useState(false)
  const timerRef = useRef<any>(null)
  const entranceScale = useRef(new Animated.Value(0.8)).current
  const entranceOpacity = useRef(new Animated.Value(0)).current

  // Arcade animation player
  let arcadeVideoSource: any = null
  try {
    arcadeVideoSource = require('../../assets/arcadeanimation.mp4')
  } catch {
    try {
      arcadeVideoSource = require('../../assets/arcadeanimation.MP4')
    } catch {}
  }

  const arcadePlayer = useVideoPlayer(
    arcadeVideoSource,
    p => {
      if (arcadeVideoSource) {
        p.loop = false
        p.muted = false
        p.play()
      }
    }
  )

  useEffect(() => {
    loadData()
    return () => clearInterval(timerRef.current)
  }, [])

  useEffect(() => {
    if (!loading && arcadeData) {
      // Play entrance animation
      if (arcadeVideoSource) {
        // Video entrance — auto-dismiss after 3 seconds
        setTimeout(() => finishEntrance(), 3500)
      } else {
        // Animated entrance fallback
        Animated.parallel([
          Animated.spring(entranceScale, {
            toValue: 1, tension: 60,
            friction: 8, useNativeDriver: true,
          }),
          Animated.timing(entranceOpacity, {
            toValue: 1, duration: 600,
            useNativeDriver: true,
          }),
        ]).start()
        setTimeout(() => finishEntrance(), 2500)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, arcadeData])

  function finishEntrance() {
    setShowEntrance(false)
    setEntranceDone(true)
  }

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

  // Check if daily time limit is reached
  function isTimeLimitReached(): boolean {
    const used = arcadeData?.minutesToday || 0
    const limit = arcadeData?.arcadeSettings?.dailyMinutes || 30
    return used >= limit
  }

  // Get unlock time (24h from first play today)
  function getUnlockTime(): string {
    // Calculate when limit resets (midnight AEST)
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    const hoursLeft = Math.ceil(
      (tomorrow.getTime() - now.getTime()) / (1000 * 60 * 60)
    )
    return `${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}`
  }

  async function handleGameTap(game: any) {
    // Check parent disabled
    if (!arcadeData?.arcadeSettings?.enabled) {
      Alert.alert(
        '🔒 Arcade Paused',
        'Your parent has paused Arcade access. Ask them to turn it on in the Parent Hub.',
        [{ text: 'OK' }]
      )
      return
    }

    // Check daily time limit
    if (isTimeLimitReached()) {
      Alert.alert(
        '⏰ Time is Up for Today!',
        `You have used all your arcade time today. Come back in ${getUnlockTime()}! Keep practising Maths to earn more play time.`,
        [
          { text: 'OK' },
          { text: '✦ Practice Maths', onPress: () => router.back() },
        ]
      )
      return
    }

    // Coming soon
    if (game.comingSoon || !game.embedUrl) {
      Alert.alert(
        '🎮 Coming Soon!',
        `${game.title} is coming very soon. Stay tuned!`,
        [{ text: 'OK' }]
      )
      return
    }

    const isUnlocked = (arcadeData?.unlockedGames || []).includes(game.id)

    if (!isUnlocked) {
      if ((arcadeData?.xp || 0) < game.pointsCost) {
        Alert.alert(
          '🔒 Not Enough Hero Points',
          `You need ${game.pointsCost} Hero Points to unlock ${game.title}.\n\nYou have ${arcadeData?.xp || 0} points.\n\nKeep answering Maths questions to earn more!`,
          [
            { text: 'OK' },
            { text: '✦ Go Practice', onPress: () => router.back() },
          ]
        )
        return
      }
      Alert.alert(
        `🔓 Unlock ${game.title}?`,
        `Spend ${game.pointsCost} Hero Points to unlock this game forever!\n\nYou have ${arcadeData?.xp || 0} points.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: `Unlock (${game.pointsCost} pts) →`,
            onPress: () => unlockAndPlay(game),
          },
        ]
      )
      return
    }

    await startPlayingGame(game)
  }

  async function unlockAndPlay(game: any) {
    try {
      const res = await arcadeAPI.unlockGame(studentId, game.id)
      const data = res.data
      if (data.success || data.alreadyUnlocked) {
        setArcadeData((prev: any) => ({
          ...prev,
          xp: data.newXP ?? prev.xp,
          unlockedGames: [...(prev.unlockedGames || []), game.id],
        }))
        await startPlayingGame(game)
      } else {
        Alert.alert('Error', data.error || 'Could not unlock game')
      }
    } catch {
      Alert.alert('Error', 'Connection error. Please try again.')
    }
  }

  async function startPlayingGame(game: any) {
    try {
      const res = await arcadeAPI.startGame(studentId, game.id)
      const data = res.data

      if (data.limitReached) {
        Alert.alert(
          '⏰ Daily Limit Reached',
          `You have used all your arcade time today. Come back in ${getUnlockTime()}!`,
          [
            { text: 'OK' },
            { text: '✦ Practice Maths', onPress: () => router.back() },
          ]
        )
        return
      }

      if (data.success) {
        setSessionId(data.sessionId)
        setPlayingGame(game)
        setSessionMinutes(0)
        setWebViewError(false)
        clearInterval(timerRef.current)

        // Track time every minute
        timerRef.current = setInterval(() => {
          setSessionMinutes(prev => {
            const newMins = prev + 1
            // Update arcade data remaining time
            setArcadeData((ad: any) => {
              if (!ad) return ad
              const newToday = (ad.minutesToday || 0) + 1
              const limit = ad.arcadeSettings?.dailyMinutes || 30
              // Auto-end session when limit hit
              if (newToday >= limit) {
                handleTimeLimitHit()
              }
              return { ...ad, minutesToday: newToday }
            })
            return newMins
          })
        }, 60000) // every real minute
      } else {
        Alert.alert('Error', data.error || 'Could not start game')
      }
    } catch {
      Alert.alert('Error', 'Connection error. Please try again.')
    }
  }

  function handleTimeLimitHit() {
    // Auto-exit game when daily limit reached
    clearInterval(timerRef.current)
    Alert.alert(
      '⏰ Time is Up!',
      "You've reached your daily arcade limit. Great gaming today! Come back tomorrow.",
      [{ text: 'OK', onPress: () => exitGame(true) }]
    )
  }

  function exitGame(fromLimit = false) {
    clearInterval(timerRef.current)
    if (sessionId) {
      arcadeAPI.endGame(
        studentId,
        playingGame?.id || '',
        sessionId,
        sessionMinutes
      ).then(() => {
        // Refresh arcade data after ending session
        loadData()
      }).catch(() => {})
    }
    setPlayingGame(null)
    setSessionId(null)
    setSessionMinutes(0)
    setWebViewError(false)
  }

  const filteredGames = ARCADE_GAMES.filter(g =>
    activeCategory === 'all' || g.category === activeCategory
  )

  const isUnlocked = (gameId: string) =>
    (arcadeData?.unlockedGames || []).includes(gameId)

  // ==================
  // LOADING
  // ==================
  if (loading) {
    return (
      <View style={s.fullDark}>
        <Text style={{ fontSize: 56, marginBottom: 16 }}>🕹️</Text>
        <ActivityIndicator color="#C49A1A" size="large" />
        <Text style={s.loadingText}>Loading Arcade...</Text>
      </View>
    )
  }

  // ==================
  // ENTRANCE ANIMATION
  // ==================
  if (showEntrance) {
    return (
      <View style={[s.fullDark, { justifyContent: 'center',
        alignItems: 'center' }]}>
        {arcadeVideoSource ? (
          <>
            <VideoView
              player={arcadePlayer}
              style={{ width, height }}
              contentFit="cover"
              nativeControls={false}
            />
            <TouchableOpacity
              onPress={finishEntrance}
              style={{
                position: 'absolute', bottom: 60,
                alignSelf: 'center',
                backgroundColor: 'rgba(255,255,255,0.15)',
                borderRadius: 20, paddingHorizontal: 24,
                paddingVertical: 10,
              }}
            >
              <Text style={{ color: 'rgba(255,255,255,0.7)',
                fontSize: 14, fontWeight: '600' }}>
                Tap to skip →
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <Animated.View style={{
            opacity: entranceOpacity,
            transform: [{ scale: entranceScale }],
            alignItems: 'center',
          }}>
            <Text style={{ fontSize: 80, marginBottom: 16 }}>🕹️</Text>
            <Text style={{
              fontSize: 36, fontWeight: '900',
              color: '#C49A1A', letterSpacing: 2,
              textTransform: 'uppercase',
            }}>
              Hero Arcade
            </Text>
          </Animated.View>
        )}
      </View>
    )
  }

  // ==================
  // XP LOCKED
  // ==================
  if ((arcadeData?.xp || 0) < 20) {
    return (
      <SafeAreaView style={s.fullDark}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ padding: 16 }}>
          <Text style={{ color: '#C49A1A', fontWeight: '700' }}>
            ← Back
          </Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center',
          justifyContent: 'center', padding: 32 }}>
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
            <Text style={{ color: '#C49A1A', fontSize: 13,
              marginBottom: 4 }}>Your Hero Points</Text>
            <Text style={{ color: 'white', fontSize: 52,
              fontWeight: '900' }}>
              {arcadeData?.xp || 0}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.5)',
              fontSize: 12, marginTop: 4 }}>
              Need 20 to unlock
            </Text>
          </View>
          <TouchableOpacity
            style={s.goldBtn}
            onPress={() => router.back()}
          >
            <Text style={s.goldBtnText}>✦ Go Practice Maths →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  // ==================
  // TIME LIMIT SCREEN
  // ==================
  if (isTimeLimitReached()) {
    return (
      <SafeAreaView style={s.fullDark}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ padding: 16 }}>
          <Text style={{ color: '#C49A1A', fontWeight: '700' }}>
            ← Back
          </Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center',
          justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontSize: 64, marginBottom: 16 }}>⏰</Text>
          <Text style={s.lockedTitle}>Time&apos;s Up!</Text>
          <Text style={s.lockedSub}>
            You have used your{' '}
            <Text style={{ color: '#C49A1A', fontWeight: '800' }}>
              {arcadeData?.arcadeSettings?.dailyMinutes || 30} minutes
            </Text>{' '}
            of Arcade time today.
          </Text>
          <View style={s.xpBox}>
            <Text style={{ color: '#C49A1A', fontSize: 14,
              fontWeight: '700', marginBottom: 4 }}>
              Come back in
            </Text>
            <Text style={{ color: 'white', fontSize: 40,
              fontWeight: '900' }}>
              {getUnlockTime()}
            </Text>
          </View>
          <TouchableOpacity
            style={s.goldBtn}
            onPress={() => router.back()}
          >
            <Text style={s.goldBtnText}>✦ Practice More Maths →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  // ==================
  // PLAYING GAME (Full Screen Modal)
  // ==================
  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>

      {/* FULL SCREEN GAME MODAL */}
      <Modal
        visible={!!playingGame}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => {
          Alert.alert(
            'Exit Game?',
            'Are you sure you want to exit?',
            [
              { text: 'Keep Playing', style: 'cancel' },
              { text: 'Exit', onPress: () => exitGame() },
            ]
          )
        }}
      >
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          {/* Game top bar */}
          <View style={[s.gameBar, {
            paddingTop: Platform.OS === 'ios' ? 52 : 12
          }]}>
            <View style={{ flexDirection: 'row',
              alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 20 }}>
                {playingGame?.emoji}
              </Text>
              <Text style={{ color: 'white', fontWeight: '700',
                fontSize: 15 }}>
                {playingGame?.title}
              </Text>
              <View style={s.timeBadge}>
                <Text style={{ color: '#C49A1A', fontSize: 12,
                  fontWeight: '700' }}>
                  {sessionMinutes}m played
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  'Exit Game?',
                  `You have played ${sessionMinutes} minutes.`,
                  [
                    { text: 'Keep Playing', style: 'cancel' },
                    { text: 'Exit', style: 'destructive',
                      onPress: () => exitGame() },
                  ]
                )
              }}
              style={s.exitBtn}
            >
              <Text style={{ color: '#EF4444', fontWeight: '700',
                fontSize: 13 }}>
                ✕ Exit
              </Text>
            </TouchableOpacity>
          </View>

          {/* WebView — plays game inline */}
          {playingGame && !webViewError && (
            <WebView
              source={{ uri: getGameUrl(playingGame.embedUrl) }}
              style={{ flex: 1 }}
              // Critical settings for inline game playback
              allowsInlineMediaPlayback
              allowsFullscreenVideo
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              domStorageEnabled
              scalesPageToFit
              // Prevent navigation away from game
              onShouldStartLoadWithRequest={(request) => {
                const gameUrl = getGameUrl(playingGame.embedUrl)
                // Only allow the game URL and same origin
                if (request.url === gameUrl) return true
                if (request.url.startsWith(gameUrl)) return true
                // Allow same-origin resources
                try {
                  const gameOrigin = new URL(gameUrl).origin
                  const reqOrigin = new URL(request.url).origin
                  if (gameOrigin === reqOrigin) return true
                } catch {}
                // Block navigation away
                return false
              }}
              onError={(syntheticEvent) => {
                console.log('WebView error:', syntheticEvent.nativeEvent)
                setWebViewError(true)
              }}
              onHttpError={(syntheticEvent) => {
                const { statusCode } = syntheticEvent.nativeEvent
                if (statusCode >= 400) setWebViewError(true)
              }}
              // Inject CSS to make game fill the webview
              injectedJavaScript={`
                document.body.style.margin = '0';
                document.body.style.padding = '0';
                document.body.style.overflow = 'hidden';
                document.documentElement.style.overflow = 'hidden';
                true;
              `}
              userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148"
            />
          )}

          {/* WebView error fallback */}
          {webViewError && (
            <View style={{ flex: 1, alignItems: 'center',
              justifyContent: 'center', padding: 32 }}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>😅</Text>
              <Text style={{ color: 'white', fontWeight: '800',
                fontSize: 20, textAlign: 'center',
                marginBottom: 8 }}>
                Could not load game
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.5)',
                fontSize: 14, textAlign: 'center',
                marginBottom: 24 }}>
                This game needs an internet connection.
                Check your connection and try again.
              </Text>
              <TouchableOpacity
                style={s.goldBtn}
                onPress={() => setWebViewError(false)}
              >
                <Text style={s.goldBtnText}>Try Again</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ marginTop: 12 }}
                onPress={() => exitGame()}
              >
                <Text style={{ color: 'rgba(255,255,255,0.4)',
                  fontSize: 14 }}>
                  Exit Game
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* ==================
          ARCADE LOBBY
      ================== */}
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: '#C49A1A', fontWeight: '700',
              fontSize: 15 }}>← HQ</Text>
          </TouchableOpacity>

          {/* Arcade logo */}
          <View style={{ flexDirection: 'row',
            alignItems: 'center', gap: 8 }}>
            <Image
              source={require('../../assets/arcadelogo.png')}
              style={{ width: 32, height: 32, resizeMode: 'contain' }}
              onError={() => {}} // silent fallback
            />
            <Text style={s.headerTitle}>
              Hero <Text style={{ color: '#C49A1A' }}>Arcade</Text>
            </Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: '#C49A1A', fontWeight: '800',
              fontSize: 14 }}>
              ⚡ {arcadeData?.xp || 0}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.3)',
              fontSize: 10 }}>Hero Points</Text>
          </View>
        </View>

        {/* Daily time progress bar */}
        <View style={s.timeBar}>
          <View style={{ flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 6 }}>
            <Text style={{ color: 'rgba(255,255,255,0.6)',
              fontSize: 12, fontWeight: '600' }}>
              ⏱ Today&apos;s Play Time
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.6)',
              fontSize: 12 }}>
              {arcadeData?.minutesToday || 0}/
              {arcadeData?.arcadeSettings?.dailyMinutes || 30} min
            </Text>
          </View>
          <View style={s.timeBarBg}>
            <View style={[s.timeBarFill, {
              width: `${Math.min(100,
                ((arcadeData?.minutesToday || 0) /
                (arcadeData?.arcadeSettings?.dailyMinutes || 30)) * 100
              )}%` as any,
            }]} />
          </View>
        </View>

        {/* Stats row */}
        <View style={s.statsRow}>
          {[
            { label: 'Unlocked', value: (arcadeData?.unlockedGames || []).length, emoji: '🔓' },
            { label: 'Available', value: ARCADE_GAMES.filter(g => !g.comingSoon).length, emoji: '🎮' },
            { label: 'Streak', value: arcadeData?.streak || 0, emoji: '🔥' },
          ].map((s2, i) => (
            <View key={i} style={s.statItem}>
              <Text style={{ fontSize: 18 }}>{s2.emoji}</Text>
              <Text style={{ color: '#C49A1A', fontWeight: '800',
                fontSize: 16 }}>
                {s2.value}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)',
                fontSize: 10 }}>
                {s2.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Category pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16,
            paddingVertical: 10, gap: 8 }}
          style={{ maxHeight: 52 }}
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
          contentContainerStyle={{ padding: 16, gap: 12,
            paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {filteredGames.map(game => {
            const unlocked = isUnlocked(game.id)
            const canAffordIt = (arcadeData?.xp || 0) >= game.pointsCost
            const limitHit = isTimeLimitReached()

            return (
              <TouchableOpacity
                key={game.id}
                onPress={() => handleGameTap(game)}
                style={[
                  s.gameCard,
                  unlocked && !game.comingSoon && s.gameCardUnlocked,
                  (game.comingSoon || limitHit) && s.gameCardDim,
                ]}
                activeOpacity={0.75}
              >
                {/* Emoji thumbnail */}
                <View style={s.gameThumb}>
                  <Text style={{ fontSize: 36 }}>
                    {game.emoji}
                  </Text>
                </View>

                {/* Game info */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row',
                    alignItems: 'center', gap: 6,
                    flexWrap: 'wrap', marginBottom: 3 }}>
                    <Text style={s.gameTitle}>
                      {game.title}
                    </Text>
                    {game.comingSoon && (
                      <View style={s.soonBadge}>
                        <Text style={s.soonText}>SOON</Text>
                      </View>
                    )}
                    {!game.comingSoon && unlocked && (
                      <View style={s.unlockedBadge}>
                        <Text style={s.unlockedText}>✓ UNLOCKED</Text>
                      </View>
                    )}
                    {game.premiumOnly && (
                      <View style={s.premiumBadge}>
                        <Text style={s.premiumText}>PREMIUM</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.gameDesc} numberOfLines={1}>
                    {game.description}
                  </Text>
                  <Text style={{ fontSize: 11,
                    color: 'rgba(255,255,255,0.25)',
                    marginTop: 2 }}>
                    {game.category} · Age {game.ageRating}
                  </Text>
                </View>

                {/* Action button */}
                <View style={{ alignItems: 'center',
                  justifyContent: 'center', minWidth: 64 }}>
                  {game.comingSoon ? (
                    <Text style={{ color: 'rgba(255,255,255,0.25)',
                      fontSize: 20 }}>🔜</Text>
                  ) : limitHit ? (
                    <Text style={{ color: 'rgba(255,255,255,0.25)',
                      fontSize: 20 }}>⏰</Text>
                  ) : unlocked ? (
                    <View style={s.playBtn}>
                      <Text style={{ color: 'white',
                        fontSize: 16, fontWeight: '900' }}>
                        ▶
                      </Text>
                    </View>
                  ) : (
                    <View style={[s.costPill,
                      !canAffordIt && s.costPillPoor]}>
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
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const s = StyleSheet.create({
  fullDark: {
    flex: 1, backgroundColor: '#000000',
    alignItems: 'center', justifyContent: 'center',
  },
  loadingText: {
    color: '#C49A1A', fontSize: 16,
    fontWeight: '700', marginTop: 12,
  },
  lockedTitle: {
    color: 'white', fontSize: 28,
    fontWeight: '800', marginBottom: 12,
    textAlign: 'center',
  },
  lockedSub: {
    color: 'rgba(255,255,255,0.6)', fontSize: 15,
    textAlign: 'center', lineHeight: 22,
    marginBottom: 24, maxWidth: 320,
  },
  xpBox: {
    backgroundColor: 'rgba(196,154,26,0.1)',
    borderWidth: 2, borderColor: '#C49A1A',
    borderRadius: 20, padding: 24,
    alignItems: 'center', marginBottom: 32,
    minWidth: 200,
  },
  goldBtn: {
    backgroundColor: '#1B2B4B',
    borderWidth: 2, borderColor: '#C49A1A',
    borderRadius: 14, paddingVertical: 14,
    paddingHorizontal: 32,
  },
  goldBtnText: {
    color: 'white', fontWeight: '800', fontSize: 15,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16, paddingTop: 8,
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(196,154,26,0.2)',
  },
  headerTitle: {
    color: 'white', fontWeight: '900',
    fontSize: 17, textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timeBar: {
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  timeBarBg: {
    height: 8, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4, overflow: 'hidden',
  },
  timeBarFill: {
    height: '100%',
    backgroundColor: '#C49A1A',
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  statItem: {
    flex: 1, alignItems: 'center',
    paddingVertical: 10,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.05)',
    gap: 2,
  },
  catPill: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  catPillActive: {
    backgroundColor: '#C49A1A',
    borderColor: '#C49A1A',
  },
  catText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12, fontWeight: '700',
  },
  catTextActive: { color: '#0A0A1A' },
  gameCard: {
    flexDirection: 'row', alignItems: 'center',
    gap: 14, backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16, padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 8,
  },
  gameCardUnlocked: {
    borderColor: 'rgba(34,197,94,0.35)',
    backgroundColor: 'rgba(34,197,94,0.04)',
  },
  gameCardDim: { opacity: 0.55 },
  gameThumb: {
    width: 60, height: 60, borderRadius: 14,
    backgroundColor: 'rgba(27,43,75,0.7)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  gameTitle: {
    color: 'white', fontWeight: '700', fontSize: 15,
  },
  gameDesc: {
    color: 'rgba(255,255,255,0.4)', fontSize: 12,
  },
  soonBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  soonText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 9, fontWeight: '800',
  },
  unlockedBadge: {
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  unlockedText: {
    color: '#22C55E', fontSize: 9, fontWeight: '800',
  },
  premiumBadge: {
    backgroundColor: 'rgba(196,154,26,0.15)',
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  premiumText: {
    color: '#C49A1A', fontSize: 9, fontWeight: '800',
  },
  playBtn: {
    backgroundColor: '#22C55E', borderRadius: 12,
    width: 44, height: 44, alignItems: 'center',
    justifyContent: 'center',
  },
  costPill: {
    backgroundColor: 'rgba(196,154,26,0.15)',
    borderRadius: 10, paddingHorizontal: 12,
    paddingVertical: 8, borderWidth: 1,
    borderColor: 'rgba(196,154,26,0.3)',
  },
  costPillPoor: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  costText: {
    color: '#C49A1A', fontSize: 13, fontWeight: '800',
  },
  costTextPoor: { color: 'rgba(255,255,255,0.25)' },
  gameBar: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(196,154,26,0.3)',
  },
  timeBadge: {
    backgroundColor: 'rgba(196,154,26,0.15)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  exitBtn: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7,
  },
})
