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

export async function GET() {
  try {
    const db = await connectDB()

    // Maths questions are stored with skillId starting "m_"/"q_m"; we group by
    // skillId and don't over-filter on subject so older docs without `subject`
    // still count. `active: false` is the only exclusion.
    const bySkill = await db.collection('questions').aggregate([
      { $match: { active: { $ne: false } } },
      { $group: {
        _id: '$skillId',
        count: { $sum: 1 },
        aiGenerated: { $sum: { $cond: ['$aiGenerated', 1, 0] } },
      }},
      { $sort: { count: 1 } },
    ]).toArray()

    const total = bySkill.reduce((sum, s) => sum + s.count, 0)
    const aiGeneratedTotal = bySkill.reduce((sum, s) => sum + s.aiGenerated, 0)
    const skillsCovered = bySkill.length
    const avgPerSkill = skillsCovered > 0 ? Math.round(total / skillsCovered) : 0
    const skillsBelow = bySkill
      .filter(s => s.count < 15)
      .map(s => ({ skillId: s._id, count: s.count, aiGenerated: s.aiGenerated }))

    return NextResponse.json({
      total,
      aiGenerated: aiGeneratedTotal,
      skillsCovered,
      avgPerSkill,
      skillsBelow,
      bySkill: bySkill.map(s => ({
        skillId: s._id,
        count: s.count,
        aiGenerated: s.aiGenerated,
      })),
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
