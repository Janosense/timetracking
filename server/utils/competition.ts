import { eq, and, asc, notInArray } from 'drizzle-orm'
import { getDb } from '../db'
import { competitions, participants, finishRecords } from '../db/schema'

export function computeCurrentLap(actualStart: number, lapDurationMinutes: number): number {
  const elapsed = Date.now() - actualStart
  const lapDurationMs = lapDurationMinutes * 60 * 1000
  return Math.floor(elapsed / lapDurationMs) + 1
}

export async function processClassicExpiry(competitionId: string): Promise<void> {
  const db = getDb()
  const [competition] = await db.select().from(competitions)
    .where(eq(competitions.id, competitionId)).limit(1)

  if (!competition || competition.type !== 'classic' ||
      !competition.actualStart || !competition.controlTimeMinutes ||
      competition.status !== 'active') return

  const elapsed = Date.now() - competition.actualStart
  if (elapsed < competition.controlTimeMinutes * 60 * 1000) return

  await db.update(participants).set({ status: 'dnf' })
    .where(and(eq(participants.competitionId, competitionId), eq(participants.status, 'active')))
  await db.update(competitions).set({ status: 'completed' })
    .where(eq(competitions.id, competitionId))
}

async function finalizeTargetBackyard(competitionId: string, lapDurationMs: number): Promise<void> {
  const db = getDb()
  const activeParticipants = await db.select().from(participants)
    .where(and(eq(participants.competitionId, competitionId), eq(participants.status, 'active')))

  if (activeParticipants.length === 0) {
    await db.update(competitions).set({ status: 'completed' })
      .where(eq(competitions.id, competitionId))
    return
  }

  const allFinishes = await db.select().from(finishRecords)
    .where(eq(finishRecords.competitionId, competitionId))

  const ranked = activeParticipants.map(p => {
    const pLaps = allFinishes.filter(f => f.participantId === p.id)
    const totalTimeMs = pLaps.reduce((sum, l) => sum + l.finishTimeMs - (l.lapNumber - 1) * lapDurationMs, 0)
    return { participant: p, totalTimeMs }
  }).sort((a, b) => a.totalTimeMs - b.totalTimeMs)

  for (let i = 0; i < ranked.length; i++) {
    await db.update(participants)
      .set({ status: i === 0 ? 'winner' : 'finisher' })
      .where(eq(participants.id, ranked[i].participant.id))
  }
  await db.update(competitions).set({ status: 'completed' })
    .where(eq(competitions.id, competitionId))
}

export async function processLapTransitions(competitionId: string): Promise<void> {
  const db = getDb()
  const [competition] = await db.select().from(competitions)
    .where(eq(competitions.id, competitionId)).limit(1)

  if (!competition || competition.type !== 'backyard_ultra' ||
      !competition.actualStart || competition.status !== 'active') return

  const elapsed = Date.now() - competition.actualStart
  const lapDurationMs = (competition.lapDurationMinutes ?? 60) * 60 * 1000
  const completedLaps = Math.floor(elapsed / lapDurationMs)

  if (completedLaps === 0) return

  for (let lap = 1; lap <= completedLaps; lap++) {
    const lapFinishes = await db.select().from(finishRecords)
      .where(and(eq(finishRecords.competitionId, competitionId), eq(finishRecords.lapNumber, lap)))

    const finishedIds = lapFinishes.map(f => f.participantId)

    if (finishedIds.length === 0) {
      await db.update(participants).set({ status: 'dnf' })
        .where(and(eq(participants.competitionId, competitionId), eq(participants.status, 'active')))
      await db.update(competitions).set({ status: 'completed' })
        .where(eq(competitions.id, competitionId))
      return
    }

    await db.update(participants).set({ status: 'dnf' })
      .where(and(
        eq(participants.competitionId, competitionId),
        eq(participants.status, 'active'),
        notInArray(participants.id, finishedIds)
      ))

    if (competition.targetLaps && lap >= competition.targetLaps) {
      await finalizeTargetBackyard(competitionId, lapDurationMs)
      return
    }

    if (!competition.targetLaps) {
      const activeAfter = await db.select().from(participants)
        .where(and(eq(participants.competitionId, competitionId), eq(participants.status, 'active')))

      if (activeAfter.length === 1) {
        await db.update(participants).set({ status: 'winner' })
          .where(eq(participants.id, activeAfter[0].id))
        await db.update(competitions).set({ status: 'completed' })
          .where(eq(competitions.id, competitionId))
        return
      }

      if (activeAfter.length === 0) {
        await db.update(competitions).set({ status: 'completed' })
          .where(eq(competitions.id, competitionId))
        return
      }
    }
  }
}

export async function recomputeClassicStatuses(competitionId: string): Promise<void> {
  const db = getDb()
  const finishes = await db.select().from(finishRecords)
    .where(eq(finishRecords.competitionId, competitionId))
    .orderBy(asc(finishRecords.finishTimeMs))

  for (let i = 0; i < finishes.length; i++) {
    const status = i === 0 ? 'winner' : i <= 2 ? 'prize_winner' : 'finisher'
    await db.update(participants).set({ status })
      .where(eq(participants.id, finishes[i].participantId))
  }
}

export interface LapResult {
  lapNumber: number
  finishTimeMs: number
  lapTimeMs: number
}

export interface ParticipantResult {
  id: string
  bibNumber: number
  name: string | null
  status: string
  laps: LapResult[]
  completedLaps: number
  finishTimeMs: number | null
  lastLapTimeMs: number | null
  totalTimeMs: number | null
  currentLapFinished: boolean
}

export interface CompetitionResponse {
  id: string
  name: string
  type: string
  status: string
  scheduledStart: number | null
  actualStart: number | null
  controlTimeMinutes: number | null
  lapDurationMinutes: number
  targetLaps: number | null
  createdAt: number
  currentLap: number | null
  participants: ParticipantResult[]
  activeCount: number
  totalCount: number
}

export async function buildCompetitionResponse(competitionId: string): Promise<CompetitionResponse> {
  const db = getDb()
  const [competition] = await db.select().from(competitions)
    .where(eq(competitions.id, competitionId)).limit(1)

  if (!competition) throw createError({ statusCode: 404, message: 'Competition not found' })

  const allParticipants = await db.select().from(participants)
    .where(eq(participants.competitionId, competitionId))
    .orderBy(asc(participants.bibNumber))

  const allFinishes = await db.select().from(finishRecords)
    .where(eq(finishRecords.competitionId, competitionId))
    .orderBy(asc(finishRecords.finishTimeMs))

  const lapDurationMs = (competition.lapDurationMinutes ?? 60) * 60 * 1000

  let currentLap: number | null = null
  if (competition.actualStart && competition.status === 'active' && competition.type === 'backyard_ultra') {
    currentLap = computeCurrentLap(competition.actualStart, competition.lapDurationMinutes ?? 60)
  }

  const participantResults: ParticipantResult[] = allParticipants.map(p => {
    const pFinishes = allFinishes
      .filter(f => f.participantId === p.id)
      .sort((a, b) => a.lapNumber - b.lapNumber)

    const laps: LapResult[] = pFinishes.map(f => ({
      lapNumber: f.lapNumber,
      finishTimeMs: f.finishTimeMs,
      lapTimeMs: f.finishTimeMs - (f.lapNumber - 1) * lapDurationMs
    }))

    const lastLap = laps[laps.length - 1] ?? null
    const totalTimeMs = laps.length > 0 ? laps.reduce((sum, l) => sum + l.lapTimeMs, 0) : null

    return {
      id: p.id,
      bibNumber: p.bibNumber,
      name: p.name,
      status: p.status,
      laps,
      completedLaps: laps.length,
      finishTimeMs: laps[0]?.finishTimeMs ?? null,
      lastLapTimeMs: lastLap?.lapTimeMs ?? null,
      totalTimeMs,
      currentLapFinished: currentLap !== null && laps.some(l => l.lapNumber === currentLap)
    }
  })

  return {
    id: competition.id,
    name: competition.name,
    type: competition.type,
    status: competition.status,
    scheduledStart: competition.scheduledStart,
    actualStart: competition.actualStart,
    controlTimeMinutes: competition.controlTimeMinutes,
    lapDurationMinutes: competition.lapDurationMinutes ?? 60,
    targetLaps: competition.targetLaps,
    createdAt: competition.createdAt,
    currentLap,
    participants: participantResults,
    activeCount: allParticipants.filter(p => p.status === 'active').length,
    totalCount: allParticipants.length
  }
}
