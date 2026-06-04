import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import { generateWeeklyReport } from '@/lib/weeklyReport'

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

// Sends one weekly Hero Report per child-with-activity. Uses the
// `generateWeeklyReport` helper so the report shape stays in one place.
//
// Iterates by child (not by parent) and resolves the parent via
// `child.parentId ?? child.parent_id` because both casings exist in the
// historical data.
export async function POST() {
  try {
    const db = await connectDB()

    const children = await db.collection('children').find({}).toArray()
    if (children.length === 0) {
      return NextResponse.json({
        success: true, sent: 0, skipped: 0, errors: 0,
        message: 'No children in the database',
      })
    }

    let sent = 0
    let skipped = 0
    let errors = 0
    const errorDetail = []

    for (const child of children) {
      const parentId = child.parentId ?? child.parent_id
      if (!parentId) {
        skipped++
        continue
      }

      const parent = await db.collection('parents').findOne({ id: parentId })
      if (!parent?.email) {
        skipped++
        continue
      }

      const result = await generateWeeklyReport(db, parent, child)
      if (result.sent) {
        sent++
      } else if (result.reason === 'no activity') {
        skipped++
      } else {
        errors++
        errorDetail.push({
          childId: child.id,
          childName: child.name,
          error: result.error || 'unknown',
        })
      }

      // Gentle pacing so Resend's rate limit doesn't throttle us.
      await new Promise(r => setTimeout(r, 300))
    }

    await db.collection('email_logs').insertOne({
      type: 'weekly_reports',
      sent, skipped, errors,
      sentAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      sent, skipped, errors,
      errorDetail: errorDetail.slice(0, 20), // cap so the response stays small
      message: `Sent ${sent} reports · skipped ${skipped} (no activity / no parent) · ${errors} errors`,
    })
  } catch (error) {
    console.error('[send-all-reports]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
