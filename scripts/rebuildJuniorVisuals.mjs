// Rebuild the authored `visual` on every Junior (mode:'junior') question.
//
// WHY: an earlier eager cleanup (cleanStrayVisuals.mjs, which only recognises
// FRACTION visuals) unset the `visual` on all 316 junior questions — they are
// count/compare/shape/pattern/add/takeaway, none of which parse as fractions,
// so every one got wiped. On screen they then fell back to a text-derived
// visual, which is why an unrelated fraction diagram (the "3/2 shaded shape")
// kept reappearing across different questions.
//
// The originating operands weren't stored separately, but they ARE recoverable
// from the surviving fields (skillId + question text + options + correctAnswer),
// so this reconstructs a correct, self-consistent visual for each type. Output
// is validated with validateVisual() before writing — anything unrecoverable is
// left untouched and reported.
//
// Idempotent. Pass --dry to preview without writing.
//
// Run: node scripts/rebuildJuniorVisuals.mjs [--dry]
import { MongoClient } from 'mongodb'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { validateVisual } from '../lib/juniorQuestion.js'

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
const DRY = process.argv.includes('--dry')

const num = (s) => { const n = parseInt(String(s).replace(/\D/g, ''), 10); return Number.isFinite(n) ? n : null }

// Reasonable default emoji per skill so the picture is themed, not generic.
const ICON = {
  m_0_count5: '🍎', m_0_count10: '⭐', m_0_subitise: '🔵', m_0_numbermatch: '🎈',
  m_0_addto5: '🍎', m_1_add: '⚽', m_0_takeaway5: '🍪', m_1_sub: '🍬',
  m_0_biggersmaller: '🔵', m_0_morefewer: '🐟', m_0_size: '⭐', m_0_sorting: '🟡',
}
const PATTERN_FILLERS = ['⭐', '🔵', '🟡', '🔺', '❤️', '⚽']

// Build a visual for one doc, or null if unrecoverable.
function buildVisual(d) {
  const sid = d.skillId || ''
  const q = String(d.question || '')
  const icon = ICON[sid] || '🔵'

  // COUNT — "How many do you see?" → correctAnswer is the count.
  if (/how many/i.test(q)) {
    const n = num(d.correctAnswer)
    if (n != null && n >= 1) return { type: 'count', n, icon }
  }

  // ADD — "3 and 1 more?"
  let m = q.match(/(\d+)\s+and\s+(\d+)\s+more/i)
  if (m) return { type: 'add', a: num(m[1]), b: num(m[2]), icon }

  // TAKEAWAY — "2 take away 1?"
  m = q.match(/(\d+)\s+take\s*away\s+(\d+)/i)
  if (m) {
    const a = num(m[1]), b = num(m[2])
    if (a != null && b != null && b <= a) return { type: 'takeaway', a, b, icon }
  }

  // COMPARE — "Which has more?" / "Which has fewer?" → the two numeric options
  // are the two group sizes; ask = which one to tap.
  if (/which has (more|fewer|bigger|smaller)/i.test(q) || /^m_0_(biggersmaller|morefewer|size|sorting)$/.test(sid)) {
    const nums = (d.options || []).map(num).filter(v => v != null)
    if (nums.length >= 2) {
      const a = nums[0], b = nums[1]
      const wantsFewer = /fewer|smaller/i.test(q)
      return { type: 'compare', a, b, iconA: '🔵', iconB: '🔴', ask: wantsFewer ? 'fewer' : 'bigger' }
    }
  }

  // SHAPE — "What shape is this?" → correctAnswer names the shape.
  if (/what shape/i.test(q)) {
    return { type: 'shape', shape: String(d.correctAnswer || '').toLowerCase() }
  }

  // PATTERN — "What comes next?" The original sequence is lost, so build a
  // simple AB…AB run whose next element is exactly correctAnswer (answerable
  // and correct). Partner = first option that differs from the answer.
  if (/what comes next/i.test(q)) {
    const ans = String(d.correctAnswer || '')
    const partner = (d.options || []).find(o => o && o !== ans)
      || PATTERN_FILLERS.find(f => f !== ans) || '⭐'
    // AB AB A?  → next is B... so make answer land on the repeating slot:
    // sequence [ans, partner, ans, partner] → next = ans.
    if (ans) return { type: 'pattern', sequence: [ans, partner, ans, partner] }
  }

  return null
}

const client = new MongoClient(process.env.MONGODB_URI)
await client.connect()
const db = client.db(process.env.DB_NAME || 'mymathshero')
const col = db.collection('questions')

const docs = await col.find({ mode: 'junior', active: { $ne: false } }).toArray()
console.log(`\n🔧 Rebuilding junior visuals — ${docs.length} questions ${DRY ? '(DRY RUN)' : ''}`)

let ok = 0, skipped = 0, already = 0
const byType = {}
const unrecoverable = []
for (const d of docs) {
  if (d.visual && validateVisual(d.visual)) { already++; continue }
  const built = buildVisual(d)
  const valid = built && validateVisual(built)
  if (!valid) { skipped++; unrecoverable.push([d.skillId, d.id, d.question]); continue }
  byType[valid.type] = (byType[valid.type] || 0) + 1
  ok++
  if (!DRY) await col.updateOne({ _id: d._id }, { $set: { visual: valid } })
}

console.log(`\n✅ rebuilt : ${ok}`)
console.log(`   already valid : ${already}`)
console.log(`   ❌ unrecoverable : ${skipped}`)
console.log('   by type :', JSON.stringify(byType))
if (unrecoverable.length) {
  console.log('\n   unrecoverable samples:')
  unrecoverable.slice(0, 20).forEach(([sid, id, q]) =>
    console.log(`     ${String(sid).padEnd(20)} ${String(id).padEnd(30)} ${String(q).slice(0, 40)}`))
}
console.log(DRY ? '\n(DRY RUN — nothing written)\n' : '\nDone.\n')
await client.close()
