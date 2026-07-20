import { baseTemplate } from './baseTemplate.js'

// 1. WELCOME EMAIL — sent when a parent adds their first child.
export function welcomeEmail({ parentName, childName, childGrade, loginUrl }) {
  return baseTemplate({
    title: `Welcome to MyMathsHero, ${parentName}!`,
    previewText: `${childName} is ready to start their maths hero journey!`,
    content: `
      <h1>Welcome to MyMathsHero! 🎉</h1>
      <p>Hi ${parentName},</p>
      <p>You have successfully created an account for <strong>${childName}</strong>.
      We are so excited to have you both join the MyMathsHero family!</p>

      <div class="highlight-box">
        <p style="margin:0;font-weight:700;color:#1B2B4B;">
          🤖 Your child's AI maths tutor is ready!
        </p>
        <p style="margin:8px 0 0;font-size:14px;">
          ${childName} can start their personalised Maths assessment right now.
          It takes just 5 minutes and sets up their personal learning plan.
        </p>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <div class="label">Child</div>
          <div class="value">${childName}</div>
        </div>
        <div class="stat-card">
          <div class="label">Grade</div>
          <div class="value">${childGrade}</div>
        </div>
      </div>

      <h2>What happens next?</h2>
      <p>1. ${childName} completes a short diagnostic assessment</p>
      <p>2. Hero (our AI tutor) creates a personalised Maths plan</p>
      <p>3. ${childName} starts earning Hero Points and climbing the Hero League!</p>

      <div class="divider"></div>
      <p style="text-align:center;">
        <a href="${loginUrl}" class="btn">Start Learning Now →</a>
      </p>
    `,
    footerText: `You are receiving this because you created a MyMathsHero account.`,
  })
}

// 1b. ACCOUNT WELCOME — sent the moment a parent registers (before any child is
// added). Child-agnostic, so it never renders "undefined".
export function accountWelcomeEmail({ parentName, loginUrl }) {
  return baseTemplate({
    title: `Welcome to MyMathsHero, ${parentName}!`,
    previewText: `Your account is ready — add your child to get started.`,
    content: `
      <h1>Welcome to MyMathsHero! 🎉</h1>
      <p>Hi ${parentName},</p>
      <p>Your account is all set up — we're so glad you're here.</p>

      <div class="highlight-box">
        <p style="margin:0;font-weight:700;color:#1B2B4B;">
          🤖 Next step: add your child
        </p>
        <p style="margin:8px 0 0;font-size:14px;">
          Add your child to unlock their personalised AI maths tutor. It only
          takes a minute, and Hero will build a learning plan just for them.
        </p>
      </div>

      <div class="divider"></div>
      <p style="text-align:center;">
        <a href="${loginUrl}" class="btn">Get Started →</a>
      </p>
    `,
    footerText: `You are receiving this because you created a MyMathsHero account.`,
  })
}

// 2. HERO REPORT EMAIL — weekly progress report to parent.
export function heroReportEmail({
  parentName, childName, childGrade,
  questionsAnswered, accuracy, mastered,
  streak, heroPoints, topSkill, needsWork,
  weeklyData, insightText, dashboardUrl,
}) {
  const weeklyRows = (weeklyData || []).map(d =>
    `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #E2E8F0;">${d.day}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #E2E8F0;text-align:center;">${d.questions}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #E2E8F0;text-align:center;color:#22C55E;font-weight:700;">${d.accuracy}%</td>
    </tr>`
  ).join('')

  return baseTemplate({
    title: `${childName}'s Hero Report — This Week`,
    previewText: `${childName} answered ${questionsAnswered} questions this week with ${accuracy}% accuracy!`,
    content: `
      <div class="badge">Weekly Hero Report</div>
      <h1 style="margin-top:16px;">${childName}'s Progress This Week</h1>
      <p>Hi ${parentName}, here is ${childName}'s learning summary for this week.</p>

      <div class="stat-grid">
        <div class="stat-card">
          <div class="label">Questions Answered</div>
          <div class="value">${questionsAnswered}</div>
        </div>
        <div class="stat-card">
          <div class="label">Accuracy</div>
          <div class="value">${accuracy}%</div>
        </div>
        <div class="stat-card">
          <div class="label">Skills Mastered</div>
          <div class="value">${mastered}</div>
        </div>
        <div class="stat-card">
          <div class="label">Day Streak 🔥</div>
          <div class="value">${streak} days</div>
        </div>
      </div>

      <div class="highlight-box">
        <p style="margin:0;font-weight:700;font-size:13px;color:#64748B;
          text-transform:uppercase;letter-spacing:0.5px;">
          🤖 Hero's Insight
        </p>
        <p style="margin:8px 0 0;color:#1B2B4B;">${insightText || ''}</p>
      </div>

      ${weeklyRows ? `
      <h2>Daily Breakdown</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background:#F0F4F8;">
            <th style="padding:10px 12px;text-align:left;color:#64748B;font-size:12px;">Day</th>
            <th style="padding:10px 12px;text-align:center;color:#64748B;font-size:12px;">Questions</th>
            <th style="padding:10px 12px;text-align:center;color:#64748B;font-size:12px;">Accuracy</th>
          </tr>
        </thead>
        <tbody>${weeklyRows}</tbody>
      </table>` : ''}

      ${topSkill ? `
      <h2>Strengths ✦</h2>
      <div class="stat-card">
        <div class="label">Top Skill This Week</div>
        <div class="value" style="font-size:16px;">${topSkill}</div>
      </div>` : ''}

      ${needsWork ? `
      <h2>Focus Area</h2>
      <div class="stat-card" style="border-left-color:#F59E0B;">
        <div class="label">Keep Practising</div>
        <div class="value" style="font-size:16px;">${needsWork}</div>
      </div>` : ''}

      <div class="divider"></div>
      <p style="text-align:center;">
        <a href="${dashboardUrl}" class="btn">View Full Dashboard →</a>
      </p>
    `,
    footerText: `Hero Report for ${childName} · Grade ${childGrade} · MyMathsHero`,
  })
}

// 3. SUPPORT TICKET CONFIRMATION — sent when a user submits a ticket.
export function supportTicketConfirmEmail({
  userName, ticketId, subject, message, estimatedResponse,
}) {
  return baseTemplate({
    title: `Support Request Received — #${ticketId}`,
    previewText: `We received your request and will respond within ${estimatedResponse}.`,
    content: `
      <h1>We got your message! 👋</h1>
      <p>Hi ${userName},</p>
      <p>Thanks for reaching out. We have received your support request
      and will get back to you as soon as possible.</p>

      <div class="stat-card">
        <div class="label">Ticket Number</div>
        <div class="value" style="font-size:18px;color:#C49A1A;">#${ticketId}</div>
      </div>

      <div class="highlight-box">
        <p style="margin:0;font-weight:700;color:#1B2B4B;">Your message:</p>
        <p style="margin:8px 0 0;font-size:14px;color:#334155;">
          <strong>Subject:</strong> ${subject}<br/>
          <br/>${message}
        </p>
      </div>

      <div class="divider"></div>
      <p style="text-align:center;color:#64748B;font-size:14px;">
        Expected response time: <strong>${estimatedResponse}</strong>
      </p>
      <p style="text-align:center;font-size:13px;color:#94A3B8;">
        Keep your ticket number handy: <strong>#${ticketId}</strong>
      </p>
    `,
    footerText: `Support request #${ticketId} · MyMathsHero Support`,
  })
}

// 4. SUPPORT TICKET REPLY — sent when admin replies to a ticket.
export function supportTicketReplyEmail({
  userName, ticketId, subject, replyMessage, isResolved,
}) {
  return baseTemplate({
    title: `${isResolved ? 'Resolved' : 'Update'}: Support Ticket #${ticketId}`,
    previewText: isResolved
      ? `Your request #${ticketId} has been resolved.`
      : `New reply on your support request #${ticketId}`,
    content: `
      <h1>${isResolved ? '✅ Request Resolved!' : '💬 New Reply on Your Request'}</h1>
      <p>Hi ${userName},</p>
      <p>${isResolved
        ? 'Great news! Your support request has been resolved.'
        : `We have an update on your support request #${ticketId}.`
      }</p>

      <div class="stat-card">
        <div class="label">Ticket</div>
        <div class="value" style="font-size:16px;">#${ticketId} — ${subject}</div>
      </div>

      <div class="highlight-box">
        <p style="margin:0;font-weight:700;color:#1B2B4B;">
          Reply from MyMathsHero Support:
        </p>
        <p style="margin:12px 0 0;color:#334155;line-height:1.7;">
          ${replyMessage}
        </p>
      </div>

      ${isResolved ? `
      <div class="divider"></div>
      <p style="text-align:center;font-size:14px;color:#64748B;">
        Was this helpful?
      </p>
      <p style="text-align:center;">
        <a href="mailto:support@mymathshero.com.au?subject=Feedback on #${ticketId} - Helpful"
          class="btn btn-gold" style="margin-right:8px;">👍 Yes</a>
        <a href="mailto:support@mymathshero.com.au?subject=Feedback on #${ticketId} - Not Helpful"
          class="btn">👎 No</a>
      </p>` : `
      <p style="text-align:center;">
        <a href="mailto:support@mymathshero.com.au?subject=Re: Ticket #${ticketId}"
          class="btn">Reply to Support →</a>
      </p>`}
    `,
    footerText: `Ticket #${ticketId} · MyMathsHero Support`,
  })
}

// 5. PASSWORD RESET EMAIL
export function passwordResetEmail({ userName, resetUrl, expiresIn }) {
  return baseTemplate({
    title: 'Reset Your MyMathsHero Password',
    previewText: 'Reset your password — link expires in ' + expiresIn,
    content: `
      <h1>Password Reset Request 🔐</h1>
      <p>Hi ${userName},</p>
      <p>We received a request to reset your MyMathsHero password.
      Click the button below to create a new password.</p>

      <div class="divider"></div>
      <p style="text-align:center;">
        <a href="${resetUrl}" class="btn btn-gold">Reset My Password →</a>
      </p>
      <div class="divider"></div>

      <div class="highlight-box">
        <p style="margin:0;font-size:13px;color:#64748B;">
          ⏰ This link expires in <strong>${expiresIn}</strong><br/>
          🔒 If you did not request this, ignore this email.
          Your password will not change.<br/>
          ❓ Need help? Email
          <a href="mailto:support@mymathshero.com.au">support@mymathshero.com.au</a>
        </p>
      </div>
    `,
    footerText: `Password reset request · MyMathsHero`,
  })
}

// 6. BADGE EARNED EMAIL — sent to parent when child earns a badge.
export function badgeEarnedEmail({
  parentName, childName, badgeName,
  badgeEmoji, badgeDescription, dashboardUrl,
}) {
  return baseTemplate({
    title: `${childName} just earned the ${badgeName} badge! ${badgeEmoji}`,
    previewText: `${childName} earned a new Hero Badge — ${badgeName}!`,
    content: `
      <h1>${childName} is a Hero! ${badgeEmoji}</h1>
      <p>Hi ${parentName},</p>
      <p>Exciting news! ${childName} just earned a new badge on MyMathsHero.</p>

      <div style="text-align:center;padding:32px;background:#F0F4F8;
        border-radius:16px;margin:24px 0;border:2px solid #C49A1A;">
        <div style="font-size:64px;margin-bottom:12px;">${badgeEmoji}</div>
        <div style="font-size:22px;font-weight:800;color:#1B2B4B;">
          ${badgeName}
        </div>
        <div style="font-size:14px;color:#64748B;margin-top:8px;">
          ${badgeDescription}
        </div>
      </div>

      <p style="text-align:center;font-size:14px;color:#64748B;">
        Keep encouraging ${childName} to practise daily to earn more badges!
      </p>

      <div class="divider"></div>
      <p style="text-align:center;">
        <a href="${dashboardUrl}" class="btn">View ${childName}'s Progress →</a>
      </p>
    `,
    footerText: `Badge notification for ${childName} · MyMathsHero`,
  })
}

// 7. ADMIN ALERT EMAIL — internal notifications to admin.
export function adminAlertEmail({ alertType, message, data, timestamp }) {
  const dataRows = Object.entries(data || {}).map(([k, v]) =>
    `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #E2E8F0;
        font-weight:600;color:#64748B;font-size:13px;">${k}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #E2E8F0;
        font-size:13px;">${v}</td>
    </tr>`
  ).join('')

  return baseTemplate({
    title: `Admin Alert: ${alertType}`,
    previewText: message,
    content: `
      <div class="badge" style="background:#EF4444;color:white;">
        System Alert
      </div>
      <h1 style="margin-top:16px;">⚠️ ${alertType}</h1>
      <p>${message}</p>

      ${dataRows ? `
      <table style="width:100%;border-collapse:collapse;
        font-size:14px;margin:20px 0;">
        <tbody>${dataRows}</tbody>
      </table>` : ''}

      <div class="divider"></div>
      <p style="font-size:12px;color:#94A3B8;">
        Timestamp: ${timestamp || new Date().toISOString()}
      </p>
    `,
    footerText: `MyMathsHero Admin System`,
  })
}

// 8. STREAK REMINDER — sent when a student hasn't logged in for ~2 days.
export function streakReminderEmail({
  parentName, childName, currentStreak, dashboardUrl,
}) {
  return baseTemplate({
    title: `Don't break ${childName}'s streak! 🔥`,
    previewText: `${childName} has a ${currentStreak}-day streak to protect!`,
    content: `
      <h1>Keep the streak alive! 🔥</h1>
      <p>Hi ${parentName},</p>
      <p>${childName} hasn't practised today and has a
      <strong>${currentStreak}-day streak</strong> to protect!</p>

      <div style="text-align:center;padding:32px;background:#1B2B4B;
        border-radius:16px;margin:24px 0;">
        <div style="font-size:56px;margin-bottom:8px;">🔥</div>
        <div style="font-size:40px;font-weight:800;color:#C49A1A;">
          ${currentStreak}
        </div>
        <div style="color:rgba(255,255,255,0.7);font-size:14px;margin-top:4px;">
          day streak at risk!
        </div>
      </div>

      <p>Just 5 minutes of practice is all it takes to keep the
      streak going. Encourage ${childName} to log in today!</p>

      <div class="divider"></div>
      <p style="text-align:center;">
        <a href="${dashboardUrl}" class="btn btn-gold">
          Protect the Streak →
        </a>
      </p>
    `,
    footerText: `Streak reminder for ${childName} · MyMathsHero`,
  })
}

// Question-bank alert — sent by the fortnightly verify-bank cron ONLY when the
// scan flags wrong questions. Flagged questions are already withheld from
// students automatically; this email tells the admin to go approve the fixes.
export function questionBankAlertEmail({ flagged, scanned, byGrade = {}, adminUrl }) {
  const rows = Object.entries(byGrade)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([g, n]) => `<tr>
        <td style="padding:6px 12px;border-bottom:1px solid #E2E8F0;">${g === '0' ? 'Prep' : `Grade ${g}`}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #E2E8F0;text-align:right;font-weight:700;">${n}</td>
      </tr>`).join('')

  const content = `
    <h2 style="margin-bottom:8px;">${flagged} question${flagged === 1 ? '' : 's'} flagged</h2>
    <p style="color:#475569;line-height:1.6;margin-bottom:16px;">
      The fortnightly bank check scanned <strong>${scanned}</strong> question${scanned === 1 ? '' : 's'}
      and flagged <strong>${flagged}</strong> with a wrong or unanswerable answer.
    </p>
    <p style="color:#475569;line-height:1.6;margin-bottom:20px;">
      <strong>These are already hidden from students</strong> — flagged questions are withheld
      automatically. Nothing is broken for learners right now. When you're ready, open the
      admin panel and run <strong>Fix all flagged</strong> to correct or replace them.
    </p>
    ${rows ? `<table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <thead><tr>
        <th style="text-align:left;padding:6px 12px;border-bottom:2px solid #1B2B4B;">Grade</th>
        <th style="text-align:right;padding:6px 12px;border-bottom:2px solid #1B2B4B;">Flagged</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>` : ''}
    <a href="${adminUrl}" style="display:inline-block;background:#C49A1A;color:#1B2B4B;padding:14px 28px;border-radius:10px;font-weight:700;text-decoration:none;">
      Go fix it now →
    </a>
  `
  return baseTemplate({
    title: 'Question bank alert',
    previewText: `${flagged} questions flagged in the fortnightly check`,
    content,
    footerText: 'Automated question-bank check · MyMathsHero',
  })
}
