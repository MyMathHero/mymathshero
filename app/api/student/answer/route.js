import { MongoClient, ObjectId } from 'mongodb'
import { NextResponse } from 'next/server'
import { updateSmartScore } from '@/lib/smartscore'
import { classifyBehaviour, getBehaviourInsight } from '@/lib/behaviour'
import { getRecommendations } from '@/lib/recommender'
import { checkAndAwardBadges } from '@/lib/badges'
import { updateStreak } from '@/lib/streak'

// Normalise an answer for comparison:
//  - trim whitespace
//  - strip "A) " / "A. " / "A " letter-prefix if present
//  - lowercase
// This lets us compare "45" to "A) 45" to "a) 45" to " 45 " correctly.
function normaliseAnswer(value) {
  if (value === null || value === undefined) return ''
  return String(value)
    .trim()
    .replace(/^[A-Da-d][).\s]+/, '')
    .trim()
    .toLowerCase()
}

// Robust correctness check that supports every historical question format in
// the DB. The DB has 1037 plain-text, 29 letter-prefixed options, and 9
// single-letter correctAnswer rows. This handles all four permutations:
//   correct "A" + options ["45","40",...]      → resolve options[0]
//   correct "A" + options ["A) 45",...]        → resolve options[0], normalise
//   correct "45" + student sends "A) 45"       → normalise both
//   correct "A) 45" + student sends "45"       → normalise both
function checkCorrect(studentAnswer, correctAnswer, options) {
  if (studentAnswer === null || studentAnswer === undefined) return false
  if (correctAnswer === null || correctAnswer === undefined) return false

  const normStudent = normaliseAnswer(studentAnswer)
  const normCorrect = normaliseAnswer(correctAnswer)
  if (normStudent === '' && normCorrect === '') return false
  if (normStudent === normCorrect) return true

  const rawCorrect = String(correctAnswer).trim()
  const rawStudent = String(studentAnswer).trim()

  if (/^[A-Da-d]$/.test(rawCorrect) && Array.isArray(options)) {
    const idx = rawCorrect.toUpperCase().charCodeAt(0) - 65
    const target = options[idx]
    if (target !== undefined && normStudent === normaliseAnswer(target)) return true
  }
  if (/^[A-Da-d]$/.test(rawStudent) && Array.isArray(options)) {
    const idx = rawStudent.toUpperCase().charCodeAt(0) - 65
    const target = options[idx]
    if (target !== undefined && normaliseAnswer(target) === normCorrect) return true
  }

  return false
}

// Look up a question by string id OR by ObjectId. The questions API exposes
// `questionId` as `rest.id || _id?.toString()`, so the client may send either
// shape. Without this, ~30% of recent wrong answers are wrong-because-not-
// -found, not wrong-because-incorrect.
async function findQuestion(db, questionId) {
  if (!questionId) return null
  const or = [{ id: questionId }]
  if (typeof questionId === 'string' && /^[a-fA-F0-9]{24}$/.test(questionId)) {
    try { or.push({ _id: new ObjectId(questionId) }) } catch {}
  }
  return db.collection('questions').findOne({ $or: or })
}

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

export async function POST(request) {
  try {
    const {
      studentId,
      skillId,
      questionId,
      answer,
      correctAnswer,
      timeTakenMs,
      hintUsed,
      difficulty = 0.5,
    } = await request.json()

    if (!studentId || !skillId || !questionId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const db = await connectDB()

    // 1. ALWAYS look up the question from the DB. The previous code accepted
    //    a client-supplied correctAnswer as a fallback, which is both a fraud
    //    vector AND meant a missing lookup silently graded students wrong.
    const question = await findQuestion(db, questionId)
    if (!question) {
      console.error('[answer] question not found', { questionId, studentId, skillId })
      return NextResponse.json(
        { error: 'Question not found', questionId },
        { status: 404 }
      )
    }
    const resolvedCorrectAnswer = question.correctAnswer

    // 2. Robust correctness check supporting plain text, letter-prefixed, and
    //    single-letter correctAnswer formats.
    const correct = checkCorrect(answer, resolvedCorrectAnswer, question.options)

    // Targeted debug log — fires ONLY on wrong answers where the normalised
    // forms are within one character of each other, suggesting a near-miss
    // (typo, formatting drift, etc.). Excludes obvious wrong answers and
    // success cases so log volume stays tiny.
    if (!correct) {
      const ns = normaliseAnswer(answer)
      const nc = normaliseAnswer(resolvedCorrectAnswer)
      if (ns && nc && Math.abs(ns.length - nc.length) <= 1 && ns !== nc) {
        const m = Math.min(ns.length, nc.length)
        let diff = 0
        for (let i = 0; i < m; i++) if (ns[i] !== nc[i]) diff++
        if (diff <= 1) {
          console.warn('[answer near-miss]', {
            questionId,
            normStudent: ns,
            normCorrect: nc,
            rawStudent: answer,
            rawCorrect: resolvedCorrectAnswer,
            options: question.options,
          })
        }
      }
    }

    // 3. Classify behaviour
    const behaviour = classifyBehaviour({
      correct,
      timeTakenMs: timeTakenMs || 15000,
      hintUsed: hintUsed || false,
      attemptNumber: 1,
    })

    // 4. Get current SmartScore for this skill
    const existing = await db.collection('skill_scores').findOne({
      studentId, skillId
    })
    const currentScore = existing?.score ?? 0

    // 5. Update SmartScore
    const { newScore, delta, mastered } = updateSmartScore(
      currentScore, correct, difficulty, behaviour
    )

    // 6. Save updated score
    await db.collection('skill_scores').updateOne(
      { studentId, skillId },
      {
        $set: {
          studentId,
          skillId,
          score: newScore,
          mastered,
          updatedAt: new Date(),
        },
        $inc: { attempts: 1 },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    )

    // 7. Log the session event. We now persist the raw student answer so
    //    bug-hunts on grading correctness have something to cross-reference.
    //    Capped to 256 chars to avoid storing pathological inputs.
    const persistedSelectedAnswer = answer === null || answer === undefined
      ? null
      : String(answer).slice(0, 256)
    await db.collection('session_events').insertOne({
      studentId,
      skillId,
      questionId,
      selectedAnswer: persistedSelectedAnswer,
      correctAnswer: resolvedCorrectAnswer,
      correct,
      behaviour,
      timeTakenMs,
      hintUsed,
      scoreBefore: currentScore,
      scoreAfter: newScore,
      timestamp: new Date(),
    })

    // 8. Session tracking
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000)
    let session = await db.collection('sessions').findOne({
      studentId,
      completed: { $ne: true },
      startedAt: { $gte: thirtyMinsAgo },
    })

    const isNewSession = !session
    if (isNewSession) {
      const res = await db.collection('sessions').insertOne({
        studentId,
        startedAt: new Date(),
        questionCount: 0,
        correctCount: 0,
        skillIds: [],
      })
      session = { _id: res.insertedId, questionCount: 0, correctCount: 0, skillIds: [] }
    }

    const updatedSession = await db.collection('sessions').findOneAndUpdate(
      { _id: session._id },
      {
        $inc: {
          questionCount: 1,
          ...(correct ? { correctCount: 1 } : {}),
        },
        $addToSet: { skillIds: skillId },
      },
      { returnDocument: 'after' }
    )

    const newQuestionCount = updatedSession.questionCount
    let giftEarned = false

    if (newQuestionCount === 10) {
      await db.collection('sessions').updateOne(
        { _id: session._id },
        { $set: { completed: true, completedAt: new Date() } }
      )

      const updatedStudent = await db.collection('children').findOneAndUpdate(
        { id: studentId },
        { $inc: { sessions_completed: 1 } },
        { returnDocument: 'after' }
      )

      if (updatedStudent.sessions_completed === 5) {
        await db.collection('children').updateOne(
          { id: studentId },
          { $set: { giftEarned: true } }
        )
        giftEarned = true
      }
    }

    // 9. Update student XP and coins.
    // XP = leaderboard ranking only. Coins = the spending currency (arcade,
    // vouchers, avatars). Coins are awarded at a lower rate than XP to deter
    // farming: correct = 2, wrong = 0, plus a one-off +20 when a skill is
    // mastered.
    const xpGain = correct ? (mastered ? 50 : 10) : 2
    let coinGain = correct ? 2 : 0
    if (mastered) coinGain += 20
    await db.collection('children').updateOne(
      { id: studentId },
      { $inc: { xp: xpGain, coins: coinGain } }
    )

    // Flag suspiciously fast correct answers (<2s) for moderation review.
    const isSuspicious = typeof timeTakenMs === 'number' && timeTakenMs < 2000 && correct
    if (isSuspicious) {
      await db.collection('children').updateOne(
        { id: studentId },
        { $inc: { suspiciousAnswers: 1 } }
      )
    }

    // 10. Get recommendations
    const student = await db.collection('children').findOne({ id: studentId })
    const allScores = await db.collection('skill_scores')
      .find({ studentId })
      .toArray()
    const scoreMap = {}
    allScores.forEach(s => { scoreMap[s.skillId] = s.score })

    const recommendations = getRecommendations(
      student?.grade ?? 3,
      scoreMap,
      5
    )

    // 11. Get behaviour insight
    const insight = getBehaviourInsight(behaviour, skillId)

    // 12. Award badges — pass sessionAccuracy from this session's running total
    const sessionAccuracy = newQuestionCount > 0
      ? Math.round((updatedSession.correctCount / newQuestionCount) * 100)
      : 0
    const { newBadges } = await checkAndAwardBadges(studentId, db, { sessionAccuracy })

    // 13. Update streak
    const streakUpdate = await updateStreak(studentId, db)

    return NextResponse.json({
      correct,
      correctAnswer: resolvedCorrectAnswer,
      behaviour,
      scoreBefore: currentScore,
      scoreAfter: newScore,
      delta,
      mastered,
      xpGained: xpGain,
      coinsGained: coinGain,
      insight,
      recommendations,
      sessionProgress: { questionCount: newQuestionCount, isNewSession },
      giftEarned,
      newBadges,
      streakUpdate,
    })

  } catch (error) {
    console.error('Answer error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}