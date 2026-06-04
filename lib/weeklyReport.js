import { sendHeroReport } from './email.js'

// Build and send one parent's weekly Hero Report for a single child.
// Returns { sent, reason?, error?, childName? } so the caller can roll up
// stats across many children without throwing.
export async function generateWeeklyReport(db, parent, child) {
  try {
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - 7)
    weekStart.setHours(0, 0, 0, 0)

    const weekEvents = await db.collection('session_events')
      .find({
        studentId: child.id,
        timestamp: { $gte: weekStart },
      })
      .toArray()

    if (weekEvents.length === 0) {
      return { sent: false, reason: 'no activity', childName: child.name }
    }

    const correct = weekEvents.filter(e => e.correct).length
    const accuracy = Math.round((correct / weekEvents.length) * 100)

    // Per-day breakdown. We aggregate by weekday name (Sun..Sat) because the
    // email template prints those labels in its weeklyData rows.
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dailyMap = {}
    weekEvents.forEach(e => {
      const day = days[new Date(e.timestamp).getDay()]
      if (!dailyMap[day]) dailyMap[day] = { questions: 0, correct: 0 }
      dailyMap[day].questions++
      if (e.correct) dailyMap[day].correct++
    })
    const weeklyData = Object.entries(dailyMap).map(([day, d]) => ({
      day,
      questions: d.questions,
      accuracy: Math.round((d.correct / d.questions) * 100),
    }))

    // Skill scores — sorted high to low so [0] is the strongest skill and the
    // last entry is the weakest. We strip the m_<grade>_ prefix so the email
    // shows human-readable skill names.
    const skillScores = await db.collection('skill_scores')
      .find({ studentId: child.id })
      .sort({ score: -1 })
      .toArray()

    const mastered = skillScores.filter(s => s.mastered).length
    const cleanSkillName = (raw) =>
      String(raw || '').replace(/^m_\d+_/, '').replace(/_/g, ' ')
    const topSkill = skillScores[0]?.skillId ? cleanSkillName(skillScores[0].skillId) : null
    const bottomSkill = skillScores.length > 1
      ? cleanSkillName(skillScores[skillScores.length - 1].skillId)
      : null

    // AI insight — best-effort. If OpenRouter is unset or fails we fall back
    // to a generic encouraging line so the email still sends.
    let insightText = `${child.name} had a great week practising Maths! Keep up the fantastic work.`
    if (process.env.OPENROUTER_API_KEY) {
      try {
        const prompt = `Write a 2-sentence encouraging insight for a parent about their child's maths progress this week.
Child: ${child.name}, Grade ${child.grade}
Questions answered: ${weekEvents.length}
Accuracy: ${accuracy}%
Skills mastered total: ${mastered}
Streak: ${child.streak || 0} days
Write in a warm, encouraging tone. Be specific about what's going well.`

        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.NEXT_PUBLIC_BASE_URL || 'https://mymathshero.com.au',
            'X-Title': 'MyMathsHero Weekly Report',
          },
          body: JSON.stringify({
            model: 'anthropic/claude-haiku-4-5',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 150,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          const content = data?.choices?.[0]?.message?.content?.trim()
          if (content) insightText = content
        }
      } catch {
        // Fall through with the fallback text.
      }
    }

    const result = await sendHeroReport({
      parentEmail: parent.email,
      parentName: parent.name || 'Parent',
      childName: child.name,
      childGrade: child.grade,
      questionsAnswered: weekEvents.length,
      accuracy,
      mastered,
      streak: child.streak || 0,
      heroPoints: child.xp || 0,
      topSkill,
      needsWork: bottomSkill,
      weeklyData,
      insightText,
      // sendHeroReport overrides this to BASE_URL/parent-dashboard, but we
      // pass it for completeness in case the template changes.
      dashboardUrl: 'https://mymathshero.com.au/parent-dashboard',
    })

    // sendEmail returns { success } not throw — surface as a hard fail so the
    // caller's `errors` counter is accurate, not silently a 'sent'.
    if (result?.success === false) {
      return { sent: false, error: result.error || 'send failed', childName: child.name }
    }

    return { sent: true, childName: child.name }
  } catch (error) {
    console.error('Weekly report failed for', child?.id, error?.message)
    return { sent: false, error: error?.message || 'unknown', childName: child?.name }
  }
}
