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

export async function GET() {
  try {
    const db = await connectDB()

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [
      totalStudents,
      totalParents,
      totalTeachersApproved,
      totalTeachersPending,
      totalWaitlist,
      totalDemoRequests,
      totalQuestions,
      totalSessionsCompleted,
      recentWaitlist,
      pendingTeachers,
      recentDemoRequests,
      // Richer activity metrics for the console dashboard.
      answersToday,
      activeTodayIds,
      weeklyActiveIds,
      newThisWeek,
      masteredThisWeek,
      aiGenerated,
      emailsSent,
    ] = await Promise.all([
      db.collection('children').countDocuments(),
      db.collection('parents').countDocuments(),
      db.collection('teachers').countDocuments({ approved: true }),
      db.collection('teachers').countDocuments({ pending: true }),
      db.collection('waitlist').countDocuments(),
      db.collection('demo_requests').countDocuments(),
      db.collection('questions').countDocuments(),
      db.collection('sessions').countDocuments({ completed: true }),

      db.collection('waitlist')
        .find({}, { projection: { _id: 0, name: 1, email: 1, role: 1, created_at: 1 } })
        .sort({ created_at: -1 })
        .limit(10)
        .toArray(),

      db.collection('teachers')
        .find({ pending: true }, {
          projection: { _id: 0, id: 1, name: 1, school: 1, grade: 1, email: 1, created_at: 1 },
        })
        .sort({ created_at: 1 })
        .toArray(),

      db.collection('demo_requests')
        .find({}, {
          projection: { _id: 0, name: 1, school_name: 1, role: 1, email: 1, phone: 1, created_at: 1 },
        })
        .sort({ created_at: -1 })
        .limit(10)
        .toArray(),

      db.collection('session_events').countDocuments({ timestamp: { $gte: dayAgo } }),
      db.collection('session_events').distinct('studentId', { timestamp: { $gte: dayAgo } }),
      db.collection('session_events').distinct('studentId', { timestamp: { $gte: weekAgo } }),
      db.collection('children').countDocuments({ created_at: { $gte: weekAgo } }),
      db.collection('skill_scores').countDocuments({ mastered: true, updatedAt: { $gte: weekAgo } }),
      db.collection('questions').countDocuments({ aiGenerated: true }),
      db.collection('email_logs').countDocuments({ success: true }),
    ])

    return NextResponse.json({
      counts: {
        students: totalStudents,
        parents: totalParents,
        teachersApproved: totalTeachersApproved,
        teachersPending: totalTeachersPending,
        waitlist: totalWaitlist,
        demoRequests: totalDemoRequests,
        questions: totalQuestions,
        sessionsCompleted: totalSessionsCompleted,
      },
      // Flat activity fields the admin console reads directly.
      answersToday,
      activeToday: activeTodayIds.length,
      weeklyActive: weeklyActiveIds.length,
      newThisWeek,
      masteredThisWeek,
      aiGenerated,
      emailsSent,
      pendingTeachers,
      recentWaitlist,
      recentDemoRequests,
    })
  } catch (error) {
    console.error('Admin stats error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
