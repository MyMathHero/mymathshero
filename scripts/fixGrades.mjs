// Migrate historical grade values to the canonical integer form.
//
// What this script DOES write:
//   • children docs whose `grade` is a non-integer (string 'Year 4', float 3.5)
//     are coerced to an integer 0–6.
//   • children docs whose `grade` is currently a valid integer are left alone.
//   • questions docs whose `grade` is a STRING are coerced via normaliseGrade.
//
// What this script does NOT write:
//   • questions with `grade: null`. We can't know what subject those are about
//     without inspecting each one — they get a printed report at the end so a
//     human can review and re-stamp them manually.
//
// Run:  node scripts/fixGrades.mjs

import { MongoClient } from 'mongodb'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { normaliseGrade } from '../lib/normaliseGrade.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Minimal .env.local loader (no dotenv dep) — matches our other scripts.
function loadEnvLocal() {
  const path = join(__dirname, '..', '.env.local')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/)
    if (!m) continue
    const [, key, rawValue] = m
    if (process.env[key]) continue
    process.env[key] = rawValue.replace(/^["']|["']$/g, '')
  }
}
loadEnvLocal()

if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI missing — check .env.local')
  process.exit(1)
}

const client = new MongoClient(process.env.MONGODB_URI)

async function main() {
  await client.connect()
  const db = client.db(process.env.DB_NAME || 'mymathshero')

  console.log('\n🔧 Grade migration\n' + '='.repeat(50))

  // ── 1. Children ─────────────────────────────────────────────────────────
  const children = await db.collection('children').find({}).toArray()
  let childFixed = 0
  for (const child of children) {
    const current = child.grade
    const isAlreadyInt = typeof current === 'number' && Number.isInteger(current) && current >= 0 && current <= 6
    if (isAlreadyInt) continue
    const fixed = normaliseGrade(current)
    await db.collection('children').updateOne(
      { _id: child._id },
      { $set: { grade: fixed } }
    )
    console.log(`  child "${child.name}" (${child.id}): ${JSON.stringify(current)} → ${fixed}`)
    childFixed++
  }
  console.log(`✅ Children fixed: ${childFixed} of ${children.length}`)

  // ── 2. Questions with STRING grade ──────────────────────────────────────
  const stringGradeQuestions = await db.collection('questions')
    .find({ grade: { $type: 'string' } })
    .toArray()
  let qStringFixed = 0
  for (const q of stringGradeQuestions) {
    const fixed = normaliseGrade(q.grade)
    await db.collection('questions').updateOne(
      { _id: q._id },
      { $set: { grade: fixed } }
    )
    qStringFixed++
  }
  console.log(`✅ Questions with string grade fixed: ${qStringFixed}`)

  // ── 3. NULL-grade questions — REPORT ONLY ──────────────────────────────
  // Per review decision: we do NOT mass-stamp these to grade 3. A blunt fix
  // could mis-categorise Year 6 questions as Year 3. Instead, we print what
  // they are so a human can decide.
  const nullGradeQs = await db.collection('questions')
    .find({ grade: null }, {
      projection: { id: 1, skillId: 1, question: 1, _id: 0 },
    })
    .toArray()

  console.log(`\n⚠️  Questions with grade=null (NOT modified): ${nullGradeQs.length}`)
  if (nullGradeQs.length > 0) {
    console.log('   Review these manually and stamp the correct grade:')
    nullGradeQs.forEach((q, i) => {
      const preview = (q.question || '').slice(0, 80)
      console.log(`   ${i + 1}. id=${q.id || '(no id)'} skill=${q.skillId || '(none)'} — "${preview}…"`)
    })
    console.log('\n   To stamp them all to Year N after review:')
    console.log('   db.questions.updateMany({ grade: null }, { $set: { grade: N } })')
  }

  console.log('\n' + '='.repeat(50))
  console.log('Migration complete.')
  console.log(`Children fixed:     ${childFixed}`)
  console.log(`Questions fixed:    ${qStringFixed}`)
  console.log(`Null questions:     ${nullGradeQs.length}  (review only, not modified)`)

  await client.close()
}

main().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
