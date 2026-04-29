import { getRouterParam } from 'h3'
import { and, eq } from 'drizzle-orm'
import { getDb } from '../../../db'
import { competitions, participants } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = getRouterParam(event, 'id')!
  const db = getDb()

  const [competition] = await db.select().from(competitions)
    .where(eq(competitions.id, id)).limit(1)

  if (!competition) throw createError({ statusCode: 404, message: 'Competition not found' })

  await db.update(participants).set({ status: 'dnf' })
    .where(and(eq(participants.competitionId, id), eq(participants.status, 'active')))

  await db.update(competitions).set({ status: 'completed' })
    .where(eq(competitions.id, id))

  return { ok: true }
})
