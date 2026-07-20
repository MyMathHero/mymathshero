import { Resend } from 'resend'

function getResend() {
  if (!process.env.RESEND_API_KEY) return null
  return new Resend(process.env.RESEND_API_KEY)
}

const FROM_ADDRESSES = {
  hello:   'MyMathsHero <hello@mymathshero.com.au>',
  support: 'MyMathsHero Support <support@mymathshero.com.au>',
  admin:   'MyMathsHero Admin <admin@mymathshero.com.au>',
  reports: 'MyMathsHero <reports@mymathshero.com.au>',
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://mymathshero.com.au'

export async function sendEmail({
  to,
  subject,
  html,
  from = 'hello',
  replyTo = null,
}) {
  const resend = getResend()
  if (!resend) {
    console.log('[email] RESEND_API_KEY not set — skipping:', subject)
    return { success: false, error: 'No API key' }
  }

  const payload = {
    from: FROM_ADDRESSES[from] || FROM_ADDRESSES.hello,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    replyTo: replyTo || 'support@mymathshero.com.au',
  }

  // Try up to twice — a single quick retry catches most transient Resend/network
  // blips without any queue infrastructure. (Not a full dead-letter system; if
  // both attempts fail we log and give up, same as before.)
  let lastErr = ''
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { data, error } = await resend.emails.send(payload)
      if (error) {
        lastErr = error.message
        console.error(`[email] Resend error (attempt ${attempt}):`, subject, error.message)
      } else {
        console.log('[email] sent:', subject, '→', to)
        return { success: true, id: data?.id }
      }
    } catch (error) {
      lastErr = error.message
      console.error(`[email] failed (attempt ${attempt}):`, subject, error.message)
    }
    if (attempt === 1) await new Promise(r => setTimeout(r, 600)) // brief backoff before retry
  }
  return { success: false, error: lastErr }
}

// ── Convenience wrappers ─────────────────────────────────────────────────────

export async function sendWelcomeEmail(data) {
  const { welcomeEmail } = await import('./templates.js')
  return sendEmail({
    to: data.parentEmail,
    subject: `Welcome to MyMathsHero, ${data.parentName}! 🎉`,
    html: welcomeEmail({ ...data, loginUrl: `${BASE_URL}/login` }),
    from: 'hello',
  })
}

export async function sendHeroReport(data) {
  const { heroReportEmail } = await import('./templates.js')
  return sendEmail({
    to: data.parentEmail,
    subject: `${data.childName}'s Hero Report — This Week ⚡`,
    html: heroReportEmail({ ...data, dashboardUrl: `${BASE_URL}/parent-dashboard` }),
    from: 'reports',
  })
}

// Sent at parent registration (before any child exists) — child-agnostic.
export async function sendAccountWelcome(data) {
  const { accountWelcomeEmail } = await import('./templates.js')
  return sendEmail({
    to: data.parentEmail,
    subject: `Welcome to MyMathsHero, ${data.parentName}! 🎉`,
    html: accountWelcomeEmail({ ...data, loginUrl: `${BASE_URL}/login` }),
    from: 'hello',
  })
}

export async function sendSupportConfirmation(data) {
  const { supportTicketConfirmEmail } = await import('./templates.js')
  return sendEmail({
    to: data.userEmail,
    subject: `We received your request — Ticket #${data.ticketId}`,
    html: supportTicketConfirmEmail(data),
    from: 'support',
    replyTo: 'support@mymathshero.com.au',
  })
}

export async function sendSupportReply(data) {
  const { supportTicketReplyEmail } = await import('./templates.js')
  return sendEmail({
    to: data.userEmail,
    subject: `${data.isResolved ? '✅ Resolved' : '💬 Update'}: Ticket #${data.ticketId}`,
    html: supportTicketReplyEmail(data),
    from: 'support',
    replyTo: 'support@mymathshero.com.au',
  })
}

export async function sendPasswordReset(data) {
  const { passwordResetEmail } = await import('./templates.js')
  return sendEmail({
    to: data.userEmail,
    subject: 'Reset your MyMathsHero password 🔐',
    html: passwordResetEmail(data),
    from: 'hello',
  })
}

export async function sendBadgeNotification(data) {
  const { badgeEarnedEmail } = await import('./templates.js')
  return sendEmail({
    to: data.parentEmail,
    subject: `${data.childName} earned the ${data.badgeName} badge! ${data.badgeEmoji}`,
    html: badgeEarnedEmail({ ...data, dashboardUrl: `${BASE_URL}/parent-dashboard` }),
    from: 'hello',
  })
}

export async function sendStreakReminder(data) {
  const { streakReminderEmail } = await import('./templates.js')
  return sendEmail({
    to: data.parentEmail,
    subject: `Don't break ${data.childName}'s ${data.currentStreak}-day streak! 🔥`,
    html: streakReminderEmail({ ...data, dashboardUrl: `${BASE_URL}/login` }),
    from: 'hello',
  })
}

export async function sendAdminAlert(data) {
  const { adminAlertEmail } = await import('./templates.js')
  return sendEmail({
    to: 'admin@mymathshero.com.au',
    subject: `⚠️ Admin Alert: ${data.alertType}`,
    html: adminAlertEmail(data),
    from: 'admin',
  })
}

// Question-bank alert → the admin. Sent by the fortnightly verify-bank cron only
// when the scan finds flagged questions. Recipient: ADMIN_ALERT_EMAIL (falls back
// to ADMIN_EMAIL, then the support inbox).
export async function sendQuestionBankAlert(data) {
  const { questionBankAlertEmail } = await import('./templates.js')
  const to = process.env.ADMIN_ALERT_EMAIL || process.env.ADMIN_EMAIL || 'support@mymathshero.com.au'
  return sendEmail({
    to,
    subject: `⚠️ ${data.flagged} question${data.flagged === 1 ? '' : 's'} flagged — question bank check`,
    html: questionBankAlertEmail({ ...data, adminUrl: data.adminUrl || `${BASE_URL}/admin` }),
    from: 'admin',
  })
}
