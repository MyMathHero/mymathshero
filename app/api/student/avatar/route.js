import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import { AVATAR_ITEMS } from '@/lib/avatarItems'

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
      unlockedItems: student.unlockedAvatarItems || [],
      coins: student.coins || 0,
    })
  } catch (error) {
    console.error('Avatar GET error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { studentId, action, category, itemId } = await request.json()
    if (!studentId) {
      return NextResponse.json({ error: 'studentId required' }, { status: 400 })
    }

    const db = await connectDB()
    const student = await db.collection('children').findOne({ id: studentId })
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
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
      await db.collection('children').updateOne(
        { id: studentId },
        {
          $inc: { coins: -item.cost },
          $addToSet: { unlockedAvatarItems: itemKey },
        }
      )

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

      const newConfig = { ...(student.avatarConfig || {}), [category]: itemId }
      await db.collection('children').updateOne(
        { id: studentId },
        { $set: { avatarConfig: newConfig } }
      )

      return NextResponse.json({ success: true, avatarConfig: newConfig })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Avatar POST error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
