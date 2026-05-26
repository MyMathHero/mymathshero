import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import { updateSmartScore } from '@/lib/smartscore'
import { classifyBehaviour, getBehaviourInsight } from '@/lib/behaviour'
import { getRecommendations } from '@/lib/recommender'
import { checkAndAwardBadges } from '@/lib/badges'
import { updateStreak } from '@/lib/streak'

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

    // 1. Resolve correctAnswer — look up from DB if not provided by client
    let resolvedCorrectAnswer = correctAnswer
    if (!resolvedCorrectAnswer) {
      const question = await db.collection('questions').findOne({ id: questionId })
      resolvedCorrectAnswer = question?.correctAnswer
    }

    // 2. Check if answer is correct
    const correct = answer?.toString().trim().toLowerCase() ===
                    resolvedCorrectAnswer?.toString().trim().toLowerCase()

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

    // 7. Log the session event
    await db.collection('session_events').insertOne({
      studentId,
      skillId,
      questionId,
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

    // 9. Update student XP and coins
    const xpGain = correct ? (mastered ? 50 : 10) : 2
    // Coin economy rebalance to deter farming: correct = 2 (was 5), wrong = 0 (was 1)
    const coinGain = correct ? 2 : 0
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