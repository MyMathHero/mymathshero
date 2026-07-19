import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { sendEmail } from '@/lib/email'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

export async function POST(request) {
  try {
    const { email, name, firstName, lastName, childGrade } = await request.json()

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    const normalisedEmail = email.trim().toLowerCase()
    const db = await connectDB()

    const existing = await db.collection('waitlist').findOne({ email: normalisedEmail })
    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'Already on waitlist',
        position: existing.position,
      })
    }

    const count = await db.collection('waitlist').countDocuments()
    const position = count + 1

    const resolvedName = name || `${firstName || ''} ${lastName || ''}`.trim() || null

    await db.collection('waitlist').insertOne({
      email: normalisedEmail,
      name: resolvedName,
      firstName: firstName || '',
      lastName: lastName || '',
      childGrade: childGrade || null,
      position,
      source: 'coming-soon-page',
      createdAt: new Date(),
    })

    // Create a Stripe customer on signup — best-effort, never block the response.
    if (stripe) {
      try {
        const customer = await stripe.customers.create({
          email: normalisedEmail,
          name: resolvedName || undefined,
          metadata: {
            source: 'waitlist',
            childGrade: childGrade ? String(childGrade) : '',
            waitlistPosition: String(position),
            foundingFamily: position <= 1000 ? 'true' : 'false',
          },
        })
        await db.collection('waitlist').updateOne(
          { email: normalisedEmail },
          { $set: {
            stripeCustomerId: customer.id,
            foundingFamily: position <= 1000,
          }}
        )
      } catch (err) {
        console.error('[waitlist] Stripe customer creation failed:', err?.message)
        // Do not block waitlist signup if Stripe fails.
      }
    }

    // User confirmation email — best-effort, never block the response.
    try {
      await sendEmail({
        to: normalisedEmail,
        from: 'hello',
        subject: "You're on the MyMathsHero waitlist! 🎉",
        html: confirmationHtml(position),
      })
    } catch (err) {
      console.error('[waitlist] user email failed:', err?.message)
    }

    // Admin notification — best-effort.
    try {
      await sendEmail({
        to: 'hello@mymathshero.com.au',
        from: 'admin',
        subject: `New waitlist signup #${position}: ${normalisedEmail}`,
        html: `<p>New waitlist signup:</p>
          <ul>
            <li><strong>Email:</strong> ${normalisedEmail}</li>
            <li><strong>Position:</strong> #${position}</li>
            <li><strong>Time:</strong> ${new Date().toLocaleString('en-AU')}</li>
            ${resolvedName ? `<li><strong>Name:</strong> ${escapeHtml(resolvedName)}</li>` : ''}
            ${childGrade ? `<li><strong>Child year level:</strong> ${escapeHtml(gradeLabel(childGrade))}</li>` : ''}
          </ul>`,
      })
    } catch (err) {
      console.error('[waitlist] admin email failed:', err?.message)
    }

    return NextResponse.json({
      success: true,
      position,
      message: `You're #${position} on the waitlist!`,
    })
  } catch (error) {
    console.error('[waitlist] error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const db = await connectDB()
    const count = await db.collection('waitlist').countDocuments()
    const recent = await db.collection('waitlist')
      .find({}, { projection: { _id: 0, email: 1, position: 1, name: 1, createdAt: 1 } })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray()
    return NextResponse.json({ count, recent })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Map the form's year-level value ('prep', '1'…'6') to a friendly label.
function gradeLabel(grade) {
  const g = String(grade).toLowerCase()
  if (g === 'prep') return 'Prep'
  if (/^[1-6]$/.test(g)) return `Year ${g}`
  return String(grade)
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function confirmationHtml(position) {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F0F4F8;font-family:'DM Sans','Segoe UI',Arial,sans-serif;">
  <div style="padding:40px 20px;">
    <div style="max-width:560px;margin:0 auto;background:white;border-radius:20px;overflow:hidden;border:1px solid #E2E8F0;box-shadow:0 4px 24px rgba(27,43,75,0.08);">
      <div style="background:#1B2B4B;padding:32px;text-align:center;border-bottom:4px solid #C49A1A;">
        <h1 style="color:white;margin:0;font-size:28px;font-weight:800;letter-spacing:-0.5px;">
          MyMaths<span style="color:#C49A1A;">Hero</span>
        </h1>
        <p style="color:#C49A1A;font-size:13px;margin:6px 0 0;font-weight:600;">Australia's AI Maths Tutor</p>
      </div>
      <div style="padding:32px;">
        <h2 style="color:#1B2B4B;margin:0 0 12px;font-size:22px;font-weight:800;">
          You're on the list! 🎉
        </h2>
        <p style="color:#64748B;line-height:1.7;font-size:15px;margin:0 0 16px;">
          Thanks for joining the MyMathsHero waitlist — you're in! 🎉
        </p>
        <p style="color:#64748B;line-height:1.7;font-size:15px;margin:0 0 20px;">
          We'll email you the moment we launch with an exclusive founding-family discount.
        </p>
        <div style="background:#FFFBEB;border:1px solid #C49A1A;border-radius:12px;padding:16px;margin:20px 0;">
          <p style="margin:0;font-weight:700;color:#1B2B4B;font-size:14px;line-height:1.5;">
            🎁 Founding Family Offer:<br/>
            First 1,000 families get their first month free, then just $19.99/month for the first year (normally $24.99/month).
          </p>
        </div>
        <p style="color:#94A3B8;font-size:12px;margin:24px 0 0;text-align:center;">
          © ${new Date().getFullYear()} MyMathsHero · mymathshero.com.au
        </p>
      </div>
    </div>
  </div>
</body>
</html>`
}
