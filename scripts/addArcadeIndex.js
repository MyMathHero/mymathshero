require('dotenv').config({ path: '.env.local' })
const { MongoClient } = require('mongodb')

async function addIndex() {
  const client = new MongoClient(process.env.MONGODB_URI)
  await client.connect()
  const db = client.db(process.env.DB_NAME || 'mymathshero')

  // Compound index for the daily-time query: find by studentId, ordered by
  // startedAt. Covers both the GET status sum and the heartbeat recompute.
  await db.collection('arcade_sessions').createIndex(
    { studentId: 1, startedAt: -1 },
    { name: 'student_date_lookup' }
  )

  // Note: heartbeat/end updates match on _id, which MongoDB already indexes by
  // default (the _id_ index). No extra index needed for those.

  const idx = await db.collection('arcade_sessions').indexes()
  console.log('✅ Arcade indexes:', idx.map(i => i.name).join(', '))
  await client.close()
}

addIndex().catch(err => {
  console.error('Index creation failed:', err.message)
  process.exit(1)
})
