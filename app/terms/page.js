import LegalDoc from '@/components/LegalDoc'
import { FileText } from 'lucide-react'

export const metadata = {
  title: 'Terms & Conditions | MyMathsHero',
  description:
    'The Terms and Conditions governing access to and use of the MyMathsHero website, mobile applications, Hero AI tutor and associated services for Australian families.',
  alternates: { canonical: '/terms' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Terms & Conditions | MyMathsHero',
    description: 'The terms governing use of MyMathsHero, Hero and our maths learning services.',
    url: '/terms',
    type: 'website',
  },
}

const sections = [
  {
    number: 1, heading: 'About these Terms',
    blocks: [
      { p: 'These Terms and Conditions govern access to and use of the MyMathsHero website, mobile applications and associated services. The services are provided by My Maths Hero, ABN 36 697 828 827, trading as MyMathsHero.' },
      { p: 'By creating an account, purchasing a subscription, joining a trial or allowing a child to use MyMathsHero, you agree to these Terms.' },
      { p: 'Please read these Terms together with our:' },
      { list: ['Privacy Policy;', 'subscription and pricing information;', 'refund and cancellation information;', 'community and safety rules; and', 'any additional terms displayed for a particular promotion or feature.'] },
      { p: 'If you do not agree to these Terms, you must not create an account or use the services.' },
      { subheading: 'In these Terms' },
      { list: ['“we”, “us” and “our” mean My Maths Hero, trading as MyMathsHero;', '“parent” includes a parent, legal guardian or authorised carer;', '“child” or “student” means a child using MyMathsHero through a parent-authorised account;', '“account holder” means the adult who creates and manages the account;', '“services” means the MyMathsHero website, applications, Hero AI tutor, maths activities, assessments, reports, games, rewards, challenges and related services;', '“Hero” means the AI-supported maths tutor available through MyMathsHero.'] },
    ],
  },
  {
    number: 2, heading: 'Who may use MyMathsHero',
    blocks: [
      { p: 'MyMathsHero is designed primarily for Australian children from Prep to Year 6. An adult aged 18 years or over must create and manage the main account.' },
      { p: 'By creating a child profile, the account holder confirms that they:' },
      { list: ["are the child's parent, guardian or authorised carer;", 'have authority to allow the child to use MyMathsHero;', 'have provided accurate account information;', "agree to supervise the child's use where appropriate; and", 'will explain relevant safety and privacy information to the child in an age-appropriate way.'] },
      { p: 'Children must not independently enter into a paid subscription or provide payment information. We may request reasonable information to confirm an account holder\'s identity or authority.' },
    ],
  },
  {
    number: 3, heading: 'What MyMathsHero provides',
    blocks: [
      { p: 'MyMathsHero provides online maths-learning tools that may include: diagnostic and introductory assessments; personalised Hero Tasks; curriculum-aligned maths questions; AI-supported hints and explanations; adaptive question difficulty; category-based maths practice; progress tracking; parent reports; coins, achievements and rewards; child-friendly reward games; Hero Speed Challenge; tutor or educator access authorised by a parent; and other learning features introduced over time.' },
      { p: 'Features may vary depending on subscription plan, device type, app version, year level, location, testing stage and feature availability.' },
      { p: 'We may improve, replace or discontinue features where reasonably necessary. Where a material change significantly reduces a paid service, we will provide reasonable notice where practical and any remedy required by law.' },
    ],
  },
  {
    number: 4, heading: 'Hero and artificial intelligence',
    blocks: [
      { p: 'Hero uses artificial intelligence and automated systems to support personalised maths learning. Hero may: select or generate maths questions; identify apparent strengths and learning needs; adjust question difficulty; provide hints and explanations; suggest areas for practice; create personalised learning tasks; and generate information for parent reports.' },
      { p: 'AI-generated material may occasionally contain errors, misunderstand a response, provide an incomplete explanation, produce content that is unsuitable for a particular learner, or require review by a parent, teacher or tutor.' },
      { p: 'Hero is intended to support learning. It does not replace a qualified teacher, a school curriculum program, a human tutor, professional educational assessment, specialist learning support, or medical, psychological or developmental advice.' },
      { note: 'Children must not enter unrelated private or sensitive information into Hero, including home addresses, school names, passwords, telephone numbers, photographs or medical information.' },
    ],
  },
  {
    number: 5, heading: 'Curriculum alignment and learning outcomes',
    blocks: [
      { p: 'MyMathsHero is designed to support maths learning aligned with relevant Australian curriculum content for Prep to Year 6. However, schools may teach topics in different sequences, state and territory curriculum requirements may vary, teachers may use different methods, curriculum documents may change, and no digital platform can guarantee a particular academic result.' },
      { p: 'We do not guarantee that using MyMathsHero will improve school grades by a particular amount, produce a particular test or NAPLAN result, replace classroom instruction, resolve a learning difficulty, or ensure mastery of every curriculum outcome.' },
      { p: "Results depend on factors including the child's participation, frequency of use, starting level, learning needs and support available at home and school." },
    ],
  },
  {
    number: 6, heading: 'Accounts and security',
    blocks: [
      { p: 'Account holders must: provide accurate and current information; keep passwords confidential; prevent unauthorised account access; notify us promptly of suspected misuse; ensure each child uses the correct profile; and update account details when they change.' },
      { p: 'You must not: share an account outside your household unless your plan expressly permits it; allow another family to use your subscription; impersonate another person; create misleading or fraudulent profiles; attempt to access another user\'s account; or bypass account limits or security controls.' },
      { p: 'You are responsible for activity conducted through your account unless it results from our failure to apply reasonable security measures.' },
    ],
  },
  {
    number: 7, heading: 'Subscriptions and pricing',
    blocks: [
      { p: 'Some services require a paid subscription. Available plans, prices and inclusions will be displayed before purchase. Prices are shown in Australian dollars and include GST where applicable, unless stated otherwise.' },
      { p: 'Subscription options may include monthly plans, annual plans, Standard plans, Premium plans, family or additional-child options, promotional plans and founding-family offers.' },
      { p: 'Your selected plan begins when payment is successfully processed, a free trial ends (if applicable), or another commencement date is clearly displayed during signup. You authorise the relevant payment provider to charge the applicable subscription fee and any clearly disclosed taxes or charges.' },
    ],
  },
  {
    number: 8, heading: 'Automatic renewal',
    blocks: [
      { p: 'Unless clearly stated otherwise, paid subscriptions automatically renew at the end of each billing period. For example, monthly subscriptions renew each month and annual subscriptions renew each year.' },
      { p: 'The applicable fee will be charged using the payment method associated with the account unless the subscription is cancelled before the next renewal date. We will clearly disclose automatic renewal before purchase.' },
      { p: 'You are responsible for cancelling through the correct website, app store or payment provider before renewal if you do not want the subscription to continue. Where required, we will provide renewal notices or other information prescribed by law.' },
    ],
  },
  {
    number: 9, heading: 'Free trials and promotional offers',
    blocks: [
      { p: 'We may offer free trials, introductory discounts, founding-family pricing, bonus access periods, referral offers or other promotions. Promotional terms will be displayed when the offer is made.' },
      { p: 'Unless stated otherwise: an offer is limited to one per eligible household; offers cannot be exchanged for cash; offers cannot be combined; eligibility may be verified; a payment method may be required before a trial begins; and the subscription may automatically convert to a paid plan when the trial ends. Before any automatic conversion, the price and billing cycle will be disclosed.' },
      { subheading: 'Founding Family offer' },
      { p: 'Where offered, eligible founding families may receive benefits such as one month of free access, a reduced subscription rate for a stated period, and early access to MyMathsHero. The exact eligibility rules, price, duration and closing conditions displayed with the offer form part of these Terms.' },
      { p: 'A founding-family price applies only for the period expressly stated. After that period, the subscription may renew at the then-current standard price, subject to notice and applicable law.' },
    ],
  },
  {
    number: 10, heading: 'Cancelling a subscription',
    blocks: [
      { p: 'You may cancel your subscription at any time through your MyMathsHero account, the Apple App Store, Google Play, the relevant payment provider, or another cancellation method communicated to you.' },
      { p: 'Cancellation generally takes effect at the end of the current paid billing period unless we state otherwise, the payment platform applies different rules, or the law requires a different outcome.' },
      { p: 'After cancellation: access may continue until the end of the paid period; future renewal charges will stop; unused access is not automatically refundable; and child learning data may be retained or deleted in accordance with our Privacy Policy.' },
      { note: 'Deleting the app does not necessarily cancel a subscription.' },
    ],
  },
  {
    number: 11, heading: 'Refunds and consumer rights',
    blocks: [
      { p: 'Refund requests will be considered in accordance with the Australian Consumer Law, these Terms, the applicable app-store rules, and any additional refund policy displayed at purchase.' },
      { p: 'Nothing in these Terms excludes, restricts or modifies any consumer guarantee, right or remedy that cannot lawfully be excluded.' },
      { p: 'You may be entitled to a remedy where the service is not provided with due care and skill; is not reasonably fit for a disclosed purpose; is materially different from its description; experiences a major failure; or otherwise fails to comply with a non-excludable consumer guarantee.' },
      { p: 'A change of mind, failure to use the service or forgetting to cancel before renewal does not automatically entitle a user to a refund, subject to applicable law and platform rules. For subscriptions purchased through an app store, refund requests may need to be submitted directly to that app store.' },
    ],
  },
  {
    number: 12, heading: 'Parent supervision and responsibility',
    blocks: [
      { p: "The account holder remains responsible for supervising the child's use of MyMathsHero where appropriate for the child's age and abilities." },
      { p: 'Parents should: ensure the selected year level is accurate; review learning progress; monitor screen time; help younger children understand online safety; ensure the child does not share personal information; review concerns about Hero\'s explanations; and contact us if content appears inaccurate or unsuitable.' },
      { note: 'MyMathsHero is a learning support service and is not a childcare or child-supervision service.' },
    ],
  },
  {
    number: 13, heading: 'Hero Tasks and personalised learning',
    blocks: [
      { p: 'Hero may create personalised learning tasks using information such as year level, previous answers, diagnostic results, accuracy, use of hints, response patterns, areas of apparent strength and areas requiring further practice. Task length and difficulty may change as the student progresses.' },
      { p: 'Personalisation is based on available platform data and does not constitute a formal educational, cognitive or developmental assessment. Parents may contact us if they believe a task is consistently unsuitable for their child.' },
    ],
  },
  {
    number: 14, heading: 'Coins, rewards and virtual items',
    blocks: [
      { p: 'Students may earn virtual coins, badges, achievements or other rewards through eligible learning activities.' },
      { p: 'Virtual items: are for use only within MyMathsHero; have no cash value; cannot be exchanged for money; cannot be transferred, sold or traded; are not cryptocurrency or financial products; do not represent ownership in MyMathsHero; and may be subject to reasonable limits and expiry rules disclosed within the service.' },
      { p: 'Coins may be used to unlock reward games, timed game access, approved digital items, character or avatar features, or other in-platform rewards.' },
      { p: 'We may correct coin balances where there has been a technical error, duplicate allocation, misuse, fraud, automated exploitation or a breach of these Terms. We will not remove properly earned coins arbitrarily. If a material reward feature is changed, we will take reasonable steps to provide notice and a fair transition where practical.' },
    ],
  },
  {
    number: 15, heading: 'Games',
    blocks: [
      { p: 'MyMathsHero may include games developed by us or licensed from third parties. Games are intended as learning rewards and entertainment.' },
      { p: 'Parents acknowledge that game availability may change; some games may require a particular device or browser; access may be limited by coins, time or subscription plan; games may be temporarily unavailable; third-party licences may expire; and parents may be offered controls to limit or disable game access.' },
      { p: 'We aim to provide child-friendly games without open chat, unauthorised advertising or unnecessary external links. Where a game is provided by a third party, additional terms may apply and will be identified where appropriate.' },
    ],
  },
  {
    number: 16, heading: 'Hero Speed Challenge',
    blocks: [
      { p: 'Hero Speed Challenge allows eligible students to participate in controlled, timed maths sessions with another student.' },
      { p: 'The feature may allow a child to view an approved nickname or avatar, see that another student is available, send a challenge request, accept or decline a request, complete a timed maths activity, and view results such as accuracy, score or completion time.' },
      { p: 'Hero Speed Challenge does not provide open chat, private messaging, free-text communication, exchange of contact details or public profile photographs. Students must not attempt to identify or contact other students outside the platform.' },
      { p: 'We may match students by year level or approximate ability, limit the number of requests, suspend challenge access, remove inappropriate nicknames or avatars, investigate suspicious activity, and provide parents with controls to disable the feature. We may cancel or disregard challenge results affected by cheating, technical failure, coordinated misuse or unauthorised software. Winning or losing a challenge does not affect a child\'s school grade or formal learning assessment.' },
    ],
  },
  {
    number: 17, heading: 'Acceptable use',
    blocks: [
      { p: 'Users must use MyMathsHero lawfully, safely and for its intended educational purposes.' },
      { p: 'You must not: bully, threaten, harass or intimidate another user; attempt to communicate personal details to another child; use an offensive or misleading nickname; upload harmful, unlawful or inappropriate material; cheat or manipulate results; use bots, scripts or automation; reverse engineer or copy the platform; bypass payment or access controls; scrape questions or content; interfere with servers or security systems; introduce viruses or malicious code; use the service to develop or train a competing product; reproduce substantial parts of the question bank; misuse Hero to generate unrelated harmful content; or use the service in a way that infringes another person\'s rights.' },
      { p: 'Parents must take reasonable steps to ensure children using their account follow these rules.' },
    ],
  },
  {
    number: 18, heading: 'Safety concerns and reporting',
    blocks: [
      { p: 'Users should report suspected inappropriate content, unsafe behaviour, attempts to exchange personal information, account misuse, cheating, technical issues, inaccurate AI explanations or other safety concerns.' },
      { p: 'We may investigate reports and take reasonable action, including removing content, restricting features, resetting a nickname, suspending an account, preserving relevant records, contacting the parent account holder, or referring serious matters to relevant authorities. We do not guarantee that every issue can be prevented, but we will take reasonable steps to operate the service safely.' },
    ],
  },
  {
    number: 19, heading: 'Intellectual property',
    blocks: [
      { p: 'MyMathsHero and its licensors own or control the intellectual property in the services, including software, source code, platform design, website content, question banks, learning activities, explanations, reports, graphics, videos, animations, logos, brand names, Hero\'s character design, Hero\'s voice and personality, coins and reward designs, trademarks, databases and other original materials.' },
      { p: 'We grant account holders a limited, personal, non-exclusive, non-transferable and revocable licence to use the services for private educational purposes during an active trial or subscription.' },
      { p: 'You must not, without written permission: copy or republish our content; commercially exploit the services; modify or create derivative versions; distribute account access; extract or reproduce question banks; use our content to train an AI model; use Hero or our branding for another product; remove copyright or trade mark notices; or represent that you are affiliated with MyMathsHero.' },
    ],
  },
  {
    number: 20, heading: 'User-provided content and feedback',
    blocks: [
      { p: 'Users may provide answers, written feedback, survey responses, bug reports, suggestions, testimonials, support messages or other content. You retain any rights you hold in original content you provide.' },
      { p: 'You grant us permission to use that content only as reasonably necessary to provide the services, respond to support requests, maintain records, improve MyMathsHero, investigate technical or safety issues, and comply with legal obligations.' },
      { p: "We will obtain separate permission before publicly using an identifiable child's name, photograph, video, voice, schoolwork or testimonial. Suggestions and general feedback may be used to improve the service without payment, provided we do not publicly identify you or your child without permission." },
    ],
  },
  {
    number: 21, heading: 'Privacy',
    blocks: [
      { p: 'Our collection, handling and protection of personal information is explained in the MyMathsHero Privacy Policy. By using the services, you acknowledge that personal information will be handled in accordance with that policy.' },
      { p: 'Where there is a conflict between these Terms and the Privacy Policy regarding personal-information handling, the Privacy Policy applies.' },
    ],
  },
  {
    number: 22, heading: 'Third-party services',
    blocks: [
      { p: 'MyMathsHero may depend on third-party providers, including cloud-hosting providers, AI services, payment processors, app stores, analytics services, email providers, game developers, authentication services and support platforms. Third-party services may have their own terms and privacy policies.' },
      { p: 'We are not responsible for an independent third party\'s acts or omissions, except to the extent that responsibility cannot lawfully be excluded or where the third party acts on our behalf and we remain legally responsible.' },
    ],
  },
  {
    number: 23, heading: 'Service availability and maintenance',
    blocks: [
      { p: 'We aim to keep MyMathsHero reasonably available, but continuous or error-free access cannot be guaranteed. Access may be interrupted by scheduled maintenance, emergency repairs, internet or device problems, third-party outages, app-store issues, cybersecurity incidents, software updates, events outside our reasonable control or service improvements.' },
      { p: 'Where practical, we will provide notice of significant planned interruptions. Users should maintain suitable internet access and compatible devices.' },
    ],
  },
  {
    number: 24, heading: 'Beta and early-access services',
    blocks: [
      { p: 'Some users may access beta, trial or early-release features. These features may be incomplete, contain bugs, change without notice, produce inaccurate results, experience interruptions, require additional testing or be withdrawn before general release.' },
      { p: 'Beta participants agree to provide honest feedback and promptly report serious technical or safety concerns. Unless separately agreed, participation in beta testing does not guarantee permanent access, a free subscription, a particular launch date, inclusion of every tested feature or compensation. Any promised beta benefit or founding-family offer will be governed by the written promotional terms provided to the participant.' },
    ],
  },
  {
    number: 25, heading: 'Suspension and termination',
    blocks: [
      { p: 'We may suspend or terminate access where reasonably necessary because these Terms have been materially breached; payment remains overdue; an account presents a safety or security risk; fraudulent activity is suspected; another user\'s rights are being harmed; the service is being misused; the account holder lacks authority to manage a child profile; or suspension is required by law.' },
      { p: 'Where appropriate, we will provide notice and a reasonable opportunity to address the issue. Immediate restriction may occur where necessary to protect children, users, systems or legal rights. Account holders may stop using the service and cancel their subscription at any time. Termination does not remove rights or obligations that arose before termination.' },
    ],
  },
  {
    number: 26, heading: 'Our responsibility',
    blocks: [
      { p: 'We provide MyMathsHero with reasonable care and skill. To the extent permitted by law, we do not guarantee that the service will always be uninterrupted; that every question or AI explanation will be error-free; that the service will work on every device; that every child will achieve a particular result; or that all third-party services will remain available.' },
      { p: 'Nothing in these Terms excludes or limits liability that cannot lawfully be excluded, including liability under applicable consumer guarantees.' },
      { p: 'Where permitted by law and where it is fair and reasonable, our liability for a failure relating to services may be limited to supplying the affected services again, or paying the reasonable cost of having the affected services supplied again. This limitation does not apply where the law provides a different remedy or does not permit limitation.' },
    ],
  },
  {
    number: 27, heading: 'Your responsibility',
    blocks: [
      { p: 'You are responsible for: the accuracy of information you provide; maintaining account security; supervising child use where appropriate; ensuring devices and internet access are suitable; following these Terms; obtaining authority to create child profiles; and using learning reports appropriately.' },
      { p: 'You are not responsible for losses caused by our negligence, breach of law or failure to apply reasonable safeguards.' },
    ],
  },
  {
    number: 28, heading: 'Changes to these Terms',
    blocks: [
      { p: 'We may update these Terms to reflect changes to the services, new features, pricing or subscription changes, changes in law, safety improvements, security requirements or operational changes.' },
      { p: 'The current version will be published on our website with the date it was last updated. Where a change materially affects an active paid subscription, we will provide reasonable notice where practical. If you do not agree to a material change, you may cancel the subscription before the change takes effect. Changes will not remove rights already accrued under applicable law.' },
    ],
  },
  {
    number: 29, heading: 'Governing law',
    blocks: [
      { p: 'These Terms are governed by the laws of Victoria, Australia. The parties submit to the courts and tribunals having jurisdiction in Victoria and any courts entitled to hear appeals from them.' },
      { p: 'Nothing in this section prevents a consumer from exercising rights available under applicable Australian consumer law or bringing a claim in another forum where the law permits.' },
    ],
  },
  {
    number: 30, heading: 'General provisions',
    blocks: [
      { p: 'If part of these Terms is found to be invalid or unenforceable, the remaining provisions will continue to operate to the extent possible. A delay in enforcing a right does not mean that right has been waived.' },
      { p: 'You may not transfer your account or rights under these Terms without our permission. We may transfer our rights or obligations as part of a genuine business restructure, sale or transfer, provided this does not reduce your legal rights.' },
      { p: 'These Terms, together with the Privacy Policy, pricing information and any applicable promotional terms, form the agreement between the account holder and MyMathsHero concerning the services.' },
    ],
  },
  {
    number: 31, heading: 'Contact us',
    blocks: [
      { contact: [
        ['Business name', 'My Maths Hero'],
        ['Trading name', 'MyMathsHero'],
        ['ABN', '36 697 828 827'],
        ['Email', 'admin@mymathshero.com.au', 'mailto:admin@mymathshero.com.au'],
        ['Website', 'www.mymathshero.com.au', 'https://www.mymathshero.com.au'],
      ] },
      { p: 'For subscription or billing enquiries, use the subject line “Subscription Enquiry”. For safety concerns involving a child account, use “Child Safety Report”. For legal enquiries, use “Terms and Conditions Enquiry”.' },
    ],
  },
]

export default function TermsPage() {
  return (
    <LegalDoc
      badge={<><FileText size={16} style={{ color: 'var(--accent-gold)' }} /> Terms &amp; Conditions</>}
      title="MyMathsHero Terms & Conditions"
      intro="These Terms govern access to and use of the MyMathsHero website, mobile applications and associated services."
      updated="1 September 2026"
      sections={sections}
    />
  )
}
