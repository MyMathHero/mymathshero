import { MongoClient } from 'mongodb'
import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'
import { createNotification } from '@/lib/notifications'

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

const STATUSES = new Set(['open', 'in_progress', 'resolved', 'closed'])

// Tickets contain free-text user messages → never public. Gate on x-admin-key,
// same as /api/feedback GET. The admin app calls this via a server-side proxy.
function checkAdminKey(request) {
  const expected = process.env.ADMIN_API_KEY
  if (!expected) {
    console.error('[admin/support] ADMIN_API_KEY env var missing')
    return { ok: false, status: 500, error: 'Server misconfigured' }
  }
  if (request.headers.get('x-admin-key') !== expected) {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }
  return { ok: true }
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
        ${status ? `<p style="color:#64748B">Ticket status: <strong>${status.replace('_', ' ')}</strong></p>` : ''}
        <a href="https://mymathshero.com.au/parent-dashboard"
          style="display:block;background:#1B2B4B;color:white;text-align:center;padding:14px;border-radius:12px;text-decoration:none;font-weight:800;border:2px solid #C49A1A;margin-top:20px">
          View your ticket →
        </a>
      </div>
    </div>`
}

// GET — list all tickets (filter by status), or one full thread with ?id=.
export async function GET(request) {
  const auth = checkAdminKey(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const db = await connectDB()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (id) {
      const ticket = await db.collection('support_tickets').findOne({ id })
      if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
      if (ticket.unreadForAdmin) {
        await db.collection('support_tickets').updateOne({ id }, { $set: { unreadForAdmin: false } })
        ticket.unreadForAdmin = false
      }
      const { _id, ...safe } = ticket
      return NextResponse.json({ ticket: safe })
    }

    const status = searchParams.get('status')
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10) || 100, 500)
    const query = status && STATUSES.has(status) ? { status } : {}

    const tickets = await db.collection('support_tickets')
      .find(query)
      .project({ _id: 0, messages: 0 })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .toArray()

    const counts = await db.collection('support_tickets').aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]).toArray()
    const byStatus = {}
    counts.forEach(c => { byStatus[c._id] = c.count })

    return NextResponse.json({ tickets, counts: byStatus })
  } catch (error) {
    console.error('[admin/support GET]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST — admin reply and/or status change. Body: { id, body?, status?, adminName? }
export async function POST(request) {
  const auth = checkAdminKey(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const db = await connectDB()
    const { id, body: replyBody, status, adminName } = await request.json().catch(() => ({}))
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const ticket = await db.collection('support_tickets').findOne({ id })
    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

    const now = new Date()
    const set = { updatedAt: now }
    const push = {}

    const reply = typeof replyBody === 'string' ? replyBody.trim().slice(0, 4000) : ''
    if (reply) {
      push.messages = { from: 'admin', authorName: adminName || 'Support Team', body: reply, createdAt: now }
      set.unreadForUser = true
      set.lastReplyBy = 'admin'
      // Replying to an open ticket moves it to in_progress unless a status is given.
      if (!status && ticket.status === 'open') set.status = 'in_progress'
    }
    if (status && STATUSES.has(status)) set.status = status

    if (!reply && !status) {
      return NextResponse.json({ error: 'Provide a reply body and/or a status' }, { status: 400 })
    }

    const update = { $set: set }
    if (push.messages) update.$push = push
    await db.collection('support_tickets').updateOne({ id }, update)

    // Notify the user (parent email) on a reply or status change.
    if (ticket.notifyEmail) {
      const heading = reply ? 'Support replied to your ticket' : 'Your ticket was updated'
      sendEmail({
        to: ticket.notifyEmail,
        subject: reply ? `Re: ${ticket.subject}` : `Update on: ${ticket.subject}`,
        from: 'support',
        html: ticketEmailHtml({
          heading,
          name: ticket.userName,
          body: reply || null,
          status: set.status || ticket.status,
        }),
      }).catch(() => {})
    }

    // Persistent in-app notification → the PARENT. For a parent ticket userId is
    // the parent; for a student ticket resolve the parent via the child record.
    let parentId = null
    if (ticket.role === 'parent') parentId = ticket.userId
    else {
      const child = await db.collection('children').findOne({ id: ticket.userId }, { projection: { parentId: 1 } })
      parentId = child?.parentId || null
    }
    if (parentId) {
      createNotification(db, {
        recipientId: parentId,
        type: 'support',
        icon: '🎫',
        title: reply ? 'Support replied to your ticket' : 'Your ticket was updated',
        body: reply ? `“${ticket.subject}” — ${reply.slice(0, 120)}` : `“${ticket.subject}” is now ${(set.status || ticket.status).replace('_', ' ')}.`,
        link: 'support',
        meta: { ticketId: ticket.id },
      }).catch(() => {})
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[admin/support POST]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
