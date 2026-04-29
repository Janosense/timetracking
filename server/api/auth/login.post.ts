import { setCookie, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const { pin } = await readBody<{ pin: string }>(event)

  if (!pin || pin !== config.adminPin) {
    throw createError({ statusCode: 401, message: 'Invalid PIN' })
  }

  const token = await signJwt(config.jwtSecret as string, { role: 'admin' })

  setCookie(event, 'admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24
  })

  return { ok: true }
})
