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

// ── Rule-based fallback ───────────────────────────────────────────────────────

function generateRuleBasedInsights(classData) {
  const students = classData.students || []
  const insights = []

  // Find students with any skill below 40
  const struggling = students.filter(s =>
    Object.values(s.skillScores || {}).some(score => score > 0 && score < 40)
  )
  if (struggling.length > 0) {
    const names = struggling.map(s => s.name).slice(0, 3).join(', ')
    insights.push({
      type: 'high',
      title: `${struggling.length} student${struggling.length > 1 ? 's' : ''} need urgent support`,
      description: `${names}${struggling.length > 3 ? ' and others' : ''} have skills below 40. A targeted small-group session is recommended.`,
      action: 'View at-risk students',
      actionLabel: 'View Students',
    })
  }

  // Find inactive students (inactiveDays >= 3)
  const inactive = students.filter(s => s.inactiveDays !== null && s.inactiveDays >= 3)
  if (inactive.length > 0) {
    insights.push({
      type: 'high',
      title: `${inactive.length} student${inactive.length > 1 ? 's' : ''} inactive for 3+ days`,
      description: `${inactive.map(s => s.name).slice(0, 3).join(', ')} haven't practised recently. Early check-in can prevent skill regression.`,
      action: 'Send reminder',
      actionLabel: 'Send Reminder',
    })
  }

  // Find skill gaps — average across students for each skill
  const skillTotals = {}
  const skillCounts = {}
  for (const student of students) {
    for (const [skillId, score] of Object.entries(student.skillScores || {})) {
      if (score > 0) {
        skillTotals[skillId] = (skillTotals[skillId] || 0) + score
        skillCounts[skillId] = (skillCounts[skillId] || 0) + 1
      }
    }
  }
  const skillAvgs = Object.entries(skillTotals).map(([id, total]) => ({
    id, avg: Math.round(total / skillCounts[id]),
  })).sort((a, b) => a.avg - b.avg)

  if (skillAvgs.length > 0 && skillAvgs[0].avg < 55) {
    insights.push({
      type: 'medium',
      title: `Skill gap in ${skillAvgs[0].id.replace(/_/g, ' ')}`,
      description: `Class average for this skill is ${skillAvgs[0].avg}. Consider a whole-class lesson or differentiated activities.`,
      action: 'Plan lesson',
      actionLabel: 'Plan Lesson',
    })
  }

  // Top performers
  const topPerformers = students
    .filter(s => {
      const scores = Object.values(s.skillScores || {}).filter(v => v > 0)
      return scores.length > 0 && scores.reduce((a, b) => a + b, 0) / scores.length >= 75
    })
  if (topPerformers.length > 0) {
    insights.push({
      type: 'low',
      title: `${topPerformers.length} student${topPerformers.length > 1 ? 's' : ''} ready for extension`,
      description: `${topPerformers.map(s => s.name).slice(0, 3).join(', ')} are performing strongly. Challenge them with harder content.`,
      action: 'Assign extension',
      actionLabel: 'Assign Extension',
    })
  }

  return insights.slice(0, 4)
}

// ── AI call ───────────────────────────────────────────────────────────────────

async function callOpenRouter(classData) {
  const students = classData.students || []
  const totalStudents = students.length

  // Summarise skill averages
  const skillTotals = {}
  const skillCounts = {}
  const below40 = []
  const inactiveStudents = []

  for (const student of students) {
    let hasBelow40 = false
    for (const [skillId, score] of Object.entries(student.skillScores || {})) {
      if (score > 0) {
        skillTotals[skillId] = (skillTotals[skillId] || 0) + score
        skillCounts[skillId] = (skillCounts[skillId] || 0) + 1
        if (score < 40) hasBelow40 = true
      }
    }
    if (hasBelow40) below40.push(student.name)
    if (student.inactiveDays !== null && student.inactiveDays >= 3) inactiveStudents.push(student.name)
  }

  const skillAvgSummary = Object.entries(skillTotals)
    .map(([id, total]) => `${id}: ${Math.round(total / skillCounts[id])}`)
    .join(', ')

  const userPrompt = [
    `Class data summary:`,
    `- Total students: ${totalStudents}`,
    `- Average SmartScore per skill: ${skillAvgSummary || 'no data yet'}`,
    `- Students with any skill below 40: ${below40.join(', ') || 'none'}`,
    `- Students inactive for 3+ days: ${inactiveStudents.join(', ') || 'none'}`,
    `- Individual student data: ${JSON.stringify(students.map(s => ({ name: s.name, skillScores: s.skillScores })))}`,
    ``,
    `Generate exactly 4 specific, actionable insights based on this data. Return ONLY a valid JSON array, no markdown, no extra text.`,
  ].join('\n')

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
      'X-Title': 'MyMathsHero',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4-5',
      messages: [
        {
          role: 'system',
          content: 'You are an experienced primary school educator analysing class performance data. Generate 4 specific, actionable insights for the teacher. Each insight must be based on the actual data provided. Format as JSON array with objects: { "type": "high"|"medium"|"low", "title": string, "description": string, "action": string, "actionLabel": string }',
        },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 800,
      temperature: 0.4,
    }),
  })

  if (!response.ok) throw new Error(`OpenRouter ${response.status}`)

  const aiData = await response.json()
  const raw = aiData.choices?.[0]?.message?.content?.trim()
  if (!raw) throw new Error('Empty AI response')

  // Strip markdown code fences if present
  const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
  const parsed = JSON.parse(jsonStr)
  if (!Array.isArray(parsed)) throw new Error('AI did not return an array')
  return parsed.slice(0, 4)
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request) {
  try {
    const { teacherId, classData: rawClassData, forceRefresh } = await request.json()

    if (!rawClassData) {
      return NextResponse.json({ error: 'classData is required' }, { status: 400 })
    }

    const db = await connectDB()

    // Defence-in-depth: re-check that none of the students in classData are private,
    // and that any present belong to this teacher. Protects against a malicious client
    // passing arbitrary classData with private-student IDs.
    let classData = rawClassData
    if (teacherId && Array.isArray(classData.students) && classData.students.length > 0) {
      const incomingIds = classData.students.map(s => s.id).filter(Boolean)
      if (incomingIds.length > 0) {
        const allowed = await db.collection('children').find({
          id: { $in: incomingIds },
          type: 'school',
          teacherId,
        }).project({ id: 1, _id: 0 }).toArray()
        const allowedSet = new Set(allowed.map(c => c.id))
        classData = {
          ...classData,
          students: classData.students.filter(s => allowedSet.has(s.id)),
        }
      }
    }
    const cacheKey = teacherId || 'unknown'
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000)

    // Check cache (unless forceRefresh)
    if (!forceRefresh) {
      const cached = await db.collection('teacher_insights').findOne({
        teacherId: cacheKey,
        generatedAt: { $gte: thirtyMinsAgo },
      })
      if (cached) {
        return NextResponse.json({ insights: cached.insights, generatedAt: cached.generatedAt, fromCache: true })
      }
    }

    let insights
    let source = 'ai'

    if (process.env.OPENROUTER_API_KEY) {
      try {
        insights = await callOpenRouter(classData)
      } catch (aiErr) {
        console.warn('[insights] AI failed, using rule-based fallback:', aiErr.message)
        insights = generateRuleBasedInsights(classData)
        source = 'rules'
      }
    } else {
      insights = generateRuleBasedInsights(classData)
      source = 'rules'
    }

    const generatedAt = new Date()

    // Upsert cache
    await db.collection('teacher_insights').updateOne(
      { teacherId: cacheKey },
      { $set: { teacherId: cacheKey, insights, generatedAt, source } },
      { upsert: true }
    )

    return NextResponse.json({ insights, generatedAt, source, fromCache: false })
  } catch (error) {
    console.error('Teacher insights error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
