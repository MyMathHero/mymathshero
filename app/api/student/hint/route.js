import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import { getPlanFeatures } from '@/lib/planGating'

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
    const { studentId, skillId, questionId, question, attemptNumber = 1, behaviour = 'unknown' } = await request.json()

    if (!studentId || !skillId || !question) {
      return NextResponse.json({ error: 'studentId, skillId, and question are required' }, { status: 400 })
    }

    const db = await connectDB()

    // Plan gate — Ask Hero (AI hints) requires Premium. Plan is read from the
    // parent record (source of truth), falling back to the child record.
    const student = await db.collection('children').findOne({ id: studentId })
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }
    const parent = student.parentId
      ? await db.collection('parents').findOne({ id: student.parentId })
      : null
    const plan = parent?.plan || student?.plan || 'free'
    if (!getPlanFeatures(plan).askHero) {
      return NextResponse.json({
        error: 'premium_required',
        message: 'Ask Hero is a Premium feature.',
        upgradeUrl: '/subscribe',
      }, { status: 403 })
    }

    // Mark hintUsed on the active session
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000)
    await db.collection('sessions').updateOne(
      { studentId, completed: { $ne: true }, startedAt: { $gte: thirtyMinsAgo } },
      { $set: { hintUsed: true } }
    )

    // Try AI hint first
    if (process.env.OPENROUTER_API_KEY) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
            'X-Title': 'MyMathsHero',
          },
          body: JSON.stringify({
            model: 'anthropic/claude-haiku-4-5',
            messages: [
              {
                role: 'system',
                content: 'You are a friendly, encouraging primary school tutor helping Australian students aged 5-11. Give a SHORT hint (max 2 sentences) that guides the student toward the answer without giving it away. Use simple language appropriate for their grade level. Be warm and encouraging.',
              },
              {
                role: 'user',
                content: `Subject skill: ${skillId}. Question: ${question}. The student has attempted this ${attemptNumber} time${attemptNumber !== 1 ? 's' : ''}. Their behaviour pattern is ${behaviour}. Give a helpful hint.`,
              },
            ],
            max_tokens: 100,
            temperature: 0.7,
          }),
        })

        if (response.ok) {
          const aiData = await response.json()
          const hint = aiData.choices?.[0]?.message?.content?.trim()
          if (hint) {
            return NextResponse.json({ hint, source: 'ai' })
          }
        }
      } catch (aiError) {
        console.warn('OpenRouter call failed, falling back:', aiError.message)
      }
    }

    // Fallback: use hint stored in the question document
    if (questionId) {
      const questionDoc = await db.collection('questions').findOne({ id: questionId })
      if (questionDoc?.hint) {
        return NextResponse.json({ hint: questionDoc.hint, source: 'fallback' })
      }
    }

    return NextResponse.json({
      hint: "Think carefully about what you already know — you've got this! Try breaking the problem into smaller steps.",
      source: 'fallback',
    })
  } catch (error) {
    console.error('Hint error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
