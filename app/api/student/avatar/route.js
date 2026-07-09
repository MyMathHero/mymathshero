import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import { AVATAR_ITEMS } from '@/lib/avatarItems'
import { isCharacterId } from '@/lib/characterAvatars'
import { logCoinChange, adjustCoins } from '@/lib/coins'
import { AVATAR_CHANGE_COST } from '@/lib/coinRules'

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
    const studentId = searchParams.get('studentId')
    if (!studentId) {
      return NextResponse.json({ error: 'studentId required' }, { status: 400 })
    }

    const db = await connectDB()
    const student = await db.collection('children').findOne({ id: studentId })
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    return NextResponse.json({
      avatar: student.avatarConfig || null,
      character: student.avatar || null,
      profilePhoto: student.profilePhoto || null,
      unlockedItems: student.unlockedAvatarItems || [],
      coins: student.coins || 0,
      changeCost: AVATAR_CHANGE_COST,
    })
  } catch (error) {
    console.error('Avatar GET error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { studentId, action, category, itemId, photo } = await request.json()
    if (!studentId) {
      return NextResponse.json({ error: 'studentId required' }, { status: 400 })
    }

    const db = await connectDB()
    const student = await db.collection('children').findOne({ id: studentId })
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Character avatars are the single source of truth shown everywhere.
    // Changing the character now costs coins (AVATAR_CHANGE_COST) — but only when
    // it actually changes (re-selecting the same character, or a student's very
    // first character, is free).
    if (action === 'setCharacter') {
      if (!isCharacterId(itemId)) {
        return NextResponse.json({ error: 'Unknown character' }, { status: 400 })
      }
      const isChange = student.avatar && student.avatar !== itemId
      if (isChange) {
        // Atomic guarded spend — never overdraw.
        const after = await adjustCoins(db, studentId, {
          coins: -AVATAR_CHANGE_COST, reason: 'avatar-change',
          meta: { kind: 'character', to: itemId },
          guard: { coins: { $gte: AVATAR_CHANGE_COST } },
        })
        if (!after) {
          return NextResponse.json(
            { error: 'Not enough coins', coins: student.coins || 0 }, { status: 400 }
          )
        }
        await db.collection('children').updateOne({ id: studentId }, { $set: { avatar: itemId } })
        return NextResponse.json({ success: true, avatar: itemId, coinsSpent: AVATAR_CHANGE_COST, newCoins: after.coins })
      }
      await db.collection('children').updateOne(
        { id: studentId },
        { $set: { avatar: itemId } }
      )
      return NextResponse.json({ success: true, avatar: itemId, coinsSpent: 0 })
    }

    // Upload / set a personal profile photo (a data URL or hosted URL). This is
    // shown to the STUDENT ONLY (their own dashboard/profile) — never to other
    // students in Challenge or the leaderboard, per the safety rules. Free.
    // `photo: null` clears it (revert to avatar).
    if (action === 'setPhoto') {
      if (photo !== null && photo !== undefined) {
        if (typeof photo !== 'string' || photo.length > 3_000_000) {
          return NextResponse.json({ error: 'Invalid photo' }, { status: 400 })
        }
        // Only allow image data URLs or https URLs — no arbitrary strings.
        const ok = /^data:image\/(png|jpe?g|webp);base64,/.test(photo) || /^https:\/\//.test(photo)
        if (!ok) return NextResponse.json({ error: 'Invalid photo format' }, { status: 400 })
      }
      await db.collection('children').updateOne(
        { id: studentId },
        photo ? { $set: { profilePhoto: photo } } : { $unset: { profilePhoto: '' } }
      )
      return NextResponse.json({ success: true, profilePhoto: photo || null })
    }

    const categoryItems = AVATAR_ITEMS[category]
    const item = categoryItems?.find(i => i.id === itemId)
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    const owned = student.unlockedAvatarItems || []
    const itemKey = `${category}_${itemId}`
    const alreadyOwned = item.cost === 0 || owned.includes(itemKey)

    if (action === 'purchase') {
      if (alreadyOwned) {
        return NextResponse.json({ error: 'Already owned' }, { status: 400 })
      }
      if ((student.coins || 0) < item.cost) {
        return NextResponse.json(
          { error: 'Not enough coins', coins: student.coins || 0 },
          { status: 400 }
        )
      }

      // $addToSet so concurrent calls can't create duplicate unlock entries.
      const upd = await db.collection('children').findOneAndUpdate(
        { id: studentId },
        {
          $inc: { coins: -item.cost },
          $addToSet: { unlockedAvatarItems: itemKey },
        },
        { returnDocument: 'after' }
      )
      await logCoinChange(db, studentId, { coins: -item.cost, reason: 'avatar-unlock', meta: { itemKey }, after: upd?.value || upd })

      return NextResponse.json({
        success: true,
        coinsSpent: item.cost,
        newCoins: (student.coins || 0) - item.cost,
        unlockedItem: itemKey,
      })
    }

    if (action === 'equip') {
      if (!alreadyOwned) {
        return NextResponse.json({ error: 'Purchase this item first' }, { status: 400 })
      }

      // Equipping a DIFFERENT item in a slot is a "change" and costs coins
      // (AVATAR_CHANGE_COST). Re-equipping what's already on is free.
      const current = (student.avatarConfig || {})[category]
      const isChange = current !== itemId
      let coinsSpent = 0
      let newCoins = student.coins || 0
      if (isChange) {
        const after = await adjustCoins(db, studentId, {
          coins: -AVATAR_CHANGE_COST, reason: 'avatar-change',
          meta: { kind: 'cosmetic', category, to: itemId },
          guard: { coins: { $gte: AVATAR_CHANGE_COST } },
        })
        if (!after) {
          return NextResponse.json(
            { error: 'Not enough coins', coins: student.coins || 0 }, { status: 400 }
          )
        }
        coinsSpent = AVATAR_CHANGE_COST
        newCoins = after.coins
      }

      const newConfig = { ...(student.avatarConfig || {}), [category]: itemId }
      await db.collection('children').updateOne(
        { id: studentId },
        { $set: { avatarConfig: newConfig } }
      )

      return NextResponse.json({ success: true, avatarConfig: newConfig, coinsSpent, newCoins })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Avatar POST error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
