import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import { getRequestToken, verifyToken } from '@/lib/auth'
import { getPlanFeatures } from '@/lib/planGating'
import { resolveEffectivePlan } from '@/lib/freeTrial'
import { parseLesson, fallbackLesson } from '@/lib/heroLesson'

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

// Build the structured-lesson prompt. The "Teach Me" lesson teaches the METHOD on
// a DIFFERENT but similar example — it must NOT solve or reveal the student's
// actual question (that would hand them the answer). It also returns a separate
// multiple-choice PRACTICE example for the student to attempt afterwards.
function buildLessonPrompt({ studentName, grade, questionText, skillId }) {
  return [
    `You are Hero, a warm Australian primary maths teacher creating a short animated whiteboard lesson for ${studentName} (Year ${grade}).`,
    `The student is stuck on THIS question (their real homework — do NOT solve it for them):`,
    `"${questionText}"`,
    ``,
    `Your job is to teach the METHOD using a DIFFERENT, SIMILAR example, then give them a fresh example to try.`,
    `CRITICAL: never use the same numbers as the student's question, and never state or compute the student's actual answer. Pick your own similar numbers.`,
    ``,
    `Return ONLY JSON (no prose, no code fences) in this exact shape:`,
    `{"steps":[{"say":"<one short spoken sentence>","write":"<one line of working on the board>","emphasis":"step"}, ...],"manipulative":null,"example":{"question":"<a new similar question>","options":["<opt>","<opt>","<opt>","<opt>"],"correctAnswer":"<the exactly-correct option text>","hint":"<one encouraging hint>"}}`,
    ``,
    `Rules for "steps" (the worked lesson — on YOUR similar example, NOT the student's):`,
    `- 3 to 6 steps. Each step adds ONE idea or line of working.`,
    `- "say" is what Hero speaks aloud: short, warm, age-appropriate, one sentence. Occasional emoji ok.`,
    `- "write" is the maths line shown on the whiteboard (plain text, e.g. "7 × 7 = 49"). May be empty for a purely spoken step.`,
    `- Build up the working; the FINAL step's "write" is the answer TO YOUR EXAMPLE, with "emphasis":"result".`,
    `- Optionally set "manipulative" to "pizza" (fractions), "numberline" (add/subtract), or "tenframe" (counting), else null.`,
    ``,
    `Rules for "example" (a SECOND similar question for the student to try — different numbers again):`,
    `- Same skill and difficulty as the student's question, but different numbers from BOTH the question and your worked example.`,
    `- Exactly 4 plain-text options; "correctAnswer" must be one of them, byte-for-byte.`,
    `- Keep it genuinely at the student's level. "hint" is one short encouraging sentence (do not reveal the answer).`,
    ``,
    `Do NOT restate these instructions. Output JSON only.`,
  ].join('\n')
}

async function callOpenRouter(prompt) {
  if (!process.env.OPENROUTER_API_KEY) return null
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_BASE_URL || 'https://mymathshero.com.au',
        'X-Title': 'MyMathsHero Lesson',
      },
      body: JSON.stringify({
        // Strongest model for teaching quality — one lesson per "Teach Me" tap.
        model: 'anthropic/claude-opus-4-8',
        max_tokens: 900,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error(`[lesson] OpenRouter ${res.status}: ${detail.slice(0, 200)}`)
      return null
    }
    const data = await res.json()
    return data.choices?.[0]?.message?.content?.trim() || null
  } catch (err) {
    console.error('[lesson] OpenRouter threw:', err.message)
    return null
  }
}

export async function POST(request) {
  const token = getRequestToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload || payload.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { questionText, questionId, skillId, studentId, grade } = await request.json()
    if (!questionText) {
      return NextResponse.json({ error: 'questionText is required' }, { status: 400 })
    }

    const sid = studentId || payload.userId
    const db = await connectDB()
    const student = await db.collection('children').findOne({ id: sid })
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

    // Plan gate — same as Ask Hero (Premium feature).
    const parent = student.parentId
      ? await db.collection('parents').findOne({ id: student.parentId })
      : null
    const plan = parent ? resolveEffectivePlan(parent) : (student?.plan || 'free')
    if (!getPlanFeatures(plan).askHero) {
      return NextResponse.json({
        upgrade: true,
        message: 'Teach Me is a Premium feature 💎 Upgrade to unlock animated lessons!',
      }, { status: 403 })
    }

    // The question doc gives us a guaranteed fallback (hint/explanation).
    const questionDoc = questionId
      ? await db.collection('questions').findOne({ id: questionId })
      : null

    const prompt = buildLessonPrompt({
      studentName: student.name || 'Hero',
      grade: grade ?? student.grade ?? 3,
      questionText,
      skillId,
    })
    const raw = await callOpenRouter(prompt)
    const lesson = (raw && parseLesson(raw, { questionText })) || fallbackLesson({
      questionText,
      hint: questionDoc?.hint,
      explanation: questionDoc?.explanation,
    })

    return NextResponse.json({ lesson })
  } catch (error) {
    console.error('Lesson error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
