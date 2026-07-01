/**
 * Single choke-point for changing a student's coins / XP so EVERY change is
 * atomic AND written to the `coin_transactions` ledger. Before this, coins were
 * a bare number on the children doc with no history — so "where did my coins go?"
 * was unanswerable. Now every earn/spend/grant is traceable, and admins can
 * inspect or restore a balance from the ledger.
 *
 *   await adjustCoins(db, studentId, { coins: 2, xp: 10, reason: 'answer', meta })
 *   await adjustCoins(db, studentId, { coins: -10, reason: 'arcade-unlock', meta })
 *
 * Returns { coins, xp } — the balance AFTER the change (or null if the student
 * was not found / a guarded update didn't apply).
 */
export async function adjustCoins(db, studentId, { coins = 0, xp = 0, reason, meta = {}, guard = null } = {}) {
  if (!studentId) return null
  const inc = {}
  if (coins) inc.coins = coins
  if (xp) inc.xp = xp
  if (!Object.keys(inc).length) return null

  // Optional guard (e.g. { coins: { $gte: cost } }) for spends that must not
  // overdraw. When present and the update doesn't match, we log nothing.
  const filter = { id: studentId, ...(guard || {}) }
  const updated = await db.collection('children').findOneAndUpdate(
    filter,
    { $inc: inc },
    { returnDocument: 'after' },
  )
  const after = updated?.value || updated
  if (!after) return null

  // Ledger entry — one row per change. balanceAfter makes reconstruction trivial.
  try {
    await db.collection('coin_transactions').insertOne({
      studentId,
      coins: coins || 0,
      xp: xp || 0,
      reason: reason || 'unspecified',
      balanceAfter: { coins: after.coins ?? 0, xp: after.xp ?? 0 },
      meta,
      at: new Date(),
    })
  } catch { /* never let ledger failure block the balance change */ }

  return { coins: after.coins ?? 0, xp: after.xp ?? 0 }
}

// Log a coin/XP change that a route already applied atomically (e.g. a guarded
// spend that also mutates other fields like unlockedGames, so it can't go
// through adjustCoins). `after` is the updated student doc for balanceAfter.
export async function logCoinChange(db, studentId, { coins = 0, xp = 0, reason, meta = {}, after = null } = {}) {
  if (!studentId) return
  try {
    await db.collection('coin_transactions').insertOne({
      studentId,
      coins: coins || 0,
      xp: xp || 0,
      reason: reason || 'unspecified',
      balanceAfter: after ? { coins: after.coins ?? 0, xp: after.xp ?? 0 } : null,
      meta,
      at: new Date(),
    })
  } catch { /* never block on ledger write */ }
}

// Read a student's ledger (most recent first). For the admin history view.
export async function getCoinHistory(db, studentId, limit = 100) {
  return db.collection('coin_transactions')
    .find({ studentId })
    .sort({ at: -1 })
    .limit(limit)
    .toArray()
}
