<template>
  <div>
    <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <tr>
            <th class="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 w-14">Place</th>
            <th class="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 w-16">Bib</th>
            <th v-if="hasNames" class="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Name</th>
            <th v-if="isClassic" class="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Time</th>
            <th v-if="!isClassic" class="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 w-20">Laps</th>
            <th v-if="!isClassic" class="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Last Lap</th>
            <th v-if="!isClassic" class="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Total Time</th>
            <th class="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 dark:divide-gray-900">
          <tr
            v-for="row in tableRows"
            :key="row.id"
            class="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors"
          >
            <td class="px-4 py-3 text-gray-400 font-medium tabular-nums">{{ row.place ?? '—' }}</td>
            <td class="px-4 py-3 font-mono font-semibold text-gray-700 dark:text-gray-300">{{ row.bibNumber }}</td>
            <td v-if="hasNames" class="px-4 py-3 text-gray-800 dark:text-gray-200">
              <button
                v-if="!isClassic && row.completedLaps > 0"
                class="hover:text-primary-600 dark:hover:text-primary-400 hover:underline transition-colors"
                @click="openLapDetail(row)"
              >{{ row.name || '—' }}</button>
              <span v-else>{{ row.name || '—' }}</span>
            </td>
            <td v-if="isClassic" class="px-4 py-3 font-mono text-gray-700 dark:text-gray-300">
              {{ row.finishTimeMs !== null ? formatMs(row.finishTimeMs) : '—' }}
            </td>
            <td v-if="!isClassic" class="px-4 py-3 text-gray-700 dark:text-gray-300 tabular-nums">
              {{ row.completedLaps }}{{ competition.targetLaps ? `/${competition.targetLaps}` : '' }}
            </td>
            <td v-if="!isClassic" class="px-4 py-3 font-mono text-gray-700 dark:text-gray-300">
              {{ formatMs(row.lastLapTimeMs) }}
            </td>
            <td v-if="!isClassic" class="px-4 py-3 font-mono text-gray-700 dark:text-gray-300">
              {{ formatMs(row.totalTimeMs) }}
            </td>
            <td class="px-4 py-3">
              <UBadge
                :label="statusLabel(row.status)"
                :color="statusColor(row.status)"
                variant="soft"
                size="sm"
              />
            </td>
          </tr>
          <tr v-if="tableRows.length === 0">
            <td :colspan="colCount" class="px-4 py-10 text-center text-gray-400 text-sm">
              No results yet
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <LapDetailModal
      v-model:open="lapModalOpen"
      :participant="selectedParticipant"
      :competition="competition"
    />
  </div>
</template>

<script setup lang="ts">
import type { CompetitionResponse, ParticipantResult } from '~/server/utils/competition'

const props = defineProps<{
  competition: CompetitionResponse
}>()

const { formatMs } = useFormatTime()

const isClassic = computed(() => props.competition.type === 'classic')
const hasNames = computed(() => props.competition.participants.some(p => p.name))

const colCount = computed(() => {
  let n = 3 // place + bib + status
  if (hasNames.value) n++
  if (isClassic.value) n++ // time
  else n += 3 // laps + last lap + total time
  return n
})

const tableRows = computed(() => {
  const { participants, type } = props.competition

  if (type === 'classic') {
    const withFinish = participants
      .filter(p => p.finishTimeMs !== null)
      .sort((a, b) => a.finishTimeMs! - b.finishTimeMs!)

    const placeMap = new Map(withFinish.map((p, i) => [p.id, i + 1]))

    return [...participants]
      .sort((a, b) => {
        const ap = placeMap.get(a.id) ?? Infinity
        const bp = placeMap.get(b.id) ?? Infinity
        if (ap !== bp) return ap - bp
        if (a.status === 'dnf' && b.status !== 'dnf') return -1
        if (b.status === 'dnf' && a.status !== 'dnf') return 1
        return a.bibNumber - b.bibNumber
      })
      .map(p => ({ ...p, place: placeMap.get(p.id) ?? null }))
  }

  // Backyard Ultra: laps DESC, total time ASC, bib ASC
  const sorted = [...participants].sort((a, b) => {
    if (a.completedLaps !== b.completedLaps) return b.completedLaps - a.completedLaps
    const at = a.totalTimeMs ?? Infinity
    const bt = b.totalTimeMs ?? Infinity
    if (at !== bt) return at - bt
    return a.bibNumber - b.bibNumber
  })

  let placeCounter = 1
  return sorted.map(p => ({
    ...p,
    place: ['winner', 'finisher'].includes(p.status) ? placeCounter++ : null
  }))
})

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    winner: 'Winner', prize_winner: 'Prize winner', finisher: 'Finisher',
    active: 'Active', dnf: 'DNF'
  }
  return map[status] ?? status
}

function statusColor(status: string): 'warning' | 'neutral' | 'success' | 'primary' | 'error' {
  const map: Record<string, 'warning' | 'neutral' | 'success' | 'primary' | 'error'> = {
    winner: 'warning', prize_winner: 'neutral', finisher: 'success',
    active: 'primary', dnf: 'error'
  }
  return map[status] ?? 'neutral'
}

// Lap detail modal
const lapModalOpen = ref(false)
const selectedParticipant = ref<ParticipantResult | null>(null)

function openLapDetail(p: ParticipantResult) {
  selectedParticipant.value = p
  lapModalOpen.value = true
}
</script>
