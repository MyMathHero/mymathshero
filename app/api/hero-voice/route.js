import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
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
    const { text, studentId } = await request.json()
    if (!text) {
      return NextResponse.json({ error: 'text required' }, { status: 400 })
    }

    // Plan gate — premium TTS voice requires a Premium plan. When a studentId is
    // provided we resolve the plan from the parent (source of truth) → child.
    // Standard/free callers get a hard 403 (no premium-quality voice).
    if (studentId) {
      const db = await connectDB()
      const student = await db.collection('children').findOne({ id: studentId })
      const parent = student?.parentId
        ? await db.collection('parents').findOne({ id: student.parentId })
        : null
      const plan = parent?.plan || student?.plan || 'free'
      if (!getPlanFeatures(plan).voiceExplanations) {
        return NextResponse.json({
          error: 'premium_required',
          message: 'Voice explanations are a Premium feature.',
        }, { status: 403 })
      }
    }

    // No key configured → tell the client to fall back to browser TTS.
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'no key' }, { status: 503 })
    }

    const clean = text
      .replace(/[✦🤖🎯💪🎉😅🔥⚡🏆👋]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 300)

    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Newer, more natural model — supports `instructions` for accent/tone
        // steering (the older tts-1 ignores it).
        model: 'gpt-4o-mini-tts',
        voice: 'nova',
        input: clean,
        // Steer toward a warm Australian accent for Hero.
        instructions:
          'Speak with a friendly, natural Australian accent. You are Hero, an encouraging primary-school maths tutor for children. Warm, upbeat and clear, at a gentle pace.',
        speed: 0.95,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('OpenAI TTS error:', err)
      return NextResponse.json({ error: 'TTS failed' }, { status: 500 })
    }

    const audioBuffer = await res.arrayBuffer()
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
