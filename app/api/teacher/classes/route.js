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
    const teacherId = searchParams.get('teacherId')

    if (!teacherId) return NextResponse.json({ error: 'teacherId is required' }, { status: 400 })

    const db = await connectDB()

    const classes = await db.collection('classes')
      .find({ teacherId })
      .sort({ createdAt: -1 })
      .toArray()

    if (classes.length === 0) {
      return NextResponse.json({ classes: [] })
    }

    // Collect all student IDs across all classes
    const allStudentIds = [...new Set(classes.flatMap(c => c.students || []))]

    // Fetch scores for all students in one query
    const allScores = allStudentIds.length > 0
      ? await db.collection('skill_scores').find({ studentId: { $in: allStudentIds } }).toArray()
      : []

    // Group scores by studentId
    const scoresByStudent = {}
    for (const s of allScores) {
      if (!scoresByStudent[s.studentId]) scoresByStudent[s.studentId] = []
      scoresByStudent[s.studentId].push(s.score)
    }

    // Build class summaries
    const result = classes.map(cls => {
      const { _id, ...rest } = cls
      const studentIds = cls.students || []

      // Average SmartScore across all skills for all students in class
      let totalScore = 0
      let scoreCount = 0
      for (const sid of studentIds) {
        const scores = scoresByStudent[sid] || []
        const nonZero = scores.filter(s => s > 0)
        for (const s of nonZero) { totalScore += s; scoreCount++ }
      }
      const avgSmartScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0

      return {
        ...rest,
        studentCount: studentIds.length,
        avgSmartScore,
      }
    })

    return NextResponse.json({ classes: result })
  } catch (error) {
    console.error('Teacher classes error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
