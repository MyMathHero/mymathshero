/**
 * MyMathsHero Behaviour Classifier
 * Analyses HOW a kid answers — not just right or wrong
 */

export function classifyBehaviour({
  correct,
  timeTakenMs,
  hintUsed,
  attemptNumber,
  averageTimeMs = 15000,
}) {
  // Fast = under 8 seconds, Slow = over 30 seconds
  const isFast = timeTakenMs < 8000
  const isSlow = timeTakenMs > 30000
  const usedHint = hintUsed === true
  const isFirstAttempt = attemptNumber === 1

  if (correct) {
    if (isFast && !usedHint && isFirstAttempt) return 'confident_correct'
    if (usedHint) return 'hint_correct'
    return 'slow_correct'
  } else {
    if (isFast && isFirstAttempt) return 'careless_error'
    if (isSlow || !isFirstAttempt) return 'conceptual_gap'
    return 'confused'
  }
}

export function getBehaviourInsight(behaviour, skillName) {
  const insights = {
    'confident_correct': `Great — ${skillName} is becoming natural. Ready for harder questions.`,
    'slow_correct': `Getting there with ${skillName} — takes time but gets it right.`,
    'hint_correct': `Understands ${skillName} with support. Build independence gradually.`,
    'careless_error': `Likely knows ${skillName} — rushing. Encourage slower careful reading.`,
    'conceptual_gap': `Struggling with ${skillName} concept. Recommend revisiting prerequisites.`,
    'confused': `Significant gap in ${skillName}. Step back to foundational skill.`,
  }
  return insights[behaviour] || `Practising ${skillName}.`
}

export function getSessionSummary(events) {
  if (!events || events.length === 0) return null

  const total = events.length
  const correct = events.filter(e => e.correct).length
  const avgTime = events.reduce((sum, e) => sum + (e.timeTakenMs || 0), 0) / total
  const hintsUsed = events.filter(e => e.hintUsed).length

  const behaviourCounts = {}
  events.forEach(e => {
    behaviourCounts[e.behaviour] = (behaviourCounts[e.behaviour] || 0) + 1
  })
  const dominantBehaviour = Object.entries(behaviourCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0]

  return {
    totalQuestions: total,
    correctAnswers: correct,
    accuracy: Math.round((correct / total) * 100),
    avgResponseSeconds: Math.round(avgTime / 1000),
    hintsUsed,
    dominantBehaviour,
    engagementLevel:
      avgTime < 10000 ? 'high' :
      avgTime < 25000 ? 'medium' : 'low',
  }
}