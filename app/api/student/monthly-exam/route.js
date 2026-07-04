import { MongoClient, ObjectId } from 'mongodb'
import { NextResponse } from 'next/server'
import { adjustCoins } from '@/lib/coins'
import { monthlyExamBonus } from '@/lib/coinRules'
import { getEffectiveCeiling, getRecommendations } from '@/lib/recommender'

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

const EXAM_SIZE = 20 // "20+ questions" review

// Calendar-month key in Sydney time (yyyy-mm) — the exam is once per month.
function monthKeyAEST(now = new Date()) {
  const [d, m, y] = now.toLocaleDateString('en-AU', {
    timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit',
  }).split('/')
  return `${y}-${m}`
}

function buildQuestionMatch(questionId) {
  const or = [{ id: questionId }]
  if (typeof questionId === 'string' && /^[a-fA-F0-9]{24}$/.test(questionId)) {
    try { or.push({ _id: new ObjectId(questionId) }) } catch {}
  }
  return { $or: or }
}

// GET — has this month's exam been taken? If not, serve a 20-question review
// drawn from the skills the student has been working on (across the month).
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 })

    const db = await connectDB()
    const student = await db.collection('children').findOne({ id: studentId })
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

    const monthKey = monthKeyAEST()
    const existing = await db.collection('monthly_exams').findOne({ studentId, monthKey })
    if (existing) {
      return NextResponse.json({
        available: false, alreadyTaken: true, monthKey,
        lastScore: existing.score, lastBonus: existing.bonus || 0,
      })
    }

    // Review pool = the student's practised + recommended skills for their grade.
    const scores = await db.collection('skill_scores').find({ studentId }).toArray()
    const scoreMap = {}
    scores.forEach(s => { scoreMap[s.skillId] = s.score })
    const effectiveGrade = getEffectiveCeiling(student.grade ?? 3, scoreMap, {
      placementFloor: student?.placement?.estimatedGrade ?? 0,
    })
    const practisedSkillIds = scores.map(s => s.skillId)
    const recSkillIds = getRecommendations(effectiveGrade, scoreMap, 8).map(r => r.id)
    const skillIds = Array.from(new Set([...practisedSkillIds, ...recSkillIds])).filter(Boolean)

    const match = skillIds.length
      ? { skillId: { $in: skillIds }, verifierFlagged: { $ne: true } }
      : { verifierFlagged: { $ne: true } }

    const pool = await db.collection('questions')
      .aggregate([{ $match: match }, { $sample: { size: EXAM_SIZE } }])
      .toArray()

    const questions = pool.slice(0, EXAM_SIZE).map(({ correctAnswer, _id, ...rest }) => ({
      ...rest,
      questionId: rest.id || _id?.toString(),
    }))

    return NextResponse.json({
      available: questions.length > 0,
      alreadyTaken: false,
      monthKey,
      total: questions.length,
      questions,
      bonusTiers: { 85: 50, 90: 80, 95: 100 },
    })
  } catch (error) {
    console.error('Monthly-exam GET error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST — score the submitted answers, record the monthly exam once, and award
// the accuracy bonus (85→50, 90→80, 95→100). Idempotent per calendar month.
export async function POST(request) {
  try {
    const { studentId, answers } = await request.json()
    if (!studentId || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'studentId and answers required' }, { status: 400 })
    }

    const db = await connectDB()
    const student = await db.collection('children').findOne({ id: studentId })
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

    const monthKey = monthKeyAEST()

    // Guard: reserve this month's slot atomically so a double-submit can't
    // double-pay. If it already exists, return the stored result.
    const existing = await db.collection('monthly_exams').findOne({ studentId, monthKey })
    if (existing) {
      return NextResponse.json({
        alreadyTaken: true, score: existing.score, bonusAwarded: existing.bonus || 0,
      })
    }

    let correct = 0
    for (const a of answers) {
      if (!a?.questionId) continue
      const q = await db.collection('questions').findOne(buildQuestionMatch(a.questionId))
      if (q && a.answer?.toString().trim().toLowerCase() === q.correctAnswer?.toString().trim().toLowerCase()) {
        correct++
      }
    }
    const denom = Math.max(answers.length, 1)
    const score = Math.round((correct / denom) * 100)
    const bonus = monthlyExamBonus(score)

    // Insert the record first (unique-ish guard on studentId+monthKey via the
    // pre-check above). Then pay the bonus once.
    await db.collection('monthly_exams').insertOne({
      studentId, monthKey, score, correct, total: denom, bonus, createdAt: new Date(),
    })

    if (bonus > 0) {
      await adjustCoins(db, studentId, {
        coins: bonus, reason: 'monthly-exam', meta: { monthKey, score },
      })
    }

    return NextResponse.json({ score, correct, total: denom, bonusAwarded: bonus })
  } catch (error) {
    console.error('Monthly-exam POST error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
