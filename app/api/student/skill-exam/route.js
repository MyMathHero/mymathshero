import { MongoClient, ObjectId } from 'mongodb'
import { NextResponse } from 'next/server'

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

// Match a question by either its string `id` or its Mongo `_id`. The questions
// API exposes both forms (id when present, otherwise stringified _id), so the
// exam needs to look up either safely.
function buildQuestionMatch(questionId) {
  const or = [{ id: questionId }]
  if (typeof questionId === 'string' && /^[a-fA-F0-9]{24}$/.test(questionId)) {
    or.push({ _id: new ObjectId(questionId) })
  }
  return { $or: or }
}

// GET — fetch exam questions for a skill
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const skillId = searchParams.get('skillId')
    const studentId = searchParams.get('studentId')

    if (!skillId || !studentId) {
      return NextResponse.json(
        { error: 'skillId and studentId required' },
        { status: 400 }
      )
    }

    const db = await connectDB()

    const score = await db.collection('skill_scores').findOne({
      studentId, skillId
    })

    if (!score || (score.score ?? 0) < 70) {
      return NextResponse.json({
        eligible: false,
        reason: 'Complete more practice to unlock the mastery exam',
        currentScore: score?.score ?? 0,
        required: 70,
      })
    }

    let questions = await db.collection('questions')
      .aggregate([
        { $match: {
          skillId,
          active: { $ne: false },
          difficulty: { $gte: 0.5 },
        } },
        { $sample: { size: 10 } },
      ])
      .toArray()

    // Not enough hard questions — broaden to any active question for this skill.
    if (questions.length < 5) {
      questions = await db.collection('questions')
        .aggregate([
          { $match: { skillId, active: { $ne: false } } },
          { $sample: { size: 10 } },
        ])
        .toArray()
    }

    if (questions.length === 0) {
      return NextResponse.json({
        eligible: false,
        reason: 'No exam questions available for this skill yet',
        currentScore: score?.score ?? 0,
        required: 70,
      })
    }

    const safe = questions.map(q => ({
      questionId: q.id || q._id?.toString(),
      question: q.question,
      options: q.options,
      difficulty: typeof q.difficulty === 'number' ? q.difficulty : 0.5,
    }))

    return NextResponse.json({
      eligible: true,
      questions: safe,
      timeLimit: 300,
      passMark: 70,
      skillId,
    })
  } catch (error) {
    console.error('Skill exam GET error:', error.message)
    return NextResponse.json(
      { error: error.message }, { status: 500 }
    )
  }
}

// POST — submit exam results
export async function POST(request) {
  try {
    const {
      studentId, skillId, answers,
      timeTakenSeconds, totalQuestions,
    } = await request.json()

    if (!studentId || !skillId || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'Missing required fields' }, { status: 400 }
      )
    }

    const db = await connectDB()

    let correct = 0
    const results = []

    for (const a of answers) {
      if (!a?.questionId) continue
      const q = await db.collection('questions').findOne(buildQuestionMatch(a.questionId))
      if (q) {
        const isCorrect =
          a.answer?.toString().trim().toLowerCase() ===
          q.correctAnswer?.toString().trim().toLowerCase()
        if (isCorrect) correct++
        results.push({
          questionId: a.questionId,
          correct: isCorrect,
          correctAnswer: q.correctAnswer,
        })
      }
    }

    // Score against the full exam length so a student can't bail early and
    // accidentally pass on a tiny correct-attempt count.
    const denominator = Math.max(
      Number.isFinite(totalQuestions) ? totalQuestions : 0,
      answers.length,
      1
    )
    const percentage = Math.round((correct / denominator) * 100)
    const passed = percentage >= 70

    await db.collection('skill_exams').insertOne({
      studentId,
      skillId,
      score: percentage,
      correct,
      total: denominator,
      attempted: answers.length,
      passed,
      timeTakenSeconds: typeof timeTakenSeconds === 'number' ? timeTakenSeconds : null,
      results,
      createdAt: new Date(),
    })

    if (passed) {
      await db.collection('skill_scores').updateOne(
        { studentId, skillId },
        {
          $set: {
            mastered: true,
            masteredAt: new Date(),
            examScore: percentage,
          },
        },
        { upsert: true }
      )
      await db.collection('children').updateOne(
        { id: studentId },
        { $inc: { xp: 50, coins: 20 } }
      )
    }

    return NextResponse.json({
      success: true,
      passed,
      score: percentage,
      correct,
      total: denominator,
      xpEarned: passed ? 50 : 10,
      coinsEarned: passed ? 20 : 5,
      results,
    })
  } catch (error) {
    console.error('Skill exam POST error:', error.message)
    return NextResponse.json(
      { error: error.message }, { status: 500 }
    )
  }
}
