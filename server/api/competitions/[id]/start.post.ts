import { getRouterParam } from 'h3'
import { eq } from 'drizzle-orm'
import { getDb } from '../../../db'
import { competitions } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = getRouterParam(event, 'id')!
  const db = getDb()

  const [competition] = await db.select().from(competitions)
    .where(eq(competitions.id, id)).limit(1)

  if (!competition) throw createError({ statusCode: 404, message: 'Competition not found' })
  if (competition.status !== 'pending') throw createError({ statusCode: 400, message: 'Competition already started' })

  await db.update(competitions)
    .set({ status: 'active', actualStart: Date.now() })
    .where(eq(competitions.id, id))

  return { ok: true }
})
