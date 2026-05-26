import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

function generateJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I to avoid confusion
  let code = ''
  for (let i = 0; i < 6; i++) {
    if (i === 2) code += '-'
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code // e.g. AB-C3D4
}

export async function POST(request) {
  try {
    const { teacherId, className, grade, year } = await request.json()

    if (!teacherId) return NextResponse.json({ error: 'teacherId is required' }, { status: 400 })
    if (!className?.trim()) return NextResponse.json({ error: 'className is required' }, { status: 400 })
    if (grade == null) return NextResponse.json({ error: 'grade is required' }, { status: 400 })

    const db = await connectDB()

    // Generate a unique join code
    let joinCode
    let attempts = 0
    do {
      joinCode = generateJoinCode()
      const existing = await db.collection('classes').findOne({ joinCode })
      if (!existing) break
      attempts++
    } while (attempts < 10)

    const classDoc = {
      id: uuidv4(),
      teacherId,
      className: className.trim(),
      grade: Number(grade),
      year: year ?? new Date().getFullYear(),
      joinCode,
      students: [],
      createdAt: new Date(),
    }

    await db.collection('classes').insertOne(classDoc)

    return NextResponse.json({
      class: {
        id: classDoc.id,
        className: classDoc.className,
        grade: classDoc.grade,
        year: classDoc.year,
        joinCode: classDoc.joinCode,
        students: [],
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Create class error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
