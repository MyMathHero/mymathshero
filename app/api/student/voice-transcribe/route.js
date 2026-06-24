import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import { getPlanFeatures } from '@/lib/planGating'
import { resolveEffectivePlan } from '@/lib/freeTrial'

export const runtime = 'nodejs'

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

// POST — transcribe a short voice clip so the student can TALK to Hero (report
// #6, speech-to-speech). Accepts multipart/form-data: `audio` (the recording) +
// `studentId`. Forwards to OpenAI Whisper (same provider/key as hero-voice TTS).
// Premium-gated like voice output.
export async function POST(request) {
  try {
    const form = await request.formData()
    const audio = form.get('audio')
    const studentId = form.get('studentId')

    if (!audio || typeof audio === 'string') {
      return NextResponse.json({ error: 'audio file required' }, { status: 400 })
    }

    // Plan gate — voice is a Premium feature (mirrors hero-voice + hint).
    if (studentId) {
      const db = await connectDB()
      const student = await db.collection('children').findOne({ id: studentId })
      const parent = student?.parentId
        ? await db.collection('parents').findOne({ id: student.parentId })
        : null
      const plan = parent ? resolveEffectivePlan(parent) : (student?.plan || 'free')
      if (!getPlanFeatures(plan).voiceExplanations) {
        return NextResponse.json({
          error: 'premium_required',
          message: 'Talking to Hero is a Premium feature.',
        }, { status: 403 })
      }
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'no key' }, { status: 503 })
    }

    // Re-pack into a form for OpenAI. Give the file a name+type Whisper accepts.
    const upstream = new FormData()
    const filename = (typeof audio.name === 'string' && audio.name) || 'speech.webm'
    upstream.append('file', audio, filename)
    upstream.append('model', 'whisper-1')
    upstream.append('language', 'en')          // students are English-speaking; improves accuracy + speed
    upstream.append('response_format', 'json')

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
      body: upstream,
    })

    if (!res.ok) {
      const err = await res.text().catch(() => '')
      console.error('Whisper error:', err.slice(0, 300))
      return NextResponse.json({ error: 'transcription failed' }, { status: 500 })
    }

    const data = await res.json()
    return NextResponse.json({ text: (data.text || '').trim() })
  } catch (error) {
    console.error('voice-transcribe error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
