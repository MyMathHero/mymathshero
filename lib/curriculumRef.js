// Curriculum reference for question generation — grounds the generator in the
// Australian Curriculum (ACARA v9) so questions match the real curriculum
// STATEMENT and stay in-level, instead of generating from "skill name + grade"
// alone (which produced vague or out-of-level questions).
//
// Licensing: ACARA content is CC BY 4.0. These are plain-English scope
// statements + number ranges derived from the v9 content descriptions — not
// verbatim copies — expressly to steer generation.
//
// Grain: category × grade (the natural ACARA strand grain), which covers all
// ~194 skills economically. Each entry gives:
//   strand  — the ACARA strand (Number, Algebra, Measurement, Space, Statistics,
//             Probability) or senior topic.
//   scope   — what a question at THIS grade should cover.
//   range   — the concrete number range / boundaries (the bit that keeps
//             questions in-level, e.g. "within 20", "no decimals").
//   avoid   — things explicitly OUT of level for this grade (optional).
//
// Additive: getCurriculumRef returns null when there's no entry, and the
// generator falls back to its previous behaviour, so nothing breaks for a
// category/grade we haven't mapped.

// Map our 15 categories onto ACARA strands for the prompt.
const CATEGORY_STRAND = {
  number_sense: 'Number', addition: 'Number', subtraction: 'Number',
  multiplication: 'Number', division: 'Number', fractions: 'Number',
  mental_maths: 'Number', money: 'Number',
  patterns: 'Algebra', algebra: 'Algebra',
  measurement: 'Measurement', geometry: 'Space',
  statistics: 'Statistics and Probability',
  trigonometry: 'Measurement and Geometry', calculus: 'Calculus',
}

// Number ranges by grade — the single biggest lever for keeping questions
// in-level. Referenced by the Number-family scope builders below.
const NUMBER_RANGE = {
  0: 'whole numbers to 20; count, order and compare small collections; NO written algorithms',
  1: 'whole numbers to 120; counting by 1s/2s/5s/10s; NO multiplication/division algorithms',
  2: 'whole numbers to 1000; place value to hundreds; simple halves/quarters/thirds',
  3: 'whole numbers to 10 000; unit fractions (halves–tenths); recall 2/3/5/10 times tables',
  4: 'whole numbers to tens of thousands; equivalent fractions; all times tables to 10×10; introduce decimals (tenths/hundredths)',
  5: 'whole numbers beyond 100 000; add/subtract fractions with same denominator; decimals to thousandths; factors and multiples',
  6: 'integers (incl. negatives) in context; add/subtract related fractions; multiply/divide decimals; percentages of quantities; order of operations',
  7: 'integers and directed numbers; index notation; four operations with fractions and decimals; ratios; percentages',
  8: 'irrational vs rational; index laws; four operations with all rationals incl. negatives; ratios and rates; percentage change',
  9: 'index laws with integer indices; scientific notation; surds intro; direct/indirect proportion',
  10: 'surds and fractional indices; logarithms intro; algebraic fractions',
  11: 'real numbers, indices and logarithms at Methods/General level',
  12: 'complex numbers / advanced number as per Specialist/Methods',
}

// Per-strand, per-grade scope. Kept concise on purpose — one or two precise
// sentences beat a paragraph the model will skim.
function numberScope(grade) {
  const r = NUMBER_RANGE[grade]
  if (!r) return null
  return {
    strand: 'Number',
    scope: 'Fluency and problem-solving with numbers, operations, fractions/decimals and their real-world use, appropriate to the grade.',
    range: r,
  }
}

const ALGEBRA = {
  0: { scope: 'Copy, continue and describe simple repeating patterns (colours, shapes, sounds).', range: 'AB/ABC repeating patterns; NO symbols or unknowns' },
  1: { scope: 'Continue and describe number patterns; skip counting patterns.', range: 'patterns counting by 2s/5s/10s; NO variables' },
  2: { scope: 'Number patterns from addition/subtraction; find missing terms.', range: 'growing/shrinking patterns; find the next term; NO variables' },
  3: { scope: 'Growing patterns; find a missing number in an equation using number facts.', range: 'e.g. 7 + ? = 12; NO letters' },
  4: { scope: 'Patterns from multiplication; find unknown quantities in equations.', range: 'e.g. 3 × ? = 24; word "unknown", NO algebra yet' },
  5: { scope: 'Describe rules for patterns; find unknowns using inverse operations.', range: 'two-step number sentences; NO formal algebra' },
  6: { scope: 'Represent situations with a rule; use a variable to describe a pattern.', range: 'simple rules like n × 2 + 1; introduce a pronumeral' },
  7: { scope: 'Introduce algebra: substitute into and simplify simple expressions; solve one-step linear equations.', range: 'one pronumeral; integer coefficients' },
  8: { scope: 'Expand and factorise simple expressions; solve two-step linear equations.', range: 'linear only; distributive law' },
  9: { scope: 'Linear equations and inequalities; expand binomial products; gradient/intercept.', range: 'linear + simple quadratics expansion' },
  10: { scope: 'Solve linear/quadratic equations; simultaneous equations; factorise quadratics.', range: 'quadratics, simultaneous linear' },
}

const MEASUREMENT = {
  0: { scope: 'Compare and order objects by length, mass, capacity using direct comparison and everyday language.', range: 'longer/shorter, heavier/lighter; NO units' },
  1: { scope: 'Measure with uniform informal units; compare durations; days of the week.', range: 'informal units (blocks, hands); NO cm/kg' },
  2: { scope: 'Compare and order using informal units; tell time to the half-hour; calendars.', range: 'half-hours; informal units' },
  3: { scope: 'Metric units for length; perimeter of shapes; tell time to the minute (quarter past/to).', range: 'mm/cm/m; quarter past/to; simple perimeter' },
  4: { scope: 'Scaled instruments; area/perimeter of rectangles; am/pm and 12-hour time; convert simple units.', range: 'cm/m, g/kg, mL/L; whole-number results' },
  5: { scope: 'Area of rectangles; perimeter; 24-hour time; convert between adjacent metric units.', range: 'whole/one-decimal results' },
  6: { scope: 'Area/volume of rectangles and rectangular prisms; convert metric units; timetables.', range: 'formula A=l×w, V=l×w×h' },
  7: { scope: 'Areas of triangles/parallelograms; volume of prisms; circumference intro.', range: 'π as needed; composite shapes' },
  8: { scope: 'Area of circles and composite shapes; surface area and volume of prisms; time zones/rates.', range: 'π, surface area, rates' },
}

const SPACE = {
  0: { scope: 'Name and sort familiar 2D shapes and 3D objects; describe position and movement.', range: 'circle/square/triangle/rectangle; above/below/beside' },
  1: { scope: 'Recognise and classify 2D shapes and 3D objects by features; give/follow position directions.', range: 'sides and corners; simple direction' },
  2: { scope: 'Features of 2D shapes; recognise the 3D object faces; interpret simple maps.', range: 'count sides/corners; halves of shapes' },
  3: { scope: 'Properties of shapes (sides, angles, symmetry); lines of symmetry; grid references.', range: 'names of common polygons; symmetry lines' },
  4: { scope: 'Compare angles; symmetry; create symmetrical patterns; map coordinates.', range: 'right/acute/obtuse by comparison' },
  5: { scope: 'Classify angles; transformations (reflect/rotate/translate); coordinate grid (first quadrant).', range: 'measure angles with protractor intro' },
  6: { scope: 'Angles on a line/at a point; all four quadrants; nets of 3D objects.', range: 'angle sums; Cartesian plane' },
  7: { scope: 'Angle relationships (parallel lines, triangles); construct shapes; Cartesian plane.', range: 'angle sum of triangle = 180°' },
  8: { scope: 'Congruence; angle properties of quadrilaterals; Pythagoras intro.', range: 'congruent triangles; Pythagoras' },
}

const STATISTICS = {
  0: { scope: 'Answer yes/no questions by sorting a small data set; use everyday chance language.', range: 'sort into groups; "might/won’t happen"' },
  1: { scope: 'Collect and sort data; represent with simple displays; describe chance as likely/unlikely.', range: 'simple pictographs' },
  2: { scope: 'Gather data with a question; column/picture graphs (one-to-one); chance language.', range: 'one-to-one graphs' },
  3: { scope: 'Collect categorical data; make and interpret graphs; list possible chance outcomes.', range: 'read a simple bar/picture graph from stated data' },
  4: { scope: 'Survey data; interpret graphs; order chance events on a 0–1 scale (words).', range: 'read given data; likely/even/unlikely' },
  5: { scope: 'Interpret dot plots and column graphs; describe possible outcomes; simple fractions of chance.', range: 'chance as fraction, given data' },
  6: { scope: 'Interpret and compare data displays; find outcomes; probability as a fraction (0–1).', range: 'probability = favourable/total' },
  7: { scope: 'Mean/median/mode/range; sample vs population; probability of single events.', range: 'summary statistics; P(event)' },
  8: { scope: 'Compare data sets; two-way tables; probability with complements and Venn/tree.', range: 'complementary events' },
}

const MONEY = {
  1: { scope: 'Recognise Australian coins and notes.', range: 'coin/note recognition; NO change' },
  2: { scope: 'Count and order small amounts; combine coins.', range: 'amounts under $5; whole dollars/cents' },
  3: { scope: 'Represent money amounts; give change from a whole dollar.', range: 'change within $10' },
  4: { scope: 'Money calculations; solve simple purchase problems with change.', range: 'add/subtract dollars and cents' },
  5: { scope: 'Money problems with decimals; best-buy comparisons.', range: 'two-decimal money' },
  6: { scope: 'Percentage discounts and GST-style problems in money contexts.', range: 'percentages of money' },
}

const SENIOR = {
  trigonometry: {
    9: { strand: 'Measurement and Geometry', scope: 'Right-angle trig: sine, cosine, tangent ratios to find sides.', range: 'right triangles only; degrees' },
    10: { strand: 'Measurement and Geometry', scope: 'Trig to find sides and angles; angles of elevation/depression; unit circle intro.', range: 'right triangles; simple applications' },
    11: { strand: 'Measurement and Geometry', scope: 'Radian measure; sine/cosine rules; trig identities and graphs.', range: 'General/Methods level' },
    12: { strand: 'Measurement and Geometry', scope: 'Trig functions, identities and equations; applications.', range: 'Methods/Specialist level' },
  },
  calculus: {
    11: { strand: 'Calculus', scope: 'Rates of change; differentiation of polynomials; gradient of a curve.', range: 'polynomial functions; first principles intro' },
    12: { strand: 'Calculus', scope: 'Differentiation and integration of standard functions; applications (optimisation, area).', range: 'Methods level' },
  },
  algebra: {
    11: { strand: 'Algebra', scope: 'Functions, quadratics, polynomials, exponentials and logarithms.', range: 'Methods/General level' },
    12: { strand: 'Algebra', scope: 'Advanced functions, sequences and series, matrices as per course.', range: 'Methods/Specialist/General' },
  },
}

// Look up the curriculum reference for a category + grade. Returns
// { strand, scope, range, avoid? } or null (→ generator falls back).
export function getCurriculumRef(category, grade) {
  const g = Number(grade)
  if (!Number.isFinite(g)) return null

  // Senior/specialist topics first (grade 9+).
  if (SENIOR[category] && SENIOR[category][g]) return SENIOR[category][g]

  const strand = CATEGORY_STRAND[category]

  // Number family — all share the grade number range.
  const NUMBER_CATS = ['number_sense', 'addition', 'subtraction', 'multiplication', 'division', 'fractions', 'mental_maths']
  if (NUMBER_CATS.includes(category)) return numberScope(g)

  if (category === 'money' && MONEY[g]) return { strand: 'Number', ...MONEY[g] }
  if (category === 'patterns' || category === 'algebra') {
    if (ALGEBRA[g]) return { strand: 'Algebra', ...ALGEBRA[g] }
  }
  if (category === 'measurement' && MEASUREMENT[g]) return { strand: 'Measurement', ...MEASUREMENT[g] }
  if (category === 'geometry' && SPACE[g]) return { strand: 'Space', ...SPACE[g] }
  if (category === 'statistics' && STATISTICS[g]) return { strand: 'Statistics and Probability', ...STATISTICS[g] }

  // Known strand but no grade-specific entry → a light strand-only hint.
  if (strand) return { strand, scope: null, range: null }
  return null
}

// Turn a ref into a prompt block. Returns '' when there's no usable ref, so the
// generator's existing prompt is unchanged.
export function buildCurriculumBlock(category, grade) {
  const ref = getCurriculumRef(category, grade)
  if (!ref || (!ref.scope && !ref.range)) {
    return ref?.strand ? `\nAustralian Curriculum strand: ${ref.strand}.` : ''
  }
  const lines = [`\nAUSTRALIAN CURRICULUM (ACARA v9) — keep questions IN-LEVEL for this grade:`]
  if (ref.strand) lines.push(`- Strand: ${ref.strand}`)
  if (ref.scope) lines.push(`- Focus: ${ref.scope}`)
  if (ref.range) lines.push(`- Stay within: ${ref.range}`)
  if (ref.avoid) lines.push(`- Do NOT include: ${ref.avoid}`)
  return lines.join('\n')
}
