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

export async function POST(request) {
  try {
    const { parentId, studentId } = await request.json()

    if (!parentId || !studentId) {
      return NextResponse.json({ error: 'parentId and studentId are required' }, { status: 400 })
    }

    const db = await connectDB()

    // 1. Fetch parent
    const parent = await db.collection('parents').findOne({ id: parentId })
    if (!parent) {
      return NextResponse.json({ error: 'Parent not found' }, { status: 404 })
    }

    // 2. Fetch student
    const student = await db.collection('children').findOne({ id: studentId })
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Ownership check: this parent must own this child.
    const ownerId = student.parentId ?? student.parent_id
    if (ownerId !== parentId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // 3. Fetch skill scores
    const skillScores = await db.collection('skill_scores').find({ studentId }).toArray()
    const masteredCount = skillScores.filter(s => s.mastered).length
    const skillsPractised = skillScores
      .filter(s => s.score > 0)
      .map(s => s.skillId)
      .slice(0, 6)

    // 4. Fetch recent session events (last 24 hours for daily report)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentEvents = await db.collection('session_events')
      .find({ studentId, timestamp: { $gte: oneDayAgo } })
      .toArray()

    const questionsAnswered = recentEvents.length
    const correctCount = recentEvents.filter(e => e.correct).length
    const accuracy = questionsAnswered > 0
      ? Math.round((correctCount / questionsAnswered) * 100)
      : 0

    // 5. Coins earned today (approximate from XP events — use student's total coins as fallback)
    const coinsEarned = correctCount * 5 + (questionsAnswered - correctCount)

    // 6. Build insight string
    const insights = accuracy >= 80
      ? `${student.name} had a fantastic session today! With ${accuracy}% accuracy, they're really nailing it. Keep the momentum going!`
      : accuracy >= 50
      ? `${student.name} is making solid progress. With ${accuracy}% accuracy today, there's a great foundation to build on.`
      : questionsAnswered === 0
      ? `${student.name} hasn't practised today yet — a gentle reminder might help keep the streak alive!`
      : `${student.name} is working through some tricky material. ${accuracy}% accuracy shows they're trying hard — encourage them to keep going!`

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

    // 7. Send email
    const result = await sendParentReport(parent.email, parent.name, student.name, reportData)

    // 8. Log the attempt
    await db.collection('email_logs').insertOne({
      parentId,
      studentId,
      type: 'daily_report',
      sentAt: new Date(),
      success: result.sent,
      reason: result.reason || null,
      messageId: result.messageId || null,
    })

    return NextResponse.json({
      sent: result.sent,
      message: result.sent
        ? `Report sent to ${parent.email}`
        : `Email not sent: ${result.reason}`,
    })
  } catch (error) {
    console.error('Send report error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
