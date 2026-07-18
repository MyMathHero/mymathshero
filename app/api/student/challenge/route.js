import { MongoClient, ObjectId } from 'mongodb'
import { NextResponse } from 'next/server'
import { adjustCoins } from '@/lib/coins'
import { parseFractionVisual } from '@/lib/fractionVisual'
import {
  challengeQuestionCount, gradesMatch, displayFirstName,
  simulateAiRun, aiThinkMs, decideWinner, challengeReward,
} from '@/lib/challenge'
import { isTaskDoneToday } from '@/lib/dailyTask'
import { isExamDue } from '@/lib/monthlyExam'

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

const ONLINE_WINDOW_MS = 60 * 1000
const INVITE_TTL_MS = 10 * 1000        // a single invite waits this long for accept/decline
const SEARCH_MAX_MS = 20 * 1000        // try real players this long, then fall back to the bot

function oid(id) { try { return new ObjectId(id) } catch { return null } }

// Find the best online, challenge-available, same-grade candidate to invite —
// excluding self, anyone already invited this search, and anyone busy in a match.
async function findCandidate(db, me, excludeIds = []) {
  const cutoff = new Date(Date.now() - ONLINE_WINDOW_MS)
  const online = await db.collection('children').find({
    id: { $nin: [me.id, ...excludeIds] },
    lastSeenAt: { $gte: cutoff },
    challengeAvailable: true,
    'challengeSettings.enabled': { $ne: false },
  }).toArray()

  const candidates = online.filter(s => gradesMatch(me.grade, s.grade))
  for (const c of candidates) {
    // Skip anyone already busy in an active/pending match.
    const busy = await db.collection('challenge_matches').findOne({
      status: { $in: ['pending', 'active'] },
      $or: [{ 'players.studentId': c.id }, { inviteeId: c.id }, { inviterId: c.id }],
    })
    if (!busy) return c
  }
  return null
}

// Public shape of an invite for BOTH sides (inviter sees invitee, invitee sees
// inviter). Photo only when that person's parent approved it (safety).
function invitePublic(inviteMatch, viewerId) {
  const otherId = viewerId === inviteMatch.inviterId ? inviteMatch.inviteeId : inviteMatch.inviterId
  const other = (inviteMatch.people || {})[otherId] || {}
  return {
    inviteId: inviteMatch._id.toString(),
    role: viewerId === inviteMatch.inviterId ? 'inviter' : 'invitee',
    from: {
      studentId: otherId,
      firstName: other.firstName || 'Hero',
      grade: other.grade ?? null,
      avatar: other.avatar || null,
      avatarConfig: other.avatarConfig || null,
      photo: other.photo || null,
    },
    status: inviteMatch.status,
  }
}

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

// Create an active AI (Hero Bot) match for a student — used when nobody's
// available or the search window elapsed.
async function startBotMatch(db, student, count) {
  const grade = student.grade ?? 3
  const questions = await sampleQuestions(db, grade, count)
  const aiRun = simulateAiRun(grade, count)
  const perQ = aiRun.map(() => aiThinkMs(grade))
  const aiTotalMs = perQ.reduce((a, b) => a + b, 0)
  const res = await db.collection('challenge_matches').insertOne({
    status: 'active', mode: 'ai', startedAt: new Date(),
    players: [playerEntry(student)],
    ai: { run: aiRun, perQ, timeMs: aiTotalMs, correct: 0, answered: 0, finished: false },
    questions, total: count, createdAt: new Date(),
  })
  const match = await db.collection('challenge_matches').findOne({ _id: res.insertedId })
  return NextResponse.json({ match: publicMatch(match, student.id) })
}

// The player entry shape stored on a match. `photo` is included ONLY when the
// parent approved it (challengeSettings.photoPublic) — otherwise it's null and
// the opponent only ever sees the avatar + first name.
function playerEntry(student) {
  const photoApproved = student.challengeSettings?.photoPublic === true
  return {
    studentId: student.id,
    firstName: displayFirstName(student.name),
    avatar: student.avatar || '🦊',
    avatarConfig: student.avatarConfig || null,
    photo: photoApproved ? (student.profilePhoto || null) : null,
    grade: student.grade ?? 3,
    correct: 0, answered: 0, timeMs: 0, finished: false,
  }
}

// A person snapshot for an invite card — name, grade, avatar (+ photo only if
// the parent approved it). Never leaks a full name or a private photo.
function personSnapshot(student) {
  const photoApproved = student.challengeSettings?.photoPublic === true
  return {
    firstName: displayFirstName(student.name),
    grade: student.grade ?? 3,
    avatar: student.avatar || '🦊',
    avatarConfig: student.avatarConfig || null,
    photo: photoApproved ? (student.profilePhoto || null) : null,
  }
}

// Public view of a match — NEVER leaks correctAnswer. The opponent's photo is
// only present when their parent approved it (stored on playerEntry.photo).
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
      firstName: opp.firstName, avatar: opp.avatar, photo: opp.photo || null,
      correct: opp.correct, answered: opp.answered, finished: opp.finished,
    } : (match.mode === 'ai' ? { firstName: 'Hero Bot', avatar: '🤖', photo: null, correct: match.ai?.correct || 0, answered: match.ai?.answered || 0, finished: match.ai?.finished || false } : null),
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

    // HERO gate — can't enter a challenge until today's requirement is done
    // (a due monthly exam, else the daily task).
    if (['find', 'invite', 'accept'].includes(action) && !isTaskDoneToday(student.dailyTask)) {
      const examDue = isExamDue(student.createdAt, student.lastExamAt || null)
      return NextResponse.json({
        error: examDue
          ? 'Finish this month’s HERO exam first to unlock Challenge.'
          : 'Finish today’s HERO task first to unlock Challenge.',
        taskLocked: true, examDue,
      }, { status: 403 })
    }

    // ── FIND: invite-based matchmaking — send a request to an available player,
    //    they Accept/Decline; retry the next player; fall back to the bot after a
    //    genuine search. `find` picks a candidate + creates ONE pending invite. ─
    if (action === 'find') {
      // Already in an active match? Return it (resume).
      const active = await db.collection('challenge_matches').findOne({
        status: 'active', 'players.studentId': studentId,
      })
      if (active) return NextResponse.json({ match: publicMatch(active, studentId) })

      // Was my invite ACCEPTED while I was polling? Return the resulting match.
      const acceptedInvite = await db.collection('challenge_matches').findOne({
        inviterId: studentId, status: 'accepted',
      })
      if (acceptedInvite?.matchId) {
        const m = await db.collection('challenge_matches').findOne({ _id: acceptedInvite.matchId })
        if (m) return NextResponse.json({ match: publicMatch(m, studentId) })
      }

      const count = challengeQuestionCount(student.grade)
      const searchStart = body.searchStart ? Number(body.searchStart) : Date.now()

      // Do I already have a live pending invite out? Keep waiting on it (unless
      // it's expired — then move on to the next candidate).
      const myPending = await db.collection('challenge_matches').findOne({
        inviterId: studentId, status: 'pending',
      })
      if (myPending) {
        const age = Date.now() - new Date(myPending.createdAt).getTime()
        if (age < INVITE_TTL_MS) {
          // Still waiting for this person to answer.
          return NextResponse.json({ searching: true, invited: invitePublic(myPending, studentId), searchStart })
        }
        // Expired without an answer — retire it and try the next person below.
        await db.collection('challenge_matches').updateOne(
          { _id: myPending._id, status: 'pending' }, { $set: { status: 'expired' } }
        )
      }

      // Genuine search window elapsed → play the Hero Bot (create an AI match).
      if (Date.now() - searchStart >= SEARCH_MAX_MS) {
        return await startBotMatch(db, student, count)
      }

      // Pick the next available candidate (skip anyone I've already invited this
      // search) and send them an invite.
      const already = Array.isArray(body.tried) ? body.tried : []
      const candidate = await findCandidate(db, student, already)
      if (!candidate) {
        // No one available at all → straight to the Hero Bot.
        return await startBotMatch(db, student, count)
      }
      const invitee = await db.collection('children').findOne({ id: candidate.id })
      const questions = await sampleQuestions(db, student.grade, count)
      const res = await db.collection('challenge_matches').insertOne({
        status: 'pending', mode: 'human',
        inviterId: studentId, inviteeId: candidate.id,
        people: { [studentId]: personSnapshot(student), [candidate.id]: personSnapshot(invitee) },
        questions, total: count,
        createdAt: new Date(),
      })
      const created = await db.collection('challenge_matches').findOne({ _id: res.insertedId })
      return NextResponse.json({
        searching: true,
        invited: invitePublic(created, studentId),
        tried: [...already, candidate.id],
        searchStart,
      })
    }

    // ── RESUME: read-only — return an active match if I'm in one, else null.
    //    (Used on arena mount so accepting a global invite lands in the race,
    //    without accidentally starting a new search.) ─────────────────────────
    if (action === 'resume') {
      const active = await db.collection('challenge_matches').findOne({
        status: 'active', 'players.studentId': studentId,
      })
      return NextResponse.json({ match: active ? publicMatch(active, studentId) : null })
    }

    // ── INBOX: does THIS student have an incoming pending invite? (poll ~2s) ──
    if (action === 'inbox') {
      const invite = await db.collection('challenge_matches').findOne({
        inviteeId: studentId, status: 'pending',
      })
      if (!invite) return NextResponse.json({ invite: null })
      // Expired ones don't count.
      if (Date.now() - new Date(invite.createdAt).getTime() >= INVITE_TTL_MS) {
        return NextResponse.json({ invite: null })
      }
      return NextResponse.json({ invite: invitePublic(invite, studentId) })
    }

    // ── ACCEPT: turn a pending invite into an active human match ──────────────
    if (action === 'accept') {
      const id = oid(body.inviteId)
      if (!id) return NextResponse.json({ error: 'inviteId required' }, { status: 400 })
      const invite = await db.collection('challenge_matches').findOne({ _id: id, inviteeId: studentId, status: 'pending' })
      if (!invite) return NextResponse.json({ error: 'Invite no longer available', gone: true }, { status: 409 })

      const inviter = await db.collection('children').findOne({ id: invite.inviterId })
      if (!inviter) return NextResponse.json({ error: 'Opponent left', gone: true }, { status: 409 })

      // Create the real match (inviter is player 0, accepter is player 1).
      const matchRes = await db.collection('challenge_matches').insertOne({
        status: 'active', mode: 'human', startedAt: new Date(),
        players: [playerEntry(inviter), playerEntry(student)],
        questions: invite.questions, total: invite.total,
        createdAt: new Date(),
      })
      // Mark the invite accepted + link it, so the inviter's poll finds the match.
      await db.collection('challenge_matches').updateOne(
        { _id: id, status: 'pending' },
        { $set: { status: 'accepted', matchId: matchRes.insertedId } }
      )
      const match = await db.collection('challenge_matches').findOne({ _id: matchRes.insertedId })
      return NextResponse.json({ match: publicMatch(match, studentId) })
    }

    // ── DECLINE: reject an invite; the inviter's poll moves to the next player ─
    if (action === 'decline') {
      const id = oid(body.inviteId)
      if (id) {
        await db.collection('challenge_matches').updateOne(
          { _id: id, inviteeId: studentId, status: 'pending' }, { $set: { status: 'declined' } }
        )
      }
      return NextResponse.json({ success: true })
    }

    // ── STATUS: poll a match; auto-convert a stale queue to an AI match ───────
    if (action === 'status') {
      const id = oid(body.matchId)
      if (!id) return NextResponse.json({ error: 'matchId required' }, { status: 400 })
      let match = await db.collection('challenge_matches').findOne({ _id: id })
      if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

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

    // ── CANCEL: stop searching — retire any pending invite I sent ─────────────
    if (action === 'cancel') {
      await db.collection('challenge_matches').updateMany(
        { inviterId: studentId, status: 'pending' }, { $set: { status: 'cancelled' } }
      )
      const id = oid(body.matchId)
      if (id) {
        await db.collection('challenge_matches').deleteOne({ _id: id, status: 'pending', inviterId: studentId })
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Challenge error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
