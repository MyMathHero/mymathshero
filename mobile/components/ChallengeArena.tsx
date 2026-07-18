import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Modal } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { useTheme, ThemeColors } from '../lib/themeContext'
import { studentAPI } from '../lib/api'
import { formatMath } from './MathText'
import CharacterAvatar from './CharacterAvatar'
import { MaterialCommunityIcons } from '@expo/vector-icons'

const HERO_PIC = require('../assets/heroprofilepic.png')

const gradeLbl = (g: any) => (g == null ? '' : g === 0 ? 'Prep' : `Grade ${g}`)
const isEmojiAv = (v: any) => typeof v === 'string' && !/^[a-z0-9_]+$/i.test(v.trim())

// A person's face for invite cards: photo → character avatar → default face.
function OppFace({ from, size = 44 }: { from: any; size?: number }) {
  if (from?.photo) return <Image source={{ uri: from.photo }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  if (from?.avatarConfig || (from?.avatar && !isEmojiAv(from.avatar))) {
    return <CharacterAvatar id={from.avatar} config={from.avatarConfig} size={size} />
  }
  return <CharacterAvatar id={null} size={size} />
}

const strip = (s: string) => String(s ?? '').trim().replace(/^\s*[A-Da-d][).:]\s*/, '')

// Hero Speed Challenge — mobile 1v1 arena. Mirrors the web ChallengeArena:
// presence heartbeat, queue matchmaking with AI fallback, polled live scores,
// result + 20-coin reward. No chat; opponent shown as first name + avatar only.
export default function ChallengeArena({ grade = 3, onCoins }: { grade?: number; onCoins?: (c: number) => void }) {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])
  const [studentId, setStudentId] = useState('')
  const [myAvatar, setMyAvatar] = useState<string | null>(null)
  const [myAvatarConfig, setMyAvatarConfig] = useState<any>(null)
  const [phase, setPhase] = useState<'idle' | 'searching' | 'racing' | 'result'>('idle')
  const [match, setMatch] = useState<any>(null)
  const [qIndex, setQIndex] = useState(0)
  const [locked, setLocked] = useState(false)
  const [error, setError] = useState('')
  const [invited, setInvited] = useState<any>(null)   // who I'm inviting
  const [incoming, setIncoming] = useState<any>(null) // an invite sent to ME
  const pollRef = useRef<any>(null)
  const inboxRef = useRef<any>(null)
  const searchRef = useRef<any>(null)
  const presenceRef = useRef<any>(null)
  const qStartRef = useRef(Date.now())
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  useEffect(() => {
    (async () => {
      const id = (await SecureStore.getItemAsync('user_id')) || ''
      setStudentId(id)
      // Load the student's own avatar so "You" shows it (not a generic emoji).
      try {
        const r = await studentAPI.progress(id)
        setMyAvatar(r?.data?.student?.avatar ?? null)
        setMyAvatarConfig(r?.data?.student?.avatarConfig ?? null)
      } catch { /* fall back to default face */ }
    })()
  }, [])

  // Presence heartbeat while mounted.
  useEffect(() => {
    if (!studentId) return
    const beat = () => studentAPI.presence(studentId, phaseRef.current === 'idle' || phaseRef.current === 'searching').catch(() => {})
    beat()
    presenceRef.current = setInterval(beat, 30000)
    return () => clearInterval(presenceRef.current)
  }, [studentId])

  const stopPoll = () => {
    if (pollRef.current) { clearInterval(pollRef.current); clearTimeout(pollRef.current); pollRef.current = null }
  }
  useEffect(() => () => stopPoll(), [])

  // Resume on mount: if there's already an ACTIVE match (accepted a global
  // invite and navigated here), drop straight into the race.
  useEffect(() => {
    if (!studentId) return
    let done = false
    ;(async () => {
      const data = await studentAPI.challenge(studentId, 'resume', {}).then((r: any) => r.data).catch(() => null)
      if (done || !data?.match || data.match.status !== 'active') return
      setMatch(data.match); startPolling(data.match.matchId)
      setPhase('racing'); qStartRef.current = Date.now()
    })()
    return () => { done = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId])

  // Poll INBOX while not racing so someone can send us a request.
  useEffect(() => {
    if (!studentId || phase === 'racing' || phase === 'result') { setIncoming(null); return }
    const tick = async () => {
      const d = await studentAPI.challenge(studentId, 'inbox', {}).then((r: any) => r.data).catch(() => null)
      setIncoming(d?.invite || null)
    }
    tick()
    inboxRef.current = setInterval(tick, 2500)
    return () => clearInterval(inboxRef.current)
  }, [studentId, phase])

  const call = useCallback((action: string, extra: any = {}) =>
    studentAPI.challenge(studentId, action, extra)
      .then((r: any) => r.data)
      // Surface the server's error body (e.g. HERO-task/exam lock, parent off)
      // instead of swallowing it, so the student sees why they can't start.
      .catch((e: any) => e?.response?.data || null), [studentId])

  const startPolling = useCallback((matchId: string) => {
    stopPoll()
    pollRef.current = setInterval(async () => {
      const data = await call('status', { matchId })
      if (data?.match) {
        setMatch(data.match)
        if (data.match.status === 'active' && phaseRef.current !== 'racing') { setPhase('racing'); qStartRef.current = Date.now() }
        if (data.match.status === 'complete') { setPhase('result'); stopPoll() }
      }
    }, 2000)
  }, [call])

  const runSearch = useCallback(async () => {
    const st = searchRef.current
    if (!st) return
    const data = await call('find', { searchStart: st.start, tried: st.tried })
    if (data?.error) { setError(data.error); setPhase('idle'); searchRef.current = null; return }
    if (data?.match) {
      searchRef.current = null; setInvited(null)
      setMatch(data.match)
      startPolling(data.match.matchId)
      if (data.match.status === 'active') { setPhase('racing'); qStartRef.current = Date.now() }
      return
    }
    if (data?.searching) {
      setInvited(data.invited || null)
      if (Array.isArray(data.tried)) st.tried = data.tried
      pollRef.current = setTimeout(runSearch, 1500)
    }
  }, [call, startPolling])

  function findMatch() {
    setError(''); setPhase('searching'); setMatch(null); setInvited(null)
    searchRef.current = { start: Date.now(), tried: [] }
    runSearch()
  }

  async function cancelSearch() {
    stopPoll(); searchRef.current = null
    await call('cancel')
    setMatch(null); setInvited(null); setPhase('idle')
  }

  async function acceptInvite() {
    const inv = incoming
    if (!inv) return
    setIncoming(null)
    const data = await call('accept', { inviteId: inv.inviteId })
    if (data?.match) {
      setMatch(data.match); startPolling(data.match.matchId)
      setPhase('racing'); qStartRef.current = Date.now()
    } else {
      setError(data?.error || 'That challenge is no longer available.')
    }
  }
  async function declineInvite() {
    const inv = incoming
    setIncoming(null)
    if (inv) await call('decline', { inviteId: inv.inviteId })
  }

  async function answer(option: string) {
    if (locked || !match) return
    setLocked(true)
    const q = match.questions[qIndex]
    const timeMs = Date.now() - qStartRef.current
    const data = await call('answer', { matchId: match.matchId, questionId: q.questionId, answer: option, timeMs })
    if (data?.match) setMatch(data.match)
    const next = qIndex + 1
    setTimeout(async () => {
      setLocked(false)
      if (next >= match.total) {
        const fin = await call('finish', { matchId: match.matchId })
        if (fin?.match) setMatch(fin.match)
        if (fin?.match?.status === 'complete') { setPhase('result'); stopPoll() }
      } else {
        setQIndex(next); qStartRef.current = Date.now()
      }
    }, 450)
  }

  // Incoming challenge-request popup (shown on idle/searching).
  const inviteModal = (
    <Modal visible={!!incoming?.from} transparent animationType="fade" onRequestClose={declineInvite}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <View style={{ backgroundColor: colors.bgCard, borderRadius: 20, padding: 24, width: '100%', maxWidth: 320, alignItems: 'center', borderWidth: 2, borderColor: colors.accentGold }}>
          <Text style={{ color: colors.accentGold, fontWeight: '800', fontSize: 12, letterSpacing: 1, marginBottom: 12 }}>CHALLENGE REQUEST</Text>
          <OppFace from={incoming?.from} size={64} />
          <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 18, marginTop: 8 }}>{incoming?.from?.firstName}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{gradeLbl(incoming?.from?.grade)}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4, marginBottom: 16, textAlign: 'center' }}>invited you to a Hero Speed Challenge!</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity onPress={declineInvite} style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={acceptInvite} style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: colors.accentGold, alignItems: 'center' }}>
              <Text style={{ color: '#1B2B4B', fontWeight: '800' }}>Accept →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )

  if (phase === 'idle') {
    return (
      <View style={s.card}>
        {inviteModal}
        <MaterialCommunityIcons name="sword-cross" size={48} color={colors.accentGold} style={{ alignSelf: 'center', marginBottom: 4 }} />
        <Text style={s.title}>Hero Speed Challenge</Text>
        <Text style={s.sub}>Race another Hero in a quick maths battle. Win to earn 20 🪙!</Text>
        <Text style={s.safe}>Safe & friendly · no chat · first name + avatar only</Text>
        {!!error && <Text style={s.error}>{error}</Text>}
        <TouchableOpacity style={s.goldBtn} onPress={findMatch}>
          <Text style={s.goldBtnText}>Find a Challenge →</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (phase === 'searching') {
    const inv = invited?.from
    return (
      <View style={[s.card, { alignItems: 'center' }]}>
        {inviteModal}
        <ActivityIndicator color={colors.accentGold} size="large" style={{ marginBottom: 12 }} />
        {inv ? (
          <>
            <Text style={s.title}>Challenge sent to {inv.firstName}!</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 10 }}>
              <OppFace from={inv} size={40} />
              <View>
                <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 14 }}>{inv.firstName}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{gradeLbl(inv.grade)}</Text>
              </View>
            </View>
            <Text style={s.sub}>Waiting for them to accept… we’ll try someone else if they’re busy.</Text>
          </>
        ) : (
          <>
            <Text style={s.title}>Looking for a Hero to race…</Text>
            <Text style={s.sub}>Sending requests to available Heroes. If no one accepts, Hero Bot jumps in!</Text>
          </>
        )}
        <TouchableOpacity onPress={cancelSearch} style={{ marginTop: 8 }}><Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Cancel</Text></TouchableOpacity>
      </View>
    )
  }

  if (phase === 'racing' && match) {
    const q = match.questions[qIndex]
    const me = match.me, opp = match.opponent
    return (
      <View>
        <View style={s.scoreRow}>
          <ScorePill c={colors} name="You" avatarId={myAvatar} avatarConfig={myAvatarConfig} correct={me?.correct || 0} answered={me?.answered || 0} total={match.total} me />
          <Text style={{ fontWeight: '800', color: colors.textSecondary, marginHorizontal: 6 }}>vs</Text>
          <ScorePill c={colors} name={opp?.firstName || 'Hero'} avatarId={opp?.avatar} photo={opp?.photo} heroPic={opp?.isBot || opp?.firstName === 'Hero Bot' || !opp?.avatar} correct={opp?.correct || 0} answered={opp?.answered || 0} total={match.total} />
        </View>
        {q ? (
          <View style={s.card}>
            <Text style={{ color: colors.accentGold, fontWeight: '700', fontSize: 12, marginBottom: 6 }}>Question {qIndex + 1} of {match.total}</Text>
            <Text style={s.question}>{formatMath(q.question)}</Text>
            <View style={{ gap: 10, marginTop: 14 }}>
              {(q.options || []).map((opt: string, i: number) => (
                <TouchableOpacity key={i} disabled={locked} onPress={() => answer(opt)} style={[s.option, locked && { opacity: 0.6 }]}>
                  <Text style={s.optionText}>{formatMath(strip(opt))}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <View style={s.card}><Text style={s.sub}>Waiting for {opp?.firstName || 'your opponent'} to finish… ⏳</Text></View>
        )}
      </View>
    )
  }

  if (phase === 'result' && match) {
    const won = match.winner === studentId
    const me = match.me
    const t = Math.max(1, match.total)
    const pct = Math.round((me?.correct || 0) / t * 100)
    return (
      <View style={[s.card, { alignItems: 'center', backgroundColor: won ? '#065F46' : colors.bgCard }]}>
        <Text style={{ fontSize: 56 }}>{won ? '🏆' : match.winner === 'tie' ? '🤝' : '💪'}</Text>
        <Text style={[s.title, won && { color: 'white' }]}>
          {won ? 'You win! 🎉' : match.winner === 'tie' ? "It's a tie!" : 'Great effort!'}
        </Text>
        <Text style={[s.sub, won && { color: 'rgba(255,255,255,0.85)' }]}>
          You solved {me?.correct || 0} question{(me?.correct || 0) === 1 ? '' : 's'} with {pct}% accuracy.
        </Text>
        {match.rewardCoins > 0 && <Text style={{ color: colors.accentGold, fontWeight: '800', fontSize: 18, marginTop: 8 }}>+{match.rewardCoins} 🪙</Text>}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <TouchableOpacity style={[s.ghostBtn]} onPress={() => { setMatch(null); setQIndex(0); setPhase('idle') }}>
            <Text style={{ color: won ? 'white' : colors.textSecondary, fontWeight: '700' }}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.goldBtnSm} onPress={() => { onCoins?.(match.rewardCoins || 0); setMatch(null); setQIndex(0); findMatch() }}>
            <Text style={s.goldBtnText}>Race again →</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return null
}

function ScorePill({ c, name, avatarId, avatarConfig, photo, heroPic, correct, answered, total, me }: any) {
  // photo → the student's own character avatar → Hero pic (AI bot) → default face.
  const isEmoji = (v: any) => typeof v === 'string' && !/^[a-z0-9_]+$/i.test(v.trim())
  let face
  if (photo) {
    face = <Image source={{ uri: photo }} style={{ width: 30, height: 30, borderRadius: 15 }} />
  } else if (heroPic) {
    // Hero Bot — always the real Hero pic (server sends avatar '🤖', so this must
    // win before the avatar branch).
    face = <Image source={HERO_PIC} style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: c.accentGold }} />
  } else if (avatarConfig || (avatarId && !isEmoji(avatarId))) {
    face = <CharacterAvatar id={avatarId} config={avatarConfig} size={30} />
  } else {
    face = <CharacterAvatar id={null} size={30} />
  }
  return (
    <View style={{
      flex: 1, backgroundColor: me ? c.accentGoldLight : c.bgCard,
      borderWidth: 2, borderColor: me ? c.accentGold : c.cardBorder,
      borderRadius: 14, padding: 10,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {face}
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ color: c.textPrimary, fontWeight: '800', fontSize: 13 }}>{name}</Text>
          <Text style={{ color: c.textSecondary, fontSize: 11 }}>✓ {correct} · {answered}/{total}</Text>
        </View>
      </View>
    </View>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  card: { backgroundColor: c.bgCard, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: c.cardBorder, marginBottom: 12 },
  title: { color: c.textPrimary, fontWeight: '800', fontSize: 20, textAlign: 'center', marginTop: 8 },
  sub: { color: c.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 4 },
  safe: { color: c.textMuted, fontSize: 12, textAlign: 'center', marginTop: 6, marginBottom: 16 },
  error: { color: '#EF4444', fontSize: 13, textAlign: 'center', marginBottom: 10 },
  goldBtn: { backgroundColor: c.accentGold, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  goldBtnSm: { backgroundColor: c.accentGold, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center' },
  goldBtnText: { color: '#1B2B4B', fontWeight: '800', fontSize: 15 },
  ghostBtn: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20, borderWidth: 1, borderColor: c.cardBorder, alignItems: 'center' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  question: { color: c.textPrimary, fontWeight: '700', fontSize: 18 },
  option: { padding: 14, borderRadius: 12, borderWidth: 2, borderColor: c.cardBorder, backgroundColor: c.bgPrimary },
  optionText: { color: c.textPrimary, fontWeight: '600', fontSize: 15 },
})
