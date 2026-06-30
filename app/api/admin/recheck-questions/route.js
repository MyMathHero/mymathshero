import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import { solveBlind, answersAgree, verifyQuestion, VERIFIER_MODEL } from '@/lib/verifyQuestion'

// AI re-check & correct loop (Part 2). Processes questions the verifier flagged
// (verifierFlagged:true) and tries to self-heal the bank:
//
//   • Re-solve with Opus. If it confidently picks an answer that IS one of the
//     options, set correctAnswer to it, log before→after, re-verify, and un-flag
//     (the question returns to rotation).
//   • If the right answer ISN'T among the options (a broken question — e.g. two
//     equivalent options, or none correct), DEACTIVATE it (active:false) and
//     regenerate a fresh verified replacement for that skill/band.
//
// Admin-gated via ADMIN_API_KEY. Runs in capped batches so it's safe to call
// repeatedly (e.g. from the admin "Questions needing review" screen).

let client
async function connectDB() {
  if (!client) { client = new MongoClient(process.env.MONGODB_URI); await client.connect() }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

function authed(request) {
  const key = request.headers.get('x-admin-key') || new URL(request.url).searchParams.get('key')
  return process.env.ADMIN_API_KEY && key === process.env.ADMIN_API_KEY
}

export async function POST(request) {
  if (!authed(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!process.env.OPENROUTER_API_KEY) return NextResponse.json({ error: 'OPENROUTER_API_KEY not set' }, { status: 503 })

  const { limit = 25, regenerate = true } = await request.json().catch(() => ({}))
  const db = await connectDB()
  const col = db.collection('questions')

  const flagged = await col.find({ verifierFlagged: true })
    .project({ id: 1, skillId: 1, grade: 1, question: 1, options: 1, correctAnswer: 1, verifierAnswer: 1 })
    .limit(Math.min(limit, 100)).toArray()

  const out = { processed: 0, corrected: 0, deactivated: 0, regenerated: 0, stillSuspect: 0, errors: 0, items: [] }

  for (const q of flagged) {
    out.processed++
    try {
      // Fresh blind solve to decide the fix.
      const v = await solveBlind(q)
      const ans = v.answer
      const matchingOption = (q.options || []).find(o => answersAgree(ans, o, q.options))

      if (matchingOption && v.confident) {
        // Candidate correction is one of the options. Re-verify against the
        // PROPOSED answer to be sure before committing.
        const recheck = await verifyQuestion({ ...q, correctAnswer: matchingOption }, { double: true })
        if (recheck.status === 'ok') {
          await col.updateOne({ id: q.id }, {
            $set: {
              correctAnswer: matchingOption,
              corrected: true,
              correctionFrom: q.correctAnswer,
              correctedBy: VERIFIER_MODEL,
              correctedAt: new Date(),
            },
            $unset: { verifierFlagged: '', verifierAnswer: '' },
          })
          out.corrected++
          out.items.push({ id: q.id, action: 'corrected', from: q.correctAnswer, to: matchingOption })
          continue
        }
      }

      // Broken: verifier's answer isn't a confident in-options match (e.g. two
      // equivalent options, or none correct). Retire it.
      await col.updateOne({ id: q.id }, {
        $set: { active: false, brokenReason: matchingOption ? 'ambiguous-options' : 'no-correct-option', retiredAt: new Date() },
        $unset: { verifierFlagged: '' },
      })
      out.deactivated++
      out.items.push({ id: q.id, action: 'deactivated', reason: matchingOption ? 'ambiguous-options' : 'no-correct-option' })

      // Regenerate a fresh verified replacement for that skill.
      if (regenerate && q.skillId) {
        try {
          const { generateMoreQuestions } = await import('@/app/api/student/questions/route')
          await generateMoreQuestions(q.skillId, q.grade ?? 3, 'Maths', db)
          out.regenerated++
        } catch { /* generation best-effort */ }
      }
    } catch (e) {
      out.errors++
      out.items.push({ id: q.id, action: 'error', error: e.message })
    }
  }

  out.remainingFlagged = await col.countDocuments({ verifierFlagged: true })
  return NextResponse.json(out)
}

// GET — how many are still flagged (for the admin screen badge).
export async function GET(request) {
  if (!authed(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = await connectDB()
  const col = db.collection('questions')
  return NextResponse.json({
    flagged: await col.countDocuments({ verifierFlagged: true }),
    corrected: await col.countDocuments({ corrected: true }),
    retired: await col.countDocuments({ active: false, retiredAt: { $exists: true } }),
    unverified: await col.countDocuments({ unverified: true }),
  })
}
