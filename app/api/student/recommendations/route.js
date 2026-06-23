import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import { getRecommendations, getEffectiveCeiling } from '@/lib/recommender'

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

    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 })
    }

    const db = await connectDB()

    const student = await db.collection('children').findOne({ id: studentId })
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const skillScores = await db.collection('skill_scores').find({ studentId }).toArray()
    const scoreMap = {}
    skillScores.forEach(s => { scoreMap[s.skillId] = s.score })

    // Serve at the student's effective grade — lifted by mastery progression or
    // the AI's diagnostic estimate so advanced students get above-grade work.
    const effectiveGrade = getEffectiveCeiling(student.grade || 3, scoreMap, {
      placementFloor: student?.placement?.estimatedGrade ?? 0,
    })
    const recommendations = getRecommendations(effectiveGrade, scoreMap, 5)

    return NextResponse.json({ recommendations })
  } catch (error) {
    console.error('Recommendations error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
