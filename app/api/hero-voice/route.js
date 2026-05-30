import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { text } = await request.json()
    if (!text) {
      return NextResponse.json({ error: 'text required' }, { status: 400 })
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
        model: 'tts-1',
        voice: 'nova',
        input: clean,
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
