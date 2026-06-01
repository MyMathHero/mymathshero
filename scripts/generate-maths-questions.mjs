/**
 * MyMathsHero — AI Maths Question Generator
 *
 * Generates AI questions (Claude Haiku via OpenRouter) for every Maths skill in
 * SKILL_ID_MAP that has fewer than MIN_THRESHOLD active questions. Inserts the
 * generated docs into the live questions collection.
 *
 * THIS WRITES TO PRODUCTION. Run only when you mean it.
 *
 * Usage:
 *   node scripts/generate-maths-questions.mjs                # all skills below threshold
 *   node scripts/generate-maths-questions.mjs --skill=m_3_add
 *   node scripts/generate-maths-questions.mjs --category=addition
 *   node scripts/generate-maths-questions.mjs --dry-run      # show plan, no API/DB writes
 */

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
    const value = rawValue.replace(/^["']|["']$/g, '')
    process.env[key] = value
  }
}
loadEnvLocal()

const TARGET_PER_SKILL = 20
const MIN_THRESHOLD = 10

if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI missing — set it in .env.local or the environment')
  process.exit(1)
}

const client = new MongoClient(process.env.MONGODB_URI)

const GRADE_LABELS = {
  0: 'Prep (Foundation)', 1: 'Year 1', 2: 'Year 2',
  3: 'Year 3', 4: 'Year 4', 5: 'Year 5', 6: 'Year 6',
}

function getGradeFromSkillId(skillId) {
  const match = skillId.match(/^m_(\d+)_/)
  return match ? parseInt(match[1], 10) : 3
}

function parseArg(name) {
  const arg = process.argv.find(a => a.startsWith(`--${name}=`))
  return arg ? arg.replace(`--${name}=`, '') : null
}

const DRY_RUN = process.argv.includes('--dry-run')

async function generateQuestionsForSkill(skillId, skillName, grade) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY missing — check .env.local')
  }

  const gradeLabel = GRADE_LABELS[grade] || `Year ${grade}`
  const prompt = `You are an expert Australian primary school Maths teacher.

Generate exactly 15 multiple choice questions for:
- Skill: ${skillName}
- Year Level: ${gradeLabel}
- Curriculum: Australian Curriculum (ACARA)

REQUIREMENTS:
- Questions must be clearly worded for ${gradeLabel} students
- Each question has exactly 4 options (A, B, C, D)
- Exactly 1 correct answer
- 3 distractors that reflect REAL mistakes students make
- Include a helpful hint (not the answer)
- Include a brief explanation
- Vary difficulty: 5 easy (0.2-0.4), 6 medium (0.5-0.7), 4 hard (0.7-0.9)
- Use Australian context (dollars, kilometres, Australian names)
- NO English, NO Science — pure Maths only

Return ONLY a valid JSON array. No markdown, no explanation, no preamble.

[
  {
    "question": "What is 23 + 45?",
    "options": ["68", "58", "78", "65"],
    "correctAnswer": "68",
    "difficulty": 0.3,
    "hint": "Try adding the tens first, then the ones.",
    "explanation": "23 + 45: add tens (20+40=60) then ones (3+5=8) to get 68."
  }
]`

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://mymathshero.com.au',
      'X-Title': 'MyMathsHero Question Generator',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-haiku-4-5',
      max_tokens: 4000,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenRouter ${response.status}: ${await response.text()}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ''
  const clean = content
    .replace(/^```json\s*/m, '')
    .replace(/^```\s*/m, '')
    .replace(/\s*```$/m, '')
    .trim()

  const parsed = JSON.parse(clean)
  if (!Array.isArray(parsed)) throw new Error('Model did not return an array')
  return parsed
}

async function saveQuestionsToDb(db, skillId, grade, questions) {
  const toInsert = questions
    .filter(q => q && q.question && Array.isArray(q.options) && q.correctAnswer)
    .map((q, i) => ({
      id: `${skillId}_ai_${Date.now()}_${i}`,
      skillId,
      subject: 'Maths',
      grade,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      difficulty: typeof q.difficulty === 'number' ? q.difficulty : 0.5,
      hint: q.hint || '',
      explanation: q.explanation || '',
      active: true,
      aiGenerated: true,
      needsReview: true,
      source: 'claude-haiku-4-5',
      createdAt: new Date(),
    }))

  if (toInsert.length === 0) return 0
  const result = await db.collection('questions').insertMany(toInsert)
  return result.insertedCount
}

async function main() {
  const specificSkill = parseArg('skill')
  const specificCategory = parseArg('category')

  await client.connect()
  const db = client.db(process.env.DB_NAME || 'mymathshero')

  console.log('\n🤖 MyMathsHero — AI Question Generator')
  console.log('='.repeat(60))
  console.log(`Target per skill: ${TARGET_PER_SKILL}`)
  console.log(`Generate if below: ${MIN_THRESHOLD}`)
  if (DRY_RUN) console.log('Mode: DRY RUN (no API calls, no DB writes)')
  console.log('')

  let skillIds = Object.keys(SKILL_ID_MAP).filter(id => id.startsWith('m_'))

  if (specificSkill) {
    skillIds = skillIds.filter(id => id === specificSkill)
    console.log(`Filter: skill=${specificSkill}\n`)
  } else if (specificCategory) {
    skillIds = skillIds.filter(id => SKILL_ID_MAP[id]?.category === specificCategory)
    console.log(`Filter: category=${specificCategory} (${skillIds.length} skills)\n`)
  }

  if (skillIds.length === 0) {
    console.log('No matching skills.')
    await client.close()
    return
  }

  let totalGenerated = 0
  let totalProcessed = 0
  let errors = 0

  for (const skillId of skillIds) {
    const skillInfo = SKILL_ID_MAP[skillId]
    if (!skillInfo) continue

    const grade = getGradeFromSkillId(skillId)
    const existing = await db.collection('questions').countDocuments({
      skillId,
      active: { $ne: false },
    })

    if (existing >= MIN_THRESHOLD && !specificSkill) {
      console.log(`  ⏭️  ${skillId.padEnd(22)} ${skillInfo.name}: ${existing} questions — skipping`)
      continue
    }

    const needed = TARGET_PER_SKILL - existing
    console.log(`  🔄 ${skillId.padEnd(22)} ${skillInfo.name}: ${existing} → +${needed}…`)

    if (DRY_RUN) {
      totalProcessed++
      continue
    }

    try {
      const questions = await generateQuestionsForSkill(skillId, skillInfo.name, grade)
      const saved = await saveQuestionsToDb(db, skillId, grade, questions)
      console.log(`     ✅ saved ${saved}`)
      totalGenerated += saved
      totalProcessed++
      await new Promise(r => setTimeout(r, 1000))
    } catch (err) {
      console.error(`     ❌ ${err.message}`)
      errors++
      await new Promise(r => setTimeout(r, 2000))
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log(`Skills processed:    ${totalProcessed}`)
  console.log(`Questions generated: ${totalGenerated}`)
  console.log(`Errors:              ${errors}`)
  if (DRY_RUN) console.log('(dry run — nothing was written)')
  console.log('')

  await client.close()
}

main().catch(err => {
  console.error('Generator failed:', err)
  process.exit(1)
})
