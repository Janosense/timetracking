import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const competitions = sqliteTable('competitions', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type', { enum: ['classic', 'backyard_ultra'] }).notNull(),
  status: text('status', { enum: ['pending', 'active', 'completed'] }).notNull().default('pending'),
  scheduledStart: integer('scheduled_start'),
  actualStart: integer('actual_start'),
  // Classic
  controlTimeMinutes: integer('control_time_minutes'),
  // Backyard Ultra
  lapDurationMinutes: integer('lap_duration_minutes').default(60),
  targetLaps: integer('target_laps'),
  createdAt: integer('created_at').notNull()
})

export const participants = sqliteTable('participants', {
  id: text('id').primaryKey(),
  competitionId: text('competition_id').notNull().references(() => competitions.id),
  bibNumber: integer('bib_number').notNull(),
  name: text('name'),
  status: text('status', {
    enum: ['active', 'dnf', 'winner', 'prize_winner', 'finisher']
  }).notNull().default('active')
})

export const finishRecords = sqliteTable('finish_records', {
  id: text('id').primaryKey(),
  participantId: text('participant_id').notNull().references(() => participants.id),
  competitionId: text('competition_id').notNull().references(() => competitions.id),
  lapNumber: integer('lap_number').notNull(),
  finishTimeMs: integer('finish_time_ms').notNull(),
  recordedAt: integer('recorded_at').notNull()
})

export type Competition = typeof competitions.$inferSelect
export type Participant = typeof participants.$inferSelect
export type FinishRecord = typeof finishRecords.$inferSelect
