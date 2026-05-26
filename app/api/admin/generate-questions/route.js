import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import { getSkillGraph } from '@/lib/recommender'

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function generateForSkill(skill, count) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not set')
  }

  const gradeLabel = skill.grade === 0 ? 'Prep/Foundation' : `Grade ${skill.grade}`

  const userPrompt = [
    `Generate ${count} multiple choice questions for "${skill.name}", ${skill.subject}, ${gradeLabel} Australian Victorian Curriculum.`,
    `Each question needs:`,
    `- question: clear, age-appropriate question string`,
    `- correctAnswer: the correct answer string`,
    `- distractors: array of exactly 3 wrong answers that reflect real student mistakes`,
    `- difficulty: number between 0.1 and 0.9`,
    `- hint: one encouraging sentence that guides without giving away the answer`,
    `- explanation: one sentence explaining why the correct answer is right`,
    ``,
    `Return ONLY a valid JSON array, no markdown, no code fences, no extra text.`,
  ].join('\n')

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
      'X-Title': 'MyMathsHero Question Generator',
    },
    body: JSON.stringify({
      model: 'qwen/qwen-2.5-72b-instruct',
      messages: [
        {
          role: 'system',
          content: 'You are an Australian primary school curriculum expert creating multiple choice questions. All questions must be aligned to the Victorian Curriculum. Return ONLY a valid JSON array.',
        },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 2000,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`OpenRouter ${response.status}: ${errText.slice(0, 200)}`)
  }

  const aiData = await response.json()
  const raw = aiData.choices?.[0]?.message?.content?.trim()
  if (!raw) throw new Error('Empty AI response')

  // Strip markdown fences if present
  const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
  const parsed = JSON.parse(jsonStr)
  if (!Array.isArray(parsed)) throw new Error('AI did not return an array')
  return parsed
}

function buildQuestionDoc(q, skill, index) {
  const options = [q.correctAnswer, ...(q.distractors || [])].sort(() => Math.random() - 0.5)
  const id = `ai_${skill.id}_${Date.now()}_${index}`
  return {
    id,
    skillId: skill.id,
    subject: skill.subject,
    grade: skill.grade,
    question: q.question,
    options,
    correctAnswer: q.correctAnswer,
    difficulty: typeof q.difficulty === 'number' ? q.difficulty : skill.difficulty,
    hint: q.hint || '',
    explanation: q.explanation || '',
    active: true,
    source: 'AI-Generated',
    needsReview: true,
    createdAt: new Date(),
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const dryRun = searchParams.get('dryRun') === 'true'
    if (!dryRun) {
      return NextResponse.json({ error: 'Use ?dryRun=true or POST to generate' }, { status: 400 })
    }

    const target = parseInt(searchParams.get('targetPerSkill') || '20', 10)
    const subject = searchParams.get('subject')
    const db = await connectDB()
    const skillGraph = getSkillGraph()
      .filter(s => !subject || s.subject === subject)

    const existingCounts = await db.collection('questions').aggregate([
      { $group: { _id: '$skillId', count: { $sum: 1 } } },
    ]).toArray()
    const countMap = {}
    for (const row of existingCounts) countMap[row._id] = row.count

    const totalQuestions = await db.collection('questions').countDocuments()
    const skillsBelow = skillGraph
      .map(s => ({ skillId: s.id, name: s.name, subject: s.subject, current: countMap[s.id] ?? 0 }))
      .filter(s => s.current < target)
      .sort((a, b) => a.current - b.current)

    return NextResponse.json({ totalQuestions, target, skillsBelow })
  } catch (error) {
    console.error('Generate questions dry-run error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const db = await connectDB()

    // ── generateAll mode ──────────────────────────────────────────────────────
    if (body.generateAll) {
      const targetPerSkill = body.targetPerSkill ?? 10
      const subjectFilter = body.subject
      const skillGraph = getSkillGraph()
        .filter(s => !subjectFilter || s.subject === subjectFilter)

      // Count existing questions per skill in one aggregation
      const existingCounts = await db.collection('questions').aggregate([
        { $group: { _id: '$skillId', count: { $sum: 1 } } },
      ]).toArray()
      const countMap = {}
      for (const row of existingCounts) countMap[row._id] = row.count

      const skillsNeedingQuestions = skillGraph.filter(skill => {
        const existing = countMap[skill.id] ?? 0
        return existing < targetPerSkill
      })

      const details = []
      let totalGenerated = 0
      let totalSkipped = 0
      let totalErrors = 0

      for (const skill of skillsNeedingQuestions) {
        const existing = countMap[skill.id] ?? 0
        const needed = targetPerSkill - existing

        try {
          const questions = await generateForSkill(skill, needed)
          const docs = questions.slice(0, needed).map((q, i) => buildQuestionDoc(q, skill, i))
          if (docs.length > 0) {
            await db.collection('questions').insertMany(docs)
          }
          totalGenerated += docs.length
          details.push({ skillId: skill.id, name: skill.name, generated: docs.length, existing })
        } catch (err) {
          console.error(`[generate] Failed for ${skill.id}:`, err.message)
          totalErrors++
          details.push({ skillId: skill.id, name: skill.name, error: err.message, existing })
        }

        // Rate limiting — 500ms between calls
        await sleep(500)
      }

      // Skills that already had enough questions
      totalSkipped = skillGraph.length - skillsNeedingQuestions.length

      return NextResponse.json({
        generated: totalGenerated,
        skipped: totalSkipped,
        errors: totalErrors,
        skillsProcessed: skillsNeedingQuestions.length,
        details,
      })
    }

    // ── Single skill mode ─────────────────────────────────────────────────────
    const { skillId, count = 5, subject, grade } = body
    if (!skillId) {
      return NextResponse.json({ error: 'skillId or generateAll is required' }, { status: 400 })
    }

    const skillGraph = getSkillGraph()
    const skill = skillGraph.find(s => s.id === skillId) ?? {
      id: skillId,
      name: skillId,
      subject: subject || 'General',
      grade: grade ?? 3,
      difficulty: 0.5,
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({
        generated: 0,
        skipped: 0,
        errors: 1,
        details: [{ skillId, error: 'OPENROUTER_API_KEY not set — add it to .env.local' }],
      })
    }

    const questions = await generateForSkill(skill, count)
    const docs = questions.slice(0, count).map((q, i) => buildQuestionDoc(q, skill, i))
    if (docs.length > 0) {
      await db.collection('questions').insertMany(docs)
    }

    return NextResponse.json({
      generated: docs.length,
      skipped: 0,
      errors: 0,
      details: [{ skillId, name: skill.name, generated: docs.length }],
      questions: docs.map(({ correctAnswer: _, ...safe }) => safe), // strip correct answers from response
    })

  } catch (error) {
    console.error('Generate questions error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
