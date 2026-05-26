import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import { sendParentReport } from '@/lib/email'

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

export async function POST() {
  try {
    const db = await connectDB()

    // Fetch all students
    const students = await db.collection('children').find({}).toArray()

    if (students.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0, results: [], message: 'No students found' })
    }

    const results = []
    let sent = 0
    let failed = 0

    for (const student of students) {
      try {
        // Find parent
        const parent = await db.collection('parents').findOne({ id: student.parent_id })
        if (!parent) {
          results.push({ studentId: student.id, studentName: student.name, sent: false, reason: 'no_parent_found' })
          failed++
          continue
        }

        // Skill scores
        const skillScores = await db.collection('skill_scores').find({ studentId: student.id }).toArray()
        const masteredCount = skillScores.filter(s => s.mastered).length
        const skillsPractised = skillScores.filter(s => s.score > 0).map(s => s.skillId).slice(0, 6)

        // Recent activity (last 24h)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const recentEvents = await db.collection('session_events')
          .find({ studentId: student.id, timestamp: { $gte: oneDayAgo } })
          .toArray()

        const questionsAnswered = recentEvents.length
        const correctCount = recentEvents.filter(e => e.correct).length
        const accuracy = questionsAnswered > 0 ? Math.round((correctCount / questionsAnswered) * 100) : 0
        const coinsEarned = correctCount * 5 + (questionsAnswered - correctCount)

        const insights = accuracy >= 80
          ? `${student.name} had a fantastic session today with ${accuracy}% accuracy!`
          : accuracy >= 50
          ? `${student.name} is making solid progress with ${accuracy}% accuracy today.`
          : questionsAnswered === 0
          ? `${student.name} hasn't practised today — a gentle reminder might help!`
          : `${student.name} is working through some tricky material at ${accuracy}% accuracy.`

        const reportData = {
          date: new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }),
          questionsAnswered,
          accuracy,
          coinsEarned,
          skillsPractised,
          insights,
          weeklyStreak: student.streak || 0,
          masteredCount,
        }

        const result = await sendParentReport(parent.email, parent.name, student.name, reportData)

        // Log
        await db.collection('email_logs').insertOne({
          parentId: parent.id,
          studentId: student.id,
          type: 'daily_report',
          sentAt: new Date(),
          success: result.sent,
          reason: result.reason || null,
          messageId: result.messageId || null,
        })

        if (result.sent) {
          sent++
          results.push({ studentId: student.id, studentName: student.name, parentEmail: parent.email, sent: true })
        } else {
          failed++
          results.push({ studentId: student.id, studentName: student.name, sent: false, reason: result.reason })
        }
      } catch (err) {
        failed++
        results.push({ studentId: student.id, studentName: student.name, sent: false, reason: err.message })
      }
    }

    return NextResponse.json({ sent, failed, total: students.length, results })
  } catch (error) {
    console.error('Send all reports error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
