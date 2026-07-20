// Email surface.
// New code should import the named senders below (sendWelcomeEmail, etc.)
// — they delegate to lib/emails/sender.js, which uses the branded templates.
// Existing routes that call sendParentReport / sendTeacherAlert keep working
// via the legacy wrappers at the bottom (they pre-date the templated system).

import { Resend } from 'resend'

// Re-export all new senders so anything that needs the new system can use it
// without knowing about lib/emails/.
export {
  sendEmail,
  sendWelcomeEmail,
  sendAccountWelcome,
  sendHeroReport,
  sendSupportConfirmation,
  sendSupportReply,
  sendPasswordReset,
  sendBadgeNotification,
  sendStreakReminder,
  sendAdminAlert,
} from './emails/sender.js'

// ── Legacy senders (kept for backward compatibility) ─────────────────────────
// Used by app/api/parent/send-report and app/api/admin/send-all-reports.

function getResend() {
  if (!process.env.RESEND_API_KEY) return null
  return new Resend(process.env.RESEND_API_KEY)
}

const BRAND_DARK = '#1B2B4B'
const BRAND_GOLD = '#C49A1A'

function statBox(emoji, label, value, bg) {
  return `
    <td style="width:50%;padding:8px;">
      <div style="background:${bg};border-radius:12px;padding:18px 14px;text-align:center;">
        <div style="font-size:24px;margin-bottom:4px;">${emoji}</div>
        <div style="font-size:22px;font-weight:800;color:${BRAND_DARK};line-height:1;">${value}</div>
        <div style="font-size:12px;color:#64748B;margin-top:4px;font-weight:600;">${label}</div>
      </div>
    </td>`
}

function buildReportHtml({ childName, date, reportData }) {
  const {
    questionsAnswered = 0,
    accuracy = 0,
    coinsEarned = 0,
    skillsPractised = [],
    insights = '',
    weeklyStreak = 0,
    masteredCount = 0,
  } = reportData

  const skillsList = skillsPractised.length > 0
    ? skillsPractised.map(s => `<li style="margin:4px 0;color:#334155;">✅ ${s}</li>`).join('')
    : '<li style="color:#94A3B8;font-style:italic;">No skills recorded today</li>'

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F0F4F8;font-family:'DM Sans','Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(27,43,75,0.08);">
    <div style="background:${BRAND_DARK};padding:32px 28px;text-align:center;border-bottom:4px solid ${BRAND_GOLD};">
      <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
        MyMathsHero
      </div>
      <div style="color:${BRAND_GOLD};font-size:13px;margin-top:4px;font-weight:600;">Hero Report — Personalised AI Maths Learning</div>
    </div>
    <div style="padding:28px 28px 0;">
      <h2 style="margin:0 0 4px;font-size:20px;color:${BRAND_DARK};font-weight:800;">
        ${childName}'s Hero Report 📚
      </h2>
      <p style="margin:0;color:#64748B;font-size:14px;">${date} · 🔥 ${weeklyStreak}-day streak</p>
    </div>
    <div style="padding:20px 20px 0;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          ${statBox('❓', 'Questions Answered', questionsAnswered, '#F0F4F8')}
          ${statBox('🎯', 'Accuracy', `${accuracy}%`, '#F0FDF4')}
        </tr>
        <tr>
          ${statBox('🪙', 'Coins Earned', coinsEarned, '#FFFBEB')}
          ${statBox('⭐', 'Skills Mastered', masteredCount, '#FFFBEB')}
        </tr>
      </table>
    </div>
    <div style="padding:20px 28px 0;">
      <h3 style="margin:0 0 12px;font-size:15px;color:${BRAND_DARK};font-weight:700;">Skills Practised</h3>
      <ul style="margin:0;padding-left:4px;list-style:none;">
        ${skillsList}
      </ul>
    </div>
    ${insights ? `
    <div style="margin:20px 28px 0;background:#FFFBEB;border-left:4px solid ${BRAND_GOLD};border-radius:0 12px 12px 0;padding:14px 16px;">
      <div style="font-size:12px;font-weight:700;color:${BRAND_DARK};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">✦ Hero's Insight</div>
      <p style="margin:0;color:#334155;font-size:14px;line-height:1.6;">${insights}</p>
    </div>` : ''}
    <div style="padding:28px;text-align:center;border-top:1px solid #E2E8F0;margin-top:24px;">
      <p style="margin:0 0 16px;font-size:15px;color:${BRAND_DARK};font-weight:700;">Keep up the great work! 🌟</p>
      <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login"
        style="display:inline-block;background:${BRAND_GOLD};color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;">
        View Dashboard →
      </a>
      <p style="margin:16px 0 0;font-size:11px;color:#94A3B8;">
        MyMathsHero · Safe learning for every child<br>
        © ${new Date().getFullYear()} MyMathsHero
      </p>
    </div>
  </div>
</body>
</html>`
}

export async function sendParentReport(parentEmail, parentName, childName, reportData) {
  const resend = getResend()
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — skipping email send')
    return { sent: false, reason: 'no_api_key' }
  }

  const date = new Date().toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  try {
    const { data, error } = await resend.emails.send({
      from: 'MyMathsHero <reports@mymathshero.com.au>',
      to: parentEmail,
      subject: `MyMathsHero — ${childName}'s Hero Report — ${date}`,
      html: buildReportHtml({ childName, date, reportData }),
    })
    if (error) {
      console.error('[email] Resend error:', error)
      return { sent: false, reason: error.message }
    }
    return { sent: true, messageId: data?.id }
  } catch (err) {
    console.error('[email] Send failed:', err.message)
    return { sent: false, reason: err.message }
  }
}

export async function sendTeacherAlert(teacherEmail, teacherName, alertType, studentName, details) {
  const resend = getResend()
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — skipping teacher alert')
    return { sent: false, reason: 'no_api_key' }
  }

  const alertLabels = {
    at_risk: '⚠️ Student At Risk',
    low_accuracy: '📉 Low Accuracy Alert',
    no_activity: '💤 No Recent Activity',
  }

  const subject = `MyMathsHero — ${alertLabels[alertType] || '🔔 Alert'}: ${studentName}`
  const text = [
    `Hi ${teacherName},`,
    '',
    `This is an automated alert from MyMathsHero regarding your student ${studentName}.`,
    '',
    `Alert type: ${alertType}`,
    `Details: ${details}`,
    '',
    `Please log in to your Teacher Hub to review their progress.`,
    `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/teacher-dashboard`,
    '',
    'MyMathsHero Team',
  ].join('\n')

  try {
    const { data, error } = await resend.emails.send({
      from: 'MyMathsHero <alerts@mymathshero.com.au>',
      to: teacherEmail,
      subject,
      text,
    })
    if (error) {
      console.error('[email] Teacher alert error:', error)
      return { sent: false, reason: error.message }
    }
    return { sent: true, messageId: data?.id }
  } catch (err) {
    console.error('[email] Teacher alert failed:', err.message)
    return { sent: false, reason: err.message }
  }
}
