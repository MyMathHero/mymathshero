import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

// Returns every student's profile + progress → admin-only. Gate on x-admin-key
// like the other sensitive admin routes (support, notifications, feedback).
function checkAdminKey(request) {
  const expected = process.env.ADMIN_API_KEY
  if (!expected) {
    console.error('[admin/students] ADMIN_API_KEY env var missing')
    return { ok: false, status: 500, error: 'Server misconfigured' }
  }
  if (request.headers.get('x-admin-key') !== expected) {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }
  return { ok: true }
}

export async function GET(request) {
  const auth = checkAdminKey(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  try {
    const db = await connectDB()
    const students = await db.collection('children')
      .find({})
      .sort({ created_at: -1 })
      .limit(200)
      .toArray()

    // Enrich each student with accuracy + mastery from their event/score history.
    const enriched = await Promise.all(students.map(async s => {
      const [skillScores, sessions] = await Promise.all([
        db.collection('skill_scores').find({ studentId: s.id }).toArray(),
        db.collection('session_events').find({ studentId: s.id }).toArray(),
      ])
      const correct = sessions.filter(e => e.correct).length
      const accuracy = sessions.length > 0
        ? Math.round((correct / sessions.length) * 100) : 0

      return {
        id: s.id,
        name: s.name,
        username: s.username,
        grade: s.grade,
        xp: s.xp || 0,
        coins: s.coins || 0,
        streak: s.streak || 0,
        type: s.type || 'private',
        accuracy,
        totalQuestions: sessions.length,
        skillsMastered: skillScores.filter(sc => sc.mastered).length,
        diagnosticComplete: s.diagnosticComplete || false,
        lastActive: s.lastActive || s.updatedAt || s.updated_at || null,
        createdAt: s.created_at || s.createdAt || null,
      }
    }))

    return NextResponse.json({ students: enriched })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
