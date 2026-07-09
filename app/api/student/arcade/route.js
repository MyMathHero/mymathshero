import { MongoClient, ObjectId } from 'mongodb'
import { NextResponse } from 'next/server'
import { ARCADE_GAMES } from '@/lib/arcadeGames'
import { adjustCoins } from '@/lib/coins'
import { getAESTMidnightUTC, TIME_PACKS, timePackCost, timePackMinutes } from '@/lib/arcadeTime'
import { resolveEffectivePlan } from '@/lib/freeTrial'
import { isTaskDoneToday } from '@/lib/dailyTask'
import { isExamDue } from '@/lib/monthlyExam'

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

// GET — get arcade status for student
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    if (!studentId) return NextResponse.json(
      { error: 'studentId required' }, { status: 400 }
    )

    const db = await connectDB()
    const student = await db.collection('children')
      .findOne({ id: studentId })
    if (!student) return NextResponse.json(
      { error: 'Student not found' }, { status: 404 }
    )

    // Today's play stats (for display only — the gate is the purchased time
    // wallet, not a daily cap). Resets at AEST midnight.
    const todayStart = getAESTMidnightUTC()
    const todaySessions = await db.collection('arcade_sessions')
      .find({ studentId, startedAt: { $gte: todayStart } })
      .toArray()
    const minutesToday = todaySessions.reduce(
      (sum, s) => sum + (s.durationMinutes || 0), 0
    )
    const gamesPlayedToday = new Set(todaySessions.map(s => s.gameId)).size

    // Plan is account-level (lives on the parent).
    const parent = student.parentId
      ? await db.collection('parents').findOne({ id: student.parentId })
      : null
    // Parents now control ONLY on/off (time is bought with coins, not a cap).
    const arcadeSettings = { enabled: student.arcadeSettings?.enabled !== false }

    // The purchased time wallet — minutes of arcade time the student has left.
    const minutesRemaining = Math.max(0, student.arcadeMinutesRemaining || 0)

    return NextResponse.json({
      coins: student.coins || 0,   // spending currency — buys arcade time
      xp: student.xp || 0,         // leaderboard only; kept for display
      plan: resolveEffectivePlan(parent),
      minutesRemaining,            // purchased time left (the real gate)
      timeLimitReached: minutesRemaining <= 0,
      minutesToday,
      gamesPlayedToday,
      arcadeSettings,
      timePacks: TIME_PACKS,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error.message }, { status: 500 }
    )
  }
}

// POST — start a game session or unlock a game
export async function POST(request) {
  try {
    // Read the body once — the request stream can only be consumed a single time.
    const { studentId, gameId, action, durationMinutes, sessionId, pack } =
      await request.json()

    const db = await connectDB()
    const student = await db.collection('children')
      .findOne({ id: studentId })
    if (!student) return NextResponse.json(
      { error: 'Student not found' }, { status: 404 }
    )

    // Buy arcade time with coins (100c → 5 min, 200c → 10 min). Games are all
    // free to open; TIME is the currency now. Atomic guarded spend so a
    // double-submit can't overdraw coins.
    if (action === 'buyTime') {
      const cost = timePackCost(pack)
      const minutes = timePackMinutes(pack)
      if (cost == null || minutes == null) {
        return NextResponse.json({ error: 'Unknown time pack' }, { status: 400 })
      }
      const after = await adjustCoins(db, studentId, {
        coins: -cost, reason: 'arcade-time',
        meta: { pack: String(pack), minutes },
        guard: { coins: { $gte: cost } },
      })
      if (!after) {
        return NextResponse.json(
          { error: `Need ${cost} coins 🪙 for ${minutes} minutes`, coins: student.coins || 0 },
          { status: 403 }
        )
      }
      // Credit the purchased minutes onto the wallet (separate $inc so the coin
      // ledger and the time wallet stay independent).
      const upd = await db.collection('children').findOneAndUpdate(
        { id: studentId },
        { $inc: { arcadeMinutesRemaining: minutes } },
        { returnDocument: 'after' }
      )
      const doc = upd?.value || upd
      return NextResponse.json({
        success: true,
        coinsSpent: cost,
        newCoins: after.coins,
        minutesRemaining: Math.max(0, doc?.arcadeMinutesRemaining || 0),
      })
    }

    const game = ARCADE_GAMES.find(g => g.id === gameId)
    if (!game) return NextResponse.json(
      { error: 'Game not found' }, { status: 404 }
    )

    if (action === 'start') {
      // Parents control on/off only (default on). No per-game unlock anymore.
      if (student.arcadeSettings?.enabled === false) return NextResponse.json(
        { error: 'Arcade disabled by parent' }, { status: 403 }
      )

      // HERO gate — block the arcade unless today's requirement is DONE.
      //   • A due monthly exam takes priority (it replaces the daily task).
      //   • Otherwise today's daily task must be complete.
      // We block whenever it isn't explicitly done (including a fresh day where
      // no task has been generated yet) so the arcade can't be reached early.
      const examDue = isExamDue(student.createdAt, student.lastExamAt || null)
      if (examDue && !isTaskDoneToday(student.dailyTask)) {
        return NextResponse.json(
          { error: 'Finish this month’s HERO exam first to unlock the Arcade.', taskLocked: true, examDue: true },
          { status: 403 }
        )
      }
      if (!isTaskDoneToday(student.dailyTask)) {
        return NextResponse.json(
          { error: 'Finish today’s HERO task first to unlock the Arcade.', taskLocked: true },
          { status: 403 }
        )
      }

      // Gate on the purchased time wallet — need at least 1 minute to play.
      const minutesRemaining = Math.max(0, student.arcadeMinutesRemaining || 0)
      if (minutesRemaining <= 0) {
        return NextResponse.json({
          error: 'No arcade time left — buy more with coins.',
          limitReached: true,
        }, { status: 403 })
      }

      // Start session. `minutesCharged` tracks how much of this session has
      // already been deducted from the wallet, so heartbeats are idempotent.
      const session = await db.collection('arcade_sessions').insertOne({
        studentId,
        gameId,
        startedAt: new Date(),
        durationMinutes: 0,
        minutesCharged: 0,
        active: true,
      })

      return NextResponse.json({
        success: true,
        sessionId: session.insertedId.toString(),
        minutesRemaining,
      })
    }

    if (action === 'end') {
      // End session and record duration. sessionId is a stringified ObjectId
      // from the start response, so convert it back to match _id.
      if (!sessionId) return NextResponse.json(
        { error: 'sessionId required' }, { status: 400 }
      )
      let id
      try {
        id = new ObjectId(sessionId)
      } catch {
        return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 })
      }
      const total = Math.max(0, Math.round(durationMinutes || 0))
      // Charge the wallet for any minutes not already charged by heartbeats.
      const sess = await db.collection('arcade_sessions').findOne({ _id: id })
      const already = sess?.minutesCharged || 0
      const toCharge = Math.max(0, total - already)
      let minutesRemaining = Math.max(0, student.arcadeMinutesRemaining || 0)
      if (toCharge > 0) {
        const upd = await db.collection('children').findOneAndUpdate(
          { id: studentId },
          { $inc: { arcadeMinutesRemaining: -toCharge } },
          { returnDocument: 'after' }
        )
        const doc = upd?.value || upd
        // Never let the wallet go negative.
        if ((doc?.arcadeMinutesRemaining || 0) < 0) {
          await db.collection('children').updateOne(
            { id: studentId }, { $set: { arcadeMinutesRemaining: 0 } }
          )
          minutesRemaining = 0
        } else {
          minutesRemaining = doc?.arcadeMinutesRemaining || 0
        }
      }
      await db.collection('arcade_sessions').updateOne(
        { _id: id },
        {
          $set: {
            endedAt: new Date(),
            durationMinutes: total,
            minutesCharged: total,
            active: false,
          }
        }
      )
      return NextResponse.json({
        success: true,
        durationMinutes: total,
        minutesRemaining,
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' }, { status: 400 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: error.message }, { status: 500 }
    )
  }
}
