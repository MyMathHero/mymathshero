import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import { getSkillGraph } from '@/lib/recommender'
import { SKILL_ID_MAP } from '@/lib/skillNames'
import { bandForDifficulty, BAND_ORDER, BAND_RANGE } from '@/lib/difficulty'
import { parseFractionVisual } from '@/lib/fractionVisual'
import { insertQuestions } from '@/lib/questionDedup'
import { buildCurriculumBlock } from '@/lib/curriculumRef'
import { deriveVisual } from '@/lib/deriveVisual'

// Build the canonical Maths skill list from SKILL_ID_MAP. This is the broader
// taxonomy (~77 skills) the dashboard uses; getSkillGraph() only has ~15. The
// admin generator should cover everything the UI can show.
function getMathsSkills() {
  return Object.entries(SKILL_ID_MAP)
    .filter(([id]) => id.startsWith('m_'))
    .map(([id, info]) => {
      const gradeMatch = id.match(/^m_(\d+)_/)
      return {
        id,
        name: info.name,
        subject: 'Maths',
        grade: gradeMatch ? parseInt(gradeMatch[1], 10) : 3,
        difficulty: 0.5,
        category: info.category,
      }
    })
}

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

// Per-band instruction + the numeric difficulty range the model must stay in.
// `band` is optional — when omitted the generator behaves exactly as before.
const BAND_INSTRUCTION = {
  easy: 'Make these EASY/foundational: single-step, small numbers, recall-level. difficulty MUST be between 0.1 and 0.39.',
  medium: 'Make these MODERATE: typical at-grade questions, may need a step or two. difficulty MUST be between 0.4 and 0.69.',
  hard: 'Make these CHALLENGING/extension: multi-step, word problems, or larger numbers that stretch a strong student. difficulty MUST be between 0.7 and 0.9.',
}

async function generateForSkill(skill, count, band = null) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not set')
  }

  const gradeLabel = skill.grade === 0 ? 'Prep/Foundation' : `Grade ${skill.grade}`
  // ACARA v9 scope for this skill's strand + grade — keeps questions in-level.
  const curriculumBlock = buildCurriculumBlock(skill.category, skill.grade)

  const userPrompt = [
    `Generate ${count} multiple choice questions for "${skill.name}", ${skill.subject}, ${gradeLabel} Australian Curriculum.`,
    ...(curriculumBlock ? [curriculumBlock, ''] : []),
    ...(band ? [BAND_INSTRUCTION[band], ''] : []),
    `Each question needs:`,
    `- question: clear, age-appropriate question string`,
    `- CRITICAL: the question is shown as TEXT ONLY — there is NO image, diagram, shape, or graph displayed. NEVER write a question that requires seeing a picture (e.g. "how many parts are shaded?", "which shape below…", "the graph shows…"). If a shape/graph/data is involved, state ALL of it in words (e.g. "A rectangle with 4 equal parts, 3 shaded — what fraction is shaded?") so it is fully answerable from the text alone.`,
    `- correctAnswer: plain text of the correct answer. DO NOT prefix with a letter like "A)" or "A." — return the literal answer value only (e.g. "45", "Pentagon", "0.5").`,
    `- distractors: array of exactly 3 wrong answers, ALSO as plain text values with NO "A)"/"B)" letter prefixes.`,
    `- difficulty: number between 0.1 and 0.9`,
    `- hint: one encouraging sentence that guides without giving away the answer`,
    `- explanation: one sentence explaining why the correct answer is right`,
    ``,
    `EXAMPLE OF CORRECT FORMAT:`,
    `  { "question": "What is 5 × 9?", "correctAnswer": "45", "distractors": ["40", "35", "50"], ... }`,
    `EXAMPLE OF WRONG FORMAT (do NOT produce this):`,
    `  { "question": "What is 5 × 9?", "correctAnswer": "A) 45", "distractors": ["B) 40", ...], ... }`,
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
      model: 'anthropic/claude-haiku-4-5',
      messages: [
        {
          role: 'system',
          content: 'You are an Australian school curriculum expert creating multiple choice questions aligned to the Australian Curriculum (ACARA v9). Keep every question strictly at the stated grade level — never above or below. Return ONLY a valid JSON array.',
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

// Strip any "A) " / "A. " / "A " letter prefix that the model may still emit
// despite the prompt instructions. Belt-and-braces — keeps the DB clean even
// if the prompt drifts.
function stripLetterPrefix(s) {
  return String(s ?? '').trim().replace(/^[A-Da-d][).\s]+/, '').trim()
}

function buildQuestionDoc(q, skill, index, band = null) {
  const cleanCorrect = stripLetterPrefix(q.correctAnswer)
  const cleanDistractors = (q.distractors || []).map(stripLetterPrefix)
  const options = [cleanCorrect, ...cleanDistractors].sort(() => Math.random() - 0.5)
  const id = `ai_${skill.id}_${Date.now()}_${index}`
  // Trust the band we asked for: clamp difficulty into the band's range so the
  // stored numeric value and difficultyBand never disagree. When no band was
  // requested, use the AI value and derive the band from it.
  let difficulty = typeof q.difficulty === 'number' ? q.difficulty : skill.difficulty
  if (band && BAND_RANGE[band]) {
    const [lo, hi] = BAND_RANGE[band]
    difficulty = Math.min(hi, Math.max(lo, difficulty))
  }
  return {
    id,
    skillId: skill.id,
    subject: skill.subject,
    grade: skill.grade,
    question: q.question,
    options,
    correctAnswer: cleanCorrect,
    difficulty,
    difficultyBand: band || bandForDifficulty(difficulty),
    hint: q.hint || '',
    explanation: q.explanation || '',
    // Auto-attach a diagram/shape/equation for young grades (Prep–3): fractions
    // first, then the broader derive (shape/count/add/takeaway/equation). Above
    // grade 3 only the fraction diagram is attached (deriveVisual returns null).
    ...(() => {
      const v = deriveVisual(q.question, skill.grade) || parseFractionVisual(q.question)
      return v ? { visual: v } : {}
    })(),
    active: true,
    source: 'AI-Generated',
    unverified: true, // cleared by verifyDocs() once the inline verifier passes
    createdAt: new Date(),
  }
}

// Part 3 — verify a batch of freshly-built question docs before insert. Mutates
// each doc: clean → drop `unverified`; suspect → set verifierFlagged (withheld).
// Best-effort (verifier down → docs stay `unverified`, servable but tagged).
async function verifyDocs(docs) {
  const { verifyQuestion } = await import('@/lib/verifyQuestion')
  await Promise.all(docs.map(async d => {
    try {
      const r = await verifyQuestion(d, { double: false })
      if (r.status === 'ok') { delete d.unverified }
      else if (r.status === 'suspect') {
        d.verifierFlagged = true
        d.verifierAnswer = r.verifierAnswer
        d.verifierModel = 'anthropic/claude-opus-4-8'
        d.verifiedAt = new Date()
        delete d.unverified
      }
    } catch { /* keep unverified */ }
  }))
  return docs
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
    // Use the broader SKILL_ID_MAP taxonomy so the dry-run reflects all Maths
    // skills the dashboard knows about, not just the small SKILL_GRAPH set.
    const skillGraph = getMathsSkills()
      .filter(s => !subject || s.subject === subject)

    // Count per skill AND per band so the dry-run shows exactly which bands are
    // thin. A doc with no difficultyBand yet is bucketed under '_unbanded'.
    const existingCounts = await db.collection('questions').aggregate([
      { $group: {
          _id: { skillId: '$skillId', band: { $ifNull: ['$difficultyBand', '_unbanded'] } },
          count: { $sum: 1 },
      } },
    ]).toArray()
    const countMap = {}     // skillId -> total
    const bandMap = {}      // skillId -> { easy, medium, hard, _unbanded }
    for (const row of existingCounts) {
      const { skillId, band } = row._id
      countMap[skillId] = (countMap[skillId] ?? 0) + row.count
      bandMap[skillId] = bandMap[skillId] || {}
      bandMap[skillId][band] = row.count
    }

    const totalQuestions = await db.collection('questions').countDocuments()
    const skillsBelow = skillGraph
      .map(s => ({
        skillId: s.id,
        name: s.name,
        subject: s.subject,
        current: countMap[s.id] ?? 0,
        bands: BAND_ORDER.reduce((acc, b) => ({ ...acc, [b]: bandMap[s.id]?.[b] ?? 0 }), {}),
        unbanded: bandMap[s.id]?._unbanded ?? 0,
      }))
      .filter(s => s.current < target || BAND_ORDER.some(b => (s.bands[b] ?? 0) < target / BAND_ORDER.length))
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

    // ── backfillBands mode ────────────────────────────────────────────────────
    // One-off: stamp difficultyBand onto any existing question that lacks it,
    // derived deterministically from its numeric difficulty. Idempotent.
    if (body.backfillBands) {
      const cursor = db.collection('questions').find(
        { difficultyBand: { $exists: false } },
        { projection: { _id: 1, difficulty: 1 } }
      )
      const ops = []
      for await (const doc of cursor) {
        ops.push({
          updateOne: {
            filter: { _id: doc._id },
            update: { $set: { difficultyBand: bandForDifficulty(doc.difficulty) } },
          },
        })
        if (ops.length >= 1000) {
          await db.collection('questions').bulkWrite(ops)
          ops.length = 0
        }
      }
      let backfilled = 0
      if (ops.length > 0) {
        const res = await db.collection('questions').bulkWrite(ops)
        backfilled = res.modifiedCount
      }
      const remaining = await db.collection('questions').countDocuments({ difficultyBand: { $exists: false } })
      return NextResponse.json({ backfilled, remaining })
    }

    // ── generateBanded mode ───────────────────────────────────────────────────
    // For each Prep–Year 6 Maths skill and each band, top up to targetPerBand.
    // Re-runnable: resumes from existing per-band counts so it can run in waves.
    if (body.generateBanded) {
      const targetPerBand = body.targetPerBand ?? 20
      const subjectFilter = body.subject
      const gradeMin = body.gradeMin ?? 0
      const gradeMax = body.gradeMax ?? 6
      const skillGraph = getMathsSkills()
        .filter(s => !subjectFilter || s.subject === subjectFilter)
        .filter(s => s.grade >= gradeMin && s.grade <= gradeMax)

      // Existing per-(skill,band) counts in one aggregation.
      const existingCounts = await db.collection('questions').aggregate([
        { $group: { _id: { skillId: '$skillId', band: '$difficultyBand' }, count: { $sum: 1 } } },
      ]).toArray()
      const bandCount = {} // `${skillId}|${band}` -> count
      for (const row of existingCounts) {
        if (row._id.band) bandCount[`${row._id.skillId}|${row._id.band}`] = row.count
      }

      const details = []
      let totalGenerated = 0
      let totalErrors = 0

      for (const skill of skillGraph) {
        for (const band of BAND_ORDER) {
          const existing = bandCount[`${skill.id}|${band}`] ?? 0
          const needed = targetPerBand - existing
          if (needed <= 0) continue
          try {
            const questions = await generateForSkill(skill, needed, band)
            const docs = questions.slice(0, needed).map((q, i) => buildQuestionDoc(q, skill, i, band))
            if (docs.length > 0) { await verifyDocs(docs); await insertQuestions(db, docs) }
            totalGenerated += docs.length
            details.push({ skillId: skill.id, band, generated: docs.length, existing })
          } catch (err) {
            console.error(`[generate banded] Failed for ${skill.id}/${band}:`, err.message)
            totalErrors++
            details.push({ skillId: skill.id, band, error: err.message, existing })
          }
          await sleep(500)
        }
      }

      return NextResponse.json({
        generated: totalGenerated,
        errors: totalErrors,
        targetPerBand,
        skillsProcessed: skillGraph.length,
        details,
      })
    }

    // ── generateAll mode ──────────────────────────────────────────────────────
    if (body.generateAll) {
      const targetPerSkill = body.targetPerSkill ?? 10
      const subjectFilter = body.subject
      // Maths only — source from SKILL_ID_MAP so coverage matches the dashboard.
      const skillGraph = getMathsSkills()
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
            await verifyDocs(docs)
            await insertQuestions(db, docs)
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

    // Maths-only — refuse legacy English/Science requests outright.
    if (!skillId.startsWith('m_')) {
      return NextResponse.json({
        error: 'Only Maths skills are supported (skillId must start with m_)',
      }, { status: 400 })
    }

    // Resolve from SKILL_ID_MAP first (broader taxonomy), then fall back to the
    // legacy SKILL_GRAPH, then a synthesised stub.
    const mapInfo = SKILL_ID_MAP[skillId]
    const gradeFromId = parseInt(skillId.match(/^m_(\d+)_/)?.[1] || '3', 10)
    const skill = mapInfo
      ? { id: skillId, name: mapInfo.name, subject: 'Maths', grade: gradeFromId, difficulty: 0.5 }
      : (getSkillGraph().find(s => s.id === skillId) ?? {
          id: skillId,
          name: skillId,
          subject: subject || 'Maths',
          grade: grade ?? gradeFromId,
          difficulty: 0.5,
        })

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
      await verifyDocs(docs)
      await insertQuestions(db, docs)
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
