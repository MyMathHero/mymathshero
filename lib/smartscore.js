/**
 * MyMathsHero SmartScore Algorithm
 * Asymmetric mastery scoring — gains shrink near 100, penalties grow near 100
 */

export function updateSmartScore(currentScore, correct, difficulty, behaviour) {
  let delta = 0

  if (correct) {
    // Gain shrinks as score approaches 100
    const baseGain = 10 * difficulty * (1 - currentScore / 100)
    const behaviourMultiplier = {
      'confident_correct': 1.2,   // fast + correct = bonus
      'slow_correct': 1.0,         // slow but got it
      'hint_correct': 0.7,         // needed hint
    }[behaviour] || 1.0
    delta = Math.max(1, baseGain * behaviourMultiplier)
  } else {
    // Penalty grows as score is higher (harder to maintain high score)
    const basePenalty = 8 * (currentScore / 100)
    const behaviourMultiplier = {
      'careless_error': 0.5,       // small penalty — probably knows it
      'conceptual_gap': 1.0,       // real gap
      'confused': 1.3,             // big gap — bigger penalty
    }[behaviour] || 1.0
    delta = -Math.max(2, basePenalty * behaviourMultiplier)
  }

  const newScore = Math.min(100, Math.max(0, currentScore + delta))
  return {
    newScore: parseFloat(newScore.toFixed(1)),
    delta: parseFloat(delta.toFixed(1)),
    mastered: newScore >= 80,
  }
}

export function getScoreStatus(score) {
  if (score >= 80) return 'mastered'
  if (score >= 60) return 'almost_there'
  if (score >= 30) return 'in_progress'
  return 'needs_work'
}

export function getScoreColor(score) {
  if (score >= 80) return 'green'
  if (score >= 60) return 'blue'
  if (score >= 30) return 'amber'
  return 'red'
}