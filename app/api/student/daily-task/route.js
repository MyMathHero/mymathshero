import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import { getRecommendations, getEffectiveCeiling } from '@/lib/recommender'
import { getSkillInfo } from '@/lib/skillNames'
import { adjustCoins } from '@/lib/coins'
import { dailyTaskBonus } from '@/lib/coinRules'
import {
  dailyTaskQuestionCount, todayKeyAEST, needsNewTask, isTaskDoneToday,
} from '@/lib/dailyTask'

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

// Pick today's HERO task skill from the student's strengths/weaknesses.
async function buildTask(db, student) {
  const scores = await db.collection('skill_scores').find({ studentId: student.id }).toArray()
  const scoreMap = {}
  scores.forEach(s => { scoreMap[s.skillId] = s.score })
  const effectiveGrade = getEffectiveCeiling(student.grade ?? 3, scoreMap, {
    placementFloor: student?.placement?.estimatedGrade ?? 0,
  })
  const recs = getRecommendations(effectiveGrade, scoreMap, 3)
  const top = recs[0]
  const skillId = top?.id || 'm_3_multiply100'
  const info = getSkillInfo(skillId) || {}
  const target = dailyTaskQuestionCount(student.grade ?? 3, student.createdAt)
  return {
    date: todayKeyAEST(),
    skillId,
    skillName: top?.name || info.name || 'Maths',
    category: info.category || null,
    target,
    progress: 0,
    done: false,
    bonus: dailyTaskBonus(student.grade ?? 3),
  }
}

// GET — return today's task (generating a fresh one on a new day).
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 })

    const db = await connectDB()
    const student = await db.collection('children').findOne({ id: studentId })
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

    let task = student.dailyTask
    if (needsNewTask(task)) {
      task = await buildTask(db, student)
      await db.collection('children').updateOne({ id: studentId }, { $set: { dailyTask: task } })
    }

    return NextResponse.json({ task, done: isTaskDoneToday(task), gated: !isTaskDoneToday(task) })
  } catch (error) {
    console.error('Daily-task GET error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST — advance the task. `action:'progress'` bumps the counter (one per
// answered task question); when it reaches the target the task completes and the
// completion bonus is awarded ONCE. `action:'skip'` is not allowed — the task is
// mandatory. Idempotent: completing an already-done task pays nothing extra.
export async function POST(request) {
  try {
    const { studentId, action = 'progress', amount = 1 } = await request.json()
    if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 })

    const db = await connectDB()
    const student = await db.collection('children').findOne({ id: studentId })
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

    let task = student.dailyTask
    if (needsNewTask(task)) {
      task = await buildTask(db, student)
      await db.collection('children').updateOne({ id: studentId }, { $set: { dailyTask: task } })
    }

    if (task.done) {
      return NextResponse.json({ task, done: true, alreadyDone: true })
    }

    if (action !== 'progress') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const inc = Math.max(1, Math.min(Number(amount) || 1, 5))
    const newProgress = Math.min(task.target, (task.progress || 0) + inc)
    const justFinished = newProgress >= task.target

    const updatedTask = { ...task, progress: newProgress, done: justFinished }
    await db.collection('children').updateOne(
      { id: studentId }, { $set: { dailyTask: updatedTask } }
    )

    let bonusAwarded = 0
    if (justFinished) {
      // Award the completion bonus once. Guard on the DB flag so a double POST
      // can't double-pay: only pay if the stored task wasn't already done.
      const guardRes = await db.collection('children').findOneAndUpdate(
        { id: studentId, 'dailyTask.date': updatedTask.date, 'dailyTask.bonusPaid': { $ne: true } },
        { $set: { 'dailyTask.bonusPaid': true } },
        { returnDocument: 'after' }
      )
      const applied = guardRes?.value || guardRes
      if (applied) {
        const bonus = task.bonus || dailyTaskBonus(student.grade ?? 3)
        await adjustCoins(db, studentId, {
          coins: bonus, reason: 'daily-task',
          meta: { skillId: task.skillId, target: task.target },
        })
        bonusAwarded = bonus
      }
    }

    return NextResponse.json({
      task: updatedTask,
      done: justFinished,
      justFinished,
      bonusAwarded,
    })
  } catch (error) {
    console.error('Daily-task POST error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
