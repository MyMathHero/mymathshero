/**
 * Manipulatives mapping
 *
 * Maps a maths concept to one of the three interactive visual tools that Hero
 * (the AI tutor) can surface inline when a student is stuck. The decision of
 * WHEN to show a tool is made by the AI (see app/api/student/hint/route.js,
 * which lets Hero emit a `[[manipulative:...]]` tag); this file only resolves
 * WHICH tool and validates the tag.
 *
 * The three tools are rendered with pure SVG (web: components/manipulatives/*,
 * mobile: mobile/components/manipulatives/*) and cost nothing to run.
 */

// Canonical tool keys — these are the only values Hero may emit in a tag.
export const MANIPULATIVES = {
  TEN_FRAME: 'tenframe',
  NUMBER_LINE: 'numberline',
  PIZZA: 'pizza',
}

const VALID = new Set(Object.values(MANIPULATIVES))

// Recommender strand (lib/recommender.js) → default tool for that strand.
const STRAND_TO_TOOL = {
  Fractions: MANIPULATIVES.PIZZA,
  Number: MANIPULATIVES.NUMBER_LINE,
  Multiplication: MANIPULATIVES.NUMBER_LINE,
  Division: MANIPULATIVES.NUMBER_LINE,
}

// Specific skill ids that map better to a different tool than their strand
// default. Early counting/place-value skills suit the ten-frame.
const SKILL_TO_TOOL = {
  m_prep_count10: MANIPULATIVES.TEN_FRAME,
  m_prep_add5: MANIPULATIVES.TEN_FRAME,
  m_1_add20: MANIPULATIVES.TEN_FRAME,
  m_1_sub10: MANIPULATIVES.TEN_FRAME,
  m_1_place10: MANIPULATIVES.TEN_FRAME,
}

/**
 * Normalise a raw tag value Hero produced (e.g. "fractions", "Number Line",
 * "ten-frame") into a canonical tool key, or null if it isn't recognised.
 */
export function normaliseManipulative(raw) {
  if (!raw || typeof raw !== 'string') return null
  const key = raw.toLowerCase().replace(/[\s_-]/g, '')
  if (key === 'fractions' || key === 'fraction' || key === 'pizza' || key === 'pie') {
    return MANIPULATIVES.PIZZA
  }
  if (key === 'numberline' || key === 'number' || key === 'kangaroo') {
    return MANIPULATIVES.NUMBER_LINE
  }
  if (key === 'tenframe' || key === 'counting' || key === 'count' || key === 'frame') {
    return MANIPULATIVES.TEN_FRAME
  }
  return VALID.has(key) ? key : null
}

/** True if `tool` is one of the three valid tool keys. */
export function isValidManipulative(tool) {
  return VALID.has(tool)
}

/**
 * Suggest a tool from a skill id and/or strand, for cases where Hero names a
 * concept but not a specific tool. Returns a tool key or null.
 */
export function toolForSkill({ skillId, strand } = {}) {
  if (skillId && SKILL_TO_TOOL[skillId]) return SKILL_TO_TOOL[skillId]
  if (strand && STRAND_TO_TOOL[strand]) return STRAND_TO_TOOL[strand]
  return null
}
