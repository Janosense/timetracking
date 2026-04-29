import { and, desc, eq, isNotNull, lte, sql } from 'drizzle-orm'
import { getDb } from '../../db'
import { competitions, participants } from '../../db/schema'

export default defineEventHandler(async () => {
  const db = getDb()

  const due = await db.select({ id: competitions.id }).from(competitions)
    .where(and(
      eq(competitions.status, 'pending'),
      isNotNull(competitions.scheduledStart),
      lte(competitions.scheduledStart, Date.now())
    ))

  for (const { id } of due) await processAutoStart(id)

  const rows = await db
    .select({
      id: competitions.id,
      name: competitions.name,
      type: competitions.type,
      status: competitions.status,
      scheduledStart: competitions.scheduledStart,
      actualStart: competitions.actualStart,
      createdAt: competitions.createdAt,
      participantCount: sql<number>`count(${participants.id})`
    })
    .from(competitions)
    .leftJoin(participants, eq(participants.competitionId, competitions.id))
    .groupBy(competitions.id)
    .orderBy(desc(competitions.createdAt))

  return rows
})
