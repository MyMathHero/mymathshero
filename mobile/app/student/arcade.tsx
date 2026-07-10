import { useState, useEffect, useRef, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
  Modal, Platform, Animated, Dimensions,
  Image,
} from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { WebView } from 'react-native-webview'
import { useVideoPlayer, VideoView } from 'expo-video'
import { SafeAreaView } from 'react-native-safe-area-context'
import { arcadeAPI, studentAPI } from '../../lib/api'
import { ARCADE_GAMES, ARCADE_CATEGORIES } from '../../lib/arcadeGames'
import { checkHeroGate } from '../../lib/heroGate'
import ArcadeCard, { ArcadeCardHandle } from '../../components/ArcadeCard'

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
  const [showBuyTime, setShowBuyTime] = useState(true) // buy-time step before lobby
  const [webViewError, setWebViewError] = useState(false)
  const [gameLoading, setGameLoading] = useState(false)
  const [buyingTime, setBuyingTime] = useState<string | null>(null)
  const [taskLocked, setTaskLocked] = useState(false)
  const timerRef = useRef<any>(null)
  const sessionIdRef = useRef<string | null>(null)
  const playingGameRef = useRef<any>(null)
  const buyCardRef = useRef<ArcadeCardHandle>(null)   // buy-time card (shimmer)
  const lobbyCardRef = useRef<ArcadeCardHandle>(null) // lobby card (flip-launch)
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

  // Clear the heartbeat timer on unmount.
  useEffect(() => {
    return () => clearInterval(timerRef.current)
  }, [])

  // Refresh arcade data every time the screen gains focus (including first
  // mount). Keeps minutesToday current across devices when returning to the
  // arcade tab. Not active while a game is being played in the modal.
  useFocusEffect(
    useCallback(() => {
      // HERO gate — if today's task / monthly exam isn't done, the arcade is
      // locked: bounce straight back to the dashboard. Closes the tab-bar
      // loophole where the arcade could be opened without finishing the task.
      let cancelled = false
      ;(async () => {
        const gate = await checkHeroGate()
        if (cancelled) return
        if (gate.locked) {
          Alert.alert('🦸 HERO Task', gate.reason.replace('this', 'the Arcade'), [
            { text: 'OK', onPress: () => router.replace('/student/dashboard') },
          ])
          return
        }
        if (!playingGame) loadData()
      })()
      return () => { cancelled = true }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playingGame])
  )

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
      // HERO Daily Task gate — arcade stays locked until today's task is done.
      try {
        const dt = await studentAPI.dailyTask(id)
        const task = dt?.data?.task
        setTaskLocked(!!task && task.done !== true)
      } catch { setTaskLocked(false) }
    } catch {
      Alert.alert('Error', 'Could not load arcade data')
    } finally {
      setLoading(false)
    }
  }

  // The gate is the purchased time wallet now, not a daily cap.
  function timeLeft(): number {
    return Math.max(0, arcadeData?.minutesRemaining || 0)
  }

  // Buy a time pack ('5' or '10') with coins → credits the wallet.
  async function buyTime(pack: '5' | '10') {
    if (buyingTime) return
    setBuyingTime(pack)
    try {
      const res = await arcadeAPI.buyTime(studentId, pack)
      const data = res.data
      if (data.success) {
        setArcadeData((prev: any) => ({
          ...prev,
          coins: data.newCoins ?? prev.coins,
          minutesRemaining: data.minutesRemaining ?? prev.minutesRemaining,
        }))
        buyCardRef.current?.shimmer()
      } else {
        Alert.alert('Not enough coins', data.error || 'Could not buy time.')
      }
    } catch (err: any) {
      Alert.alert('Oops', err?.response?.data?.error || 'Connection error. Try again.')
    } finally {
      setBuyingTime(null)
    }
  }

  function promptBuyTime() {
    Alert.alert(
      '⏱️ Out of arcade time',
      `Buy more play time with your coins.\n\nYou have ${arcadeData?.coins || 0} coins 🪙`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: '5 min · 100 🪙', onPress: () => buyTime('5') },
        { text: '10 min · 200 🪙', onPress: () => buyTime('10') },
      ]
    )
  }

  async function handleGameTap(game: any) {
    // HERO Daily Task gate — must finish today's task before playing.
    if (taskLocked) {
      Alert.alert('🦸 HERO Daily Task', 'Finish today’s HERO task first to unlock the Arcade!')
      return
    }
    // Parent on/off gate.
    if (arcadeData?.arcadeSettings?.enabled === false) {
      Alert.alert(
        '🔒 Arcade Paused',
        'Your parent has paused Arcade access. Ask them to turn it on in the Parent Hub.',
        [{ text: 'OK' }]
      )
      return
    }

    // Coming soon.
    if (game.comingSoon || !game.embedUrl) {
      Alert.alert('🎮 Coming Soon!', `${game.title} is coming very soon. Stay tuned!`, [{ text: 'OK' }])
      return
    }

    // Need purchased play time.
    if (timeLeft() <= 0) {
      promptBuyTime()
      return
    }

    // Flip the lobby card forward to "launch", then mount the game. The WebView's
    // onLoad starts the billed session, so no time is spent while it loads.
    const mount = () => {
      playingGameRef.current = game
      sessionIdRef.current = null
      setSessionId(null)
      setPlayingGame(game)
      setSessionMinutes(0)
      setWebViewError(false)
      setGameLoading(true)
      clearInterval(timerRef.current)
      lobbyCardRef.current?.reset()
    }
    if (lobbyCardRef.current) {
      lobbyCardRef.current.launch().then(() => setTimeout(mount, 250))
    } else {
      mount()
    }
  }

  // Called by the WebView onLoadEnd — the game is on screen, so begin the billed
  // session + the heartbeat that counts the purchased time wallet down.
  async function startBilledSession() {
    const game = playingGameRef.current
    if (!game || sessionIdRef.current) return
    setGameLoading(false)
    try {
      const res = await arcadeAPI.startGame(studentId, game.id)
      const data = res.data
      if (data.limitReached) {
        promptBuyTime()
        exitGame()
        return
      }
      if (data.success) {
        sessionIdRef.current = data.sessionId
        setSessionId(data.sessionId)
        if (typeof data.minutesRemaining === 'number') {
          setArcadeData((prev: any) => ({ ...prev, minutesRemaining: data.minutesRemaining }))
        }
        let localMinutes = 0
        timerRef.current = setInterval(async () => {
          localMinutes += 1
          setSessionMinutes(localMinutes)
          try {
            const hbRes = await arcadeAPI.heartbeat(sessionIdRef.current!, studentId, localMinutes)
            const hbData = hbRes.data
            if (hbData.minutesRemaining !== undefined) {
              setArcadeData((prev: any) => ({ ...prev, minutesRemaining: hbData.minutesRemaining }))
            }
            if (hbData.limitReached) {
              clearInterval(timerRef.current)
              Alert.alert(
                '⏰ Time is Up!',
                'You’re out of arcade time. Buy more with coins to keep playing!',
                [{ text: 'OK', onPress: () => exitGame() }]
              )
            }
          } catch {
            // Heartbeat failed — keep playing, reconciled on exit.
          }
        }, 60000)
      } else {
        Alert.alert('Error', data.error || 'Could not start game')
        exitGame()
      }
    } catch {
      Alert.alert('Error', 'Connection error. Please try again.')
      exitGame()
    }
  }

  function exitGame(_fromLimit = false) {
    clearInterval(timerRef.current)
    const sid = sessionIdRef.current
    if (sid) {
      arcadeAPI.endGame(studentId, playingGameRef.current?.id || '', sid, sessionMinutes)
        .then(() => loadData())
        .catch(() => {})
    }
    setPlayingGame(null)
    playingGameRef.current = null
    setSessionId(null)
    sessionIdRef.current = null
    setSessionMinutes(0)
    setGameLoading(false)
    setWebViewError(false)
  }

  const filteredGames = ARCADE_GAMES.filter(g =>
    activeCategory === 'all' || g.category === activeCategory
  )

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

  // Arcade is always enterable (games are free to browse). After the intro, the
  // BUY-TIME step lets students top up their play-time wallet with coins before
  // the game lobby (parity with web). If a parent has disabled the arcade we
  // skip straight to the lobby's parent-paused messaging.
  if (showBuyTime && arcadeData?.arcadeSettings?.enabled !== false) {
    const mins = arcadeData?.minutesRemaining || 0
    const coins = arcadeData?.coins || 0
    return (
      <View style={s.fullDark}>
        <View style={{ padding: 24, alignItems: 'center', maxWidth: 440 }}>
          <Text style={[s.lockedTitle, { marginBottom: 4 }]}>Your Arcade Card</Text>
          <Text style={[s.lockedSub, { marginBottom: 18 }]}>
            Top up your card with coins. Your timer only starts once a game loads — no time wasted!
          </Text>

          {/* The card — the play-time wallet. */}
          <View style={{ marginBottom: 20 }}>
            <ArcadeCard ref={buyCardRef} minutes={mins} plan={arcadeData?.plan} />
          </View>

          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            {[
              { pack: '5' as const, minutes: 5, coins: 100 },
              { pack: '10' as const, minutes: 10, coins: 200 },
            ].map(p => {
              const afford = coins >= p.coins
              return (
                <TouchableOpacity
                  key={p.pack}
                  onPress={() => buyTime(p.pack)}
                  disabled={buyingTime === p.pack || !afford}
                  style={{
                    flex: 1, paddingVertical: 18, borderRadius: 16, alignItems: 'center',
                    backgroundColor: afford ? '#C49A1A' : 'rgba(255,255,255,0.08)',
                  }}
                >
                  <Text style={{ color: afford ? '#0A0A1A' : 'rgba(255,255,255,0.4)', fontWeight: '800', fontSize: 18 }}>
                    {buyingTime === p.pack ? '…' : `⏱️ ${p.minutes} min`}
                  </Text>
                  <Text style={{ color: afford ? '#0A0A1A' : 'rgba(255,255,255,0.4)', fontWeight: '700', fontSize: 13, marginTop: 4 }}>
                    {p.coins} 🪙
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
          <TouchableOpacity
            onPress={() => setShowBuyTime(false)}
            style={{
              width: '100%', paddingVertical: 15, borderRadius: 14, alignItems: 'center',
              backgroundColor: mins > 0 ? '#16A34A' : 'rgba(255,255,255,0.08)',
            }}
          >
            <Text style={{ color: mins > 0 ? 'white' : 'rgba(255,255,255,0.6)', fontWeight: '800', fontSize: 15 }}>
              {mins > 0 ? 'Continue to games →' : 'Browse games →'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
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
              // Start billing time only once the game has finished loading.
              onLoadEnd={startBilledSession}
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

          {/* Loading overlay — your paid time only starts once the game loads. */}
          {gameLoading && !webViewError && (
            <View style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center',
              justifyContent: 'center', gap: 12,
            }}>
              <Text style={{ fontSize: 44 }}>🎮</Text>
              <ActivityIndicator color="#C49A1A" size="large" />
              <Text style={{ color: '#C49A1A', fontWeight: '800', fontSize: 16 }}>
                Loading {playingGame?.title}…
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
                Your time starts when the game loads ⏱️
              </Text>
            </View>
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
              🪙 {arcadeData?.coins || 0}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.3)',
              fontSize: 10 }}>Coins</Text>
          </View>
        </View>

        {/* The Arcade Card — play time on the card; flips to launch a game. */}
        <View style={{ alignItems: 'center', paddingVertical: 16 }}>
          <ArcadeCard ref={lobbyCardRef} minutes={arcadeData?.minutesRemaining || 0} plan={arcadeData?.plan} />
        </View>

        {/* Time wallet + buy-time */}
        <View style={s.timeBar}>
          <View style={{ flexDirection: 'row',
            justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 8 }}>
            <Text style={{ color: 'rgba(255,255,255,0.7)',
              fontSize: 13, fontWeight: '700' }}>
              ⏱ {arcadeData?.minutesRemaining || 0} min of play time left
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { pack: '5' as const, minutes: 5, coins: 100 },
              { pack: '10' as const, minutes: 10, coins: 200 },
            ].map(p => {
              const afford = (arcadeData?.coins || 0) >= p.coins
              return (
                <TouchableOpacity
                  key={p.pack}
                  onPress={() => buyTime(p.pack)}
                  disabled={buyingTime === p.pack || !afford}
                  style={{
                    flex: 1, paddingVertical: 10, borderRadius: 10,
                    alignItems: 'center',
                    backgroundColor: afford ? '#C49A1A' : 'rgba(255,255,255,0.08)',
                  }}
                >
                  <Text style={{
                    color: afford ? '#0A0A1A' : 'rgba(255,255,255,0.4)',
                    fontWeight: '800', fontSize: 13,
                  }}>
                    {buyingTime === p.pack ? '…' : `+${p.minutes}m · ${p.coins}🪙`}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Stats row */}
        <View style={s.statsRow}>
          {[
            { label: 'Time Left', value: `${arcadeData?.minutesRemaining || 0}m`, emoji: '⏱️' },
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
            const hasTime = (arcadeData?.minutesRemaining || 0) > 0

            return (
              <TouchableOpacity
                key={game.id}
                onPress={() => handleGameTap(game)}
                style={[
                  s.gameCard,
                  game.comingSoon && s.gameCardDim,
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
                    {!game.comingSoon && (
                      <View style={s.unlockedBadge}>
                        <Text style={s.unlockedText}>FREE</Text>
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
                  ) : !hasTime ? (
                    <Text style={{ color: 'rgba(255,255,255,0.35)',
                      fontSize: 20 }}>⏱️</Text>
                  ) : (
                    <View style={s.playBtn}>
                      <Text style={{ color: 'white',
                        fontSize: 16, fontWeight: '900' }}>
                        ▶
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
