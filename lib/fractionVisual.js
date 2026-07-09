// Extract a fraction diagram spec { type, shape, parts, shaded } from a fraction
// question's wording, so it can be rendered on screen. Shared by the backfill
// script, generation, and any future re-parse. Returns null if the text doesn't
// describe a shaded-parts fraction (so we don't attach a wrong diagram).
export function parseFractionVisual(text) {
  const t = String(text || '')

  // Total parts: "divided into N equal parts", "cut into N", "N equal parts".
  const totalM = t.match(/(?:divided|cut|split)\s+into\s+(\d+)\s+equal\s+parts/i)
    || t.match(/(\d+)\s+equal\s+parts/i)
    || t.match(/out\s+of\s+(\d+)\s+(?:equal\s+)?parts/i)
  if (!totalM) return null
  const parts = parseInt(totalM[1], 10)
  if (!parts || parts < 2 || parts > 24) return null

  // Shaded count. Several phrasings:
  //   "M out of N ... shaded", "M parts are shaded/coloured", "M of the parts",
  //   "One part is shaded", "All N parts", "M/N is shaded".
  let shaded = null
  const words = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, all: parts }
  let m
  if ((m = t.match(/(\d+)\s+out\s+of\s+\d+\s+(?:equal\s+)?parts\s+(?:are|is)\s+(?:shaded|coloured|colored)/i))) shaded = +m[1]
  else if ((m = t.match(/(\d+)\/(\d+)\s+(?:is|are)\s+(?:shaded|coloured|colored)/i))) { shaded = +m[1]; /* keep parts from denom if consistent */ }
  else if ((m = t.match(/(\d+)\s+(?:of\s+the\s+)?parts?\s+(?:are|is)\s+(?:shaded|coloured|colored|blue)/i))) shaded = +m[1]
  else if ((m = t.match(/(\d+)\s+parts?\s+(?:are|is)\s+(?:shaded|coloured|colored)/i))) shaded = +m[1]
  else if ((m = t.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|all)\b\s+(?:of\s+the\s+)?parts?\s+(?:are|is)?\s*(?:shaded|coloured|colored)/i))) shaded = words[m[1].toLowerCase()]
  else if ((m = t.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|all)\b\s+part\s+is\s+(?:shaded|coloured|colored)/i))) shaded = words[m[1].toLowerCase()]

  if (shaded == null || shaded < 0 || shaded > parts) return null

  const shape = /circle/i.test(t) ? 'circle' : /square/i.test(t) ? 'square' : 'rectangle'
  const type = shape === 'circle' ? 'fraction-circle' : 'fraction-bar'
  return { type, shape, parts, shaded }
}
