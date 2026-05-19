import type { Ref } from 'vue'
import type { CompetitionResponse, LapResult, ParticipantResult } from '~/server/utils/competition'

interface PendingWrite {
  bib: number
  kind: 'finish' | 'undo'
  finishTimeMs: number | null
  lapNumber: number
  attempts: number
  timer: ReturnType<typeof setTimeout> | null
  lastError: string | null
}

const BACKOFF_MS = [1000, 2000, 4000, 8000]
const MAX_ATTEMPTS = BACKOFF_MS.length

function classicStatusForPosition(position: number): ParticipantResult['status'] {
  if (position === 0) return 'winner'
  if (position <= 2) return 'prize_winner'
  return 'finisher'
}

function recomputeClassicRanking(c: CompetitionResponse) {
  const finished = c.participants
    .filter(p => p.finishTimeMs !== null)
    .sort((a, b) => (a.finishTimeMs ?? 0) - (b.finishTimeMs ?? 0))
  for (let i = 0; i < finished.length; i++) {
    finished[i].status = classicStatusForPosition(i)
  }
  c.activeCount = c.participants.filter(p => p.status === 'active').length
}

function applyOptimisticFinish(c: CompetitionResponse, p: ParticipantResult, finishTimeMs: number, lapNumber: number) {
  const lapDurationMs = c.lapDurationMinutes * 60 * 1000
  const lap: LapResult = {
    lapNumber,
    finishTimeMs,
    lapTimeMs: finishTimeMs - (lapNumber - 1) * lapDurationMs
  }
  p.laps = [...p.laps, lap].sort((a, b) => a.lapNumber - b.lapNumber)
  p.completedLaps = p.laps.length
  p.lastLapTimeMs = lap.lapTimeMs
  p.totalTimeMs = p.laps.reduce((sum, l) => sum + l.lapTimeMs, 0)

  if (c.type === 'classic') {
    p.finishTimeMs = finishTimeMs
    recomputeClassicRanking(c)
  } else {
    if (c.currentLap === lapNumber) p.currentLapFinished = true
  }
}

function applyOptimisticUndo(c: CompetitionResponse, p: ParticipantResult) {
  if (p.laps.length === 0) return
  p.laps = p.laps.slice(0, -1)
  p.completedLaps = p.laps.length
  const last = p.laps[p.laps.length - 1]
  p.lastLapTimeMs = last?.lapTimeMs ?? null
  p.totalTimeMs = p.laps.length > 0
    ? p.laps.reduce((sum, l) => sum + l.lapTimeMs, 0)
    : null
  p.status = 'active'
  if (c.type === 'classic') {
    p.finishTimeMs = null
    recomputeClassicRanking(c)
  } else {
    p.currentLapFinished = false
  }
}

export function useOptimisticCompetition(competitionId: string, competition: Ref<CompetitionResponse | null>) {
  const pending = ref(new Map<number, PendingWrite>())

  const pendingBibs = computed(() => new Set(pending.value.keys()))
  const stuckEntries = computed(() =>
    [...pending.value.values()].filter(w => w.attempts >= MAX_ATTEMPTS)
  )

  function touch() {
    pending.value = new Map(pending.value)
  }

  function mergeWithPending(server: CompetitionResponse): CompetitionResponse {
    if (pending.value.size === 0) return server
    const merged: CompetitionResponse = {
      ...server,
      participants: server.participants.map(p => ({ ...p, laps: [...p.laps] }))
    }
    for (const write of pending.value.values()) {
      const p = merged.participants.find(pp => pp.bibNumber === write.bib)
      if (!p) continue
      if (write.kind === 'finish' && write.finishTimeMs !== null) {
        const has = p.laps.some(l => l.lapNumber === write.lapNumber)
        if (!has) applyOptimisticFinish(merged, p, write.finishTimeMs, write.lapNumber)
      } else if (write.kind === 'undo') {
        const has = p.laps.some(l => l.lapNumber === write.lapNumber)
        if (has) applyOptimisticUndo(merged, p)
      }
    }
    return merged
  }

  async function poll() {
    if (!competition.value || competition.value.status !== 'active') return
    try {
      const fresh = await $fetch<CompetitionResponse>(`/api/competitions/${competitionId}`)
      competition.value = mergeWithPending(fresh)
    } catch {
      // Silent — next tick will retry
    }
  }

  async function fire(bibNumber: number) {
    const write = pending.value.get(bibNumber)
    if (!write) return
    try {
      if (write.kind === 'finish') {
        await $fetch(`/api/competitions/${competitionId}/participants/${bibNumber}/finish`, {
          method: 'POST',
          body: { finishTimeMs: write.finishTimeMs }
        })
      } else {
        await $fetch(`/api/competitions/${competitionId}/participants/${bibNumber}/finish`, {
          method: 'DELETE'
        })
      }
      pending.value.delete(bibNumber)
      touch()
    } catch (err: unknown) {
      const current = pending.value.get(bibNumber)
      if (!current) return
      const msg = err instanceof Error ? err.message : 'sync failed'
      const nextAttempts = current.attempts + 1
      let timer: ReturnType<typeof setTimeout> | null = null
      if (nextAttempts < MAX_ATTEMPTS) {
        const delay = BACKOFF_MS[nextAttempts - 1] ?? BACKOFF_MS[BACKOFF_MS.length - 1]
        timer = setTimeout(() => fire(bibNumber), delay)
      }
      pending.value.set(bibNumber, { ...current, attempts: nextAttempts, lastError: msg, timer })
      touch()
    }
  }

  function recordFinish(bibNumber: number) {
    const c = competition.value
    if (!c || !c.actualStart || c.status !== 'active') return
    if (pending.value.has(bibNumber)) return

    const participant = c.participants.find(p => p.bibNumber === bibNumber)
    if (!participant || participant.status !== 'active') return

    const finishTimeMs = Date.now() - c.actualStart
    const lapDurationMs = c.lapDurationMinutes * 60 * 1000
    const lapNumber = c.type === 'classic' ? 1 : Math.floor(finishTimeMs / lapDurationMs) + 1

    if (c.type !== 'classic' && participant.laps.some(l => l.lapNumber === lapNumber)) return

    applyOptimisticFinish(c, participant, finishTimeMs, lapNumber)
    pending.value.set(bibNumber, {
      bib: bibNumber,
      kind: 'finish',
      finishTimeMs,
      lapNumber,
      attempts: 0,
      timer: null,
      lastError: null
    })
    touch()
    fire(bibNumber)
  }

  function recordUndo(bibNumber: number) {
    const c = competition.value
    if (!c || c.status !== 'active') return
    if (pending.value.has(bibNumber)) return

    const participant = c.participants.find(p => p.bibNumber === bibNumber)
    if (!participant || participant.laps.length === 0) return

    const lastLap = participant.laps[participant.laps.length - 1]
    applyOptimisticUndo(c, participant)
    pending.value.set(bibNumber, {
      bib: bibNumber,
      kind: 'undo',
      finishTimeMs: null,
      lapNumber: lastLap.lapNumber,
      attempts: 0,
      timer: null,
      lastError: null
    })
    touch()
    fire(bibNumber)
  }

  function retryStuck(bibNumber: number) {
    const w = pending.value.get(bibNumber)
    if (!w) return
    if (w.timer) clearTimeout(w.timer)
    pending.value.set(bibNumber, { ...w, attempts: 0, timer: null, lastError: null })
    touch()
    fire(bibNumber)
  }

  function discardStuck(bibNumber: number) {
    const c = competition.value
    const w = pending.value.get(bibNumber)
    if (!w || !c) return
    if (w.timer) clearTimeout(w.timer)

    const participant = c.participants.find(p => p.bibNumber === bibNumber)
    if (participant) {
      if (w.kind === 'finish') {
        const idx = participant.laps.findIndex(l => l.lapNumber === w.lapNumber)
        if (idx >= 0) applyOptimisticUndo(c, participant)
      }
      // For undo: leaving the local "undone" state; server will eventually correct via poll if persisted.
    }
    pending.value.delete(bibNumber)
    touch()
  }

  let pollInterval: ReturnType<typeof setInterval> | null = null
  function startPolling() {
    stopPolling()
    pollInterval = setInterval(() => { poll() }, 2000)
  }
  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
  }

  function clearAllTimers() {
    for (const w of pending.value.values()) {
      if (w.timer) clearTimeout(w.timer)
    }
  }

  return {
    pendingBibs,
    stuckEntries,
    poll,
    recordFinish,
    recordUndo,
    retryStuck,
    discardStuck,
    startPolling,
    stopPolling,
    clearAllTimers
  }
}
