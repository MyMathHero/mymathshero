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

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESSES[from] || FROM_ADDRESSES.hello,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      replyTo: replyTo || 'support@mymathshero.com.au',
    })
    if (error) {
      console.error('[email] Resend error:', subject, error.message)
      return { success: false, error: error.message }
    }
    console.log('[email] sent:', subject, '→', to)
    return { success: true, id: data?.id }
  } catch (error) {
    console.error('[email] failed:', subject, error.message)
    return { success: false, error: error.message }
  }
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
