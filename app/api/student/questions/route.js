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
    const skillId = searchParams.get('skillId')
    const limit = Math.min(parseInt(searchParams.get('limit') || '5', 10), 20)

    if (!skillId) {
      return NextResponse.json({ error: 'skillId is required' }, { status: 400 })
    }

    const db = await connectDB()

    const rawQuestions = await db.collection('questions')
      .find({ skillId, active: true })
      .limit(limit)
      .toArray()

    // Strip correctAnswer for security — validation happens server-side on POST /api/student/answer
    const questions = rawQuestions.map(({ correctAnswer, _id, ...rest }) => ({
      ...rest,
      questionId: rest.id || _id.toString(),
    }))

    return NextResponse.json({ questions })
  } catch (error) {
    console.error('Questions GET error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const questions = Array.isArray(body) ? body : body.questions

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'questions array is required' }, { status: 400 })
    }

    const db = await connectDB()

    const docs = questions.map(q => ({
      ...q,
      active: q.active !== undefined ? q.active : true,
      createdAt: new Date(),
    }))

    const result = await db.collection('questions').insertMany(docs)

    return NextResponse.json({
      success: true,
      insertedCount: result.insertedCount,
    }, { status: 201 })
  } catch (error) {
    console.error('Questions POST error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
