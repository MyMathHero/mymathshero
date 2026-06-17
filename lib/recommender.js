/**
 * MyMathsHero Recommendation Engine
 * Picks the best next skill for each student using ZPD scoring
 */

const MASTERY_THRESHOLD = 80

// Maths-only gate. The platform is Maths-only; English/Science entries exist in
// the historical SKILL_GRAPH but must never reach the UI.
function isMathsSkill(s) {
  const id = s?.id || s?.skillId || ''
  const subject = s?.subject || ''
  return id.startsWith('m_') || subject === 'Maths' || subject === 'Mathematics'
}
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
  // YEAR 6 — Australian Curriculum Maths.
  // Prereqs are deliberately OPEN ([]) where the natural grade-5 prerequisite
  // doesn't exist in this graph (SKILL_GRAPH only has 15 entries; the broader
  // taxonomy lives in lib/skillNames.js). Within-grade chains are preserved
  // so harder Y6 skills still gate on the foundational Y6 ones.
  // Number & place value
  { id: 'm_6_place_value',         name: 'Large Numbers and Place Value',   subject: 'Maths', grade: 6, prereqs: [],                                    difficulty: 0.45, strand: 'Number' },
  { id: 'm_6_integers',            name: 'Positive and Negative Integers',  subject: 'Maths', grade: 6, prereqs: ['m_6_place_value'],                  difficulty: 0.50, strand: 'Number' },
  { id: 'm_6_prime_composite',     name: 'Prime and Composite Numbers',     subject: 'Maths', grade: 6, prereqs: [],                                    difficulty: 0.55, strand: 'Number' },
  { id: 'm_6_factors_multiples',   name: 'Factors and Multiples',           subject: 'Maths', grade: 6, prereqs: ['m_6_prime_composite'],              difficulty: 0.52, strand: 'Number' },
  { id: 'm_6_powers_squares',      name: 'Square Numbers and Powers',       subject: 'Maths', grade: 6, prereqs: ['m_6_factors_multiples'],            difficulty: 0.58, strand: 'Number' },
  // Multiplication / division / order of ops
  { id: 'm_6_multiply_large',      name: 'Multiplying Large Numbers',       subject: 'Maths', grade: 6, prereqs: [],                                    difficulty: 0.50, strand: 'Number' },
  { id: 'm_6_divide_large',        name: 'Long Division',                   subject: 'Maths', grade: 6, prereqs: ['m_6_multiply_large'],               difficulty: 0.55, strand: 'Division' },
  { id: 'm_6_order_operations',    name: 'Order of Operations (BODMAS)',    subject: 'Maths', grade: 6, prereqs: ['m_6_multiply_large','m_6_divide_large'], difficulty: 0.65, strand: 'Number' },
  // Fractions / decimals / percentages / ratio
  { id: 'm_6_fractions_decimals',  name: 'Fractions and Decimals',          subject: 'Maths', grade: 6, prereqs: [],                                    difficulty: 0.52, strand: 'Fractions' },
  { id: 'm_6_percentages',         name: 'Percentages',                     subject: 'Maths', grade: 6, prereqs: ['m_6_fractions_decimals'],            difficulty: 0.55, strand: 'Fractions' },
  { id: 'm_6_fractions_operations',name: 'Adding and Subtracting Fractions',subject: 'Maths', grade: 6, prereqs: ['m_6_fractions_decimals'],            difficulty: 0.58, strand: 'Fractions' },
  { id: 'm_6_multiply_fractions',  name: 'Multiplying Fractions',           subject: 'Maths', grade: 6, prereqs: ['m_6_fractions_operations'],         difficulty: 0.62, strand: 'Fractions' },
  { id: 'm_6_divide_fractions',    name: 'Dividing Fractions',              subject: 'Maths', grade: 6, prereqs: ['m_6_multiply_fractions'],           difficulty: 0.65, strand: 'Fractions' },
  { id: 'm_6_ratio_rates',         name: 'Ratios and Rates',                subject: 'Maths', grade: 6, prereqs: ['m_6_percentages'],                  difficulty: 0.60, strand: 'Number' },
  // Patterns / algebra
  { id: 'm_6_number_patterns',     name: 'Number Patterns and Rules',       subject: 'Maths', grade: 6, prereqs: [],                                    difficulty: 0.52, strand: 'Algebra' },
  { id: 'm_6_equations',           name: 'Simple Equations',                subject: 'Maths', grade: 6, prereqs: ['m_6_number_patterns'],               difficulty: 0.62, strand: 'Algebra' },
  { id: 'm_6_variables',           name: 'Using Variables (Pronumerals)',   subject: 'Maths', grade: 6, prereqs: ['m_6_equations'],                    difficulty: 0.68, strand: 'Algebra' },
  // Measurement
  { id: 'm_6_area_complex',        name: 'Area of Complex Shapes',          subject: 'Maths', grade: 6, prereqs: [],                                    difficulty: 0.58, strand: 'Measurement' },
  { id: 'm_6_volume',              name: 'Volume and Capacity',             subject: 'Maths', grade: 6, prereqs: ['m_6_area_complex'],                 difficulty: 0.60, strand: 'Measurement' },
  { id: 'm_6_perimeter_complex',   name: 'Perimeter of Complex Shapes',     subject: 'Maths', grade: 6, prereqs: [],                                    difficulty: 0.55, strand: 'Measurement' },
  { id: 'm_6_metric_convert',      name: 'Converting Metric Units',         subject: 'Maths', grade: 6, prereqs: [],                                    difficulty: 0.55, strand: 'Measurement' },
  { id: 'm_6_time_zones',          name: 'Time Zones and Elapsed Time',     subject: 'Maths', grade: 6, prereqs: [],                                    difficulty: 0.58, strand: 'Measurement' },
  // Geometry
  { id: 'm_6_angles',              name: 'Angles and Degrees',              subject: 'Maths', grade: 6, prereqs: [],                                    difficulty: 0.58, strand: 'Geometry' },
  { id: 'm_6_coordinates',         name: 'Cartesian Coordinates',           subject: 'Maths', grade: 6, prereqs: ['m_6_angles'],                       difficulty: 0.60, strand: 'Geometry' },
  { id: 'm_6_transformations',     name: 'Transformations (Flip, Slide, Turn)', subject: 'Maths', grade: 6, prereqs: [],                               difficulty: 0.55, strand: 'Geometry' },
  { id: 'm_6_symmetry',            name: 'Symmetry and Tessellation',       subject: 'Maths', grade: 6, prereqs: ['m_6_transformations'],              difficulty: 0.52, strand: 'Geometry' },
  { id: 'm_6_3d_shapes',           name: '3D Shapes and Nets',              subject: 'Maths', grade: 6, prereqs: [],                                    difficulty: 0.58, strand: 'Geometry' },
  // Statistics & probability
  { id: 'm_6_data_graphs',         name: 'Data Collection and Graphs',      subject: 'Maths', grade: 6, prereqs: [],                                    difficulty: 0.55, strand: 'Statistics' },
  { id: 'm_6_mean_median_mode',    name: 'Mean, Median and Mode',           subject: 'Maths', grade: 6, prereqs: ['m_6_data_graphs'],                  difficulty: 0.65, strand: 'Statistics' },
  { id: 'm_6_probability',         name: 'Probability and Chance',          subject: 'Maths', grade: 6, prereqs: ['m_6_data_graphs'],                  difficulty: 0.62, strand: 'Statistics' },
  { id: 'm_6_pie_charts',          name: 'Pie Charts and Column Graphs',    subject: 'Maths', grade: 6, prereqs: ['m_6_data_graphs'],                  difficulty: 0.58, strand: 'Statistics' },
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

// Maths-only by default — pass { includeAll: true } to opt in to the legacy
// English/Science entries (used only by admin tooling that explicitly wants them).
export function getSkillGraph({ includeAll = false } = {}) {
  return includeAll ? SKILL_GRAPH : SKILL_GRAPH.filter(isMathsSkill)
}

// Dynamic grade ceiling. A student who has mastered most of their current
// grade's Maths skills is ready to be stretched into grade+1 work. This returns
// the grade the engine should treat them as working at (their grade, or grade+1
// once they've cleared the bar). Pure + unit-testable.
//
// `readyFraction` = share of current-grade skills that must be mastered to lift
// the ceiling (default 0.7). Caps at grade 6 (top of the curriculum).
export function getEffectiveCeiling(studentGrade, skillScores = {}, readyFraction = 0.7) {
  const gradeSkills = SKILL_GRAPH.filter(isMathsSkill).filter(s => s.grade === studentGrade)
  if (gradeSkills.length === 0) return studentGrade
  const mastered = gradeSkills.filter(s => (skillScores[s.id] ?? 0) >= MASTERY_THRESHOLD).length
  const fraction = mastered / gradeSkills.length
  if (fraction >= readyFraction && studentGrade < 6) return studentGrade + 1
  return studentGrade
}

export function getRecommendations(studentGrade, skillScores = {}, maxResults = 5) {
  const scored = []

  for (const skill of SKILL_GRAPH.filter(isMathsSkill)) {
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
    .filter(isMathsSkill)
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