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

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const skillId = searchParams.get('skillId')
    const studentId = searchParams.get('studentId')
    const gradeParam = searchParams.get('grade')
    const limit = Math.min(parseInt(searchParams.get('limit') || '5', 10), 20)

    if (!skillId) {
      return NextResponse.json({ error: 'skillId is required' }, { status: 400 })
    }

    // Reject non-Maths skill IDs immediately. The platform is Maths-only —
    // e_*/s_* must never be served, even if a legacy client requests them.
    if (!skillId.startsWith('m_')) {
      return NextResponse.json({ questions: [], total: 0 })
    }

    const db = await connectDB()

    // Resolve subject/grade for this skill (used for AI top-up + grade fallback).
    const { getSkillGraph } = await import('@/lib/recommender')
    const skillDoc = getSkillGraph().find(s => s.id === skillId)
    const subject = skillDoc?.subject || 'Maths'
    const gradeNum = Number.isFinite(parseInt(gradeParam, 10))
      ? parseInt(gradeParam, 10)
      : (skillDoc?.grade ?? 3)

    // Questions this student has already answered CORRECTLY for this skill —
    // mastered questions shouldn't repeat. Wrong ones stay in the pool for practice.
    let answeredCorrectlyIds = []
    if (studentId) {
      const answered = await db.collection('session_events')
        .find({ studentId, skillId, correct: true })
        .project({ questionId: 1, _id: 0 })
        .toArray()
      answeredCorrectlyIds = [...new Set(answered.map(e => e.questionId).filter(Boolean))]
    }

    const baseMatch = {
      skillId,
      active: { $ne: false },
      // Spec: enforce Maths subject in the query so a mistyped/legacy question
      // doc with the wrong subject can't slip through.
      $or: [
        { subject: { $in: ['Maths', 'Mathematics', 'Math'] } },
        { subject: { $exists: false } }, // tolerate older docs without a subject
      ],
    }
    const unmasteredMatch = answeredCorrectlyIds.length > 0
      ? { ...baseMatch, id: { $nin: answeredCorrectlyIds } }
      : baseMatch

    // $sample randomizes order so we rotate through the whole pool (this is the
    // core fix — the old .find().limit() returned the same docs every call).
    // Over-fetch for variety, then trim to `limit` below.
    let questions = await db.collection('questions')
      .aggregate([{ $match: unmasteredMatch }, { $sample: { size: limit * 3 } }])
      .toArray()

    // Not enough unmastered questions — fall back to the full skill pool so the
    // student can keep practising (repeating only because stock is exhausted).
    if (questions.length < 2) {
      questions = await db.collection('questions')
        .aggregate([{ $match: baseMatch }, { $sample: { size: limit * 3 } }])
        .toArray()
    }

    // Still thin — generate more via AI, then re-sample.
    if (questions.length < 3) {
      await generateMoreQuestions(skillId, gradeNum, subject, db)
      questions = await db.collection('questions')
        .aggregate([{ $match: baseMatch }, { $sample: { size: limit * 3 } }])
        .toArray()
    }

    // Last resort — skill has no questions at all: sample same subject + grade.
    let fallbackUsed = false
    if (questions.length === 0) {
      questions = await db.collection('questions')
        .aggregate([
          { $match: { subject, grade: gradeNum, active: { $ne: false } } },
          { $sample: { size: limit } },
        ])
        .toArray()
      fallbackUsed = true
    }

    // Strip correctAnswer — validation happens server-side on POST /api/student/answer.
    const safe = questions.slice(0, limit).map(({ correctAnswer, _id, ...rest }) => ({
      ...rest,
      questionId: rest.id || _id?.toString(),
    }))

    return NextResponse.json({ questions: safe, total: safe.length, fallbackUsed })
  } catch (error) {
    console.error('Questions GET error:', error.message)
    return NextResponse.json({ error: error.message, questions: [] }, { status: 500 })
  }
}

// Generate more questions for a skill via AI when the stock is running low.
// Mirrors the doc shape used by /api/admin/generate-questions so they're interchangeable.
async function generateMoreQuestions(skillId, grade, subject, db) {
  try {
    if (!process.env.OPENROUTER_API_KEY) return
    const existingCount = await db.collection('questions').countDocuments({ skillId })
    if (existingCount >= 30) return // already plenty

    const skillName = skillId.replace(/^[a-z]_\d+_/, '').replace(/_/g, ' ')

    const prompt = `Generate 10 multiple choice maths questions for Australian Year ${grade} students about "${skillName}".

Return ONLY a JSON array. Each question must have:
- question: the question text
- options: array of exactly 4 answer choices
- correctAnswer: the correct answer (must be one of the options)
- explanation: brief explanation of the answer
- difficulty: number between 0.1 and 0.9
- hint: a helpful hint without giving the answer away

Questions must be curriculum-appropriate, clearly worded, and varied in difficulty.
Return only the JSON array, no other text.`

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_BASE_URL || 'https://mymathshero.com.au',
        'X-Title': 'MyMathsHero',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-haiku-4-5',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    })

    if (!res.ok) return
    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || ''

    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return
    const generated = JSON.parse(jsonMatch[0])
    if (!Array.isArray(generated) || generated.length === 0) return

    const toInsert = generated
      .filter(q => q && q.question && Array.isArray(q.options) && q.correctAnswer)
      .map((q, i) => ({
        id: `${skillId}_gen_${Date.now()}_${i}`,
        skillId,
        grade,
        subject,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || '',
        hint: q.hint || '',
        difficulty: typeof q.difficulty === 'number' ? q.difficulty : 0.5,
        active: true,
        aiGenerated: true,
        needsReview: true,
        source: 'AI-Generated',
        createdAt: new Date(),
      }))

    if (toInsert.length > 0) {
      await db.collection('questions').insertMany(toInsert)
      console.log(`[questions] Generated ${toInsert.length} new questions for ${skillId}`)
    }
  } catch (err) {
    console.error('Question generation failed:', err.message)
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const questions = Array.isArray(body) ? body : body.questions

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'questions array is required' }, { status: 400 })
    }

    const db = await connectDB()

    const docs = questions.map(q => ({
      ...q,
      active: q.active !== undefined ? q.active : true,
      createdAt: new Date(),
    }))

    const result = await db.collection('questions').insertMany(docs)

    return NextResponse.json({
      success: true,
      insertedCount: result.insertedCount,
    }, { status: 201 })
  } catch (error) {
    console.error('Questions POST error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
