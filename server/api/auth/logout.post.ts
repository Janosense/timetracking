import { deleteCookie } from 'h3'

export default defineEventHandler((event) => {
  deleteCookie(event, 'admin_token')
  return { ok: true }
})
