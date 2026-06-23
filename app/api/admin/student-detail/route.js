import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import { getSkillInfo } from '@/lib/skillNames'

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
    console.error('[admin/student-detail] ADMIN_API_KEY env var missing')
    return { ok: false, status: 500, error: 'Server misconfigured' }
  }
  if (request.headers.get('x-admin-key') !== expected) {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }
  return { ok: true }
}

// GET — full learning picture for ONE student for the admin panel (report §5):
// diagnostic status, AI placement, per-skill scores, and a daily accuracy trend.
export async function GET(request) {
  const auth = checkAdminKey(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 })

    const db = await connectDB()
    const student = await db.collection('children').findOne({ id: studentId })
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

    const [skillScores, events] = await Promise.all([
      db.collection('skill_scores').find({ studentId }).toArray(),
      db.collection('session_events')
        .find({ studentId })
        .project({ correct: 1, timestamp: 1, skillId: 1, _id: 0 })
        .sort({ timestamp: -1 })
        .limit(500)
        .toArray(),
    ])

    // Per-skill view with display names + how each score was set.
    const skills = skillScores
      .filter(s => String(s.skillId || '').startsWith('m_'))
      .map(s => ({
        skillId: s.skillId,
        name: getSkillInfo(s.skillId)?.name || s.skillId,
        score: Math.round(s.score ?? 0),
        mastered: !!s.mastered,
        placedByDiagnostic: !!s.placedByDiagnostic,
        feedbackBias: s.feedbackBias ?? 0,
        attempts: s.attempts ?? 0,
      }))
      .sort((a, b) => b.score - a.score)

    const totalCorrect = events.filter(e => e.correct).length
    const accuracy = events.length ? Math.round((totalCorrect / events.length) * 100) : 0

    // Daily accuracy trend (last 14 days) — performance over time.
    const byDay = {}
    for (const e of events) {
      if (!e.timestamp) continue
      const day = new Date(e.timestamp).toISOString().slice(0, 10)
      const d = byDay[day] || (byDay[day] = { total: 0, correct: 0 })
      d.total++
      if (e.correct) d.correct++
    }
    const trend = Object.entries(byDay)
      .map(([date, d]) => ({ date, total: d.total, accuracy: Math.round((d.correct / d.total) * 100) }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14)

    const masteredCount = skills.filter(s => s.mastered).length
    const avgScore = skills.length
      ? Math.round(skills.reduce((a, s) => a + s.score, 0) / skills.length)
      : 0

    return NextResponse.json({
      student: {
        id: student.id,
        name: student.name,
        username: student.username,
        grade: student.grade,
      },
      diagnostic: {
        complete: !!student.diagnosticComplete,
        date: student.diagnosticDate || null,
      },
      // AI placement (from the diagnostic, report §1) + any admin override.
      placement: student.placement || null,
      parentInsight: student.parentInsight || null,
      adminOverride: student.adminOverride || null,
      summary: { accuracy, totalQuestions: events.length, masteredCount, avgScore },
      skills,
      trend,
    })
  } catch (error) {
    console.error('[admin/student-detail]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
