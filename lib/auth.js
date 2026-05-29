import { SignJWT, jwtVerify } from 'jose'

const COOKIE_NAME = 'mymathshero_token'
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60 // 7 days

function getSecret() {
  const secret = process.env.JWT_SECRET || 'mymathshero_jwt_secret_dev_only'
  return new TextEncoder().encode(secret)
}

export async function createToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret())
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload
  } catch {
    return null
  }
}

export function setAuthCookie(response, token) {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === 'production',
  })
}

export function getAuthCookie(request) {
  return request.cookies.get(COOKIE_NAME)?.value ?? null
}

// Resolve a token from either the httpOnly cookie (web) or an
// `Authorization: Bearer <token>` header (native mobile clients).
export function getRequestToken(request) {
  const cookieToken = getAuthCookie(request)
  if (cookieToken) return cookieToken
  const authHeader = request.headers.get('authorization') || ''
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim() || null
  }
  return null
}
