import { MongoClient, ObjectId } from 'mongodb'
import { NextResponse } from 'next/server'
import { ARCADE_GAMES, canPlayGame } from '@/lib/arcadeGames'
import { getAESTMidnightUTC } from '@/lib/arcadeTime'

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

    // Get today's arcade usage (resets at AEST midnight, not UTC). Active
    // sessions are included because the heartbeat keeps their durationMinutes
    // current, so mid-session time is visible across devices.
    const todayStart = getAESTMidnightUTC()
    const todaySessions = await db.collection('arcade_sessions')
      .find({
        studentId,
        startedAt: { $gte: todayStart },
      })
      .toArray()

    const minutesToday = todaySessions.reduce(
      (sum, s) => sum + (s.durationMinutes || 0), 0
    )
    const gamesPlayedToday = new Set(
      todaySessions.map(s => s.gameId)
    ).size

    // Plan is account-level (lives on the parent); arcade limits are per-child.
    const parent = student.parentId
      ? await db.collection('parents').findOne({ id: student.parentId })
      : null
    const arcadeSettings = student.arcadeSettings || {
      dailyMinutes: 30,
      enabled: true,
      allowedDays: ['Monday','Tuesday','Wednesday','Thursday',
        'Friday','Saturday','Sunday'],
    }

    const dailyLimit = arcadeSettings.dailyMinutes || 30
    const minutesRemaining = Math.max(0, dailyLimit - minutesToday)
    const timeLimitReached = minutesToday >= dailyLimit

    return NextResponse.json({
      coins: student.coins || 0,   // spending currency — gates the arcade
      xp: student.xp || 0,         // leaderboard only; kept for display
      plan: parent?.plan || 'free',
      minutesToday,
      minutesRemaining,
      timeLimitReached,
      dailyLimit,
      gamesPlayedToday,
      arcadeSettings,
      unlockedGames: student.unlockedGames || [],
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
    const { studentId, gameId, action, durationMinutes, sessionId } =
      await request.json()

    const db = await connectDB()
    const student = await db.collection('children')
      .findOne({ id: studentId })
    if (!student) return NextResponse.json(
      { error: 'Student not found' }, { status: 404 }
    )

    const game = ARCADE_GAMES.find(g => g.id === gameId)
    if (!game) return NextResponse.json(
      { error: 'Game not found' }, { status: 404 }
    )

    const parent = student.parentId
      ? await db.collection('parents').findOne({ id: student.parentId })
      : null

    if (action === 'unlock') {
      const check = canPlayGame(game, student.coins || 0, parent?.plan)
      if (!check.allowed) return NextResponse.json(
        { error: check.reason }, { status: 403 }
      )

      // Already unlocked?
      const unlocked = student.unlockedGames || []
      if (unlocked.includes(gameId)) return NextResponse.json({
        success: true, alreadyUnlocked: true,
      })

      // Atomic deduct: only succeeds if the student still has enough coins and
      // hasn't already unlocked this game. Guards against double-submit / races
      // overdrawing coins into the negative.
      const updated = await db.collection('children').findOneAndUpdate(
        {
          id: studentId,
          coins: { $gte: game.coinsCost },
          unlockedGames: { $ne: gameId },
        },
        {
          $inc: { coins: -game.coinsCost },
          $push: { unlockedGames: gameId },
        },
        { returnDocument: 'after' }
      )
      const after = updated?.value || updated
      if (!after) {
        // Lost the race or balance dropped — re-check for a precise message.
        const current = await db.collection('children').findOne({ id: studentId })
        if ((current?.unlockedGames || []).includes(gameId)) {
          return NextResponse.json({ success: true, alreadyUnlocked: true })
        }
        return NextResponse.json(
          { error: `Need ${game.coinsCost} coins 🪙 to unlock` },
          { status: 403 }
        )
      }

      return NextResponse.json({
        success: true,
        coinsSpent: game.coinsCost,
        newCoins: after.coins,
      })
    }

    if (action === 'start') {
      // Check if game is unlocked
      const unlocked = student.unlockedGames || []
      if (!unlocked.includes(gameId)) return NextResponse.json(
        { error: 'Game not unlocked' }, { status: 403 }
      )

      // Check daily limits (per-child settings live on the children doc).
      const arcadeSettings = student.arcadeSettings || {
        dailyMinutes: 30, enabled: true
      }
      if (!arcadeSettings.enabled) return NextResponse.json(
        { error: 'Arcade disabled by parent' }, { status: 403 }
      )

      const todayStart = getAESTMidnightUTC()
      const todaySessions = await db.collection('arcade_sessions')
        .find({ studentId, startedAt: { $gte: todayStart } })
        .toArray()
      const minutesToday = todaySessions.reduce(
        (sum, s) => sum + (s.durationMinutes || 0), 0
      )

      if (minutesToday >= arcadeSettings.dailyMinutes) {
        return NextResponse.json({
          error: `Daily limit of ${arcadeSettings.dailyMinutes} minutes reached`,
          limitReached: true,
        }, { status: 403 })
      }

      // Start session
      const session = await db.collection('arcade_sessions').insertOne({
        studentId,
        gameId,
        startedAt: new Date(),
        durationMinutes: 0,
        active: true,
      })

      return NextResponse.json({
        success: true,
        sessionId: session.insertedId.toString(),
        minutesRemaining: arcadeSettings.dailyMinutes - minutesToday,
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
      await db.collection('arcade_sessions').updateOne(
        { _id: id },
        {
          $set: {
            endedAt: new Date(),
            durationMinutes: durationMinutes || 0,
            active: false,
          }
        }
      )
      return NextResponse.json({
        success: true,
        durationMinutes: durationMinutes || 0,
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
