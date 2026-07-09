import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { useTheme, ThemeColors } from '../lib/themeContext'
import { studentAPI } from '../lib/api'
import { formatMath } from './MathText'

const strip = (s: string) => String(s ?? '').trim().replace(/^\s*[A-Da-d][).:]\s*/, '')

// Hero Speed Challenge — mobile 1v1 arena. Mirrors the web ChallengeArena:
// presence heartbeat, queue matchmaking with AI fallback, polled live scores,
// result + 20-coin reward. No chat; opponent shown as first name + avatar only.
export default function ChallengeArena({ grade = 3, onCoins }: { grade?: number; onCoins?: (c: number) => void }) {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])
  const [studentId, setStudentId] = useState('')
  const [phase, setPhase] = useState<'idle' | 'searching' | 'racing' | 'result'>('idle')
  const [match, setMatch] = useState<any>(null)
  const [qIndex, setQIndex] = useState(0)
  const [locked, setLocked] = useState(false)
  const [error, setError] = useState('')
  const pollRef = useRef<any>(null)
  const presenceRef = useRef<any>(null)
  const qStartRef = useRef(Date.now())
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  useEffect(() => {
    (async () => setStudentId((await SecureStore.getItemAsync('user_id')) || ''))()
  }, [])

  // Presence heartbeat while mounted.
  useEffect(() => {
    if (!studentId) return
    const beat = () => studentAPI.presence(studentId, phaseRef.current === 'idle' || phaseRef.current === 'searching').catch(() => {})
    beat()
    presenceRef.current = setInterval(beat, 30000)
    return () => clearInterval(presenceRef.current)
  }, [studentId])

  const stopPoll = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }
  useEffect(() => () => stopPoll(), [])

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

  async function findMatch() {
    setError(''); setPhase('searching')
    const data = await call('find')
    if (data?.error) { setError(data.error); setPhase('idle'); return }
    if (data?.match) {
      setMatch(data.match)
      startPolling(data.match.matchId)
      if (data.match.status === 'active') { setPhase('racing'); qStartRef.current = Date.now() }
    }
  }

  async function cancelSearch() {
    stopPoll()
    if (match?.matchId) await call('cancel', { matchId: match.matchId })
    setMatch(null); setPhase('idle')
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

  if (phase === 'idle') {
    return (
      <View style={s.card}>
        <Text style={{ fontSize: 52, textAlign: 'center' }}>⚔️</Text>
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
    return (
      <View style={[s.card, { alignItems: 'center' }]}>
        <Text style={{ fontSize: 46 }}>🔎</Text>
        <Text style={s.title}>Finding a Hero to race…</Text>
        <Text style={s.sub}>Matching you with someone online. If no one’s around, Hero Bot 🤖 jumps in!</Text>
        <ActivityIndicator color={colors.accentGold} style={{ marginVertical: 12 }} />
        <TouchableOpacity onPress={cancelSearch}><Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Cancel</Text></TouchableOpacity>
      </View>
    )
  }

  if (phase === 'racing' && match) {
    const q = match.questions[qIndex]
    const me = match.me, opp = match.opponent
    return (
      <View>
        <View style={s.scoreRow}>
          <ScorePill c={colors} name="You" avatar="🦸" correct={me?.correct || 0} answered={me?.answered || 0} total={match.total} me />
          <Text style={{ fontWeight: '800', color: colors.textSecondary, marginHorizontal: 6 }}>vs</Text>
          <ScorePill c={colors} name={opp?.firstName || 'Hero'} avatar={opp?.avatar || '🤖'} photo={opp?.photo} correct={opp?.correct || 0} answered={opp?.answered || 0} total={match.total} />
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

function ScorePill({ c, name, avatar, photo, correct, answered, total, me }: any) {
  return (
    <View style={{
      flex: 1, backgroundColor: me ? c.accentGoldLight : c.bgCard,
      borderWidth: 2, borderColor: me ? c.accentGold : c.cardBorder,
      borderRadius: 14, padding: 10,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {/* Parent-approved photo if present, else the avatar emoji. */}
        {photo
          ? <Image source={{ uri: photo }} style={{ width: 24, height: 24, borderRadius: 12 }} />
          : <Text style={{ fontSize: 20 }}>{avatar}</Text>}
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
