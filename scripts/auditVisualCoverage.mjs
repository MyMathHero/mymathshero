// Read-only audit of visual coverage for young questions (Prep–Grade 3).
// No writes. Answers two questions:
//   1. JUNIOR questions (mode:'junior'): does every one still carry a VALID
//      authored `visual`? (A missing/invalid one = a blank picture on screen.)
//   2. STANDARD grade ≤3 questions: for each, would the serving route derive a
//      visual from the wording? Flags ones that *describe* a shape/fraction/
//      count but derive nothing ("needs a picture but won't get one").
//
// Run: node scripts/auditVisualCoverage.mjs
import { MongoClient } from 'mongodb'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { validateVisual } from '../lib/juniorQuestion.js'
import { parseFractionVisual } from '../lib/fractionVisual.js'

// Inline copy of deriveVisual's "can we draw something?" test. (deriveVisual.js
// uses extensionless imports meant for the Next bundler, so we don't import it
// under raw Node ESM.) This mirrors lib/deriveVisual.js closely enough for a
// coverage audit — it returns true when the wording yields a fraction / shape /
// equation / count picture for grade ≤3.
const MAX_DRAW = 20
const SHAPE_WORDS = ['circle', 'square', 'triangle', 'rectangle', 'star', 'heart', 'oval', 'diamond', 'pentagon', 'hexagon']
function deriveDraws(question, grade) {
  const g = Number(grade)
  if (!Number.isFinite(g) || g > 3) return !!parseFractionVisual(question)
  const t = String(question || '')
  if (!t.trim()) return false
  if (parseFractionVisual(t)) return true
  const shapeM = SHAPE_WORDS.find(s => new RegExp(`\\b${s}s?\\b`, 'i').test(t))
  if (shapeM && /\b(shape|sides?|corners?|vertic|angle)\b/i.test(t)) return true
  const eq = t.match(/(\d+)\s*([+\-−×x*÷/])\s*(\d+)/)
  if (eq) return true
  if (/how many/i.test(t)) {
    const nums = (t.match(/\d+/g) || []).map(Number).filter(n => n >= 0 && n <= MAX_DRAW)
    if (nums.length === 1 && nums[0] >= 1) return true
    if (nums.length === 2 && /\b(more|altogether|in all|total|combined|join|both|gets?|added?|left|gave away|ate|lost|removed?|takes? away|fewer|remain)\b/i.test(t)) return true
  }
  return false
}

const __dirname = dirname(fileURLToPath(import.meta.url))
function loadEnvLocal() {
  const path = join(__dirname, '..', '.env.local')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/)
    if (!m || process.env[m[1]]) continue
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
loadEnvLocal()
if (!process.env.MONGODB_URI) { console.error('❌ MONGODB_URI missing'); process.exit(1) }

// Wording that IMPLIES a picture is needed but where deriveVisual may draw nothing.
const VISUAL_WORDS = /\b(shaded|coloured|colored|shape|triangle|circle|square|rectangle|pentagon|hexagon|diagram|picture|graph|below|shown|figure|pattern|array|grid)\b/i

const client = new MongoClient(process.env.MONGODB_URI)
await client.connect()
const db = client.db(process.env.DB_NAME || 'mymathshero')
const col = db.collection('questions')

console.log('\n📊 Visual Coverage Audit (Prep–Grade 3)')
console.log('='.repeat(64))

// ── 1. JUNIOR questions ────────────────────────────────────────────────
const junior = await col.find({ mode: 'junior', active: { $ne: false } }).toArray()
let jNoVisual = 0, jBadVisual = 0
const jBadSamples = []
for (const q of junior) {
  if (!q.visual) { jNoVisual++; jBadSamples.push(['NO visual', q.id, q.question]); continue }
  if (!validateVisual(q.visual)) { jBadVisual++; jBadSamples.push(['INVALID visual', q.id, q.question]) }
}
console.log(`\n🎨 Junior (visual) questions: ${junior.length}`)
console.log(`   ✅ valid authored visual : ${junior.length - jNoVisual - jBadVisual}`)
console.log(`   ❌ missing visual        : ${jNoVisual}`)
console.log(`   ⚠️  invalid visual        : ${jBadVisual}`)
if (jBadSamples.length) {
  console.log('   — samples:')
  jBadSamples.slice(0, 15).forEach(([why, id, text]) =>
    console.log(`     [${why}] ${String(id).padEnd(28)} ${String(text).slice(0, 50)}`))
}

// ── 2. STANDARD grade ≤3 questions ─────────────────────────────────────
const standard = await col.find({
  mode: { $ne: 'junior' },
  grade: { $in: [0, 1, 2, 3, '0', '1', '2', '3', 'Prep'] },
  active: { $ne: false },
}).toArray()

let derives = 0, noDerivesButNeeds = 0
const needsSamples = []
for (const q of standard) {
  const g = Number(q.grade)
  const gradeNum = Number.isFinite(g) ? g : 3
  if (deriveDraws(q.question, gradeNum)) { derives++; continue }
  if (VISUAL_WORDS.test(q.question || '')) {
    noDerivesButNeeds++
    needsSamples.push([q.id, q.question])
  }
}
console.log(`\n📝 Standard grade ≤3 questions: ${standard.length}`)
console.log(`   ✅ a visual is drawn from the wording        : ${derives}`)
console.log(`   ⚠️  wording implies a picture but none drawn : ${noDerivesButNeeds}`)
if (needsSamples.length) {
  console.log('   — samples (question asks for a picture the text can\'t supply):')
  needsSamples.slice(0, 25).forEach(([id, text]) =>
    console.log(`     ${String(id).padEnd(28)} ${String(text).slice(0, 60)}`))
}

console.log('\n' + '='.repeat(64))
console.log('Junior missing/invalid visual :', jNoVisual + jBadVisual)
console.log('Standard "needs but no draw"   :', noDerivesButNeeds)
console.log('')
await client.close()
