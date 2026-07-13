import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import { normaliseGrade } from '@/lib/normaliseGrade'
import { bandForDifficulty, bandForScore, adjacentBands, shiftBand } from '@/lib/difficulty'
import { verifyQuestion } from '@/lib/verifyQuestion'
import { parseFractionVisual } from '@/lib/fractionVisual'
import { insertQuestions } from '@/lib/questionDedup'
import { buildCurriculumBlock } from '@/lib/curriculumRef'
import { SKILL_ID_MAP } from '@/lib/skillNames'
import { deriveVisual } from '@/lib/deriveVisual'

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
    // Junior Mode (Prep–3) serves VISUAL questions (mode:'junior'); Standard
    // mode serves the normal text questions. Keeps the two pools from mixing.
    const junior = searchParams.get('mode') === 'junior'

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
    // normaliseGrade accepts numbers, numeric strings ('3'), labels ('Year 3',
    // 'Prep'), and unknown values — falls back to skillDoc.grade or 3. Without
    // this, a request like grade='Year 6' becomes NaN → silently downgrades to
    // grade 3 questions for a Year 6 student.
    // The skillId encodes the true grade (m_<grade>_…). For Years 7–12 prefer
    // that over the client `grade` param, since normaliseGrade clamps to 0–6 and
    // would mis-target AI top-up / cross-skill fallback for above-Year-6 skills.
    const skillIdGrade = parseInt(skillId.match(/^m_(\d+)_/)?.[1] ?? '', 10)
    const gradeNum = Number.isFinite(skillIdGrade) && skillIdGrade > 6
      ? skillIdGrade
      : (gradeParam != null && gradeParam !== ''
          ? normaliseGrade(gradeParam)
          : (skillDoc?.grade ?? 3))

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
      // Withhold questions flagged by the AI verifier as having a wrong/suspect
      // answer — they must be re-checked & corrected before students see them.
      verifierFlagged: { $ne: true },
      // Junior serves only visual junior questions; Standard excludes them.
      mode: junior ? 'junior' : { $ne: 'junior' },
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

    // Dynamic difficulty: serve questions matched to the student's mastery of
    // THIS skill. A near-mastered student (high SmartScore) gets hard items; a
    // beginner gets easy ones. As the score climbs mid-session, later fetches
    // escalate the band — this breaks the "too easy forever" loop.
    let targetBand = 'easy'
    if (studentId) {
      const scoreDoc = await db.collection('skill_scores').findOne(
        { studentId, skillId },
        { projection: { score: 1, feedbackBias: 1, _id: 0 } }
      )
      targetBand = bandForScore(scoreDoc?.score ?? 0)
      // Apply the student's mandatory difficulty feedback on top of the score
      // band: "too easy" → one band harder, "too hard" → one band easier.
      if (scoreDoc?.feedbackBias) targetBand = shiftBand(targetBand, scoreDoc.feedbackBias)
    }
    // Constrain by band. Docs without difficultyBand are tolerated in widened
    // passes (pre-backfill safety) but excluded from the tight target-band pass.
    const inBand = (bands) => ({ difficultyBand: { $in: bands } })

    // Over-fetch for variety, then trim to `limit` below. $sample randomizes
    // order so we rotate through the whole pool.
    // Pass 1: unmastered AND in the exact target band.
    let questions = await db.collection('questions')
      .aggregate([{ $match: { ...unmasteredMatch, ...inBand([targetBand]) } }, { $sample: { size: limit * 3 } }])
      .toArray()

    // Pass 2: unmastered, widened to adjacent bands.
    if (questions.length < limit) {
      questions = await db.collection('questions')
        .aggregate([{ $match: { ...unmasteredMatch, ...inBand(adjacentBands(targetBand)) } }, { $sample: { size: limit * 3 } }])
        .toArray()
    }

    // Pass 3: unmastered, any band (includes unbanded legacy docs).
    if (questions.length < 2) {
      questions = await db.collection('questions')
        .aggregate([{ $match: unmasteredMatch }, { $sample: { size: limit * 3 } }])
        .toArray()
    }

    // Pass 4: full skill pool so the student can keep practising (repeating only
    // because unmastered stock is exhausted).
    if (questions.length < 2) {
      questions = await db.collection('questions')
        .aggregate([{ $match: baseMatch }, { $sample: { size: limit * 3 } }])
        .toArray()
    }

    // Still thin — generate more via AI, then re-sample. The AI generator makes
    // TEXT questions, so skip it for Junior (visual) requests — Junior content is
    // pre-seeded (mode:'junior') and must never mix with text questions.
    if (!junior && questions.length < 3) {
      await generateMoreQuestions(skillId, gradeNum, subject, db)
      questions = await db.collection('questions')
        .aggregate([{ $match: baseMatch }, { $sample: { size: limit * 3 } }])
        .toArray()
    }

    // Last resort — skill has no questions at all: sample same subject + grade
    // (respecting the junior/standard split so the pools never cross).
    let fallbackUsed = false
    if (questions.length === 0) {
      questions = await db.collection('questions')
        .aggregate([
          { $match: { subject, grade: gradeNum, active: { $ne: false }, mode: junior ? 'junior' : { $ne: 'junior' } } },
          { $sample: { size: limit } },
        ])
        .toArray()
      fallbackUsed = true
    }

    // Strip correctAnswer — validation happens server-side on POST /api/student/answer.
    // RE-DERIVE the `visual` from the wording every time (never trust a stale
    // stored one) so the picture always matches the text. For Prep–3 this draws
    // a shape/count/add/takeaway/equation as well as fractions; for older grades
    // only a fraction diagram is derived. Phase 3: young questions always show a
    // diagram when one can be drawn.
    const safe = questions.slice(0, limit).map(({ correctAnswer, _id, visual, ...rest }) => {
      const derived = rest.question
        ? (deriveVisual(rest.question, gradeNum) || parseFractionVisual(rest.question))
        : null
      return {
        ...rest,
        ...(derived ? { visual: derived } : {}),
        questionId: rest.id || _id?.toString(),
      }
    })

    return NextResponse.json({ questions: safe, total: safe.length, fallbackUsed })
  } catch (error) {
    console.error('Questions GET error:', error.message)
    return NextResponse.json({ error: error.message, questions: [] }, { status: 500 })
  }
}

// Generate more questions for a skill via AI when the stock is running low.
// Mirrors the doc shape used by /api/admin/generate-questions so they're interchangeable.
// Exported so the diagnostic can reuse the same generator to fill skill gaps.
export async function generateMoreQuestions(skillId, grade, subject, db) {
  try {
    if (!process.env.OPENROUTER_API_KEY) return
    const existingCount = await db.collection('questions').countDocuments({ skillId })
    if (existingCount >= 30) return // already plenty

    const skillName = skillId.replace(/^[a-z]_\d+_/, '').replace(/_/g, ' ')
    // ACARA v9 scope for this skill's strand + grade — keeps regenerated
    // questions in-level (mirrors the admin generator).
    const category = SKILL_ID_MAP[skillId]?.category
    const curriculumBlock = buildCurriculumBlock(category, grade)

    const prompt = `Generate 10 multiple choice maths questions for Australian Year ${grade} students about "${skillName}".${curriculumBlock}

Return ONLY a JSON array. Each question must have:
- question: the question text. IMPORTANT: questions are shown as TEXT ONLY — no image, diagram, shape or graph is displayed. Never ask something that needs a picture (e.g. "how many parts are shaded?"). State all shape/graph/data in words so it is answerable from the text alone.
- options: array of exactly 4 plain text answer choices. DO NOT prefix with letters ("A)", "B)") — just the literal values.
- correctAnswer: must EXACTLY match one of the options as a plain text value (no "A)" prefix).
- explanation: brief explanation of the answer
- difficulty: number between 0.1 and 0.9
- hint: a helpful hint without giving the answer away

Example: { "question": "What is 5 × 9?", "options": ["45","40","35","50"], "correctAnswer": "45", ... }

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

    // Strip any "A) " / "A. " / "A " prefix the model may still emit on
    // either side. Keeps the question bank in a single consistent format.
    const stripPrefix = (s) => String(s ?? '').trim().replace(/^[A-Da-d][).\s]+/, '').trim()
    const toInsert = generated
      .filter(q => q && q.question && Array.isArray(q.options) && q.correctAnswer)
      .map((q, i) => {
        const difficulty = typeof q.difficulty === 'number' ? q.difficulty : 0.5
        return {
        id: `${skillId}_gen_${Date.now()}_${i}`,
        skillId,
        grade,
        subject,
        question: q.question,
        options: q.options.map(stripPrefix),
        correctAnswer: stripPrefix(q.correctAnswer),
        explanation: q.explanation || '',
        hint: q.hint || '',
        difficulty,
        difficultyBand: bandForDifficulty(difficulty),
        // Auto-attach a fraction diagram when the wording describes one, so
        // shaded-parts questions are answerable on screen.
        ...(parseFractionVisual(q.question) ? { visual: parseFractionVisual(q.question) } : {}),
        active: true,
        aiGenerated: true,
        unverified: true, // set false once the inline verify below passes
        source: 'AI-Generated',
        createdAt: new Date(),
        }
      })

    if (toInsert.length > 0) {
      // Part 3 — auto-verify each new question BEFORE it can be served. A suspect
      // answer gets verifierFlagged:true (withheld); a clean one drops `unverified`.
      // Best-effort: if the verifier API is down, leave them `unverified` (servable
      // but tagged) rather than blocking generation entirely.
      await Promise.all(toInsert.map(async d => {
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
          // 'skipped' (visual) / 'error' → stays unverified (servable)
        } catch { /* keep unverified */ }
      }))
      const { inserted, skipped } = await insertQuestions(db, toInsert)
      const flagged = toInsert.filter(d => d.verifierFlagged).length
      console.log(`[questions] Generated ${inserted} for ${skillId} (${flagged} flagged, ${skipped} duplicate-skipped)`)
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

    const { inserted, skipped } = await insertQuestions(db, docs)

    return NextResponse.json({
      success: true,
      insertedCount: inserted,
      duplicatesSkipped: skipped,
    }, { status: 201 })
  } catch (error) {
    console.error('Questions POST error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
