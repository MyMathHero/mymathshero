import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

const SKILL_SCORES = [
  { skillId: 'm_3_multiply100', score: 62 },
  { skillId: 'm_2_add100',      score: 85 },
  { skillId: 'm_2_sub100',      score: 80 },
  { skillId: 'm_3_fractions',   score: 25 },
  { skillId: 'e_1_blend',       score: 55 },
  { skillId: 'e_2_comprehend',  score: 82 },
  { skillId: 's_1_plants',      score: 90 },
  { skillId: 's_3_foodweb',     score: 40 },
]

// Prerequisite scores needed for the recommender to unlock seeded skills
const PREREQ_SCORES = [
  { skillId: 'm_prep_count10', score: 90 },
  { skillId: 'm_prep_add5',    score: 90 },
  { skillId: 'm_1_add20',      score: 90 },
  { skillId: 'm_1_sub10',      score: 88 },
  { skillId: 'm_1_place10',    score: 85 },
  { skillId: 'm_2_multiply',   score: 82 },
  { skillId: 'e_prep_letters', score: 92 },
  { skillId: 'e_prep_phonics', score: 88 },
  { skillId: 's_prep_senses',  score: 95 },
  { skillId: 's_2_habitats',   score: 82 },
]

const SAMPLE_QUESTIONS = [
  // m_3_multiply100
  {
    id: 'q_m3_mult_001',
    skillId: 'm_3_multiply100',
    question: 'What is 7 × 8?',
    options: ['54', '56', '58', '48'],
    correctAnswer: '56',
    hint: 'Try (7 × 10) − (7 × 2) to break it down.',
    steps: [
      'Break it down: 7 × 8 = 7 × (10 − 2)',
      'Calculate 7 × 10 = 70',
      'Calculate 7 × 2 = 14',
      'Subtract: 70 − 14 = 56 ✓',
    ],
    difficulty: 0.5,
    active: true,
  },
  {
    id: 'q_m3_mult_002',
    skillId: 'm_3_multiply100',
    question: 'What is 9 × 6?',
    options: ['45', '54', '63', '48'],
    correctAnswer: '54',
    hint: 'Think of 9 × 6 as 10 × 6 minus 1 × 6.',
    steps: [
      '10 × 6 = 60',
      '1 × 6 = 6',
      '60 − 6 = 54 ✓',
    ],
    difficulty: 0.5,
    active: true,
  },
  // m_3_fractions
  {
    id: 'q_m3_frac_001',
    skillId: 'm_3_fractions',
    question: 'What is 1/4 + 1/4?',
    options: ['1/2', '2/8', '1/8', '2/4'],
    correctAnswer: '1/2',
    hint: 'When denominators are the same, just add the numerators!',
    steps: [
      'Both fractions have the same denominator (4)',
      'Add the numerators: 1 + 1 = 2',
      'Keep the denominator: 2/4',
      'Simplify: 2/4 = 1/2 ✓',
    ],
    difficulty: 0.6,
    active: true,
  },
  {
    id: 'q_m3_frac_002',
    skillId: 'm_3_fractions',
    question: 'Which fraction is bigger: 3/4 or 1/2?',
    options: ['1/2', '3/4', 'They are equal', 'Cannot compare'],
    correctAnswer: '3/4',
    hint: 'Convert 1/2 to quarters: 1/2 = 2/4',
    steps: [
      'Convert to a common denominator of 4',
      '1/2 = 2/4',
      'Compare 3/4 vs 2/4',
      '3/4 is bigger ✓',
    ],
    difficulty: 0.6,
    active: true,
  },
  // m_2_add100
  {
    id: 'q_m2_add_001',
    skillId: 'm_2_add100',
    question: 'What is 47 + 36?',
    options: ['73', '83', '82', '93'],
    correctAnswer: '83',
    hint: 'Add the tens first (40+30), then the ones (7+6).',
    steps: [
      'Add tens: 40 + 30 = 70',
      'Add ones: 7 + 6 = 13',
      'Combine: 70 + 13 = 83 ✓',
    ],
    difficulty: 0.4,
    active: true,
  },
  // m_2_sub100
  {
    id: 'q_m2_sub_001',
    skillId: 'm_2_sub100',
    question: 'What is 75 − 38?',
    options: ['37', '47', '33', '43'],
    correctAnswer: '37',
    hint: 'Try subtracting 40 then adding 2 back.',
    steps: [
      'Round 38 up to 40 for easier subtraction',
      '75 − 40 = 35',
      'Add back the 2 we over-subtracted: 35 + 2 = 37 ✓',
    ],
    difficulty: 0.4,
    active: true,
  },
  // e_1_blend
  {
    id: 'q_e1_blend_001',
    skillId: 'e_1_blend',
    question: 'Which word uses a blend of sounds: "cl", "at", "un"?',
    options: ['clap', 'run', 'mat', 'bed'],
    correctAnswer: 'clap',
    hint: 'A blend is when two consonants sound together at the start.',
    steps: [
      'A consonant blend is two or more consonants side by side',
      '"cl" in "clap" blends the sounds /k/ and /l/',
      '"run" starts with a single sound /r/',
      '"clap" uses the "cl" blend ✓',
    ],
    difficulty: 0.3,
    active: true,
  },
  // e_2_comprehend
  {
    id: 'q_e2_comp_001',
    skillId: 'e_2_comprehend',
    question: 'In "The cat sat lazily on the mat", what does "lazily" describe?',
    options: ['The cat', 'How the cat sat', 'The mat', 'Where the cat sat'],
    correctAnswer: 'How the cat sat',
    hint: 'Adverbs describe how an action is done.',
    steps: [
      'The word "lazily" is an adverb',
      'Adverbs modify verbs — they tell us HOW',
      'The verb here is "sat"',
      '"Lazily" describes how the cat sat ✓',
    ],
    difficulty: 0.4,
    active: true,
  },
  // s_1_plants
  {
    id: 'q_s1_plant_001',
    skillId: 's_1_plants',
    question: 'Which part of a plant makes food using sunlight?',
    options: ['Root', 'Stem', 'Leaf', 'Flower'],
    correctAnswer: 'Leaf',
    hint: 'This part is usually green and flat.',
    steps: [
      'Plants make food through photosynthesis',
      'Photosynthesis happens in leaves',
      'Leaves contain chlorophyll (the green pigment)',
      'Chlorophyll captures sunlight to make food ✓',
    ],
    difficulty: 0.2,
    active: true,
  },
  // s_3_foodweb
  {
    id: 'q_s3_food_001',
    skillId: 's_3_foodweb',
    question: 'What is the role of a producer in a food chain?',
    options: ['Eats animals', 'Makes its own food', 'Breaks down dead matter', 'Hunts prey'],
    correctAnswer: 'Makes its own food',
    hint: 'Plants use sunlight to make food — they produce it!',
    steps: [
      'Producers are at the base of every food chain',
      'They make their own food using sunlight (photosynthesis)',
      'Examples: grass, trees, algae',
      'Consumers eat producers or other consumers ✓',
    ],
    difficulty: 0.5,
    active: true,
  },
]

export async function POST() {
  try {
    const db = await connectDB()
    const studentId = 'student_test_001'

    // 1. Upsert test student
    // lastActiveDate = yesterday so first answer triggers a streak extension
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().slice(0, 10) // YYYY-MM-DD

    await db.collection('children').updateOne(
      { id: studentId },
      {
        $set: {
          id: studentId,
          name: 'Alex',
          grade: 3,
          username: 'alex2026',
          pin: '1234',
          avatar: '🦊',
          xp: 2650,
          coins: 340,
          level: 12,
          streak: 5,
          longestStreak: 5,
          lastActiveDate: yesterdayStr,
          sessions_completed: 3,
          type: 'private',
          schoolId: null,
          classId: null,
          teacherId: null,
          created_at: new Date(),
        },
      },
      { upsert: true }
    )

    // Second test student — belongs to teacher_seed_001 (school student)
    const schoolStudentId = 'school_student_001'
    await db.collection('children').updateOne(
      { id: schoolStudentId },
      {
        $set: {
          id: schoolStudentId,
          type: 'school',
          name: 'Emma',
          username: 'emma2026',
          pin: '5678',
          grade: 3,
          avatar: '🐱',
          schoolId: 'school_001',
          classId: 'class_001',
          teacherId: 'teacher_seed_001',
          parentId: null,
          coins: 50,
          xp: 100,
          level: 1,
          streak: 0,
          sessions_completed: 0,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    )

    // One-time backfill: any pre-existing child without a `type` field is treated
    // as a private student (safe default — keeps them invisible to teachers).
    await db.collection('children').updateMany(
      { type: { $exists: false } },
      { $set: { type: 'private', schoolId: null, classId: null, teacherId: null } }
    )

    // 2. Upsert skill scores (main + prereqs)
    const allScores = [...PREREQ_SCORES, ...SKILL_SCORES]
    for (const ss of allScores) {
      await db.collection('skill_scores').updateOne(
        { studentId, skillId: ss.skillId },
        {
          $set: {
            studentId,
            skillId: ss.skillId,
            score: ss.score,
            mastered: ss.score >= 80,
            updatedAt: new Date(),
          },
          $setOnInsert: { attempts: 10, createdAt: new Date() },
        },
        { upsert: true }
      )
    }

    // 3. Seed 7 days of fake session events
    await db.collection('session_events').deleteMany({ studentId })

    const skillIds = SKILL_SCORES.map(s => s.skillId)
    const behaviours = ['confident_correct', 'slow_correct', 'hint_correct', 'careless_error', 'conceptual_gap']
    const sessionEvents = []

    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      const numEvents = 3 + Math.floor(Math.random() * 8)
      for (let j = 0; j < numEvents; j++) {
        const skillId = skillIds[Math.floor(Math.random() * skillIds.length)]
        const correct = Math.random() > 0.3
        const eventDate = new Date()
        eventDate.setDate(eventDate.getDate() - dayOffset)
        eventDate.setHours(9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60))
        sessionEvents.push({
          studentId,
          skillId,
          questionId: `q_seed_${uuidv4()}`,
          correct,
          behaviour: behaviours[Math.floor(Math.random() * behaviours.length)],
          timeTakenMs: 5000 + Math.floor(Math.random() * 25000),
          hintUsed: Math.random() > 0.7,
          scoreBefore: 50,
          scoreAfter: correct ? 55 : 47,
          timestamp: eventDate,
        })
      }
    }

    await db.collection('session_events').insertMany(sessionEvents)

    // 4. Upsert sample questions (by id field)
    for (const q of SAMPLE_QUESTIONS) {
      await db.collection('questions').updateOne(
        { id: q.id },
        { $set: q },
        { upsert: true }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Test data seeded successfully',
      studentId,
      schoolStudentId,
      skillScoresSeeded: allScores.length,
      sessionEventsSeeded: sessionEvents.length,
      questionsSeeded: SAMPLE_QUESTIONS.length,
    })
  } catch (error) {
    console.error('Seed error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
