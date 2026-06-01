// Maps skill IDs to proper display names and categories
// Based on Australian Curriculum Maths (Prep–Year 6)
// Keep in sync with /lib/skillNames.js (web).

export type SkillCategoryKey =
  | 'number_sense'
  | 'addition'
  | 'subtraction'
  | 'multiplication'
  | 'division'
  | 'fractions'
  | 'measurement'
  | 'geometry'
  | 'patterns'
  | 'statistics'
  | 'money'
  | 'mental_maths'

export interface SkillCategory {
  label: string
  emoji: string
  color: string
  lightColor: string
  description: string
}

export interface SkillInfo {
  name: string
  category: SkillCategoryKey
  categoryLabel: string
  emoji: string
  color: string
  lightColor: string
}

export const SKILL_CATEGORIES: Record<SkillCategoryKey, SkillCategory> = {
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
}

interface SkillMapping {
  category: SkillCategoryKey
  name: string
}

export const SKILL_ID_MAP: Record<string, SkillMapping> = {
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

  m_1_add: { category: 'addition', name: 'Addition to 10' },
  m_1_add20: { category: 'addition', name: 'Addition to 20' },
  m_2_add: { category: 'addition', name: 'Addition to 100' },
  m_2_addregroup: { category: 'addition', name: 'Addition with Regrouping' },
  m_3_add: { category: 'addition', name: 'Adding 3-Digit Numbers' },
  m_4_add: { category: 'addition', name: 'Adding 4-Digit Numbers' },
  m_3_addmulti: { category: 'addition', name: 'Adding Multiple Numbers' },

  m_1_sub: { category: 'subtraction', name: 'Subtraction to 10' },
  m_1_sub20: { category: 'subtraction', name: 'Subtraction to 20' },
  m_2_sub: { category: 'subtraction', name: 'Subtraction to 100' },
  m_2_subregroup: { category: 'subtraction', name: 'Subtraction with Regrouping' },
  m_3_sub: { category: 'subtraction', name: 'Subtracting 3-Digit Numbers' },
  m_4_sub: { category: 'subtraction', name: 'Subtracting 4-Digit Numbers' },

  m_2_multiply2: { category: 'multiplication', name: '2 Times Table' },
  m_2_multiply5: { category: 'multiplication', name: '5 Times Table' },
  m_2_multiply10: { category: 'multiplication', name: '10 Times Table' },
  m_3_multiply: { category: 'multiplication', name: 'Times Tables (3, 4, 6)' },
  m_3_multiply100: { category: 'multiplication', name: 'Multiplying by 10 and 100' },
  m_4_multiply: { category: 'multiplication', name: 'Times Tables (7, 8, 9)' },
  m_4_multiplylong: { category: 'multiplication', name: 'Long Multiplication' },
  m_5_multiply: { category: 'multiplication', name: 'Multiplying Decimals' },

  m_2_divide: { category: 'division', name: 'Division Basics' },
  m_3_divide: { category: 'division', name: 'Division with Remainders' },
  m_4_divide: { category: 'division', name: 'Long Division' },
  m_5_divide: { category: 'division', name: 'Dividing Decimals' },

  m_2_fractions: { category: 'fractions', name: 'Halves and Quarters' },
  m_3_fractions: { category: 'fractions', name: 'Fractions of Shapes' },
  m_4_fractions: { category: 'fractions', name: 'Equivalent Fractions' },
  m_4_fractionadd: { category: 'fractions', name: 'Adding Fractions' },
  m_5_fractions: { category: 'fractions', name: 'Fractions and Decimals' },
  m_4_decimals: { category: 'fractions', name: 'Decimal Numbers' },
  m_5_decimals: { category: 'fractions', name: 'Decimal Operations' },
  m_5_percentage: { category: 'fractions', name: 'Percentages' },

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

  m_1_shapes: { category: 'geometry', name: '2D Shapes' },
  m_2_shapes: { category: 'geometry', name: '3D Objects' },
  m_3_shapes: { category: 'geometry', name: 'Properties of Shapes' },
  m_4_shapes: { category: 'geometry', name: 'Angles' },
  m_5_shapes: { category: 'geometry', name: 'Transformations' },
  m_3_symmetry: { category: 'geometry', name: 'Lines of Symmetry' },

  m_1_patterns: { category: 'patterns', name: 'Simple Patterns' },
  m_2_patterns: { category: 'patterns', name: 'Number Patterns' },
  m_3_patterns: { category: 'patterns', name: 'Growing Patterns' },
  m_4_patterns: { category: 'patterns', name: 'Pattern Rules' },
  m_5_algebra: { category: 'patterns', name: 'Introduction to Algebra' },

  m_2_data: { category: 'statistics', name: 'Reading Graphs' },
  m_3_data: { category: 'statistics', name: 'Making Graphs' },
  m_4_data: { category: 'statistics', name: 'Data Analysis' },
  m_3_chance: { category: 'statistics', name: 'Chance and Probability' },
  m_5_statistics: { category: 'statistics', name: 'Statistics' },

  m_2_money: { category: 'money', name: 'Counting Money' },
  m_3_money: { category: 'money', name: 'Making Change' },
  m_4_money: { category: 'money', name: 'Money Problems' },

  m_3_mental: { category: 'mental_maths', name: 'Mental Addition Strategies' },
  m_4_mental: { category: 'mental_maths', name: 'Mental Multiplication' },
  m_5_mental: { category: 'mental_maths', name: 'Estimation' },
}

export function getSkillInfo(skillId: string | undefined | null): SkillInfo | null {
  // Reject non-Maths skill IDs entirely. Callers MUST handle null.
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

interface SkillLike {
  id?: string
  skillId?: string
  [key: string]: any
}

export interface GroupedCategory extends SkillCategory {
  category: SkillCategoryKey
  skills: Array<SkillLike & SkillInfo>
}

export function groupSkillsByCategory(
  skills: SkillLike[]
): Partial<Record<SkillCategoryKey, GroupedCategory>> {
  const grouped: Partial<Record<SkillCategoryKey, GroupedCategory>> = {}
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
    grouped[cat]!.skills.push({ ...skill, ...info })
  })
  return grouped
}
