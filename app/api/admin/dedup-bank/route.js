import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import { questionHash } from '@/lib/questionHash'
import { ensureQHashIndex } from '@/lib/questionDedup'

// Grade-by-grade DEDUP for the question bank. New inserts are already guarded by
// lib/questionDedup (so twins can't ENTER), but the existing bank was built with
// NO dedup, so it holds repeats. This cleans them up:
//
//   POST { mode:'backfill', grade, limit }  → stamp qHash on questions missing it
//   POST { mode:'sweep',    grade, limit }  → cluster by qHash; keep the BEST copy
//                                             of each cluster, retire the rest
//                                             (active:false, dupOf:<keptId>).
//   POST { mode:'neardup',  grade, skillId, limit } → AI finds REWORDED twins
//                                             within one skill+grade and retires
//                                             the extras.
//   GET  ?grade=N  → dedup stats for that grade.
//
// Admin-gated via ADMIN_API_KEY. Batches → safe to call repeatedly.

let client
async function connectDB() {
  if (!client) { client = new MongoClient(process.env.MONGODB_URI); await client.connect() }
  return client.db(process.env.DB_NAME || 'mymathshero')
}
function authed(request) {
  const key = request.headers.get('x-admin-key') || new URL(request.url).searchParams.get('key')
  return process.env.ADMIN_API_KEY && key === process.env.ADMIN_API_KEY
}
function gradeFilter(grade) {
  return grade === null || grade === undefined || grade === ''
    ? {} : { grade: typeof grade === 'number' ? grade : parseInt(grade, 10) }
}

export const maxDuration = 300

// Rank a question so we keep the BEST copy of a duplicate cluster. Higher wins.
function qualityScore(q) {
  let s = 0
  if (q.active !== false) s += 100          // active beats retired
  if (q.corrected) s += 20                  // human/AI-corrected answer
  if (q.verifierScannedAt && !q.verifierFlagged) s += 15 // verified clean
  if (!q.unverified) s += 5                 // has been through verify
  if (q.visual) s += 3                      // has a diagram
  if (q.createdAt) s += 0                   // tie-break handled below
  return s
}

export async function GET(request) {
  if (!authed(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = await connectDB()
  const col = db.collection('questions')
  const grade = new URL(request.url).searchParams.get('grade')
  const gf = gradeFilter(grade)

  // Count exact-duplicate clusters among ACTIVE questions with a hash.
  const dupAgg = await col.aggregate([
    { $match: { active: { $ne: false }, qHash: { $exists: true }, ...gf } },
    { $group: { _id: '$qHash', n: { $sum: 1 } } },
    { $match: { n: { $gt: 1 } } },
    { $group: { _id: null, clusters: { $sum: 1 }, extra: { $sum: { $subtract: ['$n', 1] } } } },
  ]).toArray()

  return NextResponse.json({
    grade: grade ?? 'all',
    totalActive: await col.countDocuments({ active: { $ne: false }, ...gf }),
    missingHash: await col.countDocuments({ active: { $ne: false }, qHash: { $exists: false }, ...gf }),
    duplicateClusters: dupAgg[0]?.clusters || 0,
    duplicateExtras: dupAgg[0]?.extra || 0,     // how many active docs would be retired
    retiredAsDup: await col.countDocuments({ dupOf: { $exists: true }, ...gf }),
  })
}

export async function POST(request) {
  if (!authed(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const db = await connectDB()
  await ensureQHashIndex(db)

  if (body.mode === 'backfill') return backfill(db, body)
  if (body.mode === 'sweep') return sweep(db, body)
  if (body.mode === 'neardup') return nearDup(db, body)
  return NextResponse.json({ error: "mode must be 'backfill', 'sweep' or 'neardup'" }, { status: 400 })
}

// Stamp qHash onto active questions that don't have one yet.
async function backfill(db, { grade = null, limit = 500 }) {
  const col = db.collection('questions')
  const gf = gradeFilter(grade)
  const batch = await col.find({ active: { $ne: false }, qHash: { $exists: false }, ...gf })
    .project({ id: 1, skillId: 1, question: 1, correctAnswer: 1 })
    .limit(Math.min(limit, 2000)).toArray()

  let stamped = 0
  for (const q of batch) {
    await col.updateOne({ id: q.id }, { $set: { qHash: questionHash(q) } })
    stamped++
  }
  const remaining = await col.countDocuments({ active: { $ne: false }, qHash: { $exists: false }, ...gf })
  return NextResponse.json({ grade: grade ?? 'all', stamped, remaining })
}

// Exact-hash sweep: for each cluster of ≥2 active questions sharing a qHash, keep
// the highest-quality one and retire the rest (active:false, dupOf:<keptId>).
async function sweep(db, { grade = null, limit = 200 }) {
  const col = db.collection('questions')
  const gf = gradeFilter(grade)

  const clusters = await col.aggregate([
    { $match: { active: { $ne: false }, qHash: { $exists: true }, ...gf } },
    { $group: { _id: '$qHash', ids: { $push: '$id' }, n: { $sum: 1 } } },
    { $match: { n: { $gt: 1 } } },
    { $limit: Math.min(limit, 500) },
  ]).toArray()

  const out = { grade: grade ?? 'all', clusters: clusters.length, kept: 0, retired: 0, items: [] }

  for (const c of clusters) {
    const docs = await col.find({ id: { $in: c.ids } }).toArray()
    // Best = highest quality; tie-break on oldest (earliest createdAt = original).
    docs.sort((a, b) =>
      qualityScore(b) - qualityScore(a) ||
      new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
    )
    const keep = docs[0]
    const drop = docs.slice(1)
    out.kept++
    for (const d of drop) {
      await col.updateOne({ id: d.id }, {
        $set: { active: false, dupOf: keep.id, retiredAt: new Date(), retiredReason: 'exact-duplicate' },
      })
      out.retired++
    }
    out.items.push({ qHash: c._id, kept: keep.id, retired: drop.map(d => d.id) })
  }

  out.remainingClusters = (await col.aggregate([
    { $match: { active: { $ne: false }, qHash: { $exists: true }, ...gf } },
    { $group: { _id: '$qHash', n: { $sum: 1 } } },
    { $match: { n: { $gt: 1 } } },
    { $count: 'c' },
  ]).toArray())[0]?.c || 0
  return NextResponse.json(out)
}

// AI near-duplicate detection WITHIN one skill+grade. Sends the active questions
// for a skill to a model, which returns groups of semantically-equivalent
// questions (reworded twins the exact hash misses). We keep the best of each
// group and retire the rest. Cheap because it's scoped to one skill.
async function nearDup(db, { grade = null, skillId = null, limit = 60 }) {
  if (!process.env.OPENROUTER_API_KEY) return NextResponse.json({ error: 'OPENROUTER_API_KEY not set' }, { status: 503 })
  const col = db.collection('questions')
  const gf = gradeFilter(grade)

  // Pick the skill with the most active questions if none specified.
  if (!skillId) {
    const top = await col.aggregate([
      { $match: { active: { $ne: false }, nearDupCheckedAt: { $exists: false }, ...gf } },
      { $group: { _id: '$skillId', n: { $sum: 1 } } },
      { $sort: { n: -1 } }, { $limit: 1 },
    ]).toArray()
    skillId = top[0]?._id
    if (!skillId) return NextResponse.json({ grade: grade ?? 'all', skillId: null, done: true, groups: 0, retired: 0 })
  }

  const docs = await col.find({ active: { $ne: false }, skillId, ...gf })
    .project({ id: 1, question: 1, correctAnswer: 1, createdAt: 1, corrected: 1, verifierFlagged: 1, verifierScannedAt: 1, unverified: 1, visual: 1, active: 1 })
    .limit(Math.min(limit, 120)).toArray()

  if (docs.length < 2) {
    await col.updateMany({ skillId, ...gf }, { $set: { nearDupCheckedAt: new Date() } })
    return NextResponse.json({ grade: grade ?? 'all', skillId, groups: 0, retired: 0, note: 'too few' })
  }

  const numbered = docs.map((d, i) => `${i}: ${String(d.question).replace(/\s+/g, ' ').slice(0, 200)} [ans: ${d.correctAnswer}]`).join('\n')
  const prompt = [
    `These are maths questions from ONE skill. Group together any that are DUPLICATES — same underlying question even if reworded, same numbers/answer, or only trivially different. Different numbers or a genuinely different concept are NOT duplicates.`,
    `Return ONLY JSON: {"groups":[[indexes that duplicate each other], ...]}. Only include groups with 2+ members. If there are no duplicates, return {"groups":[]}.`,
    ``,
    numbered,
  ].join('\n')

  let groups = []
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', 'X-Title': 'MMH Near-Dup' },
      body: JSON.stringify({ model: 'anthropic/claude-haiku-4-5', max_tokens: 800, temperature: 0, messages: [{ role: 'user', content: prompt }] }),
    })
    const data = await res.json()
    const raw = (data.choices?.[0]?.message?.content || '').replace(/```(?:json)?/g, '')
    const m = raw.match(/\{[\s\S]*\}/)
    groups = m ? (JSON.parse(m[0]).groups || []) : []
  } catch {
    return NextResponse.json({ grade: grade ?? 'all', skillId, error: 'ai-failed', groups: 0, retired: 0 })
  }

  const out = { grade: grade ?? 'all', skillId, groups: 0, retired: 0, items: [] }
  for (const g of groups) {
    const members = (Array.isArray(g) ? g : []).map(i => docs[i]).filter(Boolean)
    if (members.length < 2) continue
    out.groups++
    members.sort((a, b) =>
      qualityScore(b) - qualityScore(a) ||
      new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
    )
    const keep = members[0]
    for (const d of members.slice(1)) {
      await col.updateOne({ id: d.id }, {
        $set: { active: false, dupOf: keep.id, retiredAt: new Date(), retiredReason: 'ai-near-duplicate' },
      })
      out.retired++
    }
    out.items.push({ kept: keep.id, retired: members.slice(1).map(d => d.id) })
  }

  // Mark this skill's questions checked so a "scan all" loop moves on.
  await col.updateMany({ skillId, ...gf }, { $set: { nearDupCheckedAt: new Date() } })
  out.remainingSkills = (await col.aggregate([
    { $match: { active: { $ne: false }, nearDupCheckedAt: { $exists: false }, ...gf } },
    { $group: { _id: '$skillId' } }, { $count: 'c' },
  ]).toArray())[0]?.c || 0
  return NextResponse.json(out)
}
