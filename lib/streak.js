/**
 * Returns today's date as YYYY-MM-DD in Australian Eastern Time (UTC+10/+11).
 * Handles both AEST (UTC+10) and AEDT (UTC+11) by using a fixed offset of +10
 * as a safe baseline — close enough for streak day boundaries.
 */
function getTodayAEST() {
  const now = new Date()
  // Australian Eastern Standard Time is UTC+10; AEDT is UTC+11.
  // We use the Intl API to get the correct local date in Sydney.
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)

  const y = parts.find(p => p.type === 'year').value
  const m = parts.find(p => p.type === 'month').value
  const d = parts.find(p => p.type === 'day').value
  return `${y}-${m}-${d}` // YYYY-MM-DD
}

function subtractOneDay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() - 1)
  return dt.toISOString().slice(0, 10) // YYYY-MM-DD
}

/**
 * Updates the streak for a student based on their lastActiveDate.
 *
 * @param {string} studentId - the student's `id` field in the children collection
 * @param {object} db - connected MongoDB db instance
 * @returns {{ streak: number, changed: boolean, extended?: boolean, reset?: boolean }}
 */
export async function updateStreak(studentId, db) {
  const student = await db.collection('children').findOne({ id: studentId })
  if (!student) return { streak: 0, changed: false }

  const today = getTodayAEST()
  const yesterday = subtractOneDay(today)
  const lastActive = student.lastActiveDate ?? null
  const currentStreak = student.streak ?? 0
  const longestStreak = student.longestStreak ?? 0

  // Already counted today — no change
  if (lastActive === today) {
    return { streak: currentStreak, changed: false }
  }

  let newStreak
  let extended = false
  let reset = false

  if (lastActive === yesterday) {
    // Consecutive day — extend streak
    newStreak = currentStreak + 1
    extended = true
  } else {
    // Gap of 2+ days, or first time ever
    newStreak = 1
    reset = currentStreak > 0 // only a "reset" if they had a streak before
  }

  const newLongest = Math.max(newStreak, longestStreak)

  await db.collection('children').updateOne(
    { id: studentId },
    {
      $set: {
        streak: newStreak,
        lastActiveDate: today,
        longestStreak: newLongest,
      },
    }
  )

  return { streak: newStreak, changed: true, extended, reset }
}
