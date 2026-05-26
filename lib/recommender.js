/**
 * MyMathsHero Recommendation Engine
 * Picks the best next skill for each student using ZPD scoring
 */

const MASTERY_THRESHOLD = 80
const SKILL_GRAPH = [
  // MATHS
  { id: 'm_prep_count10',  name: 'Count to 10',            subject: 'Maths', grade: 0, prereqs: [],                              difficulty: 0.1, strand: 'Number' },
  { id: 'm_prep_add5',     name: 'Add within 5',           subject: 'Maths', grade: 0, prereqs: ['m_prep_count10'],               difficulty: 0.2, strand: 'Number' },
  { id: 'm_1_add20',       name: 'Add within 20',          subject: 'Maths', grade: 1, prereqs: ['m_prep_add5'],                  difficulty: 0.3, strand: 'Number' },
  { id: 'm_1_sub10',       name: 'Subtract within 10',     subject: 'Maths', grade: 1, prereqs: ['m_prep_add5'],                  difficulty: 0.3, strand: 'Number' },
  { id: 'm_1_place10',     name: 'Place Value tens/ones',  subject: 'Maths', grade: 1, prereqs: ['m_1_add20'],                   difficulty: 0.4, strand: 'Number' },
  { id: 'm_2_add100',      name: 'Add within 100',         subject: 'Maths', grade: 2, prereqs: ['m_1_add20', 'm_1_place10'],    difficulty: 0.4, strand: 'Number' },
  { id: 'm_2_sub100',      name: 'Subtract within 100',    subject: 'Maths', grade: 2, prereqs: ['m_1_sub10', 'm_1_place10'],    difficulty: 0.4, strand: 'Number' },
  { id: 'm_2_multiply',    name: 'Intro Multiplication',   subject: 'Maths', grade: 2, prereqs: ['m_2_add100'],                  difficulty: 0.5, strand: 'Multiplication' },
  { id: 'm_3_multiply100', name: 'Multiply within 100',    subject: 'Maths', grade: 3, prereqs: ['m_2_multiply'],                difficulty: 0.5, strand: 'Multiplication' },
  { id: 'm_3_divide',      name: 'Divide within 100',      subject: 'Maths', grade: 3, prereqs: ['m_3_multiply100'],             difficulty: 0.6, strand: 'Division' },
  { id: 'm_3_fractions',   name: 'Understand Fractions',   subject: 'Maths', grade: 3, prereqs: ['m_2_add100'],                  difficulty: 0.6, strand: 'Fractions' },
  { id: 'm_4_fracadd',     name: 'Add/Subtract Fractions', subject: 'Maths', grade: 4, prereqs: ['m_3_fractions'],               difficulty: 0.7, strand: 'Fractions' },
  { id: 'm_4_decimals',    name: 'Intro to Decimals',      subject: 'Maths', grade: 4, prereqs: ['m_3_fractions'],               difficulty: 0.7, strand: 'Number' },
  { id: 'm_5_fracmul',     name: 'Multiply Fractions',     subject: 'Maths', grade: 5, prereqs: ['m_4_fracadd'],                 difficulty: 0.8, strand: 'Fractions' },
  { id: 'm_5_decops',      name: 'Decimal Operations',     subject: 'Maths', grade: 5, prereqs: ['m_4_decimals'],                difficulty: 0.8, strand: 'Number' },
  // ENGLISH
  { id: 'e_prep_letters',  name: 'Letter Recognition',     subject: 'English', grade: 0, prereqs: [],                            difficulty: 0.1, strand: 'Phonics' },
  { id: 'e_prep_phonics',  name: 'Letter Sounds',          subject: 'English', grade: 0, prereqs: ['e_prep_letters'],             difficulty: 0.2, strand: 'Phonics' },
  { id: 'e_1_blend',       name: 'Blend Sounds CVC',       subject: 'English', grade: 1, prereqs: ['e_prep_phonics'],             difficulty: 0.3, strand: 'Phonics' },
  { id: 'e_1_sight',       name: 'Sight Words 50',         subject: 'English', grade: 1, prereqs: ['e_prep_letters'],             difficulty: 0.3, strand: 'Vocabulary' },
  { id: 'e_2_comprehend',  name: 'Reading Comprehension',  subject: 'English', grade: 2, prereqs: ['e_1_blend'],                  difficulty: 0.4, strand: 'Reading' },
  { id: 'e_3_mainidea',    name: 'Main Idea & Details',    subject: 'English', grade: 3, prereqs: ['e_2_comprehend'],             difficulty: 0.5, strand: 'Reading' },
  { id: 'e_4_infer',       name: 'Make Inferences',        subject: 'English', grade: 4, prereqs: ['e_3_mainidea'],               difficulty: 0.6, strand: 'Reading' },
  { id: 'e_5_theme',       name: 'Theme & Author Purpose', subject: 'English', grade: 5, prereqs: ['e_4_infer'],                  difficulty: 0.7, strand: 'Reading' },
  // SCIENCE
  { id: 's_prep_senses',   name: '5 Senses',               subject: 'Science', grade: 0, prereqs: [],                            difficulty: 0.1, strand: 'Life Science' },
  { id: 's_1_plants',      name: 'Parts of a Plant',       subject: 'Science', grade: 1, prereqs: ['s_prep_senses'],              difficulty: 0.2, strand: 'Life Science' },
  { id: 's_2_habitats',    name: 'Habitats & Ecosystems',  subject: 'Science', grade: 2, prereqs: ['s_1_plants'],                 difficulty: 0.4, strand: 'Life Science' },
  { id: 's_3_foodweb',     name: 'Food Chains & Webs',     subject: 'Science', grade: 3, prereqs: ['s_2_habitats'],               difficulty: 0.5, strand: 'Life Science' },
  { id: 's_4_energy',      name: 'Forms of Energy',        subject: 'Science', grade: 4, prereqs: ['s_3_foodweb'],                difficulty: 0.6, strand: 'Physical Science' },
  { id: 's_5_cells',       name: 'Cells & Organisms',      subject: 'Science', grade: 5, prereqs: ['s_4_energy'],                 difficulty: 0.7, strand: 'Life Science' },
]

export function getSkillGraph() {
  return SKILL_GRAPH
}

export function getRecommendations(studentGrade, skillScores = {}, maxResults = 5) {
  const scored = []

  for (const skill of SKILL_GRAPH) {
    const currentScore = skillScores[skill.id] ?? 0

    // Skip mastered skills
    if (currentScore >= MASTERY_THRESHOLD) continue

    // Skip if prerequisites not mastered
    const prereqsMet = skill.prereqs.every(
      p => (skillScores[p] ?? 0) >= MASTERY_THRESHOLD
    )
    if (!prereqsMet) continue

    // ZPD scoring
    const urgency = currentScore === 0 ? 0.6
      : currentScore < 40 ? 0.8
      : 1.0

    const gradeDiff = Math.abs(skill.grade - studentGrade)
    const gradeBonus = Math.max(0, 1.0 - gradeDiff * 0.2)
    const difficultyFit = 1.0 - Math.abs(skill.difficulty - 0.5)

    const recScore = urgency * 0.5 + gradeBonus * 0.3 + difficultyFit * 0.2

    scored.push({
      ...skill,
      currentScore,
      recScore: parseFloat(recScore.toFixed(3)),
      status: currentScore > 0 ? 'in_progress' : 'new',
    })
  }

  return scored
    .sort((a, b) => b.recScore - a.recScore)
    .slice(0, maxResults)
}

export function getSkillTreeForGrade(grade, skillScores = {}) {
  return SKILL_GRAPH
    .filter(s => s.grade <= grade + 1)
    .map(s => {
      const score = skillScores[s.id] ?? 0
      const prereqsMet = s.prereqs.every(
        p => (skillScores[p] ?? 0) >= MASTERY_THRESHOLD
      )
      return {
        ...s,
        score,
        status: score >= MASTERY_THRESHOLD ? 'mastered'
          : !prereqsMet ? 'locked'
          : score > 0 ? 'in_progress'
          : 'available',
      }
    })
}