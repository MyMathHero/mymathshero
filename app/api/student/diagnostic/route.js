import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

// GET — fetch a diagnostic question set for a given grade + subject (default Maths).
// 5 at-grade, 3 below-grade, 3 above-grade (11 total).
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const grade = parseInt(searchParams.get('grade') || '3', 10)
    const subject = searchParams.get('subject') || 'Maths'
    const db = await connectDB()

    const [atGrade, belowGrade, aboveGrade] = await Promise.all([
      db.collection('questions').aggregate([
        { $match: { grade, subject, active: true } },
        { $sample: { size: 5 } },
      ]).toArray(),
      db.collection('questions').aggregate([
        { $match: { grade: Math.max(0, grade - 1), subject, active: true } },
        { $sample: { size: 3 } },
      ]).toArray(),
      db.collection('questions').aggregate([
        { $match: { grade: grade + 1, subject, active: true } },
        { $sample: { size: 3 } },
      ]).toArray(),
    ])

    const questions = [...atGrade, ...belowGrade, ...aboveGrade].map(({ correctAnswer, _id, ...q }) => ({
      ...q,
      questionId: q.id || _id?.toString(),
      level: q.grade === grade ? 'at' : q.grade < grade ? 'below' : 'above',
      correctAnswer, // keep client-side for self-grade during diagnostic
    }))

    return NextResponse.json({ questions, total: questions.length })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST — save diagnostic results and set starting SmartScore per skill.
// Body: { studentId, results: [{ questionId, skillId, correct, timeTakenMs, grade }] }
export async function POST(request) {
  try {
    const { studentId, results } = await request.json()
    if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 })
    if (!Array.isArray(results)) return NextResponse.json({ error: 'results array required' }, { status: 400 })

    const db = await connectDB()

    // Aggregate per-skill accuracy from results
    const skillResults = {}
    results.forEach(r => {
      if (!r?.skillId) return
      if (!skillResults[r.skillId]) {
        skillResults[r.skillId] = { correct: 0, total: 0, grade: r.grade }
      }
      skillResults[r.skillId].total++
      if (r.correct) skillResults[r.skillId].correct++
    })

    for (const [skillId, data] of Object.entries(skillResults)) {
      const accuracy = data.correct / data.total
      let startingScore = 10
      if (accuracy >= 0.8) startingScore = 65
      else if (accuracy >= 0.6) startingScore = 45
      else if (accuracy >= 0.4) startingScore = 25

      await db.collection('skill_scores').updateOne(
        { studentId, skillId },
        {
          $setOnInsert: {
            studentId,
            skillId,
            score: startingScore,
            mastered: startingScore >= 80,
            attempts: 0,
            createdAt: new Date(),
          },
        },
        { upsert: true }
      )
    }

    await db.collection('children').updateOne(
      { id: studentId },
      { $set: { diagnosticComplete: true, diagnosticDate: new Date() } }
    )

    return NextResponse.json({
      success: true,
      message: 'Diagnostic complete',
      skillsSet: Object.keys(skillResults).length,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
