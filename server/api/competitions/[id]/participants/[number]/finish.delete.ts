import { getRouterParam } from 'h3'
import { eq, and, desc } from 'drizzle-orm'
import { getDb } from '../../../../../db'
import { competitions, participants, finishRecords } from '../../../../../db/schema'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const competitionId = getRouterParam(event, 'id')!
  const bibNumber = parseInt(getRouterParam(event, 'number')!, 10)

  const db = getDb()

  const [competition] = await db.select().from(competitions)
    .where(eq(competitions.id, competitionId)).limit(1)

  if (!competition) throw createError({ statusCode: 404, message: 'Competition not found' })
  if (competition.status !== 'active') throw createError({ statusCode: 400, message: 'Competition is not active' })

  const [participant] = await db.select().from(participants)
    .where(and(
      eq(participants.competitionId, competitionId),
      eq(participants.bibNumber, bibNumber)
    )).limit(1)

  if (!participant) throw createError({ statusCode: 404, message: 'Participant not found' })

  // Find the most recent finish record for this participant
  const [record] = await db.select().from(finishRecords)
    .where(eq(finishRecords.participantId, participant.id))
    .orderBy(desc(finishRecords.recordedAt))
    .limit(1)

  if (!record) throw createError({ statusCode: 404, message: 'No finish record to undo' })

  await db.delete(finishRecords).where(eq(finishRecords.id, record.id))
  await db.update(participants).set({ status: 'active' })
    .where(eq(participants.id, participant.id))

  // For classic: recompute all finisher positions
  if (competition.type === 'classic') {
    await recomputeClassicStatuses(competitionId)
  }

  return buildCompetitionResponse(competitionId)
})
