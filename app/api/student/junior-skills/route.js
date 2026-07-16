import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import { SKILL_ID_MAP } from '@/lib/skillNames'
import { categoriesForWorld } from '@/lib/juniorMode'

// Lists the skills that ACTUALLY have Junior (mode:'junior') visual questions,
// optionally narrowed to a world's curriculum categories. The Junior play page
// uses this to pick a skill instead of guessing from the student's (Grade-3+)
// recommendations — those never contain m_0_/m_1_ skills, so every world was
// resolving to a skill with no junior stock → "Let's try a different game!".
//
// GET /api/student/junior-skills            → all junior skills (with counts)
// GET /api/student/junior-skills?world=<id> → only that world's junior skills

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const world = searchParams.get('world')

    const db = await connectDB()

    // Skills that have at least one active junior question, with counts.
    const agg = await db.collection('questions').aggregate([
      { $match: { mode: 'junior', active: { $ne: false }, verifierFlagged: { $ne: true } } },
      { $group: { _id: '$skillId', count: { $sum: 1 } } },
    ]).toArray()

    let skills = agg
      .filter(s => s._id && s.count > 0)
      .map(s => ({
        id: s._id,
        name: SKILL_ID_MAP[s._id]?.name || s._id,
        category: SKILL_ID_MAP[s._id]?.category || null,
        count: s.count,
      }))

    // Narrow to the world's categories when a world is given AND that leaves a
    // non-empty set; otherwise fall back to the full junior list so the game can
    // always start (a world with no junior stock — money/times/fractions — still
    // launches something rather than dead-ending).
    if (world) {
      const cats = categoriesForWorld(world)
      const inWorld = skills.filter(s => cats.includes(s.category))
      if (inWorld.length) skills = inWorld
    }

    // Stable, sensible order: by skill id (m_0_* before m_1_*).
    skills.sort((a, b) => a.id.localeCompare(b.id))

    return NextResponse.json({ skills, total: skills.length })
  } catch (error) {
    console.error('junior-skills GET error:', error.message)
    return NextResponse.json({ error: error.message, skills: [] }, { status: 500 })
  }
}
