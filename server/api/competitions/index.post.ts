import { readBody } from 'h3'
import { getDb } from '../../db'
import { competitions, participants } from '../../db/schema'

interface CreateCompetitionBody {
  name: string
  type: 'classic' | 'backyard_ultra'
  scheduledStart?: number
  controlTimeMinutes?: number
  lapDurationMinutes?: number
  targetLaps?: number
  participants: { number: number; name?: string }[]
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody<CreateCompetitionBody>(event)

  if (!body.name?.trim()) throw createError({ statusCode: 400, message: 'Name is required' })
  if (!body.type) throw createError({ statusCode: 400, message: 'Type is required' })
  if (!body.participants?.length) throw createError({ statusCode: 400, message: 'At least one participant is required' })

  const db = getDb()
  const id = crypto.randomUUID()
  const now = Date.now()

  await db.insert(competitions).values({
    id,
    name: body.name.trim(),
    type: body.type,
    status: 'pending',
    scheduledStart: body.scheduledStart ?? null,
    actualStart: null,
    controlTimeMinutes: body.controlTimeMinutes ?? null,
    lapDurationMinutes: body.lapDurationMinutes ?? 60,
    targetLaps: body.targetLaps ?? null,
    createdAt: now
  })

  if (body.participants.length > 0) {
    await db.insert(participants).values(
      body.participants.map(p => ({
        id: crypto.randomUUID(),
        competitionId: id,
        bibNumber: p.number,
        name: p.name?.trim() || null,
        status: 'active' as const
      }))
    )
  }

  return { id }
})
