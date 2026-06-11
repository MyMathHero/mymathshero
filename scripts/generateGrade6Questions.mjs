// Bulk-generate Year 6 maths questions for all 31 Year 6 skills.
//
// WRITES TO PRODUCTION MONGO. Spends real OpenRouter tokens (Claude Haiku).
// Run only when ready. Expected cost: ~$1-3, ~10 minutes wallclock.
//
// Usage:
//   node scripts/generateGrade6Questions.mjs                # all 31 skills
//   node scripts/generateGrade6Questions.mjs --skill=m_6_percentages
//   node scripts/generateGrade6Questions.mjs --dry-run      # no API/DB writes

import { MongoClient } from 'mongodb'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { SKILL_ID_MAP } from '../lib/skillNames.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

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

const QUESTIONS_PER_SKILL = 20
const DRY_RUN = process.argv.includes('--dry-run')
const SKILL_FILTER = (process.argv.find(a => a.startsWith('--skill=')) || '').replace('--skill=', '')

// Source the Year 6 list from SKILL_ID_MAP so we never drift from the
// canonical skill list.
const GRADE_6_SKILLS = Object.entries(SKILL_ID_MAP)
  .filter(([id]) => id.startsWith('m_6_'))
  .map(([id, info]) => ({ id, name: info.name }))

const client = new MongoClient(process.env.MONGODB_URI)

async function generateForSkill(skill) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY missing — check .env.local')
  }
  const prompt = `Generate ${QUESTIONS_PER_SKILL} multiple choice maths questions for Australian Year 6 students about "${skill.name}".

Requirements:
- Appropriate difficulty for Year 6 (age 11-12)
- Clear, unambiguous questions
- Real-world context where possible
- Australian spelling (maths not math, metre not meter)
- Mix of easy (40%), medium (40%), hard (20%)

Return ONLY a valid JSON array. No other text, no markdown, no backticks.
Format:
[
  {
    "question": "Question text here?",
    "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
    "correctAnswer": "A) option1",
    "explanation": "Brief explanation of why this is correct",
    "hint": "A helpful hint without giving away the answer",
    "difficulty": 0.5
  }
]`

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://mymathshero.com.au',
      'X-Title': 'MyMathsHero Y6 Generator',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-haiku-4-5',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 6000,
      temperature: 0.7,
    }),
  })

  if (!res.ok) {
    throw new Error(`OpenRouter ${res.status}: ${await res.text()}`)
  }

  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content || ''
  const clean = content.replace(/```json/g, '').replace(/```/g, '').trim()
  const m = clean.match(/\[[\s\S]*\]/)
  if (!m) {
    throw new Error('No JSON array found in model output')
  }
  return JSON.parse(m[0])
}

async function run() {
  await client.connect()
  const db = client.db(process.env.DB_NAME || 'mymathshero')

  console.log('\n🤖 Year 6 Question Generator')
  console.log('='.repeat(60))
  console.log(`Skills:               ${GRADE_6_SKILLS.length}`)
  console.log(`Questions per skill:  ${QUESTIONS_PER_SKILL}`)
  if (DRY_RUN) console.log('Mode:                 DRY RUN (no API/DB writes)')
  if (SKILL_FILTER) console.log(`Filter:               --skill=${SKILL_FILTER}`)
  console.log('')

  const skills = SKILL_FILTER
    ? GRADE_6_SKILLS.filter(s => s.id === SKILL_FILTER)
    : GRADE_6_SKILLS

  if (skills.length === 0) {
    console.log('No matching skills.')
    await client.close()
    return
  }

  let totalInserted = 0
  let errors = 0

  for (const skill of skills) {
    console.log(`  ${skill.id.padEnd(28)} ${skill.name}`)
    if (DRY_RUN) continue
    try {
      const questions = await generateForSkill(skill)
      if (!Array.isArray(questions) || questions.length === 0) {
        console.log(`     ⚠️  no questions returned`)
        continue
      }

      const docs = questions
        .filter(q => q?.question && Array.isArray(q.options) && q.correctAnswer)
        .map((q, i) => ({
          id: `${skill.id}_ai_${Date.now()}_${i}`,
          skillId: skill.id,
          subject: 'Maths',
          grade: 6,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || '',
          hint: q.hint || '',
          difficulty: typeof q.difficulty === 'number' ? q.difficulty : 0.5,
          active: true,
          aiGenerated: true,
          needsReview: true,
          source: 'claude-haiku-4-5',
          createdAt: new Date(),
        }))

      if (docs.length > 0) {
        await db.collection('questions').insertMany(docs)
      }
      console.log(`     ✅ inserted ${docs.length}`)
      totalInserted += docs.length
      await new Promise(r => setTimeout(r, 2000))
    } catch (err) {
      console.error(`     ❌ ${err.message}`)
      errors++
      await new Promise(r => setTimeout(r, 3000))
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log(`Total inserted:       ${totalInserted}`)
  console.log(`Errors:               ${errors}`)
  if (!DRY_RUN) {
    const count = await db.collection('questions').countDocuments({ grade: 6 })
    console.log(`Grade 6 questions:    ${count} (after run)`)
  }
  await client.close()
}

run().catch(err => {
  console.error('Generator failed:', err)
  process.exit(1)
})
