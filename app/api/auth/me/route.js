import { NextResponse } from 'next/server'
import { getRequestToken, verifyToken } from '@/lib/auth'

export async function GET(request) {
  const token = getRequestToken(request)

  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  const payload = await verifyToken(token)

  if (!payload) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      userId: payload.userId,
      role: payload.role,
      name: payload.name,
      grade: payload.grade ?? null,
    },
  })
}
