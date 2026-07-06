import { MongoClient, ObjectId } from 'mongodb'
import { NextResponse } from 'next/server'
import { adjustCoins } from '@/lib/coins'
import { parseFractionVisual } from '@/lib/fractionVisual'
import {
  challengeQuestionCount, gradesMatch, displayFirstName,
  simulateAiRun, aiThinkMs, decideWinner, challengeReward,
} from '@/lib/challenge'

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

const ONLINE_WINDOW_MS = 60 * 1000
const QUEUE_AI_FALLBACK_MS = 12 * 1000 // wait this long for a human, then play the AI

function oid(id) { try { return new ObjectId(id) } catch { return null } }

// Sample a shared question set for a match at a grade. Keeps correctAnswer for
// server-side grading; the client-facing shape strips it.
async function sampleQuestions(db, grade, count) {
  const gradePrefix = `m_${grade}_`
  const pipeline = [
    { $match: { verifierFlagged: { $ne: true }, skillId: { $regex: `^${gradePrefix}` } } },
    { $sample: { size: count } },
  ]
  let docs = await db.collection('questions').aggregate(pipeline).toArray()
  if (docs.length < count) {
    const more = await db.collection('questions')
      .aggregate([{ $match: { verifierFlagged: { $ne: true } } }, { $sample: { size: count } }])
      .toArray()
    docs = [...docs, ...more].slice(0, count)
  }
  return docs.map(d => ({
    questionId: d.id || d._id?.toString(),
    question: d.question,
    options: d.options,
    correctAnswer: d.correctAnswer,
    skillId: d.skillId,
    // Re-validate: only attach a fraction diagram if the wording still parses to
    // one, so stale stored visuals never render on unrelated questions.
    visual: (d.question ? parseFractionVisual(d.question) : null) || null,
  }))
}

// The player entry shape stored on a match.
function playerEntry(student) {
  return {
    studentId: student.id,
    firstName: displayFirstName(student.name),
    avatar: student.avatar || '🦊',
    grade: student.grade ?? 3,
    correct: 0, answered: 0, timeMs: 0, finished: false,
  }
}

// Public view of a match — NEVER leaks correctAnswer or the opponent's photo.
function publicMatch(match, meId) {
  const me = match.players.find(p => p.studentId === meId) || match.players[0]
  const opp = match.players.find(p => p.studentId !== meId) || null
  return {
    matchId: match._id.toString(),
    status: match.status,
    mode: match.mode,
    total: match.total,
    questions: (match.questions || []).map(({ correctAnswer, ...q }) => q),
    me: me ? { correct: me.correct, answered: me.answered, finished: me.finished } : null,
    opponent: opp ? {
      firstName: opp.firstName, avatar: opp.avatar,
      correct: opp.correct, answered: opp.answered, finished: opp.finished,
    } : (match.mode === 'ai' ? { firstName: 'Hero Bot', avatar: '🤖', correct: match.ai?.correct || 0, answered: match.ai?.answered || 0, finished: match.ai?.finished || false } : null),
    winner: match.winner || null,
    rewardCoins: match.rewardFor === meId ? (match.rewardCoins || 0) : 0,
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { studentId, action } = body
    if (!studentId || !action) return NextResponse.json({ error: 'studentId and action required' }, { status: 400 })

    const db = await connectDB()
    const student = await db.collection('children').findOne({ id: studentId })
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

    // Respect the parent on/off switch for every entry action.
    if (student.challengeSettings?.enabled === false && ['find', 'invite', 'accept'].includes(action)) {
      return NextResponse.json({ error: 'Challenge is turned off by your parent.', disabled: true }, { status: 403 })
    }

    // ── FIND: queue-based matchmaking with AI fallback ───────────────────────
    if (action === 'find') {
      // Already in an active match? Return it.
      const existing = await db.collection('challenge_matches').findOne({
        status: { $in: ['queued', 'active'] }, 'players.studentId': studentId,
      })
      if (existing) return NextResponse.json({ match: publicMatch(existing, studentId) })

      const count = challengeQuestionCount(student.grade)

      // Try to join an OPEN queued match from a compatible, still-online player.
      const cutoff = new Date(Date.now() - ONLINE_WINDOW_MS)
      const open = await db.collection('challenge_matches').find({
        status: 'queued', mode: 'human',
        'players.0.studentId': { $ne: studentId },
      }).sort({ createdAt: 1 }).toArray()

      for (const m of open) {
        const host = m.players[0]
        const hostDoc = await db.collection('children').findOne({ id: host.studentId })
        const hostOnline = hostDoc?.lastSeenAt && hostDoc.lastSeenAt >= cutoff
        if (hostOnline && gradesMatch(student.grade, host.grade)) {
          // Join: become player 2 and flip to active.
          const joined = await db.collection('challenge_matches').findOneAndUpdate(
            { _id: m._id, status: 'queued' },
            { $set: { status: 'active', startedAt: new Date() }, $push: { players: playerEntry(student) } },
            { returnDocument: 'after' }
          )
          const doc = joined?.value || joined
          if (doc) return NextResponse.json({ match: publicMatch(doc, studentId) })
        }
      }

      // No one to join → create a queued match hosting this player.
      const questions = await sampleQuestions(db, student.grade, count)
      const res = await db.collection('challenge_matches').insertOne({
        status: 'queued', mode: 'human',
        players: [playerEntry(student)],
        questions, total: count,
        createdAt: new Date(),
      })
      const created = await db.collection('challenge_matches').findOne({ _id: res.insertedId })
      return NextResponse.json({ match: publicMatch(created, studentId) })
    }

    // ── STATUS: poll a match; auto-convert a stale queue to an AI match ───────
    if (action === 'status') {
      const id = oid(body.matchId)
      if (!id) return NextResponse.json({ error: 'matchId required' }, { status: 400 })
      let match = await db.collection('challenge_matches').findOne({ _id: id })
      if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

      // Waited too long in queue → start an AI opponent so the student always plays.
      if (match.status === 'queued' && match.players[0].studentId === studentId) {
        const waited = Date.now() - new Date(match.createdAt).getTime()
        if (waited >= QUEUE_AI_FALLBACK_MS) {
          const grade = match.players[0].grade
          const aiRun = simulateAiRun(grade, match.total)
          // Give the bot a REAL total time (sum of per-question think times) so
          // the race is genuinely competitive: to win you must be more accurate
          // OR (on a tie) actually faster than the bot — not just finish.
          const perQ = aiRun.map(() => aiThinkMs(grade))
          const aiTotalMs = perQ.reduce((a, b) => a + b, 0)
          const upd = await db.collection('challenge_matches').findOneAndUpdate(
            { _id: id, status: 'queued' },
            { $set: {
              status: 'active', mode: 'ai', startedAt: new Date(),
              ai: { run: aiRun, perQ, timeMs: aiTotalMs, correct: 0, answered: 0, finished: false },
            } },
            { returnDocument: 'after' }
          )
          match = upd?.value || upd
        }
      }

      // In an AI match, advance the bot to (roughly) mirror the player's pace.
      if (match?.status === 'active' && match.mode === 'ai' && match.ai && !match.ai.finished) {
        const me = match.players.find(p => p.studentId === studentId)
        const target = Math.min(match.total, (me?.answered || 0)) // bot keeps pace with player
        if (target > (match.ai.answered || 0)) {
          const run = match.ai.run || []
          let correct = match.ai.correct || 0
          for (let i = match.ai.answered || 0; i < target; i++) if (run[i]?.correct) correct++
          const finished = target >= match.total
          await db.collection('challenge_matches').updateOne(
            { _id: id },
            { $set: { 'ai.answered': target, 'ai.correct': correct, 'ai.finished': finished } }
          )
          match = await db.collection('challenge_matches').findOne({ _id: id })
        }
      }

      return NextResponse.json({ match: publicMatch(match, studentId) })
    }

    // ── ANSWER: grade one question against the stored correctAnswer ──────────
    if (action === 'answer') {
      const id = oid(body.matchId)
      const { questionId, answer, timeMs = 0 } = body
      if (!id || !questionId) return NextResponse.json({ error: 'matchId and questionId required' }, { status: 400 })
      const match = await db.collection('challenge_matches').findOne({ _id: id })
      if (!match || match.status !== 'active') return NextResponse.json({ error: 'Match not active' }, { status: 400 })

      const q = (match.questions || []).find(x => x.questionId === questionId)
      const correct = !!q && String(answer).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()

      await db.collection('challenge_matches').updateOne(
        { _id: id, 'players.studentId': studentId },
        {
          $inc: {
            'players.$.answered': 1,
            ...(correct ? { 'players.$.correct': 1 } : {}),
            'players.$.timeMs': Math.max(0, Math.round(timeMs)),
          },
        }
      )
      const updated = await db.collection('challenge_matches').findOne({ _id: id })
      return NextResponse.json({ correct, match: publicMatch(updated, studentId) })
    }

    // ── FINISH: mark me done; when both sides are done, decide + pay winner ───
    if (action === 'finish') {
      const id = oid(body.matchId)
      if (!id) return NextResponse.json({ error: 'matchId required' }, { status: 400 })
      await db.collection('challenge_matches').updateOne(
        { _id: id, 'players.studentId': studentId },
        { $set: { 'players.$.finished': true } }
      )
      let match = await db.collection('challenge_matches').findOne({ _id: id })

      // In an AI match, finalize the bot's FULL run when the player finishes —
      // so even if the human raced ahead, the AI is scored on its whole
      // simulated run (real opponent), not just the questions it had "mirrored".
      if (match.mode === 'ai' && match.ai && !match.ai.finished) {
        const run = match.ai.run || []
        const fullCorrect = run.reduce((n, r) => n + (r?.correct ? 1 : 0), 0)
        await db.collection('challenge_matches').updateOne(
          { _id: id },
          { $set: { 'ai.answered': match.total, 'ai.correct': fullCorrect, 'ai.finished': true } }
        )
        match = await db.collection('challenge_matches').findOne({ _id: id })
      }

      const meDone = match.players.find(p => p.studentId === studentId)?.finished
      const opp = match.players.find(p => p.studentId !== studentId)
      const oppDone = match.mode === 'ai' ? (match.ai?.finished || (match.ai?.answered >= match.total)) : opp?.finished
      const bothDone = meDone && oppDone

      if (bothDone && match.status !== 'complete') {
        const mePlayer = match.players.find(p => p.studentId === studentId)
        // Against the AI, use its REAL simulated total time so ties are decided
        // by genuine speed — you only beat the bot by being more accurate, or
        // faster when you're tied on correct answers.
        const oppStats = match.mode === 'ai'
          ? { correct: match.ai?.correct || 0, timeMs: match.ai?.timeMs ?? Infinity }
          : { correct: opp?.correct || 0, timeMs: opp?.timeMs ?? Infinity }
        const outcome = decideWinner(
          { correct: mePlayer.correct, timeMs: mePlayer.timeMs },
          oppStats
        )
        const winnerId = outcome === 'player' ? studentId : (opp?.studentId || 'ai')
        const reward = challengeReward(outcome)

        // Atomically close the match so the reward is paid ONCE.
        const closed = await db.collection('challenge_matches').findOneAndUpdate(
          { _id: id, status: { $ne: 'complete' } },
          { $set: {
            status: 'complete', completedAt: new Date(),
            winner: winnerId, rewardCoins: reward, rewardFor: reward > 0 ? studentId : null,
          } },
          { returnDocument: 'after' }
        )
        const doc = closed?.value || closed
        if (doc && reward > 0 && outcome === 'player') {
          await adjustCoins(db, studentId, { coins: reward, reason: 'challenge-win', meta: { matchId: id.toString() } })
        }
        match = doc || match
      }

      return NextResponse.json({ match: publicMatch(match, studentId) })
    }

    // ── CANCEL: leave a queue you're hosting ─────────────────────────────────
    if (action === 'cancel') {
      const id = oid(body.matchId)
      if (id) {
        await db.collection('challenge_matches').deleteOne({ _id: id, status: 'queued', 'players.0.studentId': studentId })
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Challenge error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
