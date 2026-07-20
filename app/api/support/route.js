import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getRequestToken, verifyToken } from '@/lib/auth'
import { sendEmail, sendSupportConfirmation } from '@/lib/email'
import { notifyAdmin } from '@/lib/notifications'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

let client
async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'mymathshero')
}

const CATEGORIES = new Set(['billing', 'technical', 'learning', 'account', 'other'])
const SUPPORT_INBOX = process.env.SUPPORT_INBOX_EMAIL || 'support@mymathshero.com.au'

function clean(s, max) {
  return typeof s === 'string' ? s.trim().slice(0, max) : ''
}

async function authUser(request) {
  const token = getRequestToken(request)
  if (!token) return null
  const payload = await verifyToken(token)
  if (!payload || (payload.role !== 'parent' && payload.role !== 'student')) return null
  return payload
}

// Resolve the email we should notify for a ticket. Parents have their own
// email; students don't, so we notify their parent.
async function resolveNotifyEmail(db, payload) {
  if (payload.role === 'parent') {
    const parent = await db.collection('parents').findOne({ id: payload.userId })
    return { email: parent?.email || null, parentName: parent?.name || payload.name }
  }
  // student → find parent via the child record
  const child = await db.collection('children').findOne({ id: payload.userId })
  if (child?.parentId) {
    const parent = await db.collection('parents').findOne({ id: child.parentId })
    return { email: parent?.email || null, parentName: parent?.name || null }
  }
  return { email: null, parentName: null }
}

function ticketEmailHtml({ heading, name, body, status }) {
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <div style="background:#1B2B4B;padding:24px;text-align:center;border-radius:12px 12px 0 0">
        <h1 style="color:white;margin:0">MyMaths<span style="color:#C49A1A">Hero</span></h1>
      </div>
      <div style="background:white;padding:32px;border:1px solid #E2E8F0">
        <h2 style="color:#1B2B4B">${heading}</h2>
        <p>Hi ${name || 'there'},</p>
        ${body ? `<div style="background:#F0F4F8;border-radius:12px;padding:16px;margin:16px 0;color:#1B2B4B">${body}</div>` : ''}
        ${status ? `<p style="color:#64748B">Ticket status: <strong>${status}</strong></p>` : ''}
        <a href="https://mymathshero.com.au/parent-dashboard"
          style="display:block;background:#1B2B4B;color:white;text-align:center;padding:14px;border-radius:12px;text-decoration:none;font-weight:800;border:2px solid #C49A1A;margin-top:20px">
          View in MyMathsHero →
        </a>
      </div>
    </div>`
}

// GET — list the caller's tickets, or one full thread with ?id=.
export async function GET(request) {
  const payload = await authUser(request)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const db = await connectDB()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (id) {
      const ticket = await db.collection('support_tickets').findOne({ id, userId: payload.userId })
      if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
      // Opening a ticket clears the user's unread flag.
      if (ticket.unreadForUser) {
        await db.collection('support_tickets').updateOne({ id }, { $set: { unreadForUser: false } })
        ticket.unreadForUser = false
      }
      const { _id, ...safe } = ticket
      return NextResponse.json({ ticket: safe })
    }

    const tickets = await db.collection('support_tickets')
      .find({ userId: payload.userId })
      .project({ _id: 0, messages: 0 }) // list view: omit full threads
      .sort({ updatedAt: -1 })
      .limit(100)
      .toArray()
    return NextResponse.json({ tickets })
  } catch (error) {
    console.error('[support GET]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST — create a ticket, or add a reply with ?id=.
export async function POST(request) {
  const payload = await authUser(request)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const db = await connectDB()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const body = await request.json().catch(() => ({}))
    const now = new Date()

    // ── Reply to an existing ticket ───────────────────────────────────────────
    if (id) {
      const msg = clean(body.message, 4000)
      if (!msg) return NextResponse.json({ error: 'message is required' }, { status: 400 })
      const ticket = await db.collection('support_tickets').findOne({ id, userId: payload.userId })
      if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

      await db.collection('support_tickets').updateOne(
        { id },
        {
          $push: { messages: { from: 'user', authorName: payload.name || 'You', body: msg, createdAt: now } },
          $set: {
            updatedAt: now,
            lastReplyBy: 'user',
            unreadForAdmin: true,
            // A user reply reopens a resolved/closed ticket.
            status: ticket.status === 'closed' || ticket.status === 'resolved' ? 'open' : ticket.status,
          },
        }
      )
      sendEmail({
        to: SUPPORT_INBOX,
        subject: `↩️ Reply on support ticket: ${ticket.subject}`,
        from: 'support',
        html: ticketEmailHtml({ heading: 'New reply on a ticket', name: 'Support', body: msg }),
      }).catch(() => {})
      return NextResponse.json({ success: true })
    }

    // ── Create a new ticket ─────────────────────────────────────────────────
    const subject = clean(body.subject, 140)
    const message = clean(body.message, 4000)
    let category = clean(body.category, 20)
    if (!CATEGORIES.has(category)) category = 'other'
    if (!subject) return NextResponse.json({ error: 'subject is required' }, { status: 400 })
    if (!message) return NextResponse.json({ error: 'message is required' }, { status: 400 })

    const { email, parentName } = await resolveNotifyEmail(db, payload)
    const ticketId = uuidv4()

    await db.collection('support_tickets').insertOne({
      id: ticketId,
      userId: payload.userId,
      role: payload.role,
      userName: payload.name || (payload.role === 'parent' ? parentName : 'Student') || 'User',
      notifyEmail: email,
      subject,
      category,
      status: 'open',
      messages: [{ from: 'user', authorName: payload.name || 'User', body: message, createdAt: now }],
      unreadForUser: false,
      unreadForAdmin: true,
      lastReplyBy: 'user',
      createdAt: now,
      updatedAt: now,
    })

    // Alert the support inbox that a new ticket arrived.
    sendEmail({
      to: SUPPORT_INBOX,
      subject: `🎫 New support ticket: ${subject}`,
      from: 'support',
      html: ticketEmailHtml({
        heading: 'New support ticket',
        name: 'Support',
        body: `<strong>${subject}</strong> (${category})<br><br>${message}`,
      }),
    }).catch(() => {})

    // Confirm to the USER that we got their message (only if we have an email).
    if (email) {
      sendSupportConfirmation({
        userEmail: email,
        userName: payload.name || parentName || 'there',
        ticketId,
        subject,
        message,
        estimatedResponse: '1–2 business days',
      }).catch(() => {})
    }

    // Admin-feed notification so it surfaces in the admin console too.
    notifyAdmin(db, {
      type: 'support', icon: '🎫',
      title: 'New support ticket',
      body: `${payload.name || 'A user'}: “${subject}” (${category})`,
      link: 'support',
      meta: { ticketId },
    }).catch(() => {})

    return NextResponse.json({ success: true, id: ticketId })
  } catch (error) {
    console.error('[support POST]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
