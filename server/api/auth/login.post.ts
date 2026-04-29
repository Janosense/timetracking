import { setCookie, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const { pin } = await readBody<{ pin: string }>(event)

  console.log('[auth/login] debug', {
    receivedLen: pin?.length ?? 0,
    configLen: (config.adminPin as string)?.length ?? 0,
    envSet: !!process.env.NUXT_ADMIN_PIN,
    envLen: process.env.NUXT_ADMIN_PIN?.length ?? 0,
    isDefault: config.adminPin === '1234',
    match: pin === config.adminPin
  })

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
