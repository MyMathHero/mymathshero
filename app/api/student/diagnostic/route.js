import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import { summariseDiagnostic, estimateLevel, nudgeSkillScore, MAX_DIAGNOSTIC_GRADE } from '@/lib/placement'
import { SKILL_ID_MAP } from '@/lib/skillNames'
import { JUNIOR_DIAGNOSTIC_LENGTH } from '@/lib/juniorMode'

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
// Maths skills at an exact grade. ≤6 from the curated graph, ≥7 from SKILL_ID_MAP
// (which has the Years 7–12 skills the adaptive diagnostic climbs into).
function skillsAtGrade(allCurated, grade) {
  if (grade <= 6) return allCurated.filter(s => s.grade === grade)
  return Object.entries(SKILL_ID_MAP)
    .filter(([id]) => parseInt(id.match(/^m_(\d+)_/)?.[1] ?? '-1', 10) === grade)
    .map(([id, info]) => ({ id, name: info.name, subject: 'Maths', grade }))
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const grade = parseInt(searchParams.get('grade') || '3', 10)
    const subject = searchParams.get('subject') || 'Maths'
    // Adaptive climb: when the student aced a stage, the client asks for the next
    // grade up via ?stageGrade=N. Returns a small batch at that grade + whether a
    // further stage exists.
    const stageGrade = searchParams.get('stageGrade') != null
      ? parseInt(searchParams.get('stageGrade'), 10) : null
    const db = await connectDB()

    const { getSkillGraph } = await import('@/lib/recommender')
    const { generateMoreQuestions } = await import('@/app/api/student/questions/route')
    const allSkills = getSkillGraph() // Maths-only

    // Sample `depth` questions for a skill; auto-generate if short. (Shared by
    // base + stage modes.)
    async function sampleSkill(skillId, depth, gradeForGen) {
      const match = {
        skillId, active: { $ne: false },
        verifierFlagged: { $ne: true }, // don't diagnose with flagged/suspect questions
        $or: [{ subject: { $in: ['Maths', 'Mathematics', 'Math'] } }, { subject: { $exists: false } }],
      }
      let qs = await db.collection('questions').aggregate([{ $match: match }, { $sample: { size: depth } }]).toArray()
      if (qs.length < depth) {
        await generateMoreQuestions(skillId, gradeForGen, subject, db)
        qs = await db.collection('questions').aggregate([{ $match: match }, { $sample: { size: depth } }]).toArray()
      }
      return qs
    }
    const tagQ = (arr, level) => arr.map(({ correctAnswer, _id, ...q }) => ({
      ...q, questionId: q.id || _id?.toString(), level, correctAnswer,
    }))

    // ── Junior diagnostic (Prep–2): a short 10-question VISUAL assessment that
    // needs no reading. Samples junior questions across the Prep/Grade-1 skills,
    // tagged 'at' so it feeds the same placement engine as the big diagnostic.
    if (searchParams.get('junior') === '1') {
      const juniorSkillIds = Object.keys(SKILL_ID_MAP).filter(id => /^m_0_/.test(id))
      const sampled = await db.collection('questions').aggregate([
        { $match: { mode: 'junior', skillId: { $in: juniorSkillIds }, active: { $ne: false } } },
        { $sample: { size: JUNIOR_DIAGNOSTIC_LENGTH } },
      ]).toArray()
      const questions = sampled.map(({ _id, ...q }) => ({
        ...q, questionId: q.id || _id?.toString(), level: 'at', // keep correctAnswer for client self-grade
      }))
      return NextResponse.json({ junior: true, questions, total: questions.length })
    }

    // ── Adaptive stage: a small batch at exactly `stageGrade` ────────────────
    if (stageGrade != null && stageGrade >= 0 && stageGrade <= MAX_DIAGNOSTIC_GRADE) {
      const skills = skillsAtGrade(allSkills, stageGrade).slice(0, 3)
      const out = []
      for (const s of skills) {
        out.push(...tagQ(await sampleSkill(s.id, 1, stageGrade), 'above'))
        if (out.length >= 3) break
      }
      return NextResponse.json({
        questions: out.slice(0, 3),
        stageGrade,
        nextStageGrade: stageGrade < MAX_DIAGNOSTIC_GRADE ? stageGrade + 1 : null,
      })
    }

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

    const below = [], at = [], above = []
    for (const { skill, level, depth } of plan) {
      const qs = tagQ(await sampleSkill(skill.id, depth, grade), level)
      if (level === 'below') below.push(...qs)
      else if (level === 'above') above.push(...qs)
      else at.push(...qs)
    }

    // Difficulty-ordered: warm up with a couple of easier items, then at-grade,
    // then probe the ceiling with above-grade items last.
    let questions = [...below.slice(0, 2), ...at, ...below.slice(2), ...above]

    // Keep within the target band so it's a steady ~3 minutes.
    if (questions.length > TARGET_MAX) questions = questions.slice(0, TARGET_MAX)

    // The base batch already probes grade+1 ("above"). Adaptive climbing, when
    // the student aces it, starts at grade+2 and continues up to Year 12.
    const nextStageGrade = grade + 2 <= MAX_DIAGNOSTIC_GRADE ? grade + 2 : null

    return NextResponse.json({
      questions,
      total: questions.length,
      nextStageGrade,
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

    // Load the student for grade + parent insight + name (drives placement).
    const student = await db.collection('children').findOne({ id: studentId })
    const enteredGrade = Number.isFinite(student?.grade) ? student.grade : 3
    const parentInsight = student?.parentInsight || { perceivedLevel: 'at', confidence: 'medium' }

    // Fuse diagnostic results + response speed + parent insight into an estimate
    // of the student's true working level. Never throws — falls back internally.
    const summary = summariseDiagnostic(results)
    const placement = await estimateLevel({
      enteredGrade,
      studentName: student?.name,
      summary,
      parentInsight,
    })

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
      const baseScore = placementScore(weightedAccuracy, data.hadAbove)
      // Conservative AI-placement nudge: only lifts at/above-grade seeds when the
      // estimate exceeds the entered grade. Skill grade comes from the m_<grade>_ id.
      const skillGrade = parseInt(String(skillId).match(/^m_(\d+)_/)?.[1] ?? enteredGrade, 10)
      const startingScore = nudgeSkillScore(baseScore, placement, skillGrade)
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
      { $set: {
          diagnosticComplete: true,
          diagnosticDate: new Date(),
          placement: {
            enteredGrade,
            estimatedGrade: placement.estimatedGrade,
            confidence: placement.confidence,
            rationale: placement.rationale,
            source: placement.source,
            generatedAt: new Date(),
          },
        } }
    )

    return NextResponse.json({
      success: true,
      message: 'Diagnostic complete',
      skillsSet: Object.keys(skillResults).length,
      mastered,
      placement: {
        enteredGrade,
        estimatedGrade: placement.estimatedGrade,
        confidence: placement.confidence,
        rationale: placement.rationale,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
