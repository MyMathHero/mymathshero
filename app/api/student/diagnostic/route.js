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

// How many questions to sample per skill during the diagnostic.
const PER_SKILL = 2
// Target total — ~12–15 questions (~3 min). Per-skill coverage drives the real
// count; this caps it so an under-or-over-supplied grade stays in range.
const TARGET_MIN = 12
const TARGET_MAX = 15

// GET — fetch a per-skill diagnostic set so EVERY skill in the student's grade
// (plus a taste of grade-1 and grade+1) gets probed, ~12–15 questions total.
// Auto-generates questions for any skill that's short so the diagnostic is
// always full-length even on a thinly-seeded grade.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const grade = parseInt(searchParams.get('grade') || '3', 10)
    const subject = searchParams.get('subject') || 'Maths'
    const db = await connectDB()

    const { getSkillGraph } = await import('@/lib/recommender')
    const { generateMoreQuestions } = await import('@/app/api/student/questions/route')
    const allSkills = getSkillGraph() // Maths-only

    // Build the skill set to probe: every at-grade skill, plus up to 2 each from
    // grade-1 (below) and grade+1 (above) so we can place AND probe the ceiling.
    const atSkills = allSkills.filter(s => s.grade === grade)
    const belowSkills = allSkills.filter(s => s.grade === Math.max(0, grade - 1)).slice(0, 2)
    const aboveSkills = allSkills.filter(s => s.grade === grade + 1).slice(0, 2)

    // Younger grades have few skills (2–3), so 2/skill wouldn't reach the target.
    // Scale per-skill depth on the at-grade skills so every grade lands ~12–15.
    const atDepth = Math.max(PER_SKILL, Math.ceil(TARGET_MIN / Math.max(1, atSkills.length)))

    const plan = [
      ...belowSkills.map(s => ({ skill: s, level: 'below', depth: PER_SKILL })),
      ...atSkills.map(s => ({ skill: s, level: 'at', depth: atDepth })),
      ...aboveSkills.map(s => ({ skill: s, level: 'above', depth: PER_SKILL })),
    ]

    // Sample `depth` questions for a planned skill; auto-generate if short.
    async function sampleForSkill(skillId, depth) {
      const match = {
        skillId,
        active: { $ne: false },
        $or: [
          { subject: { $in: ['Maths', 'Mathematics', 'Math'] } },
          { subject: { $exists: false } },
        ],
      }
      let qs = await db.collection('questions')
        .aggregate([{ $match: match }, { $sample: { size: depth } }])
        .toArray()
      if (qs.length < depth) {
        // Top up this skill via the same AI generator the practice flow uses.
        await generateMoreQuestions(skillId, grade, subject, db)
        qs = await db.collection('questions')
          .aggregate([{ $match: match }, { $sample: { size: depth } }])
          .toArray()
      }
      return qs
    }

    const tag = (arr, level) => arr.map(({ correctAnswer, _id, ...q }) => ({
      ...q,
      questionId: q.id || _id?.toString(),
      level,
      correctAnswer, // kept client-side for self-grade during the diagnostic
    }))

    const below = [], at = [], above = []
    for (const { skill, level, depth } of plan) {
      const qs = tag(await sampleForSkill(skill.id, depth), level)
      if (level === 'below') below.push(...qs)
      else if (level === 'above') above.push(...qs)
      else at.push(...qs)
    }

    // Difficulty-ordered: warm up with a couple of easier items, then at-grade,
    // then probe the ceiling with above-grade items last.
    let questions = [...below.slice(0, 2), ...at, ...below.slice(2), ...above]

    // Keep within the target band so it's a steady ~3 minutes.
    if (questions.length > TARGET_MAX) questions = questions.slice(0, TARGET_MAX)

    return NextResponse.json({
      questions,
      total: questions.length,
      // Surfaced for debugging/telemetry; harmless to clients that ignore it.
      meta: { skillsProbed: plan.length, target: [TARGET_MIN, TARGET_MAX] },
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Maps a level-weighted diagnostic accuracy to a starting SmartScore.
// Unlike the old flat cap of 65, strong performance — especially on at/above-
// grade items — can seed a skill at mastery (80+) so question serving targets
// the right level immediately instead of starting everyone at Prep basics.
// `weightedAccuracy` is in [0,1]; `hadAbove` true if any above-grade item was seen.
export function placementScore(weightedAccuracy, hadAbove) {
  if (weightedAccuracy >= 0.85) return hadAbove ? 88 : 82 // demonstrated mastery
  if (weightedAccuracy >= 0.7) return 70
  if (weightedAccuracy >= 0.55) return 55
  if (weightedAccuracy >= 0.4) return 38
  if (weightedAccuracy >= 0.2) return 22
  return 10
}

// Per-result weight by difficulty level relative to the student's grade.
// Getting an above-grade item right is strong evidence of mastery; getting a
// below-grade item wrong is strong evidence of a gap.
function levelWeight(level) {
  if (level === 'above') return 1.5
  if (level === 'below') return 0.6
  return 1.0 // at-grade (or unknown)
}

// POST — save diagnostic results and set starting SmartScore per skill.
// Body: { studentId, results: [{ questionId, skillId, correct, timeTakenMs, grade, level }] }
export async function POST(request) {
  try {
    const { studentId, results } = await request.json()
    if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 })
    if (!Array.isArray(results)) return NextResponse.json({ error: 'results array required' }, { status: 400 })

    const db = await connectDB()

    // Aggregate per-skill, weighting each result by its difficulty level.
    const skillResults = {}
    results.forEach(r => {
      if (!r?.skillId) return
      if (!skillResults[r.skillId]) {
        skillResults[r.skillId] = { weightedCorrect: 0, weightedTotal: 0, count: 0, hadAbove: false }
      }
      const w = levelWeight(r.level)
      const s = skillResults[r.skillId]
      s.weightedTotal += w
      if (r.correct) s.weightedCorrect += w
      if (r.level === 'above') s.hadAbove = true
      s.count++
    })

    let mastered = 0
    for (const [skillId, data] of Object.entries(skillResults)) {
      const weightedAccuracy = data.weightedTotal > 0 ? data.weightedCorrect / data.weightedTotal : 0
      const startingScore = placementScore(weightedAccuracy, data.hadAbove)
      const isMastered = startingScore >= 80
      if (isMastered) mastered++

      await db.collection('skill_scores').updateOne(
        { studentId, skillId },
        {
          // Use $set (not $setOnInsert) so re-running the diagnostic re-places
          // the student rather than silently keeping a stale first placement.
          $set: {
            studentId,
            skillId,
            score: startingScore,
            mastered: isMastered,
            updatedAt: new Date(),
            ...(isMastered ? { masteredAt: new Date() } : {}),
            placedByDiagnostic: true,
          },
          $setOnInsert: { attempts: 0, createdAt: new Date() },
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
      mastered,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
