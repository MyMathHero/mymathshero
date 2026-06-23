import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import { buildLevelOverride } from '@/lib/placement'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

function checkAdminKey(request) {
  const expected = process.env.ADMIN_API_KEY
  if (!expected) {
    console.error('[admin/override-level] ADMIN_API_KEY env var missing')
    return { ok: false, status: 500, error: 'Server misconfigured' }
  }
  if (request.headers.get('x-admin-key') !== expected) {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }
  return { ok: true }
}

// POST — manual grade / learning-level override (report §5).
// Body: { studentId, grade?, level?, reason?, by? }
//
// We do NOT rewrite skill_scores. Changing `grade` re-runs the AI recommender
// against the new grade on the next answer/progress call, so AI recommendations
// are preserved (the report's explicit requirement). The override is recorded on
// the child as an audit trail and can be cleared by sending grade:null,level:null
// → handled by the caller; here we simply set what's provided.
export async function POST(request) {
  const auth = checkAdminKey(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const body = await request.json().catch(() => ({}))
    const { studentId } = body
    if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 })

    const db = await connectDB()
    const student = await db.collection('children').findOne({ id: studentId })
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

    const result = buildLevelOverride(body, { grade: student.grade })
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })

    const { gradeChange, override } = result
    const set = { adminOverride: override }
    // Enrolled grade override → update grade so the recommender follows it.
    if (gradeChange !== undefined) set.grade = gradeChange
    // Learning-level override → reflect on the placement estimate (non-destructive;
    // the engine still derives per-skill recs from skill_scores + grade).
    if (override.level !== undefined) {
      set['placement.estimatedGrade'] = override.level
      set['placement.source'] = 'admin'
      set['placement.overriddenAt'] = override.at
    }

    await db.collection('children').updateOne({ id: studentId }, { $set: set })

    // Tell the parent their child's level was adjusted (best-effort).
    const parentOwnerId = student.parentId ?? student.parent_id
    if (parentOwnerId) {
      try {
        const { createNotification } = await import('@/lib/notifications')
        await createNotification(db, {
          recipientId: parentOwnerId,
          type: 'progress',
          icon: '🛠️',
          title: `${student.name}'s level was updated`,
          body: `A teacher reviewed ${student.name}'s progress and adjusted their learning level.`,
          link: 'children',
        })
      } catch { /* notification is non-critical */ }
    }

    return NextResponse.json({ success: true, override, grade: set.grade ?? student.grade })
  } catch (error) {
    console.error('[admin/override-level]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
