// One-off cleanup: remove/repair stored `visual` fields on questions whose
// wording does NOT actually describe a fraction diagram. Earlier backfills
// attached fraction bars too eagerly, so some non-fraction questions carried a
// stray diagram. This re-parses every question and:
//   • unsets `visual` when the text no longer parses to a fraction visual;
//   • overwrites `visual` when the re-parsed spec differs from the stored one.
// Idempotent — safe to run repeatedly. The serving routes also re-validate at
// runtime, so this just keeps the stored data clean.
//
// Run: node scripts/cleanStrayVisuals.mjs
import 'dotenv/config'
import { MongoClient } from 'mongodb'
import { parseFractionVisual } from '../lib/fractionVisual.js'

const client = new MongoClient(process.env.MONGODB_URI)
await client.connect()
const db = client.db(process.env.DB_NAME || 'mymathshero')

// IMPORTANT: only STANDARD (text) questions are considered. Junior questions
// (mode:'junior') carry an AUTHORED visual (count/compare/shape/pattern) that is
// NOT a fraction — running the fraction-only re-parse over them would unset every
// one (this already happened once; see scripts/rebuildJuniorVisuals.mjs). Never
// touch junior docs here.
const withVisual = await db.collection('questions')
  .find({ visual: { $ne: null, $exists: true }, mode: { $ne: 'junior' } })
  .toArray()
console.log(`Standard (non-junior) questions with a stored visual: ${withVisual.length}`)

let unset = 0, fixed = 0, kept = 0
for (const q of withVisual) {
  const valid = parseFractionVisual(q.question)
  if (!valid) {
    await db.collection('questions').updateOne({ _id: q._id }, { $unset: { visual: '' } })
    unset++
  } else if (JSON.stringify(valid) !== JSON.stringify(q.visual)) {
    await db.collection('questions').updateOne({ _id: q._id }, { $set: { visual: valid } })
    fixed++
  } else {
    kept++
  }
}

console.log(`✅ Done — unset ${unset} stray, repaired ${fixed}, kept ${kept} valid.`)
await client.close()
