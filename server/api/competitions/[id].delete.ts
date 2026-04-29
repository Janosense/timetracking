import { getRouterParam } from 'h3'
import { eq } from 'drizzle-orm'
import { getDb } from '../../db'
import { competitions, finishRecords, participants } from '../../db/schema'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = getRouterParam(event, 'id')!
  const db = getDb()

  const [competition] = await db.select().from(competitions)
    .where(eq(competitions.id, id)).limit(1)

  if (!competition) throw createError({ statusCode: 404, message: 'Competition not found' })
  if (competition.status === 'active') {
    throw createError({ statusCode: 400, message: 'Cannot delete an active competition. End it first.' })
  }

  await db.delete(finishRecords).where(eq(finishRecords.competitionId, id))
  await db.delete(participants).where(eq(participants.competitionId, id))
  await db.delete(competitions).where(eq(competitions.id, id))

  return { ok: true }
})
