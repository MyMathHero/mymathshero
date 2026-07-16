import LegalDoc from '@/components/LegalDoc'
import { Shield } from 'lucide-react'

export const metadata = {
  title: 'Privacy Policy | MyMathsHero',
  description:
    "How MyMathsHero collects, uses, stores, shares and protects personal information for children, parents and carers — including our commitment to children's privacy under Australian law.",
  alternates: { canonical: '/privacy' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Privacy Policy | MyMathsHero',
    description: "How we protect the privacy of children, parents and carers using MyMathsHero.",
    url: '/privacy',
    type: 'website',
  },
}

const sections = [
  {
    number: 1, heading: 'About this Privacy Policy',
    blocks: [
      { p: 'MyMathsHero respects the privacy of children, parents, carers and other users of our website, mobile applications and learning services.' },
      { p: 'This Privacy Policy explains how My Maths Hero ABN 36 697 828 827, trading as MyMathsHero, collects, uses, stores, shares and protects personal information.' },
      { p: 'It applies when you:' },
      { list: ['visit the MyMathsHero website;', 'join our waitlist;', 'create or manage an account;', 'use the MyMathsHero website or mobile application;', 'use Hero, our AI maths tutor;', 'complete maths activities or assessments;', 'access parent reports;', 'participate in reward games or Hero Speed Challenges;', 'contact us or provide feedback; or', 'otherwise interact with our services.'] },
      { subheading: 'In this policy' },
      { list: ['“parent” includes a parent, legal guardian or authorised carer;', '“child” or “student” means a child using MyMathsHero through a parent-authorised account;', '“services” means our website, applications, Hero AI tutor, learning activities, reports, reward features and associated services;', '“personal information” means information or an opinion about an identified individual or an individual who is reasonably identifiable.'] },
    ],
  },
  {
    number: 2, heading: "Our commitment to children's privacy",
    blocks: [
      { p: "MyMathsHero is designed for children from Prep to Year 6. We take children's privacy and online safety seriously." },
      { p: 'Our approach includes:' },
      { list: ["requiring a parent or authorised adult to create or approve a child's account;", 'collecting only information reasonably necessary to provide and improve the learning service;', 'avoiding public child profiles;', 'not allowing open chat or private messaging between students;', 'limiting student-to-student interaction to controlled maths activities;', 'using child-friendly explanations where appropriate;', "giving parents visibility and control over their child's account;", "not selling children's personal information;", "not using children's learning information for unrelated advertising; and", 'applying security and access controls to protect personal information.'] },
      { p: 'Parents should supervise younger children when they use MyMathsHero and help them understand how their information is used.' },
    ],
  },
  {
    number: 3, heading: 'Information we collect',
    blocks: [
      { p: 'The information we collect depends on how you use MyMathsHero.' },
      { subheading: '3.1 Parent and account information' },
      { p: 'We may collect: parent or guardian name; email address; telephone number, if provided; password or account authentication information; billing and subscription status; communication preferences; waitlist details; support enquiries; survey responses and feedback; and records of consent and account settings.' },
      { subheading: '3.2 Child and student information' },
      { p: 'We may collect: nickname or approved display name; year level; age range; account avatar; learning level; answers submitted; assessment and diagnostic results; areas of strength and areas needing support; learning progress and activity history; time spent completing activities; use of hints or Hero support; coins, rewards, achievements and game activity; Hero Task history; Hero Speed Challenge results; accuracy, response times and performance trends; and feedback provided by the child or parent.' },
      { note: "We encourage parents not to provide a child's full name unless it is necessary." },
      { subheading: '3.3 Technical and device information' },
      { p: 'We may automatically collect: IP address; device type; browser type; operating system; application version; device identifiers; login dates and times; pages and features used; crash reports; diagnostic logs; approximate location derived from an IP address; cookie and analytics information; and security and fraud prevention information.' },
      { p: 'We do not require precise geolocation for ordinary learning activities unless we clearly explain why it is needed and obtain any required consent.' },
      { subheading: '3.4 Payment information' },
      { p: 'Payments may be processed by third-party payment providers or app stores. We may receive information such as: subscription type; payment status; transaction identifier; renewal or cancellation status; and limited billing details.' },
      { p: 'We generally do not receive or store full payment-card numbers.' },
      { subheading: '3.5 Communications and feedback' },
      { p: 'When you contact us, participate in beta testing, complete a survey or provide a testimonial, we may collect: your name and contact details; the content of your message; feedback about the service; bug reports; screenshots or attachments you provide; and testimonial permissions.' },
      { p: "We will not publicly use a child's name, image, video, voice or testimonial without appropriate parent or guardian permission." },
    ],
  },
  {
    number: 4, heading: 'How we collect information',
    blocks: [
      { p: 'We may collect information:' },
      { list: ['directly from parents or guardians;', 'directly from students while they use the service;', 'automatically through our website, app, cookies and analytics tools;', 'from app stores and payment providers;', 'from schools, tutors or authorised learning partners where relevant and permitted;', 'during beta testing and customer-support interactions; and', 'from third-party service providers acting on our behalf.'] },
      { p: 'Where practical, we will explain why information is being collected and how it will be used.' },
    ],
  },
  {
    number: 5, heading: 'Why we collect and use information',
    blocks: [
      { p: 'We may use personal information to: create and manage accounts; verify parent or guardian authority; provide personalised maths learning; assess a child\'s current learning level; identify strengths and areas requiring further practice; create personalised Hero Tasks; provide AI-generated hints, explanations and learning support; adjust question difficulty; track progress and produce parent reports; operate coins, rewards and learning games; facilitate controlled Hero Speed Challenges; process subscriptions and payments; provide customer and technical support; investigate bugs, crashes and security issues; communicate about accounts, subscriptions and service changes; send waitlist, launch and marketing communications where permitted; improve the quality, safety and performance of the service; analyse how features are used; prevent fraud, misuse and unauthorised access; meet legal and regulatory obligations; and protect the rights, safety and security of users and MyMathsHero.' },
      { p: "We will not use a child's personal information for a materially different purpose without providing an appropriate explanation and obtaining consent where required." },
    ],
  },
  {
    number: 6, heading: 'Hero and artificial intelligence',
    blocks: [
      { p: 'Hero uses artificial intelligence to support personalised maths learning.' },
      { p: "Information processed by Hero may include: the child's year level; questions presented; answers submitted; areas of strength and difficulty; requests for hints; learning history; response accuracy; and information needed to generate an appropriate explanation or task." },
      { p: 'Hero may use this information to: select or generate learning activities; explain maths concepts; provide hints and step-by-step support; adapt the level of difficulty; identify learning patterns; and create progress insights for parents.' },
      { p: 'Hero is intended to support learning and does not replace a teacher, school, tutor or professional assessment. AI-generated explanations may occasionally be incomplete or incorrect. We encourage parents and students to report questionable content so it can be reviewed.' },
      { note: "Children should not enter personal information into Hero's response fields, including full names, home addresses, school names, telephone numbers, email addresses, passwords, photographs, medical information or other private information unrelated to the maths activity." },
      { p: 'Where external AI or cloud providers process information on our behalf, we take reasonable steps to limit the information shared, use contractual safeguards and select providers that offer appropriate privacy and security protections.' },
    ],
  },
  {
    number: 7, heading: 'Parent consent and control',
    blocks: [
      { p: "A parent or authorised adult must create or approve a child's account." },
      { p: 'Parents may be able to: review account details; view learning progress; manage subscription settings; control optional features; turn competitive features on or off; request correction of information; request deletion of the child\'s account; and contact us about privacy concerns.' },
      { p: 'Where consent is required, a parent may withdraw consent by contacting us. Withdrawal may affect our ability to provide some or all of the service.' },
    ],
  },
  {
    number: 8, heading: 'Hero Speed Challenge and student interaction',
    blocks: [
      { p: 'Hero Speed Challenge allows students to participate in controlled, timed maths activities with another online student.' },
      { p: 'To protect children: there is no open chat; there is no private messaging; students cannot exchange contact details; students do not need to display full names; profile photos are not required; challenge interaction is limited to structured options such as invite, accept or decline; results focus on maths performance, accuracy and participation; and parents may be given controls to disable the feature.' },
      { p: 'We may use approved nicknames, avatars, approximate ability levels or year-level matching to operate the feature.' },
    ],
  },
  {
    number: 9, heading: 'Cookies and analytics',
    blocks: [
      { p: 'Our website and app may use cookies, software development kits and similar technologies to: keep users signed in; remember settings; maintain security; understand website and app performance; identify technical problems; measure waitlist and subscription conversions; and improve user experience.' },
      { p: 'We may use service providers such as Google Analytics, Google Tag Manager, Firebase or others.' },
      { p: 'We will configure analytics and advertising technologies with children\'s privacy in mind. We do not intend to serve behaviourally targeted advertising to children inside MyMathsHero.' },
      { p: 'Parents may control certain cookies through browser or device settings. Disabling essential cookies may prevent parts of the service from working correctly.' },
    ],
  },
  {
    number: 10, heading: 'Marketing communications',
    blocks: [
      { p: 'We may send parents and adult account holders: waitlist updates; early-access information; launch announcements; product updates; maths-learning resources; promotional offers; and subscription communications.' },
      { p: 'You may unsubscribe from promotional emails by using the unsubscribe link or contacting us. We may still send essential service messages relating to account security, payments, policy changes or the operation of the service.' },
      { note: 'We do not send direct marketing communications to children.' },
    ],
  },
  {
    number: 11, heading: 'When we share information',
    blocks: [
      { p: 'We may share personal information with trusted service providers that help us operate MyMathsHero, including providers of: cloud hosting; databases and data storage; AI processing; email delivery; customer support; analytics; security and fraud prevention; payment processing; app distribution; software development; and technical maintenance.' },
      { p: 'We may also disclose information: where a parent has requested or authorised it; to a school, tutor or learning partner authorised by the parent; where required or authorised by law; to investigate suspected fraud, misuse or security incidents; to protect the safety, rights or property of users or others; in connection with a merger, acquisition, financing or sale of the business, subject to appropriate privacy safeguards; or to professional advisers such as lawyers, accountants and insurers.' },
      { note: "We do not sell or rent children's personal information. We require service providers to use personal information only for authorised purposes and to apply appropriate safeguards." },
    ],
  },
  {
    number: 12, heading: 'Overseas disclosure and storage',
    blocks: [
      { p: 'Some service providers may store or process information outside Australia. Depending on the providers we use, information may be processed in countries including the USA.' },
      { p: 'We take reasonable steps to select reputable providers and protect information transferred overseas. However, privacy and data-protection laws in other countries may differ from Australian law.' },
    ],
  },
  {
    number: 13, heading: 'Data security',
    blocks: [
      { p: 'We take reasonable technical and organisational steps to protect personal information from misuse, interference, loss, unauthorised access, unauthorised modification and unauthorised disclosure.' },
      { p: 'Measures may include: encryption in transit and where appropriate at rest; access controls; secure authentication; restricted staff and contractor access; security monitoring; data backups; software updates; confidentiality obligations; incident-response procedures; and regular review of third-party providers.' },
      { p: 'No online system can be guaranteed to be completely secure. Parents should protect account passwords and contact us promptly if they suspect unauthorised access.' },
    ],
  },
  {
    number: 14, heading: 'Data retention and deletion',
    blocks: [
      { p: 'We retain personal information only for as long as reasonably necessary to: provide the service; maintain learning history and reports; manage subscriptions; comply with legal, accounting and tax obligations; resolve disputes; prevent fraud; and protect our legal rights.' },
      { p: 'When information is no longer needed, we take reasonable steps to delete it or de-identify it. Parents may request deletion of their account or their child\'s account by contacting us.' },
      { p: 'Some information may remain in backups for a limited period or be retained where required by law. We may retain de-identified or aggregated information that no longer identifies an individual.' },
    ],
  },
  {
    number: 15, heading: 'Access and correction',
    blocks: [
      { p: 'Parents and other individuals may request access to personal information we hold about them or their child. They may also ask us to correct information that is inaccurate, out of date, incomplete, irrelevant or misleading.' },
      { p: "To make a request, contact us using the details below. We may need to verify the requester's identity and authority before providing access or making changes. We will respond within a reasonable period. If we cannot fulfil a request, we will explain why where required." },
    ],
  },
  {
    number: 16, heading: 'Data breaches',
    blocks: [
      { p: 'If a privacy or security incident occurs, we will investigate and take appropriate action.' },
      { p: 'Where required under the Notifiable Data Breaches scheme, we will notify affected individuals and the Office of the Australian Information Commissioner when an eligible data breach is likely to result in serious harm.' },
    ],
  },
  {
    number: 17, heading: 'Third-party links and services',
    blocks: [
      { p: 'MyMathsHero may contain links to third-party websites, app stores or services. We are not responsible for the privacy practices of third parties that operate independently from us. Parents should review their privacy policies before providing personal information.' },
      { p: 'Games offered within MyMathsHero should be appropriately licensed, child-friendly and configured without unauthorised advertising, external communication or unnecessary tracking.' },
    ],
  },
  {
    number: 18, heading: 'Testimonials, photographs and recordings',
    blocks: [
      { p: "We will obtain separate permission before using: a child's photograph; a child's video or voice; identifiable student work; a child's full name; or a parent or child testimonial for advertising or public marketing." },
      { p: 'Giving testimonial or media permission is optional and is not required to use the service. Parents may contact us to withdraw permission for future use. Withdrawal may not apply to materials already lawfully published or distributed, although we will take reasonable steps to stop future use.' },
    ],
  },
  {
    number: 19, heading: 'Changes to this Privacy Policy',
    blocks: [
      { p: 'We may update this Privacy Policy when: our services or technology change; new features are introduced; our service providers change; privacy laws or regulatory requirements change; or we improve our privacy practices.' },
      { p: 'The current version will be published on our website with the date it was last updated. Where changes are significant, we may notify parents by email, through the app or through another appropriate notice.' },
    ],
  },
  {
    number: 20, heading: 'Privacy complaints',
    blocks: [
      { p: 'Parents and other individuals may contact us if they have a question or complaint about privacy. We will: acknowledge the complaint; investigate the issue; request further information where necessary; and provide a response within a reasonable period.' },
      { p: 'If you are not satisfied with our response, you may contact the Office of the Australian Information Commissioner.' },
    ],
  },
  {
    number: 21, heading: 'Contact us',
    blocks: [
      { contact: [
        ['Business name', 'My Maths Hero'],
        ['Trading name', 'MyMathsHero'],
        ['ABN', '36 697 828 827'],
        ['Email', 'admin@mymathshero.com.au', 'mailto:admin@mymathshero.com.au'],
        ['Website', 'www.mymathshero.com.au', 'https://www.mymathshero.com.au'],
      ] },
      { p: 'For privacy questions or requests concerning a child\'s account, please use the subject line: “Privacy Request – Child Account”.' },
    ],
  },
]

const summary = {
  heading: 'Child-friendly privacy summary',
  subheading: 'Your privacy at MyMathsHero',
  blocks: [
    { p: 'MyMathsHero uses information about your maths learning so Hero can give you questions and help that suit you.' },
    { p: 'We may remember your first name or nickname, your year level, the questions you answer, what you find easy or difficult, the coins and rewards you earn, and how you are improving. Hero uses this information to help you learn.' },
    { p: 'Please do not type private information into Hero, such as your address, school name, phone number, password or photos.' },
    { p: 'There is no open chat between students. In Hero Speed Challenge, you can complete a maths challenge, but you cannot send private messages.' },
    { p: 'Your parent or carer can see and manage your account. They can ask us to correct or delete information. Talk to your parent, carer or teacher if you have questions about your privacy.' },
  ],
}

export default function PrivacyPage() {
  return (
    <LegalDoc
      badge={<><Shield size={16} style={{ color: 'var(--accent-gold)' }} /> Privacy Policy</>}
      title="MyMathsHero Privacy Policy"
      intro="How we collect, use, store, share and protect personal information for children, parents and carers."
      effective="13 July 2026"
      updated="1 September 2026"
      sections={sections}
      summary={summary}
    />
  )
}
