import { questionHash } from './questionHash'

// Single choke-point for writing NEW questions into the bank so duplicates can
// never enter (the generator/verifier had no dedup, which is why questions
// repeated). Every insert path should go through insertQuestions() instead of a
// raw collection.insertMany().
//
//   • stamps each doc with `qHash` (content fingerprint),
//   • drops duplicates WITHIN the incoming batch,
//   • skips docs whose hash already exists among ACTIVE questions in the DB,
//   • inserts what remains and reports what was kept vs. skipped.
//
// Returns { inserted, skipped, insertedIds }.
export async function insertQuestions(db, docs, { collection = 'questions' } = {}) {
  const col = db.collection(collection)
  const list = (Array.isArray(docs) ? docs : [docs]).filter(Boolean)
  if (list.length === 0) return { inserted: 0, skipped: 0, insertedIds: [] }

  // 1. Stamp hashes + de-dupe within the batch.
  const seen = new Set()
  const stamped = []
  for (const d of list) {
    const qHash = d.qHash || questionHash(d)
    if (seen.has(qHash)) continue
    seen.add(qHash)
    stamped.push({ ...d, qHash })
  }

  // 2. Drop any whose hash already exists among active questions.
  const hashes = stamped.map(d => d.qHash)
  const existing = await col
    .find({ qHash: { $in: hashes }, active: { $ne: false } })
    .project({ qHash: 1, _id: 0 })
    .toArray()
  const existingSet = new Set(existing.map(e => e.qHash))
  const fresh = stamped.filter(d => !existingSet.has(d.qHash))

  const skipped = list.length - fresh.length
  if (fresh.length === 0) return { inserted: 0, skipped, insertedIds: [] }

  // 3. Insert what's left. ordered:false so a race that slips a duplicate past
  // the check (unique index below) doesn't abort the whole batch.
  try {
    await col.insertMany(fresh, { ordered: false })
  } catch (e) {
    // Duplicate-key errors (11000) are fine — those are dupes we raced on.
    if (e?.code !== 11000 && !(e?.writeErrors || []).every(w => w.code === 11000)) throw e
  }
  return { inserted: fresh.length, skipped, insertedIds: fresh.map(d => d.id) }
}

// Ensure the qHash index exists. Non-unique by default (a unique index would
// reject legitimate re-inserts after a retire); the app-level check above is the
// primary guard, the index just makes lookups fast. Call once at startup/first
// use; safe to call repeatedly.
export async function ensureQHashIndex(db, { collection = 'questions' } = {}) {
  try { await db.collection(collection).createIndex({ qHash: 1 }) } catch { /* best-effort */ }
}
