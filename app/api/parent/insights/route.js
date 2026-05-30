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

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const parentId = searchParams.get('parentId')
    if (!studentId) {
      return NextResponse.json({ error: 'studentId required' }, { status: 400 })
    }

    const db = await connectDB()

    // Verify parent owns this student (supports new parentId + legacy parent_id).
    const student = await db.collection('children').findOne({ id: studentId })
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }
    if (parentId) {
      const ownerId = student.parentId ?? student.parent_id
      if (ownerId !== parentId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Recent session activity (last 7 days) + all skill scores.
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const [recentSessions, skillScores] = await Promise.all([
      db.collection('session_events')
        .find({ studentId, timestamp: { $gte: sevenDaysAgo } })
        .sort({ timestamp: -1 })
        .limit(200)
        .toArray(),
      db.collection('skill_scores').find({ studentId }).toArray(),
    ])

    const todayStr = new Date().toDateString()
    const totalToday = recentSessions.filter(
      s => new Date(s.timestamp).toDateString() === todayStr
    ).length

    const accuracy = recentSessions.length > 0
      ? Math.round((recentSessions.filter(s => s.correct).length / recentSessions.length) * 100)
      : 0

    const mastered = skillScores.filter(s => s.mastered || s.score >= 80).length

    const stats = {
      totalToday,
      accuracy,
      mastered,
      streak: student.streak || 0,
    }

    // Fallback insight used when AI is unavailable or errors.
    const fallback = totalToday > 0
      ? `${student.name} answered ${totalToday} question${totalToday === 1 ? '' : 's'} today with ${accuracy}% accuracy and has mastered ${mastered} skill${mastered === 1 ? '' : 's'}. Keep encouraging daily practice to build strong maths foundations.`
      : `${student.name} hasn't practised yet today. A short session keeps the ${stats.streak}-day streak alive and builds strong maths foundations.`

    let insight = fallback

    if (process.env.OPENROUTER_API_KEY) {
      try {
        const prompt = `You are Hero, a friendly AI maths tutor. Write a short 2-sentence daily insight for a parent about their child ${student.name} (Grade ${student.grade}).

Today's data:
- Questions answered today: ${totalToday}
- Overall accuracy: ${accuracy}%
- Skills mastered: ${mastered}
- Streak: ${stats.streak} days

Be positive, specific and encouraging. Mention one strength and one area to focus on. Keep it under 50 words. Write directly to the parent.`

        const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
            'X-Title': 'MyMathsHero',
          },
          body: JSON.stringify({
            model: 'anthropic/claude-sonnet-4-5',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 120,
            temperature: 0.6,
          }),
        })
        if (aiRes.ok) {
          const aiData = await aiRes.json()
          const text = aiData.choices?.[0]?.message?.content?.trim()
          if (text) insight = text
        }
      } catch (aiErr) {
        console.warn('[parent insights] AI failed, using fallback:', aiErr.message)
      }
    }

    return NextResponse.json({
      insight,
      stats,
      student: { name: student.name, grade: student.grade, avatar: student.avatar },
    })
  } catch (error) {
    console.error('Parent insights error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
