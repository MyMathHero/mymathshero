import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import { getRequestToken, verifyToken } from '@/lib/auth'
import { getPlanFeatures } from '@/lib/planGating'
import { normaliseManipulative } from '@/lib/manipulatives'
import { resolveEffectivePlan } from '@/lib/freeTrial'

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

// Patterns checked ONLY against the newest user message (not the whole history).
const JAILBREAK_PATTERNS = [
  'ignore your instructions', 'ignore all instructions', 'ignore previous',
  'pretend you are', 'pretend to be', 'act as', 'you are now',
  'forget your rules', 'forget everything', 'new persona',
  'disregard', 'override', 'system prompt',
  'dan mode', 'developer mode', 'jailbreak',
]

const OFF_TOPIC_KEYWORDS = [
  'fortnite', 'minecraft', 'roblox', 'tiktok', 'instagram', 'snapchat',
  'facebook', 'youtube', 'netflix', 'violence', 'kill', 'fight', 'weapon',
  'girlfriend', 'boyfriend', 'dating', 'sex', 'drugs', 'alcohol',
  'password', 'credit card', 'address', 'phone number',
]

const DAILY_MESSAGE_LIMIT = 50
const SAFE_DEFLECTION =
  "I'm only here to help with Maths! Ask me anything about your schoolwork 😊"

function todayAEST() {
  return new Date().toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney' })
}

// Optional, additive capability appended to every system prompt. It lets Hero
// surface a hands-on visual tool when (and only when) a child is genuinely
// stuck. It does NOT change the tutoring rules above — Hero still never gives
// the answer. The tag is parsed out and stripped from the visible reply.
const MANIPULATIVE_INSTRUCTION = `

VISUAL TOOLS (optional):
If the student is still stuck AFTER you have explained in words, you MAY end your reply with ONE tag to show them an interactive visual tool to play with:
- [[manipulative:pizza]] — for fractions (a pizza they can slice and colour)
- [[manipulative:numberline]] — for adding/subtracting (a kangaroo hopping along a number line)
- [[manipulative:tenframe]] — for counting and small numbers (a grid they fill with counters)
Only add a tag when a visual would genuinely help — not every message. Put it on its own line at the very end. Never mention the tag itself in your words; just keep tutoring naturally.`

function buildSystemPrompt(studentName, grade, questionText) {
  return (questionText
    ? `You are Hero, a friendly and encouraging AI Maths tutor for Australian primary school students.
You are talking to ${studentName} who is in Grade ${grade}.

The student is currently working on this question: "${questionText}"

STRICT RULES:
- Only discuss Maths and education. If asked anything unrelated, say "I'm only here to help with Maths! Let's focus on your question 😊"
- NEVER give the answer directly. Guide using hints, encouragement, and Socratic questions
- Keep responses short (2-4 sentences), warm, and age-appropriate
- Use emojis occasionally 😊
- Remember what the student said and respond to it directly. Never repeat your previous message word for word
- If the student says "how?" or "why?" or "I don't get it", dig deeper into THEIR specific confusion — ask them what they do understand so far
- Vary your approach each message: try a different angle, example, or analogy
- When the student gets closer to the answer, celebrate their progress enthusiastically`
    : `You are Hero, a friendly and encouraging AI Maths tutor for Australian primary school students.
You are talking to ${studentName} who is in Grade ${grade}.

Help the student with any Maths question they have.

STRICT RULES:
- Only discuss Maths, science, or school subjects. If asked anything unrelated, say "I'm only here to help with schoolwork! 😊"
- NEVER give answers directly. Guide the student using hints and Socratic questions
- Keep responses short (2-4 sentences), warm, and age-appropriate
- Use emojis occasionally
- If a student says "I don't know", encourage them to guess and explain their thinking`
  ) + MANIPULATIVE_INSTRUCTION
}

// Pulls a [[manipulative:xxx]] tag out of an AI reply. Returns the cleaned
// reply text (tag removed) and the resolved tool key, or null if no valid tag.
function extractManipulative(reply) {
  if (!reply) return { text: reply, manipulative: null }
  const match = reply.match(/\[\[\s*manipulative\s*:\s*([a-z0-9 _-]+?)\s*\]\]/i)
  if (!match) return { text: reply, manipulative: null }
  const tool = normaliseManipulative(match[1])
  const text = reply.replace(match[0], '').trim()
  return { text, manipulative: tool }
}

async function callOpenRouter(systemPrompt, conversation, fallback) {
  if (!process.env.OPENROUTER_API_KEY) return fallback
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_BASE_URL || 'https://mymathshero.com.au',
        'X-Title': 'MyMathsHero',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-haiku-4-5',
        max_tokens: 200,
        temperature: 0.7,
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversation,
        ],
      }),
    })
    if (!response.ok) return fallback
    const data = await response.json()
    return data.choices?.[0]?.message?.content?.trim() || fallback
  } catch (err) {
    console.warn('OpenRouter call failed:', err.message)
    return fallback
  }
}

export async function POST(request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const token = getRequestToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload || payload.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      messages,
      questionText,
      questionId,
      studentName,
      grade,
      studentId,
      // Legacy fields (used by existing AskHero / AskHeroSheet components).
      skillId,
      question,
      attemptNumber = 1,
      behaviour = 'unknown',
    } = body

    // Multi-turn mode is selected when a `messages` array is provided.
    const isMultiTurn = Array.isArray(messages)
    const sid = studentId || payload.userId

    const db = await connectDB()
    const student = await db.collection('children').findOne({ id: sid })
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Plan gate — Ask Hero (AI hints) requires Premium. Plan lives on the parent
    // record (source of truth), falling back to the child record.
    const parent = student.parentId
      ? await db.collection('parents').findOne({ id: student.parentId })
      : null
    // resolveEffectivePlan honours an app-granted free month and downgrades it
    // back to 'free' once the month has elapsed.
    const plan = parent ? resolveEffectivePlan(parent) : (student?.plan || 'free')
    if (!getPlanFeatures(plan).askHero) {
      if (isMultiTurn) {
        return NextResponse.json({
          reply: 'Ask Hero is a Premium feature 💎 Upgrade to unlock unlimited AI tutoring!',
          upgrade: true,
        }, { status: 403 })
      }
      return NextResponse.json({
        error: 'premium_required',
        message: 'Ask Hero is a Premium feature.',
        upgradeUrl: '/subscribe',
      }, { status: 403 })
    }

    // ── Multi-turn conversation path ─────────────────────────────────────────
    if (isMultiTurn) {
      // Security pre-check: only the newest user message.
      const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || ''
      const isJailbreak = JAILBREAK_PATTERNS.some(p => lastMessage.includes(p))
      const isOffTopic = OFF_TOPIC_KEYWORDS.some(k => lastMessage.includes(k))
      if (isJailbreak || isOffTopic) {
        return NextResponse.json({ reply: SAFE_DEFLECTION })
      }

      // Rate limiting — 50 messages/student/day (AEST).
      const today = todayAEST()
      const msgCount = student.heroMessageCount || { date: '', count: 0 }
      const currentCount = msgCount.date === today ? msgCount.count : 0
      if (currentCount >= DAILY_MESSAGE_LIMIT) {
        return NextResponse.json({
          reply: "You've sent a lot of messages today! Come back tomorrow to keep learning 🌟",
          rateLimited: true,
        })
      }
      await db.collection('children').updateOne(
        { id: sid },
        { $set: { heroMessageCount: { date: today, count: currentCount + 1 } } }
      )

      const systemPrompt = buildSystemPrompt(
        studentName || student.name || 'Hero',
        grade ?? student.grade ?? 3,
        questionText || null
      )
      const rawReply = await callOpenRouter(
        systemPrompt,
        // Only pass clean role/content pairs to the model.
        messages.map(m => ({ role: m.role, content: m.content })),
        "I'm thinking... can you tell me more about what you're trying to work out? 🤔"
      )
      // Parse any [[manipulative:...]] tag Hero added, strip it from the text,
      // and return the resolved tool so the client can render it inline.
      const { text: reply, manipulative } = extractManipulative(rawReply)
      return NextResponse.json({ reply, manipulative })
    }

    // ── Legacy single-shot path (existing components) ────────────────────────
    if (!question) {
      return NextResponse.json(
        { error: 'question or messages is required' }, { status: 400 }
      )
    }

    // Mark hintUsed on the active session.
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000)
    await db.collection('sessions').updateOne(
      { studentId: sid, completed: { $ne: true }, startedAt: { $gte: thirtyMinsAgo } },
      { $set: { hintUsed: true } }
    )

    const systemPrompt =
      'You are a friendly, encouraging primary school tutor helping Australian students aged 5-11. ' +
      'Give a SHORT hint (max 2 sentences) that guides the student toward the answer without giving it away. ' +
      'Use simple language appropriate for their grade level. Be warm and encouraging.'
    const userPrompt =
      `Subject skill: ${skillId}. Question: ${question}. The student has attempted this ` +
      `${attemptNumber} time${attemptNumber !== 1 ? 's' : ''}. Their behaviour pattern is ${behaviour}. Give a helpful hint.`

    const aiHint = await callOpenRouter(
      systemPrompt,
      [{ role: 'user', content: userPrompt }],
      null
    )
    if (aiHint) {
      return NextResponse.json({ hint: aiHint, source: 'ai' })
    }

    // Fallback: hint stored on the question document.
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
