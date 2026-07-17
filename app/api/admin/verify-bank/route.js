import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import { solveBlind, answersAgree, verifyQuestion, verifyQuestionCheap, isVisualQuestion, VERIFIER_MODEL } from '@/lib/verifyQuestion'

// Grade-by-grade question-bank verifier + healer.
//
// The self-heal loop in /api/admin/recheck-questions only touches questions the
// verifier has ALREADY flagged. But wrong answers can slip through un-flagged
// (a weak single-pass solve passing them). This route RE-SCANS active, unflagged
// questions with the HARDENED verifier (chain-of-thought + 2-of-3 consensus +
// numeric/fraction equality) so it catches those, one grade at a time — and it
// reports what it finds broken down BY SOURCE (AI-Generated vs seed/scraper/
// other), so you can see where the bad questions come from before fixing.
//
//   GET  ?grade=8            → stats for that grade (total active, by source,
//                              flagged, retired, corrected, unverified). Omit
//                              grade for an all-grades roll-up.
//   POST { mode:'scan', grade, limit } → re-verify a capped batch; flag suspects;
//                              return counts + a per-source breakdown of wrongs.
//   POST { mode:'fix', grade, limit, regenerate } → heal flagged questions for
//                              that grade: auto-correct if an option is right,
//                              else deactivate + regenerate a verified replacement.
//
// Admin-gated via ADMIN_API_KEY. Capped batches → safe to call repeatedly.

let client
async function connectDB() {
  if (!client) { client = new MongoClient(process.env.MONGODB_URI); await client.connect() }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

function authed(request) {
  const key = request.headers.get('x-admin-key') || new URL(request.url).searchParams.get('key')
  return process.env.ADMIN_API_KEY && key === process.env.ADMIN_API_KEY
}

// How many questions to verify in parallel within one batch. Each verify is
// mostly LLM wait time, so overlapping them cuts batch wall-time ~CONCURRENCY×.
// Kept modest to stay under OpenRouter rate limits and serverless memory.
const CONCURRENCY = 8

// Give the batch room: each question is up to 3 Opus calls; a 60-question batch
// at CONCURRENCY 8 is well within a 300s function budget.
export const maxDuration = 300

// Bucket a question by where it came from, for the source report. AI questions
// carry source:'AI-Generated' and an `ai_` id prefix; everything else is grouped
// by its `source` field or, failing that, an id-prefix guess.
function sourceOf(q) {
  const s = String(q.source || '').trim()
  if (s) return s
  const id = String(q.id || '')
  if (id.startsWith('ai_')) return 'AI-Generated'
  if (id.startsWith('q_seed_') || id.includes('seed')) return 'Seed'
  return 'Unknown'
}

function gradeFilter(grade) {
  return grade === null || grade === undefined || grade === ''
    ? {}
    : { grade: typeof grade === 'number' ? grade : parseInt(grade, 10) }
}

export async function GET(request) {
  if (!authed(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = await connectDB()
  const col = db.collection('questions')
  const gradeParam = new URL(request.url).searchParams.get('grade')
  const gf = gradeFilter(gradeParam)

  // Source breakdown of ACTIVE questions for this grade.
  const bySource = await col.aggregate([
    { $match: { active: { $ne: false }, ...gf } },
    { $group: { _id: { $ifNull: ['$source', 'Unknown'] }, count: { $sum: 1 } } },
  ]).toArray()

  // Flagged split by grade — powers the "all grades" view + the cron alert email.
  const flaggedByGradeRows = await col.aggregate([
    { $match: { verifierFlagged: true, ...gf } },
    { $group: { _id: '$grade', n: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]).toArray()

  return NextResponse.json({
    grade: gradeParam ?? 'all',
    totalActive: await col.countDocuments({ active: { $ne: false }, ...gf }),
    bySource: Object.fromEntries(bySource.map(r => [r._id || 'Unknown', r.count])),
    flaggedByGrade: Object.fromEntries(flaggedByGradeRows.map(r => [String(r._id ?? 'null'), r.n])),
    flagged: await col.countDocuments({ verifierFlagged: true, ...gf }),
    retired: await col.countDocuments({ active: false, retiredAt: { $exists: true }, ...gf }),
    corrected: await col.countDocuments({ corrected: true, ...gf }),
    unverified: await col.countDocuments({ unverified: true, ...gf }),
    unscanned: await col.countDocuments({ active: { $ne: false }, verifierScannedAt: { $exists: false }, ...gf }),
  })
}

export async function POST(request) {
  if (!authed(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!process.env.OPENROUTER_API_KEY) return NextResponse.json({ error: 'OPENROUTER_API_KEY not set' }, { status: 503 })

  const body = await request.json().catch(() => ({}))
  const mode = body.mode || 'scan'
  const db = await connectDB()

  if (mode === 'scan') return scan(db, body)
  if (mode === 'fix') return fix(db, body)
  if (mode === 'audit') return audit(db, body)
  return NextResponse.json({ error: "mode must be 'scan', 'fix' or 'audit'" }, { status: 400 })
}

// AUDIT the cheap path: take a random sample of questions the CHEAP verifier
// cleared as 'ok' (verifierScannedAt set, not flagged) for a young grade, and
// re-check each with the FULL Opus verifier. If Opus disagrees with any, the
// cheap screen let a wrong answer through — proof to tighten it. Returns the
// disagreements. Cheap to run (~sample × Opus). Use before trusting a cheap run.
async function audit(db, { grade = null, sample = 30 }) {
  const col = db.collection('questions')
  const gf = gradeFilter(grade)
  const pool = await col.aggregate([
    { $match: { active: { $ne: false }, verifierFlagged: { $ne: true }, verifierScannedAt: { $exists: true }, mode: { $ne: 'junior' }, ...gf } },
    { $sample: { size: Math.min(sample, 50) } },
    { $project: { id: 1, grade: 1, question: 1, options: 1, correctAnswer: 1 } },
  ]).toArray()

  const out = { grade: grade ?? 'all', audited: 0, agreed: 0, disagreed: 0, misses: [] }
  for (let i = 0; i < pool.length; i += CONCURRENCY) {
    await Promise.all(pool.slice(i, i + CONCURRENCY).map(async q => {
      out.audited++
      const r = await verifyQuestion(q, { double: true }) // full Opus
      if (r.status === 'ok') out.agreed++
      else {
        out.disagreed++
        out.misses.push({ id: q.id, stored: q.correctAnswer, opus: r.verifierAnswer, reason: r.reason })
      }
    }))
  }
  out.verdict = out.disagreed === 0
    ? 'PASS — Opus agreed with every cheap-cleared question in the sample.'
    : `REVIEW — Opus disagreed on ${out.disagreed}/${out.audited}; the cheap screen may be letting some through.`
  return NextResponse.json(out)
}

// Re-verify a capped batch of active, not-yet-scanned questions for a grade.
// `cheap:true` uses the cost-aware verifier (Haiku screen + Opus arbitrate for
// young grades; full Opus for hard grades). Default false = full Opus for all.
async function scan(db, { grade = null, limit = 60, cheap = false }) {
  const col = db.collection('questions')
  const gf = gradeFilter(grade)

  // Prefer questions we haven't scanned with the hardened verifier yet; skip
  // visual ones (can't be solved from text) and already-flagged ones.
  const batch = await col.find({
    active: { $ne: false },
    verifierFlagged: { $ne: true },
    verifierScannedAt: { $exists: false },
    ...gf,
  }).project({ id: 1, skillId: 1, grade: 1, question: 1, options: 1, correctAnswer: 1, source: 1, mode: 1, visual: 1 })
    .limit(Math.min(limit, 100)).toArray()

  const out = {
    grade: grade ?? 'all', scanned: 0, ok: 0, suspect: 0, skipped: 0, errors: 0,
    wrongBySource: {}, items: [],
  }

  // Verify one question and apply its result. Extracted so a batch can run
  // several of these CONCURRENTLY (each is mostly waiting on the LLM), which is
  // what makes a big batch finish in seconds rather than minutes.
  async function processOne(q) {
    out.scanned++
    if (isVisualQuestion(q)) {
      out.skipped++
      await col.updateOne({ id: q.id }, { $set: { verifierScannedAt: new Date(), verifierSkipped: 'visual' } })
      return
    }
    try {
      const r = cheap ? await verifyQuestionCheap(q) : await verifyQuestion(q, { double: true })
      if (r.via) out.via = { ...(out.via || {}), [r.via]: (out.via?.[r.via] || 0) + 1 }
      if (r.status === 'ok') {
        out.ok++
        await col.updateOne({ id: q.id }, { $set: { verifierScannedAt: new Date() }, $unset: { unverified: '' } })
      } else if (r.status === 'suspect') {
        out.suspect++
        const src = sourceOf(q)
        out.wrongBySource[src] = (out.wrongBySource[src] || 0) + 1
        await col.updateOne({ id: q.id }, {
          $set: {
            verifierFlagged: true,
            verifierAnswer: r.verifierAnswer,
            verifierReason: r.reason || 'suspect',
            verifierModel: VERIFIER_MODEL,
            verifierScannedAt: new Date(),
          },
          $unset: { unverified: '' },
        })
        out.items.push({ id: q.id, source: src, stored: q.correctAnswer, verifier: r.verifierAnswer, reason: r.reason })
      } else {
        // 'error' — don't stamp scannedAt so it's retried next run.
        out.errors++
      }
    } catch (e) {
      out.errors++
      out.items.push({ id: q.id, action: 'error', error: e.message })
    }
  }

  // Run the batch in concurrent chunks (CONCURRENCY at a time) so LLM latency
  // overlaps instead of stacking up.
  for (let i = 0; i < batch.length; i += CONCURRENCY) {
    await Promise.all(batch.slice(i, i + CONCURRENCY).map(processOne))
  }

  out.remainingUnscanned = await col.countDocuments({
    active: { $ne: false }, verifierScannedAt: { $exists: false }, ...gf,
  })
  return NextResponse.json(out)
}

// Heal flagged questions for a grade: auto-correct where an option is right,
// else deactivate + regenerate a verified replacement. Mirrors recheck-questions
// but scoped to the grade.
async function fix(db, { grade = null, limit = 40, regenerate = true }) {
  const col = db.collection('questions')
  const gf = gradeFilter(grade)

  const flagged = await col.find({ verifierFlagged: true, ...gf })
    .project({ id: 1, skillId: 1, grade: 1, question: 1, options: 1, correctAnswer: 1, verifierAnswer: 1, source: 1 })
    .limit(Math.min(limit, 100)).toArray()

  const out = { grade: grade ?? 'all', processed: 0, corrected: 0, deactivated: 0, regenerated: 0, errors: 0, items: [] }

  async function healOne(q) {
    out.processed++
    try {
      const v = await solveBlind(q)
      const ans = v.answer
      const matchingOption = (q.options || []).find(o => answersAgree(ans, o, q.options))

      if (matchingOption && v.confident) {
        // Re-verify against the PROPOSED answer with the hardened path.
        const recheck = await verifyQuestion({ ...q, correctAnswer: matchingOption }, { double: true })
        if (recheck.status === 'ok') {
          await col.updateOne({ id: q.id }, {
            $set: {
              correctAnswer: matchingOption, corrected: true,
              correctionFrom: q.correctAnswer, correctedBy: VERIFIER_MODEL, correctedAt: new Date(),
            },
            $unset: { verifierFlagged: '', verifierAnswer: '', verifierReason: '' },
          })
          out.corrected++
          out.items.push({ id: q.id, action: 'corrected', from: q.correctAnswer, to: matchingOption, source: sourceOf(q) })
          return
        }
      }

      // Broken — retire it.
      await col.updateOne({ id: q.id }, {
        $set: { active: false, brokenReason: matchingOption ? 'ambiguous-options' : 'no-correct-option', retiredAt: new Date() },
        $unset: { verifierFlagged: '' },
      })
      out.deactivated++
      out.items.push({ id: q.id, action: 'deactivated', reason: matchingOption ? 'ambiguous-options' : 'no-correct-option', source: sourceOf(q) })

      if (regenerate && q.skillId) {
        try {
          const { generateMoreQuestions } = await import('@/app/api/student/questions/route')
          await generateMoreQuestions(q.skillId, q.grade ?? 3, 'Maths', db)
          out.regenerated++
        } catch { /* best-effort */ }
      }
    } catch (e) {
      out.errors++
      out.items.push({ id: q.id, action: 'error', error: e.message })
    }
  }

  // Heal in concurrent chunks (fewer than scan — each may also regenerate).
  for (let i = 0; i < flagged.length; i += CONCURRENCY) {
    await Promise.all(flagged.slice(i, i + CONCURRENCY).map(healOne))
  }

  out.remainingFlagged = await col.countDocuments({ verifierFlagged: true, ...gf })
  return NextResponse.json(out)
}
