import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import { sendStreakReminderPush } from '@/lib/pushNotifications'
import { sendStreakReminder } from '@/lib/email'

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

// Server-side auth — gate this route behind ADMIN_API_KEY env var so it can't
// be hit from the public internet to spam students. The admin app sends the
// matching header; everyone else gets 401.
function isAuthorized(request) {
  const expected = process.env.ADMIN_API_KEY
  if (!expected) {
    // Misconfigured server — refuse rather than fail-open.
    console.error('[streak-reminders] ADMIN_API_KEY env var missing')
    return false
  }
  const sent = request.headers.get('x-admin-key')
  return sent === expected
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const db = await connectDB()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    // Students with an active streak.
    const studentsWithStreak = await db.collection('children')
      .find({ streak: { $gt: 0 } })
      .toArray()

    // Anyone who already practised today is exempt.
    const practicedToday = await db.collection('session_events')
      .distinct('studentId', { timestamp: { $gte: todayStart } })
    const practicedSet = new Set(practicedToday)

    const atRisk = studentsWithStreak.filter(s => !practicedSet.has(s.id))

    let pushSent = 0
    let pushFailed = 0
    let emailSent = 0
    const invalidTokens = []

    for (const student of atRisk) {
      // Push to the student device.
      if (student.pushToken) {
        const r = await sendStreakReminderPush(student)
        if (r?.success) {
          pushSent++
        } else {
          pushFailed++
          // Clean up tokens the device has unregistered.
          if (r?.ticket?.details?.error === 'DeviceNotRegistered') {
            invalidTokens.push(student.id)
          }
        }
      }

      // Parent email if streak is meaningful enough to escalate.
      if (student.streak >= 3 && student.parentId) {
        const parent = await db.collection('parents').findOne({ id: student.parentId })
        if (parent?.email) {
          try {
            await sendStreakReminder({
              parentEmail: parent.email,
              parentName: parent.name || 'there',
              childName: student.name,
              currentStreak: student.streak,
            })
            emailSent++
          } catch (err) {
            console.error('[streak-reminders] email failed for', parent.email, err?.message)
          }
        }
      }
    }

    // Drop dead tokens so we don't keep wasting Expo quota on them.
    if (invalidTokens.length > 0) {
      await db.collection('children').updateMany(
        { id: { $in: invalidTokens } },
        { $unset: { pushToken: '', pushPlatform: '' } }
      )
      await db.collection('push_tokens').deleteMany({ studentId: { $in: invalidTokens } })
    }

    return NextResponse.json({
      success: true,
      studentsAtRisk: atRisk.length,
      pushSent,
      pushFailed,
      emailSent,
      invalidTokensCleaned: invalidTokens.length,
      message: `${pushSent} push, ${emailSent} emails sent · ${invalidTokens.length} dead tokens cleaned`,
    })
  } catch (error) {
    console.error('[streak-reminders] error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
