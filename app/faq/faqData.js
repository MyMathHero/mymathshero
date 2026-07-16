// FAQ content — shared by the page UI and the FAQPage JSON-LD structured data,
// so the on-page Q&A and the schema Google reads can never drift apart.
// Answers are plain strings (no markup) so they're valid for schema.org too;
// list items are rendered from `bullets`.

export const FAQS = [
  {
    q: 'What is MyMathsHero?',
    a: 'MyMathsHero is an online maths learning platform designed for Australian primary school children from Prep to Year 6. Children receive personalised maths practice created by Hero, our friendly AI maths tutor, who helps identify strengths, target areas for improvement, and provide step-by-step guidance whenever children need support.',
  },
  {
    q: 'Who is Hero?',
    a: "Hero is your child's AI maths tutor and learning partner. Unlike traditional maths programs that present the same questions to every student, Hero creates personalised learning tasks based on your child's progress, confidence, strengths and learning needs. Hero encourages children, provides hints when they get stuck, celebrates achievements and helps build confidence with every session.",
  },
  {
    q: 'Which year levels does MyMathsHero support?',
    a: "MyMathsHero is designed for Australian children in Prep, Year 1, Year 2, Year 3, Year 4, Year 5 and Year 6. The platform adapts to each child's learning level, helping them build confidence while working through age-appropriate maths concepts.",
    bullets: ['Prep', 'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6'],
  },
  {
    q: 'Is MyMathsHero aligned with the Australian Curriculum?',
    a: 'Yes. Our maths content is designed to align with the Australian Curriculum, helping children practise the key concepts they learn at school.',
    bullets: [
      'Number and Place Value', 'Addition and Subtraction', 'Multiplication and Division',
      'Fractions and Decimals', 'Measurement', 'Geometry', 'Statistics', 'Probability',
      'Algebra', 'Problem Solving',
    ],
  },
  {
    q: 'How does Hero personalise learning?',
    a: "Every child learns differently. Hero analyses your child's answers to understand strengths, areas needing improvement, learning patterns, confidence levels and progress over time. Using this information, Hero creates personalised daily learning tasks designed to help your child improve at their own pace.",
  },
  {
    q: 'How long should my child use MyMathsHero each day?',
    a: 'Most children benefit from 10–20 minutes of regular practice. Hero creates manageable daily learning tasks that are designed to fit around school, homework and family life. Consistency is more important than long study sessions.',
  },
  {
    q: 'Can my child choose their own maths topics?',
    a: 'Yes. Each session begins with a personalised Hero Task that focuses on the skills your child needs most. Once the Hero Task is completed, children can explore additional maths categories, practise favourite topics or continue building their skills while earning rewards.',
  },
  {
    q: 'How does the reward system work?',
    a: 'Children earn coins by answering maths questions correctly and completing their Hero Tasks. Coins can then be used to unlock fun, child-friendly games inside MyMathsHero. Learning always comes first, ensuring children stay motivated while developing positive study habits.',
  },
  {
    q: 'What happens if my child gets stuck?',
    a: 'Hero is there to help. Instead of simply showing the answer, Hero provides hints and step-by-step explanations that help children understand the problem and build confidence. Our goal is to encourage learning rather than guessing.',
  },
  {
    q: 'Will my child receive the same questions every day?',
    a: "No. Hero continuously adapts learning based on your child's progress. As your child improves, Hero adjusts future tasks to keep learning engaging, challenging and personalised.",
  },
  {
    q: "Can I track my child's progress?",
    a: 'Yes. Parents receive progress reports showing completed learning tasks, strengths, areas needing extra practice, learning trends, consistency and achievements. This makes it easy to stay involved in your child\'s learning journey.',
  },
  {
    q: 'Is MyMathsHero suitable for children who struggle with maths?',
    a: "Absolutely. Many children lose confidence because they don't receive support at the moment they become stuck. Hero is designed to provide encouragement, personalised guidance and manageable learning goals that help children rebuild confidence one step at a time.",
  },
  {
    q: 'Is MyMathsHero suitable for advanced learners?',
    a: "Yes. Hero adjusts the level of challenge based on each child's ability, allowing confident learners to continue progressing while remaining engaged.",
  },
  {
    q: 'Does MyMathsHero replace school or tutoring?',
    a: 'No. MyMathsHero is designed to support classroom learning, homework and tutoring. It provides additional personalised practice that helps children reinforce the concepts they are learning at school.',
  },
  {
    q: 'Is MyMathsHero safe for children?',
    a: 'Yes. Child safety is a priority. MyMathsHero is designed as a safe learning environment. There are no public chat features and children cannot communicate freely with other users. Features such as Hero Speed Challenge focus on friendly maths competition without messaging or social interaction.',
  },
  {
    q: 'Can children compete against each other?',
    a: 'Yes. Children can participate in Hero Speed Challenge, a timed maths competition against other students. There is no chat or messaging, helping keep the experience focused on learning, speed and accuracy.',
  },
  {
    q: 'Can I use MyMathsHero on multiple devices?',
    a: 'Yes. MyMathsHero is designed to work across supported computers, tablets and mobile devices, allowing children to continue learning wherever they are.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Yes. Families who join the waitlist before launch may receive special early-access offers, including our Founding Family promotion.',
  },
  {
    q: 'What is the Founding Family offer?',
    a: 'The first 1,000 families to join MyMathsHero will receive one month free, Founding Family pricing of $19.99 per month for the first year (normally $24.99), and early access before public launch.',
    bullets: [
      'One month FREE',
      'Founding Family pricing of $19.99 per month for the first year (normally $24.99)',
      'Early access before public launch',
    ],
  },
  {
    q: 'Will English be available?',
    a: 'Yes. MyMathsHero is the first subject being launched. Our long-term vision is to expand into English learning through MyEnglishHero, giving families access to personalised AI learning across multiple subjects.',
  },
  {
    q: 'How do I join the waitlist?',
    a: "Simply enter your details on our Join the Waitlist form. You'll receive launch updates, early-access information and details about our Founding Family offer.",
  },
]
