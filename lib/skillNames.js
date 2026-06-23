// Maps skill IDs to proper display names and categories
// Based on Australian Curriculum Maths (Prep–Year 6)

export const SKILL_CATEGORIES = {
  number_sense: {
    label: 'Number & Place Value',
    emoji: '🔢',
    color: '#2563EB',
    lightColor: '#EFF6FF',
    description: 'Counting, place value, comparing numbers',
  },
  addition: {
    label: 'Addition',
    emoji: '➕',
    color: '#16A34A',
    lightColor: '#F0FDF4',
    description: 'Adding numbers with and without regrouping',
  },
  subtraction: {
    label: 'Subtraction',
    emoji: '➖',
    color: '#DC2626',
    lightColor: '#FEF2F2',
    description: 'Subtracting numbers with and without regrouping',
  },
  multiplication: {
    label: 'Multiplication',
    emoji: '✖️',
    color: '#7C3AED',
    lightColor: '#F5F3FF',
    description: 'Times tables, arrays, repeated addition',
  },
  division: {
    label: 'Division',
    emoji: '➗',
    color: '#EA580C',
    lightColor: '#FFF7ED',
    description: 'Sharing equally, remainders, long division',
  },
  fractions: {
    label: 'Fractions & Decimals',
    emoji: '½',
    color: '#0891B2',
    lightColor: '#ECFEFF',
    description: 'Halves, quarters, tenths, hundredths',
  },
  measurement: {
    label: 'Measurement',
    emoji: '📏',
    color: '#CA8A04',
    lightColor: '#FEFCE8',
    description: 'Length, mass, capacity, time, temperature',
  },
  geometry: {
    label: 'Geometry & Space',
    emoji: '📐',
    color: '#DB2777',
    lightColor: '#FDF2F8',
    description: '2D shapes, 3D objects, angles, symmetry',
  },
  patterns: {
    label: 'Patterns & Algebra',
    emoji: '🔄',
    color: '#059669',
    lightColor: '#ECFDF5',
    description: 'Number patterns, rules, sequences',
  },
  statistics: {
    label: 'Statistics & Probability',
    emoji: '📊',
    color: '#4F46E5',
    lightColor: '#EEF2FF',
    description: 'Data, graphs, chance, likelihood',
  },
  money: {
    label: 'Money & Finance',
    emoji: '💰',
    color: '#B45309',
    lightColor: '#FFFBEB',
    description: 'Counting money, making change, budgeting',
  },
  mental_maths: {
    label: 'Mental Maths',
    emoji: '🧠',
    color: '#6D28D9',
    lightColor: '#F5F3FF',
    description: 'Quick calculations, estimation, rounding',
  },
  // ── Secondary categories (Years 7–12) ──────────────────────────────────────
  // Added for Years 7–12 content. Public UI currently stays Prep–Year 6, so
  // these only surface once higher grades are published.
  algebra: {
    label: 'Algebra',
    emoji: '🔡',
    color: '#0D9488',
    lightColor: '#F0FDFA',
    description: 'Expressions, equations, inequalities, linear & quadratic',
  },
  trigonometry: {
    label: 'Trigonometry',
    emoji: '📐',
    color: '#9333EA',
    lightColor: '#FAF5FF',
    description: 'Ratios, Pythagoras, sine/cosine rules, the unit circle',
  },
  calculus: {
    label: 'Calculus',
    emoji: '∫',
    color: '#BE123C',
    lightColor: '#FFF1F2',
    description: 'Limits, differentiation, integration, rates of change',
  },
}

// Maps skill IDs to categories and proper display names
export const SKILL_ID_MAP = {
  // NUMBER SENSE
  m_1_count10: { category: 'number_sense', name: 'Counting to 10' },
  m_1_count20: { category: 'number_sense', name: 'Counting to 20' },
  m_1_count100: { category: 'number_sense', name: 'Counting to 100' },
  m_2_placevalue: { category: 'number_sense', name: 'Place Value (Tens & Ones)' },
  m_3_placevalue: { category: 'number_sense', name: 'Place Value (Hundreds)' },
  m_4_placevalue: { category: 'number_sense', name: 'Place Value (Thousands)' },
  m_3_count10: { category: 'number_sense', name: 'Counting by 10s and 100s' },
  m_3_count5: { category: 'number_sense', name: 'Counting by 5s' },
  m_2_oddeven: { category: 'number_sense', name: 'Odd and Even Numbers' },
  m_3_ordinal: { category: 'number_sense', name: 'Ordinal Numbers' },
  m_4_rounding: { category: 'number_sense', name: 'Rounding Numbers' },
  m_5_integers: { category: 'number_sense', name: 'Negative Numbers' },

  // ADDITION
  m_1_add: { category: 'addition', name: 'Addition to 10' },
  m_1_add20: { category: 'addition', name: 'Addition to 20' },
  m_2_add: { category: 'addition', name: 'Addition to 100' },
  m_2_addregroup: { category: 'addition', name: 'Addition with Regrouping' },
  m_3_add: { category: 'addition', name: 'Adding 3-Digit Numbers' },
  m_4_add: { category: 'addition', name: 'Adding 4-Digit Numbers' },
  m_3_addmulti: { category: 'addition', name: 'Adding Multiple Numbers' },

  // SUBTRACTION
  m_1_sub: { category: 'subtraction', name: 'Subtraction to 10' },
  m_1_sub20: { category: 'subtraction', name: 'Subtraction to 20' },
  m_2_sub: { category: 'subtraction', name: 'Subtraction to 100' },
  m_2_subregroup: { category: 'subtraction', name: 'Subtraction with Regrouping' },
  m_3_sub: { category: 'subtraction', name: 'Subtracting 3-Digit Numbers' },
  m_4_sub: { category: 'subtraction', name: 'Subtracting 4-Digit Numbers' },

  // MULTIPLICATION
  m_2_multiply2: { category: 'multiplication', name: '2 Times Table' },
  m_2_multiply5: { category: 'multiplication', name: '5 Times Table' },
  m_2_multiply10: { category: 'multiplication', name: '10 Times Table' },
  m_3_multiply: { category: 'multiplication', name: 'Times Tables (3, 4, 6)' },
  m_3_multiply100: { category: 'multiplication', name: 'Multiplying by 10 and 100' },
  m_4_multiply: { category: 'multiplication', name: 'Times Tables (7, 8, 9)' },
  m_4_multiplylong: { category: 'multiplication', name: 'Long Multiplication' },
  m_5_multiply: { category: 'multiplication', name: 'Multiplying Decimals' },

  // DIVISION
  m_2_divide: { category: 'division', name: 'Division Basics' },
  m_3_divide: { category: 'division', name: 'Division with Remainders' },
  m_4_divide: { category: 'division', name: 'Long Division' },
  m_5_divide: { category: 'division', name: 'Dividing Decimals' },

  // FRACTIONS
  m_2_fractions: { category: 'fractions', name: 'Halves and Quarters' },
  m_3_fractions: { category: 'fractions', name: 'Fractions of Shapes' },
  m_4_fractions: { category: 'fractions', name: 'Equivalent Fractions' },
  m_4_fractionadd: { category: 'fractions', name: 'Adding Fractions' },
  m_5_fractions: { category: 'fractions', name: 'Fractions and Decimals' },
  m_4_decimals: { category: 'fractions', name: 'Decimal Numbers' },
  m_5_decimals: { category: 'fractions', name: 'Decimal Operations' },
  m_5_percentage: { category: 'fractions', name: 'Percentages' },

  // MEASUREMENT
  m_1_measurement: { category: 'measurement', name: 'Comparing Lengths' },
  m_2_measurement: { category: 'measurement', name: 'Measuring with Rulers' },
  m_3_measurement: { category: 'measurement', name: 'Perimeter' },
  m_4_measurement: { category: 'measurement', name: 'Area and Perimeter' },
  m_5_measurement: { category: 'measurement', name: 'Volume and Capacity' },
  m_2_time: { category: 'measurement', name: "Telling Time (O'clock, Half Past)" },
  m_3_time: { category: 'measurement', name: 'Telling Time (Quarter Past/To)' },
  m_4_time: { category: 'measurement', name: 'Time Calculations' },
  m_2_mass: { category: 'measurement', name: 'Mass (Grams and Kilograms)' },
  m_3_mass: { category: 'measurement', name: 'Mass Calculations' },

  // GEOMETRY
  m_1_shapes: { category: 'geometry', name: '2D Shapes' },
  m_2_shapes: { category: 'geometry', name: '3D Objects' },
  m_3_shapes: { category: 'geometry', name: 'Properties of Shapes' },
  m_4_shapes: { category: 'geometry', name: 'Angles' },
  m_5_shapes: { category: 'geometry', name: 'Transformations' },
  m_3_symmetry: { category: 'geometry', name: 'Lines of Symmetry' },

  // PATTERNS
  m_1_patterns: { category: 'patterns', name: 'Simple Patterns' },
  m_2_patterns: { category: 'patterns', name: 'Number Patterns' },
  m_3_patterns: { category: 'patterns', name: 'Growing Patterns' },
  m_4_patterns: { category: 'patterns', name: 'Pattern Rules' },
  m_5_algebra: { category: 'patterns', name: 'Introduction to Algebra' },

  // STATISTICS
  m_2_data: { category: 'statistics', name: 'Reading Graphs' },
  m_3_data: { category: 'statistics', name: 'Making Graphs' },
  m_4_data: { category: 'statistics', name: 'Data Analysis' },
  m_3_chance: { category: 'statistics', name: 'Chance and Probability' },
  m_5_statistics: { category: 'statistics', name: 'Statistics' },

  // MONEY
  m_2_money: { category: 'money', name: 'Counting Money' },
  m_3_money: { category: 'money', name: 'Making Change' },
  m_4_money: { category: 'money', name: 'Money Problems' },

  // MENTAL MATHS
  m_3_mental: { category: 'mental_maths', name: 'Mental Addition Strategies' },
  m_4_mental: { category: 'mental_maths', name: 'Mental Multiplication' },
  m_5_mental: { category: 'mental_maths', name: 'Estimation' },

  // ── YEAR 6 — Australian Curriculum Maths ───────────────────────────────
  // Routed through the existing 12 categories so display/colours/emojis
  // continue to work without adding new SKILL_CATEGORIES entries.

  // Number & Place Value
  m_6_place_value:         { category: 'number_sense',   name: 'Large Numbers and Place Value' },
  m_6_integers:            { category: 'number_sense',   name: 'Positive and Negative Integers' },
  m_6_prime_composite:     { category: 'number_sense',   name: 'Prime and Composite Numbers' },
  m_6_factors_multiples:   { category: 'number_sense',   name: 'Factors and Multiples' },
  m_6_powers_squares:      { category: 'number_sense',   name: 'Square Numbers and Powers' },

  // Multiplication / Division (large numbers)
  m_6_multiply_large:      { category: 'multiplication', name: 'Multiplying Large Numbers' },
  m_6_divide_large:        { category: 'division',       name: 'Long Division' },
  m_6_order_operations:    { category: 'mental_maths',   name: 'Order of Operations (BODMAS)' },

  // Fractions & Decimals & Percentages
  m_6_fractions_decimals:  { category: 'fractions', name: 'Fractions and Decimals' },
  m_6_percentages:         { category: 'fractions', name: 'Percentages' },
  m_6_fractions_operations:{ category: 'fractions', name: 'Adding and Subtracting Fractions' },
  m_6_multiply_fractions:  { category: 'fractions', name: 'Multiplying Fractions' },
  m_6_divide_fractions:    { category: 'fractions', name: 'Dividing Fractions' },
  m_6_ratio_rates:         { category: 'fractions', name: 'Ratios and Rates' },

  // Patterns & Algebra
  m_6_number_patterns:     { category: 'patterns', name: 'Number Patterns and Rules' },
  m_6_equations:           { category: 'patterns', name: 'Simple Equations' },
  m_6_variables:           { category: 'patterns', name: 'Using Variables (Pronumerals)' },

  // Measurement
  m_6_area_complex:        { category: 'measurement', name: 'Area of Complex Shapes' },
  m_6_volume:              { category: 'measurement', name: 'Volume and Capacity' },
  m_6_perimeter_complex:   { category: 'measurement', name: 'Perimeter of Complex Shapes' },
  m_6_metric_convert:      { category: 'measurement', name: 'Converting Metric Units' },
  m_6_time_zones:          { category: 'measurement', name: 'Time Zones and Elapsed Time' },

  // Geometry
  m_6_angles:              { category: 'geometry', name: 'Angles and Degrees' },
  m_6_coordinates:         { category: 'geometry', name: 'Cartesian Coordinates' },
  m_6_transformations:     { category: 'geometry', name: 'Transformations (Flip, Slide, Turn)' },
  m_6_symmetry:            { category: 'geometry', name: 'Symmetry and Tessellation' },
  m_6_3d_shapes:           { category: 'geometry', name: '3D Shapes and Nets' },

  // Statistics & Probability
  m_6_data_graphs:         { category: 'statistics', name: 'Data Collection and Graphs' },
  m_6_mean_median_mode:    { category: 'statistics', name: 'Mean, Median and Mode' },
  m_6_probability:         { category: 'statistics', name: 'Probability and Chance' },
  m_6_pie_charts:          { category: 'statistics', name: 'Pie Charts and Column Graphs' },

  // ══════════════════════════════════════════════════════════════════════════
  // YEARS 7–12 — Australian Curriculum (7–10) + senior secondary (11–12).
  // Built internally for adaptive reach; public UI stays Prep–Year 6 for now.
  // Routed through the existing + new secondary categories.
  // ══════════════════════════════════════════════════════════════════════════

  // ── YEAR 7 ─────────────────────────────────────────────────────────────────
  m_7_integers:            { category: 'number_sense',   name: 'Integers and Directed Numbers' },
  m_7_index_notation:      { category: 'number_sense',   name: 'Index Notation and Powers' },
  m_7_prime_factorisation: { category: 'number_sense',   name: 'Prime Factorisation, HCF and LCM' },
  m_7_fractions_ops:       { category: 'fractions',      name: 'Operations with Fractions' },
  m_7_decimals_ops:        { category: 'fractions',      name: 'Operations with Decimals' },
  m_7_percentages:         { category: 'fractions',      name: 'Percentages and Applications' },
  m_7_ratio_rates:         { category: 'fractions',      name: 'Ratios and Rates' },
  m_7_algebra_intro:       { category: 'algebra',        name: 'Introduction to Algebra' },
  m_7_algebraic_expr:      { category: 'algebra',        name: 'Simplifying Algebraic Expressions' },
  m_7_linear_equations:    { category: 'algebra',        name: 'Solving Linear Equations' },
  m_7_coordinates:         { category: 'geometry',       name: 'The Cartesian Plane' },
  m_7_angles:              { category: 'geometry',       name: 'Angles and Parallel Lines' },
  m_7_2d_shapes:           { category: 'geometry',       name: 'Triangles and Quadrilaterals' },
  m_7_area_perimeter:      { category: 'measurement',    name: 'Area and Perimeter' },
  m_7_volume:              { category: 'measurement',    name: 'Volume of Prisms' },
  m_7_data_summary:        { category: 'statistics',     name: 'Summarising Data (Mean, Median, Mode, Range)' },
  m_7_probability:         { category: 'statistics',     name: 'Introduction to Probability' },

  // ── YEAR 8 ─────────────────────────────────────────────────────────────────
  m_8_indices:             { category: 'number_sense',   name: 'Index Laws' },
  m_8_rational_numbers:    { category: 'number_sense',   name: 'Rational Numbers' },
  m_8_percentage_change:   { category: 'fractions',      name: 'Percentage Increase and Decrease' },
  m_8_rates_ratios:        { category: 'fractions',      name: 'Rates, Ratios and Proportion' },
  m_8_algebra_expand:      { category: 'algebra',        name: 'Expanding and Factorising' },
  m_8_linear_equations:    { category: 'algebra',        name: 'Linear Equations with Brackets' },
  m_8_linear_graphs:       { category: 'algebra',        name: 'Graphing Linear Relationships' },
  m_8_congruence:          { category: 'geometry',       name: 'Congruent Figures' },
  m_8_pythagoras:          { category: 'trigonometry',   name: 'Pythagoras’ Theorem' },
  m_8_circles:             { category: 'measurement',    name: 'Circumference and Area of Circles' },
  m_8_volume_capacity:     { category: 'measurement',    name: 'Volume and Capacity' },
  m_8_data_displays:       { category: 'statistics',     name: 'Data Displays and Interpretation' },
  m_8_probability:         { category: 'statistics',     name: 'Probability of Events' },

  // ── YEAR 9 ─────────────────────────────────────────────────────────────────
  m_9_indices_scientific:  { category: 'number_sense',   name: 'Index Laws and Scientific Notation' },
  m_9_surds_intro:         { category: 'number_sense',   name: 'Introduction to Surds' },
  m_9_algebra_factorise:   { category: 'algebra',        name: 'Factorising Quadratic Expressions' },
  m_9_linear_simultaneous: { category: 'algebra',        name: 'Simultaneous Linear Equations' },
  m_9_linear_graphs:       { category: 'algebra',        name: 'Gradient and Linear Graphs' },
  m_9_quadratics_intro:    { category: 'algebra',        name: 'Introduction to Quadratics' },
  m_9_trig_ratios:         { category: 'trigonometry',   name: 'Trigonometric Ratios (SOH CAH TOA)' },
  m_9_pythagoras_apply:    { category: 'trigonometry',   name: 'Applying Pythagoras’ Theorem' },
  m_9_similarity:          { category: 'geometry',       name: 'Similar Figures and Scale' },
  m_9_surface_area:        { category: 'measurement',    name: 'Surface Area of Solids' },
  m_9_data_analysis:       { category: 'statistics',     name: 'Comparing Data Sets' },
  m_9_probability:         { category: 'statistics',     name: 'Two-Step Probability' },

  // ── YEAR 10 ────────────────────────────────────────────────────────────────
  m_10_surds_indices:      { category: 'number_sense',   name: 'Surds and Fractional Indices' },
  m_10_quadratics_solve:   { category: 'algebra',        name: 'Solving Quadratic Equations' },
  m_10_quadratic_formula:  { category: 'algebra',        name: 'The Quadratic Formula' },
  m_10_parabolas:          { category: 'algebra',        name: 'Graphing Parabolas' },
  m_10_simultaneous:       { category: 'algebra',        name: 'Simultaneous Equations (Linear & Non-linear)' },
  m_10_polynomials:        { category: 'algebra',        name: 'Introduction to Polynomials' },
  m_10_trig_applications:  { category: 'trigonometry',   name: 'Trigonometry: Sine and Cosine Rules' },
  m_10_circle_geometry:    { category: 'geometry',       name: 'Circle Geometry' },
  m_10_measurement:        { category: 'measurement',    name: 'Surface Area and Volume of Composite Solids' },
  m_10_statistics:         { category: 'statistics',     name: 'Standard Deviation and Box Plots' },
  m_10_probability:        { category: 'statistics',     name: 'Conditional Probability' },

  // ── YEAR 11 (senior secondary, General/Methods foundations) ─────────────────
  m_11_functions:          { category: 'algebra',        name: 'Functions and Relations' },
  m_11_quadratic_functions:{ category: 'algebra',        name: 'Quadratic Functions' },
  m_11_polynomials:        { category: 'algebra',        name: 'Polynomials and the Factor Theorem' },
  m_11_exponential_log:    { category: 'algebra',        name: 'Exponential and Logarithmic Functions' },
  m_11_trig_functions:     { category: 'trigonometry',   name: 'Trigonometric Functions and the Unit Circle' },
  m_11_trig_identities:    { category: 'trigonometry',   name: 'Trigonometric Identities' },
  m_11_sequences_series:   { category: 'patterns',       name: 'Arithmetic and Geometric Sequences' },
  m_11_calculus_intro:     { category: 'calculus',       name: 'Introduction to Differentiation' },
  m_11_probability:        { category: 'statistics',     name: 'Probability and Counting Techniques' },
  m_11_statistics:         { category: 'statistics',     name: 'Discrete Random Variables' },

  // ── YEAR 12 (senior secondary) ──────────────────────────────────────────────
  m_12_differentiation:    { category: 'calculus',       name: 'Differentiation Techniques' },
  m_12_applications_calc:  { category: 'calculus',       name: 'Applications of Differentiation' },
  m_12_integration:        { category: 'calculus',       name: 'Integration' },
  m_12_applications_int:   { category: 'calculus',       name: 'Applications of Integration' },
  m_12_trig_functions:     { category: 'trigonometry',   name: 'Trigonometric Functions and Graphs' },
  m_12_exponential_log:    { category: 'algebra',        name: 'Exponential and Logarithmic Modelling' },
  m_12_sequences_series:   { category: 'patterns',       name: 'Sequences, Series and Financial Maths' },
  m_12_normal_distribution:{ category: 'statistics',     name: 'The Normal Distribution' },
  m_12_continuous_random:  { category: 'statistics',     name: 'Continuous Random Variables' },
  m_12_statistical_inference:{ category: 'statistics',   name: 'Statistical Inference and Confidence Intervals' },
}

export function getSkillInfo(skillId) {
  // Reject non-Maths skill IDs entirely. Callers MUST handle null and skip rendering.
  if (!skillId || skillId.startsWith('e_') || skillId.startsWith('s_')) {
    return null
  }
  const mapped = SKILL_ID_MAP[skillId]
  if (mapped) {
    const cat = SKILL_CATEGORIES[mapped.category]
    return {
      name: mapped.name,
      category: mapped.category,
      categoryLabel: cat.label,
      emoji: cat.emoji,
      color: cat.color,
      lightColor: cat.lightColor,
    }
  }
  const cleaned = String(skillId || '')
    .replace(/^m_\d+_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
  return {
    name: cleaned || 'Skill',
    category: 'number_sense',
    categoryLabel: 'Maths',
    emoji: '🔢',
    color: '#1B2B4B',
    lightColor: '#F0F4F8',
  }
}

export function groupSkillsByCategory(skills) {
  const grouped = {}
  ;(skills || []).forEach(skill => {
    const info = getSkillInfo(skill.id || skill.skillId)
    if (!info) return
    const cat = info.category
    if (!grouped[cat]) {
      grouped[cat] = {
        ...SKILL_CATEGORIES[cat],
        category: cat,
        skills: [],
      }
    }
    grouped[cat].skills.push({ ...skill, ...info })
  })
  return grouped
}
