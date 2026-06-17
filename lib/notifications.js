// Persistent notification center.
//
// Every notable event calls one of the helpers below. They write a durable doc
// to the `notifications` collection (so a parent can see it later even if they
// missed the live push) and — for parent notifications — fire a best-effort
// push via the existing Expo sender. This is the single emit point; callers must
// never write the collection directly.
//
// Collection `notifications`:
//   { id, audience: 'parent'|'admin', recipientId, type, title, body, icon,
//     link, read, createdAt, meta }
//   - recipientId: the parentId for parent notifs; '*' for admin-feed docs.
//   - link: an in-app target the client knows how to open (e.g. 'support',
//     'subscription', 'children', 'badges'), or null.

import { v4 as uuidv4 } from 'uuid'
import { sendPushNotification } from '@/lib/pushNotifications'

const VALID_TYPES = new Set(['support', 'progress', 'badge', 'billing', 'broadcast', 'system'])

function clip(s, max) {
  return typeof s === 'string' ? s.slice(0, max) : ''
}

// Create one parent notification (and fire a best-effort push).
export async function createNotification(db, {
  recipientId, type = 'system', title, body = '', icon = '🔔', link = null, meta = {},
}) {
  if (!db || !recipientId) return null
  const doc = {
    id: uuidv4(),
    audience: 'parent',
    recipientId,
    type: VALID_TYPES.has(type) ? type : 'system',
    title: clip(title, 140),
    body: clip(body, 600),
    icon: clip(icon, 8) || '🔔',
    link,
    read: false,
    createdAt: new Date(),
    meta: meta && typeof meta === 'object' ? meta : {},
  }
  try {
    await db.collection('notifications').insertOne(doc)
  } catch (err) {
    console.error('[notifications] insert failed:', err.message)
    return null
  }
  // Best-effort live push — never block or throw on failure.
  try {
    const parent = await db.collection('parents').findOne(
      { id: recipientId },
      { projection: { pushToken: 1 } }
    )
    if (parent?.pushToken) {
      await sendPushNotification({
        token: parent.pushToken,
        title: doc.title,
        body: doc.body,
        data: { link: doc.link, type: doc.type, notificationId: doc.id },
      })
    }
  } catch { /* push is optional */ }
  return doc
}

// Create one admin-feed notification (no push; admins read it in the console).
export async function notifyAdmin(db, { type = 'system', title, body = '', icon = '🔔', link = null, meta = {} }) {
  if (!db) return null
  try {
    await db.collection('notifications').insertOne({
      id: uuidv4(),
      audience: 'admin',
      recipientId: '*',
      type: VALID_TYPES.has(type) ? type : 'system',
      title: clip(title, 140),
      body: clip(body, 600),
      icon: clip(icon, 8) || '🔔',
      link,
      read: false,
      createdAt: new Date(),
      meta: meta && typeof meta === 'object' ? meta : {},
    })
  } catch (err) {
    console.error('[notifications] admin insert failed:', err.message)
  }
}

// Broadcast a message to every parent — one doc each so reads are independent.
export async function createBroadcast(db, { title, body = '', icon = '📢' }) {
  if (!db) return { sent: 0 }
  const parents = await db.collection('parents').find({}).project({ id: 1, pushToken: 1 }).toArray()
  const now = new Date()
  const docs = parents
    .filter(p => p.id)
    .map(p => ({
      id: uuidv4(),
      audience: 'parent',
      recipientId: p.id,
      type: 'broadcast',
      title: clip(title, 140),
      body: clip(body, 600),
      icon: clip(icon, 8) || '📢',
      link: null,
      read: false,
      createdAt: now,
      meta: {},
    }))
  if (docs.length > 0) {
    try { await db.collection('notifications').insertMany(docs) } catch (err) {
      console.error('[notifications] broadcast insert failed:', err.message)
      return { sent: 0 }
    }
  }
  // Best-effort push to those with tokens (don't block on it).
  Promise.all(
    parents.filter(p => p.pushToken).map(p =>
      sendPushNotification({ token: p.pushToken, title: clip(title, 140), body: clip(body, 600), data: { type: 'broadcast' } }).catch(() => {})
    )
  ).catch(() => {})
  return { sent: docs.length }
}
