// Run with: node scripts/importQuestions.mjs
// Imports questions.json directly into MongoDB Atlas

import { MongoClient } from 'mongodb'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// ── CONFIG ──────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not set in environment')
  process.exit(1)
}
const DB_NAME = 'eduadapt'
const QUESTIONS_PATH = '/Users/darsh/ScrapperPY/files/question_bank/questions.json'

// ── IMPORT ──────────────────────────────────────────────
async function importQuestions() {
  console.log('📂 Loading questions.json...')
  const raw = readFileSync(QUESTIONS_PATH, 'utf-8')
  const questions = JSON.parse(raw)
  console.log(`   Found ${questions.length} questions`)

  console.log('\n🔌 Connecting to MongoDB Atlas...')
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  const db = client.db(DB_NAME)
  console.log('   Connected ✅')

  // Clear existing questions
  const existing = await db.collection('questions').countDocuments()
  if (existing > 0) {
    console.log(`\n⚠️  Found ${existing} existing questions — clearing...`)
    await db.collection('questions').deleteMany({})
  }

  // Transform and insert
  console.log('\n📥 Importing questions...')
  const transformed = questions.map(q => ({
    // Map from scraper format to our app format
    skillId:       q.skill_id,
    subject:       q.subject === 'Math' ? 'Maths' : q.subject, // Australian spelling
    grade:         parseInt(q.grade) || 0,
    question:      q.question,
    correctAnswer: q.answer,
    options:       buildOptions(q.answer, q.distractors),
    difficulty:    parseFloat(q.difficulty) || 0.5,
    hint:          q.hint || '',
    explanation:   q.explanation || '',
    source:        q.source || 'AI-Generated',
    strand:        q.skill_id?.split('_')[1] || 'General',
    needsReview:   q.needs_review === true || q.needs_review === 'True',
    active:        true,
    timesAnswered: 0,
    timesCorrect:  0,
    createdAt:     new Date(),
  }))

  // Insert in batches of 100
  const batchSize = 100
  let inserted = 0
  for (let i = 0; i < transformed.length; i += batchSize) {
    const batch = transformed.slice(i, i + batchSize)
    await db.collection('questions').insertMany(batch)
    inserted += batch.length
    process.stdout.write(`   Imported ${inserted}/${transformed.length}...\r`)
  }

  // Create indexes for fast queries
  console.log('\n\n🔧 Creating indexes...')
  await db.collection('questions').createIndex({ skillId: 1 })
  await db.collection('questions').createIndex({ grade: 1 })
  await db.collection('questions').createIndex({ subject: 1 })
  await db.collection('questions').createIndex({ difficulty: 1 })
  await db.collection('questions').createIndex({ active: 1 })
  console.log('   Indexes created ✅')

  // Stats
  console.log('\n📊 Import Summary:')
  const bySubject = await db.collection('questions').aggregate([
    { $group: { _id: '$subject', count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]).toArray()
  const byGrade = await db.collection('questions').aggregate([
    { $group: { _id: '$grade', count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]).toArray()

  console.log('\nBy Subject:')
  bySubject.forEach(s => console.log(`  ${s._id}: ${s.count} questions`))
  console.log('\nBy Grade:')
  byGrade.forEach(g => console.log(`  Grade ${g._id === 0 ? 'Prep' : g._id}: ${g.count} questions`))
  console.log(`\n✅ Total imported: ${inserted} questions`)

  await client.close()
}

// ── HELPERS ─────────────────────────────────────────────
function buildOptions(correctAnswer, distractorsRaw) {
  // Parse pipe-separated distractors
  const distractors = typeof distractorsRaw === 'string'
    ? distractorsRaw.split('|').map(d => d.trim()).filter(Boolean)
    : Array.isArray(distractorsRaw)
    ? distractorsRaw
    : []

  // Combine correct answer with distractors and shuffle
  const all = [correctAnswer, ...distractors.slice(0, 3)]
  return shuffleArray(all)
}

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── RUN ─────────────────────────────────────────────────
importQuestions().catch(err => {
  console.error('❌ Import failed:', err.message)
  process.exit(1)
})