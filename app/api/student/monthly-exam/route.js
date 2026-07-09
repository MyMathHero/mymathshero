import { MongoClient, ObjectId } from 'mongodb'
import { NextResponse } from 'next/server'
import { adjustCoins } from '@/lib/coins'
import { monthlyExamBonus } from '@/lib/coinRules'
import { getEffectiveCeiling, getRecommendations } from '@/lib/recommender'
import { isExamDue, daysUntilExam } from '@/lib/monthlyExam'
import { getSkillInfo } from '@/lib/skillNames'
import { todayKeyAEST } from '@/lib/dailyTask'

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

const EXAM_SIZE = 20 // "20+ questions" review

function buildQuestionMatch(questionId) {
  const or = [{ id: questionId }]
  if (typeof questionId === 'string' && /^[a-fA-F0-9]{24}$/.test(questionId)) {
    try { or.push({ _id: new ObjectId(questionId) }) } catch {}
  }
  return { $or: or }
}

// GET — is a review exam DUE (per the student's ~monthly cycle from join date)?
// If due, serve a 20-question review from the skills they've been working on.
// If not due, report when the next one lands. `due` is sticky: once overdue it
// stays true until an exam is completed.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 })

    const db = await connectDB()
    const student = await db.collection('children').findOne({ id: studentId })
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

    const lastExamAt = student.lastExamAt || null
    const due = isExamDue(student.createdAt, lastExamAt)

    if (!due) {
      return NextResponse.json({
        due: false, available: false,
        daysUntil: daysUntilExam(student.createdAt, lastExamAt),
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
      due: true,
      available: questions.length > 0,
      total: questions.length,
      questions,
      bonusTiers: { 85: 50, 90: 80, 95: 100 },
    })
  } catch (error) {
    console.error('Monthly-exam GET error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// A warm, Hero-voiced note to the PARENT about how their child did on the exam.
// Kept deterministic (per score band + strongest/weakest skill) so it's fast and
// always sensible — this is the summary the parent sees in their dashboard.
function heroExamSummary(firstName, score, correct, total, best, worst) {
  const name = firstName || 'Your child'
  const strong = best ? ` ${name} was strongest in ${best}.` : ''
  const grow = worst && worst !== best ? ` We'll keep building ${worst} together.` : ''
  let head
  if (score >= 95) head = `Outstanding! ${name} aced this month's review — ${correct}/${total} correct.`
  else if (score >= 90) head = `Brilliant work — ${name} scored ${score}% (${correct}/${total}) on this month's review.`
  else if (score >= 85) head = `Great effort! ${name} scored ${score}% (${correct}/${total}) this month.`
  else if (score >= 70) head = `Solid progress — ${name} got ${correct}/${total} (${score}%) on this month's review.`
  else if (score >= 50) head = `${name} completed this month's review with ${correct}/${total} (${score}%). A good base to build on.`
  else head = `${name} finished this month's review (${correct}/${total}). Let's turn this into next month's win.`
  return `${head}${strong}${grow}`
}

// POST — score the submitted answers, record the exam, award the accuracy bonus
// (85→50, 90→80, 95→100), reset the monthly cycle (lastExamAt), mark today's
// HERO daily task done (the exam REPLACES the daily task that day), and produce
// a Hero summary for the parent.
export async function POST(request) {
  try {
    const { studentId, answers } = await request.json()
    if (!studentId || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'studentId and answers required' }, { status: 400 })
    }

    const db = await connectDB()
    const student = await db.collection('children').findOne({ id: studentId })
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

    // Guard against a double-submit finalizing twice: if a completed exam was
    // recorded in the last minute, return it instead of scoring again.
    const recent = await db.collection('monthly_exams').findOne(
      { studentId }, { sort: { takenAt: -1 } }
    )
    if (recent && recent.takenAt && (Date.now() - new Date(recent.takenAt).getTime()) < 60_000) {
      return NextResponse.json({
        alreadyTaken: true, score: recent.score, bonusAwarded: recent.bonus || 0,
        heroSummary: recent.heroSummary || '',
      })
    }

    // Score, tallying per-skill so we can name the strongest/weakest area.
    let correct = 0
    const bySkill = {} // skillId → { correct, total }
    for (const a of answers) {
      if (!a?.questionId) continue
      const q = await db.collection('questions').findOne(buildQuestionMatch(a.questionId))
      if (!q) continue
      const ok = a.answer?.toString().trim().toLowerCase() === q.correctAnswer?.toString().trim().toLowerCase()
      if (ok) correct++
      const sid = q.skillId || 'unknown'
      bySkill[sid] = bySkill[sid] || { correct: 0, total: 0 }
      bySkill[sid].total++
      if (ok) bySkill[sid].correct++
    }
    const denom = Math.max(answers.length, 1)
    const score = Math.round((correct / denom) * 100)
    const bonus = monthlyExamBonus(score)

    // Strongest / weakest skill names (only where there were enough questions).
    const ranked = Object.entries(bySkill)
      .filter(([, v]) => v.total > 0)
      .map(([sid, v]) => ({ sid, rate: v.correct / v.total }))
      .sort((a, b) => b.rate - a.rate)
    const nameOf = (sid) => getSkillInfo(sid)?.name || null
    const best = ranked.length ? nameOf(ranked[0].sid) : null
    const worst = ranked.length ? nameOf(ranked[ranked.length - 1].sid) : null

    const firstName = String(student.name || '').trim().split(/\s+/)[0]
    const heroSummary = heroExamSummary(firstName, score, correct, denom, best, worst)

    const takenAt = new Date()
    await db.collection('monthly_exams').insertOne({
      studentId, score, correct, total: denom, bonus, heroSummary, takenAt, createdAt: takenAt,
    })

    // Reset the cycle + satisfy today's daily task (exam replaces it).
    const today = todayKeyAEST()
    const dt = student.dailyTask && student.dailyTask.date === today
      ? { ...student.dailyTask, done: true, satisfiedByExam: true }
      : { date: today, skillId: null, target: 0, progress: 0, done: true, satisfiedByExam: true, bonus: 0 }
    await db.collection('children').updateOne(
      { id: studentId },
      { $set: { lastExamAt: takenAt, dailyTask: dt } }
    )

    if (bonus > 0) {
      await adjustCoins(db, studentId, {
        coins: bonus, reason: 'monthly-exam', meta: { score },
      })
    }

    return NextResponse.json({ score, correct, total: denom, bonusAwarded: bonus, heroSummary })
  } catch (error) {
    console.error('Monthly-exam POST error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
