// Content for the cinematic coming-soon page. Kept in one place so copy is easy
// to tweak without touching the layout/animation code.

export const PILLARS = [
  { emoji: '🎯', title: 'Personalised Learning', desc: "Tasks tailored to your child's strengths and learning needs.", bg: '#EFF6FF', fg: '#2563EB' },
  { emoji: '📖', title: 'Australian Curriculum', desc: 'Aligned to the Australian Curriculum (Prep – Year 6) by learning experts.', bg: '#F0FDF4', fg: '#16A34A' },
  { emoji: '💬', title: 'Step-by-Step Support', desc: 'Hero helps when they get stuck — so kids keep moving forward.', bg: '#F5F3FF', fg: '#7C3AED' },
  { emoji: '⭐', title: 'Builds Confidence', desc: 'Celebrate progress, earn rewards and grow every day.', bg: '#FFFBEB', fg: '#C49A1A' },
]

export const STEPS = [
  { emoji: '📋', title: 'Hero understands your child', desc: 'A short assessment helps identify strengths and areas to focus on.', color: '#2563EB' },
  { emoji: '🎯', title: 'Hero creates a personalised task', desc: 'Every session is tailored to what your child needs to learn next.', color: '#16A34A' },
  { emoji: '💬', title: 'Hero helps when they get stuck', desc: 'Step-by-step hints and explanations help them learn and keep going.', color: '#7C3AED' },
]

export const FAMILY_TRUST = [
  // `sub` renders on its own line (see .cs-family-sub) so "(Prep – Year 6)"
  // sits under the label instead of wrapping awkwardly on mobile.
  { emoji: '🇦🇺', label: 'Australian Curriculum Aligned', sub: '(Prep – Year 6)' },
  { emoji: '👥', label: 'Built with Educators and Learning Experts' },
  { emoji: '🛡️', label: 'Safe, Secure & Ad-Free' },
  { emoji: '❤️', label: 'Made in Australia' },
]

export const TESTIMONIALS = [
  { quote: 'My daughter asked to use it again the next day! That never happens with maths.', author: 'Parent of Year 3 student', initials: 'SM', avatarBg: '#2563EB' },
  { quote: 'Hero explains it in a way that finally clicks for my son. His confidence has grown so much.', author: 'Parent of Year 5 student', initials: 'DJ', avatarBg: '#16A34A' },
  { quote: 'The progress reports are fantastic. I can see exactly where my child needs support.', author: 'Parent of Year 2 student', initials: 'AL', avatarBg: '#C49A1A' },
]

export const OFFER_POINTS = [
  '1 month FREE',
  'Exclusive first-year Founding Family pricing',
  'Early access before the public launch',
  'Exclusive updates and behind-the-scenes news',
]

export const FAQS = [
  { q: 'How much will MyMathsHero cost?', a: 'Standard and Premium plans will be available when we launch. Founding Families receive exclusive first-year pricing, including one month free.' },
  { q: 'How does Hero use AI?', a: 'Hero uses AI to personalise maths learning, explain concepts step by step and adapt lessons based on your child\'s progress. Parents remain in control, and Hero is designed to support learning rather than replace teachers.' },
  { q: 'Can I track my child\'s progress?', a: 'Yes. Parents receive easy-to-understand progress reports showing strengths, areas for improvement and overall learning growth.' },
  { q: 'What age groups is MyMathsHero for?', a: 'MyMathsHero is designed for Australian primary school children from Prep to Year 6. The platform adapts to each child\'s learning level, helping them build confidence while working through age-appropriate maths concepts.' },
  { q: 'Is MyMathsHero aligned to the Australian Curriculum?', a: 'Yes. Our maths content is designed to align with the Australian Curriculum, helping children practise the key concepts they learn at school — across number, addition and subtraction, multiplication and division, fractions, measurement, geometry, statistics, probability, algebra and problem solving.' },
  { q: 'How does the founding family offer work?', a: 'The first 1,000 families to join receive one month free, Founding Family pricing of $19.99 per month for the first year (normally $24.99), and early access before public launch. Simply join the waitlist to reserve your spot.' },
  { q: 'When will MyMathsHero launch?', a: 'MyMathsHero is launching in September 2026. Join the waitlist and we\'ll email you with launch updates, early-access information and details about the Founding Family offer.' },
  { q: 'Is MyMathsHero safe for children?', a: 'Yes. Child safety is a priority. There are no public chat features and children cannot communicate freely with other users. Features such as Hero Speed Challenge focus on friendly maths competition without messaging or social interaction.' },
  { q: 'Does it replace school or tutoring?', a: 'No. MyMathsHero is designed to support classroom learning, homework and tutoring. It provides additional personalised practice that helps children reinforce the concepts they are learning at school.' },
]

// Floating maths symbols in the hero — decorative background only. Positioned in
// the RIGHT half + top/edge empty zones so they never sit over the left-column
// headline. x/y = start; dx/dy = parallax drift on scroll; dur = idle float.
// (Hidden on mobile, where there's no room for them — see the media query.)
export const FLOAT_SYMBOLS = [
  { ch: '2 + 3 = 5', x: '66%', y: '14%', size: 34, color: '#2563EB', dx: 60, dy: -30, dur: 7 },
  { ch: '△', x: '88%', y: '30%', size: 50, color: '#16A34A', dx: 50, dy: 30, dur: 6.5 },
  { ch: '▢', x: '92%', y: '58%', size: 40, color: '#7C3AED', dx: 60, dy: 50, dur: 8 },
  { ch: '½', x: '58%', y: '8%', size: 40, color: '#2563EB', dx: -30, dy: -40, dur: 6 },
  { ch: '×', x: '80%', y: '80%', size: 40, color: '#C49A1A', dx: 40, dy: 50, dur: 6 },
]
