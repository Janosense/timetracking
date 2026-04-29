import { SignJWT, jwtVerify } from 'jose'
import { getCookie } from 'h3'
import type { H3Event } from 'h3'

export async function signJwt(secret: string, payload: Record<string, unknown>): Promise<string> {
  const key = new TextEncoder().encode(secret)
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .setIssuedAt()
    .sign(key)
}

export async function verifyJwt(secret: string, token: string): Promise<boolean> {
  try {
    const key = new TextEncoder().encode(secret)
    await jwtVerify(token, key)
    return true
  } catch {
    return false
  }
}

export async function requireAdmin(event: H3Event): Promise<void> {
  const config = useRuntimeConfig()
  const token = getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const valid = await verifyJwt(config.jwtSecret as string, token)
  if (!valid) throw createError({ statusCode: 401, message: 'Unauthorized' })
}
