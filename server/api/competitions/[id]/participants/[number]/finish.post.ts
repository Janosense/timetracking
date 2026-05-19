import { getRouterParam, readBody } from 'h3'
import { eq, and, count } from 'drizzle-orm'
import { getDb } from '../../../../../db'
import { competitions, participants, finishRecords } from '../../../../../db/schema'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const competitionId = getRouterParam(event, 'id')!
  const bibNumber = parseInt(getRouterParam(event, 'number')!, 10)

  const body = await readBody<{ finishTimeMs?: unknown }>(event).catch(() => ({}))
  const finishTimeMs = body?.finishTimeMs

  if (typeof finishTimeMs !== 'number' || !Number.isInteger(finishTimeMs) || finishTimeMs < 0) {
    throw createError({ statusCode: 400, message: 'finishTimeMs must be a non-negative integer' })
  }

  const db = getDb()

  const [competition] = await db.select().from(competitions)
    .where(eq(competitions.id, competitionId)).limit(1)

  if (!competition) throw createError({ statusCode: 404, message: 'Competition not found' })
  if (competition.status !== 'active') throw createError({ statusCode: 400, message: 'Competition is not active' })
  if (!competition.actualStart) throw createError({ statusCode: 400, message: 'Competition has not started' })

  const elapsedMs = Date.now() - competition.actualStart
  if (finishTimeMs > elapsedMs + 5000) {
    throw createError({ statusCode: 400, message: 'finishTimeMs exceeds elapsed race time' })
  }

  const [participant] = await db.select().from(participants)
    .where(and(
      eq(participants.competitionId, competitionId),
      eq(participants.bibNumber, bibNumber)
    )).limit(1)

  if (!participant) throw createError({ statusCode: 404, message: 'Participant not found' })
  if (participant.status !== 'active') throw createError({ statusCode: 400, message: 'Participant is not active' })

  const now = Date.now()

  if (competition.type === 'classic') {
    const [{ total }] = await db.select({ total: count() }).from(finishRecords)
      .where(eq(finishRecords.competitionId, competitionId))

    const position = total
    const status = position === 0 ? 'winner' : position <= 2 ? 'prize_winner' : 'finisher'

    await db.insert(finishRecords).values({
      id: crypto.randomUUID(),
      participantId: participant.id,
      competitionId,
      lapNumber: 1,
      finishTimeMs,
      recordedAt: now
    })

    await db.update(participants).set({ status })
      .where(eq(participants.id, participant.id))

    return { ok: true, lapNumber: 1, finishTimeMs }
  }

  await processLapTransitions(competitionId)

  const [refreshed] = await db.select().from(participants)
    .where(eq(participants.id, participant.id)).limit(1)

  if (!refreshed || refreshed.status !== 'active') {
    throw createError({ statusCode: 400, message: 'Participant is no longer active' })
  }

  const lapDurationMs = (competition.lapDurationMinutes ?? 60) * 60 * 1000
  const lapNumber = Math.floor(finishTimeMs / lapDurationMs) + 1

  const [existing] = await db.select().from(finishRecords)
    .where(and(
      eq(finishRecords.participantId, participant.id),
      eq(finishRecords.lapNumber, lapNumber)
    )).limit(1)

  if (existing) throw createError({ statusCode: 400, message: 'Already recorded for this lap' })

  await db.insert(finishRecords).values({
    id: crypto.randomUUID(),
    participantId: participant.id,
    competitionId,
    lapNumber,
    finishTimeMs,
    recordedAt: now
  })

  return { ok: true, lapNumber, finishTimeMs }
})
