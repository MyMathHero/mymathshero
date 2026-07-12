// Hero AI config — a single shared MongoDB doc (collection `hero_config`,
// _id 'main') that the ADMIN app writes and the STUDENT app reads. It currently
// holds `avoidWords`: words/phrases Hero must never say (e.g. an over-familiar
// "g'day <name>" greeting — Hero should just say "Hi"). Additive: when the list
// is empty, prompts are unchanged.
//
// IMPORTANT: this shape MUST match the admin app's /api/hero-config so both apps
// read and write the SAME document (same cross-repo contract as `feature_flags`).

const HERO_CONFIG_ID = 'main'

export const DEFAULT_HERO_CONFIG = {
  avoidWords: [],
}

// Read the config doc, merged over defaults. Never throws — on any error it
// returns the defaults so Hero keeps working (just without custom avoid-words).
export async function getHeroConfig(db) {
  try {
    const doc = await db.collection('hero_config').findOne({ _id: HERO_CONFIG_ID })
    if (!doc) return { ...DEFAULT_HERO_CONFIG }
    const { _id, updatedAt, ...stored } = doc
    void _id; void updatedAt
    return { ...DEFAULT_HERO_CONFIG, ...stored, avoidWords: normaliseAvoidWords(stored.avoidWords) }
  } catch {
    return { ...DEFAULT_HERO_CONFIG }
  }
}

// Clean a raw avoid-words value into a de-duped, trimmed string array (max 100,
// each ≤ 60 chars) so admin input can never bloat or break a prompt.
export function normaliseAvoidWords(raw) {
  if (!Array.isArray(raw)) return []
  const seen = new Set()
  const out = []
  for (const item of raw) {
    const w = String(item ?? '').trim()
    if (!w) continue
    const key = w.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(w.slice(0, 60))
    if (out.length >= 100) break
  }
  return out
}

// Turn the avoid-words list into a prompt instruction appended to Hero's system
// prompt. Returns '' when there's nothing to avoid, so the prompt is unchanged.
export function buildAvoidInstruction(avoidWords) {
  const words = normaliseAvoidWords(avoidWords)
  if (words.length === 0) return ''
  const list = words.map(w => `"${w}"`).join(', ')
  return (
    `\n\nAVOID THESE WORDS/PHRASES: never say ${list}. ` +
    `If you would normally greet the student with their name or an over-familiar phrase, ` +
    `just say a simple "Hi" instead. Rephrase naturally so the banned words never appear.`
  )
}
