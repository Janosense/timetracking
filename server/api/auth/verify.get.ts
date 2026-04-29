import { getCookie } from 'h3'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const token = getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const valid = await verifyJwt(config.jwtSecret as string, token)
  if (!valid) throw createError({ statusCode: 401, message: 'Unauthorized' })
  return { ok: true }
})
