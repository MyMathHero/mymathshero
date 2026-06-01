// Read-only audit of the questions collection — no writes, safe to rerun.
// Run: node scripts/check-questions.mjs

import { MongoClient } from 'mongodb'
import { SKILL_ID_MAP } from '../lib/skillNames.js'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Minimal .env.local loader (no dotenv dep). Loads only KEY=VALUE lines that
// aren't already set in process.env.
function loadEnvLocal() {
  const path = join(__dirname, '..', '.env.local')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/)
    if (!m) continue
    const [, key, rawValue] = m
    if (process.env[key]) continue
    const value = rawValue.replace(/^["']|["']$/g, '')
    process.env[key] = value
  }
}
loadEnvLocal()

if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI missing — set it in .env.local or the environment')
  process.exit(1)
}

const client = new MongoClient(process.env.MONGODB_URI)

async function main() {
  await client.connect()
  const db = client.db(process.env.DB_NAME || 'mymathshero')

  console.log('\n📊 Question Bank Audit')
  console.log('='.repeat(60))

  const skillIds = Object.keys(SKILL_ID_MAP)
  const results = []

  for (const skillId of skillIds) {
    const count = await db.collection('questions').countDocuments({
      skillId,
      subject: { $in: ['Maths', 'Mathematics', 'Math'] },
      active: { $ne: false },
    })
    const info = SKILL_ID_MAP[skillId]
    results.push({ skillId, name: info.name, category: info.category, count })
  }

  results.sort((a, b) => a.count - b.count)

  const missing = results.filter(r => r.count === 0)
  const thin = results.filter(r => r.count > 0 && r.count < 10)
  const good = results.filter(r => r.count >= 10)

  console.log('\n❌ Skills with 0 questions:')
  if (missing.length === 0) {
    console.log('  (none — every mapped skill has at least one question)')
  } else {
    missing.forEach(r => {
      console.log(`  ${r.skillId.padEnd(22)} — ${r.name} (${r.category})`)
    })
  }

  console.log('\n⚠️  Skills with < 10 questions:')
  if (thin.length === 0) {
    console.log('  (none)')
  } else {
    thin.forEach(r => {
      console.log(`  ${r.skillId.padEnd(22)} — ${r.name}: ${r.count} questions`)
    })
  }

  console.log('\n✅ Skills with 10+ questions:')
  console.log(`  ${good.length} skills meet the bar`)

  console.log('\n' + '='.repeat(60))
  console.log(`Missing:  ${missing.length}`)
  console.log(`Thin:     ${thin.length}`)
  console.log(`OK:       ${good.length}`)
  console.log(`Total:    ${results.length} mapped skills`)
  console.log('')

  await client.close()
}

main().catch(err => {
  console.error('Audit failed:', err)
  process.exit(1)
})
