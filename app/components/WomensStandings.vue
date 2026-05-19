<template>
  <div v-if="women.length > 0" class="mt-6">
    <div class="mb-3 flex items-center gap-2">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Women's Standings</h2>
      <span class="text-xs text-gray-500 dark:text-gray-400">
        {{ women.length }} {{ women.length === 1 ? 'participant' : 'participants' }}
      </span>
    </div>

    <div class="overflow-x-auto rounded-xl border border-pink-200 dark:border-pink-900/50">
      <table class="w-full text-sm">
        <thead class="bg-pink-50 dark:bg-pink-950/30 border-b border-pink-200 dark:border-pink-900/50">
          <tr>
            <th class="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 w-14">Place</th>
            <th class="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 w-16">Bib</th>
            <th v-if="hasNames" class="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Name</th>
            <th v-if="isClassic" class="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Time</th>
            <template v-else>
              <th class="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 w-20">Laps</th>
              <th class="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Total Time</th>
            </template>
            <th class="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-pink-100 dark:divide-pink-950/40">
          <tr
            v-for="row in rankedWomen"
            :key="row.id"
            :class="row.place === 1 ? 'bg-amber-50/60 dark:bg-amber-950/20' : ''"
          >
            <td class="px-4 py-3 font-medium tabular-nums" :class="row.place === 1 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'">
              {{ row.place ?? '—' }}
            </td>
            <td class="px-4 py-3 font-mono font-semibold text-gray-700 dark:text-gray-300">{{ row.bibNumber }}</td>
            <td v-if="hasNames" class="px-4 py-3 text-gray-800 dark:text-gray-200">{{ row.name || '—' }}</td>
            <td v-if="isClassic" class="px-4 py-3 font-mono text-gray-700 dark:text-gray-300">
              {{ row.finishTimeMs !== null ? formatMs(row.finishTimeMs) : '—' }}
            </td>
            <template v-else>
              <td class="px-4 py-3 text-gray-700 dark:text-gray-300 tabular-nums">
                {{ row.completedLaps }}{{ competition.targetLaps ? `/${competition.targetLaps}` : '' }}
              </td>
              <td class="px-4 py-3 font-mono text-gray-700 dark:text-gray-300">
                {{ formatMs(row.totalTimeMs) }}
              </td>
            </template>
            <td class="px-4 py-3">
              <UBadge
                :label="womensBadgeLabel(row)"
                :color="row.place === 1 && row.finishTimeMs !== null ? 'warning' : statusColor(row.status)"
                variant="soft"
                size="sm"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CompetitionResponse } from '~/server/utils/competition'

const props = defineProps<{
  competition: CompetitionResponse
}>()

const { formatMs } = useFormatTime()

const isClassic = computed(() => props.competition.type === 'classic')

const women = computed(() => props.competition.participants.filter(p => p.gender === 'F'))

const hasNames = computed(() => women.value.some(p => p.name))

const rankedWomen = computed(() => {
  if (isClassic.value) {
    const withFinish = women.value
      .filter(p => p.finishTimeMs !== null)
      .sort((a, b) => a.finishTimeMs! - b.finishTimeMs!)
    const placeMap = new Map(withFinish.map((p, i) => [p.id, i + 1]))

    return [...women.value]
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

  const sorted = [...women.value].sort((a, b) => {
    if (a.completedLaps !== b.completedLaps) return b.completedLaps - a.completedLaps
    const at = a.totalTimeMs ?? Infinity
    const bt = b.totalTimeMs ?? Infinity
    if (at !== bt) return at - bt
    return a.bibNumber - b.bibNumber
  })

  let placeCounter = 1
  return sorted.map(p => ({
    ...p,
    place: p.completedLaps > 0 ? placeCounter++ : null
  }))
})

function womensBadgeLabel(row: { place: number | null; status: string; finishTimeMs: number | null; completedLaps: number }): string {
  const isFirst = row.place === 1
  if (isFirst && isClassic.value && row.finishTimeMs !== null) return "Women's Winner"
  if (isFirst && !isClassic.value && row.completedLaps > 0) return "Women's Winner"
  return statusLabel(row.status)
}

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
</script>
