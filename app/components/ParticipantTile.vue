<template>
  <component
    :is="isClickable ? 'button' : 'div'"
    type="button"
    class="relative flex flex-col items-center justify-center rounded-xl border-2 aspect-square transition-all duration-150 select-none overflow-hidden"
    :class="[tileClass, isLoading ? 'opacity-60 pointer-events-none' : '']"
    @click="handleClick"
  >
    <!-- Loading spinner -->
    <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-current/5">
      <div class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-60" />
    </div>

    <!-- Bib number -->
    <span class="font-bold tabular-nums leading-none" :class="bibTextClass">
      {{ participant.bibNumber }}
    </span>

    <!-- Sub text: lap time or finish time -->
    <span v-if="displayTime" class="text-xs mt-1 font-mono tabular-nums leading-none" :class="subTextClass">
      {{ displayTime }}
    </span>
  </component>
</template>

<script setup lang="ts">
import type { CompetitionResponse, ParticipantResult } from '~/server/utils/competition'

const props = defineProps<{
  participant: ParticipantResult
  competition: CompetitionResponse
  loading?: boolean
}>()

const emit = defineEmits<{
  finish: [bibNumber: number]
  undo: [bibNumber: number]
}>()

const { formatMs } = useFormatTime()

const isLoading = computed(() => props.loading)

const isClickable = computed(() => {
  if (props.competition.status !== 'active') return false
  const { status } = props.participant
  if (status === 'dnf') return false

  if (props.competition.type === 'classic') {
    return true // active → record, finished → undo
  }
  // Backyard Ultra: only active participants
  return status === 'active'
})

const tileState = computed(() => {
  const { status, currentLapFinished } = props.participant
  const { type, status: raceStatus } = props.competition

  if (status === 'dnf') return 'dnf'
  if (raceStatus !== 'active') return status // winner / finisher / active (non-interactive)

  if (type === 'classic') {
    if (status === 'active') return 'active'
    return status // winner / prize_winner / finisher
  }

  // Backyard Ultra, active race
  if (status === 'active') return currentLapFinished ? 'lap_finished' : 'active'
  return status
})

const tileClass = computed(() => {
  const clickable = isClickable.value
  const base = clickable ? 'cursor-pointer' : 'cursor-default'
  switch (tileState.value) {
    case 'active':
      return `${base} bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 ${clickable ? 'hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/20 active:scale-95' : ''}`
    case 'lap_finished':
      return `${base} bg-green-50 dark:bg-green-950/40 border-green-400 dark:border-green-600 hover:bg-green-100 dark:hover:bg-green-950/60 active:scale-95`
    case 'dnf':
      return 'bg-gray-50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-800 opacity-35'
    case 'winner':
      return 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600'
    case 'prize_winner':
      return 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600'
    case 'finisher':
      return 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
    default:
      return 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
  }
})

const bibTextClass = computed(() => {
  const digits = String(props.participant.bibNumber).length
  const size = digits <= 2 ? 'text-2xl' : digits === 3 ? 'text-xl' : 'text-base'

  switch (tileState.value) {
    case 'lap_finished': return `${size} text-green-700 dark:text-green-300`
    case 'dnf': return `${size} text-gray-400 dark:text-gray-600`
    case 'winner': return `${size} text-amber-700 dark:text-amber-300`
    case 'prize_winner': return `${size} text-gray-600 dark:text-gray-400`
    case 'finisher': return `${size} text-green-700 dark:text-green-300`
    default: return `${size} text-gray-900 dark:text-white`
  }
})

const subTextClass = computed(() => {
  switch (tileState.value) {
    case 'lap_finished': return 'text-green-600 dark:text-green-400'
    case 'winner': return 'text-amber-600 dark:text-amber-400'
    case 'prize_winner': return 'text-gray-500 dark:text-gray-400'
    case 'finisher': return 'text-green-600 dark:text-green-400'
    default: return 'text-gray-500 dark:text-gray-400'
  }
})

const displayTime = computed(() => {
  const { status, currentLapFinished, laps, finishTimeMs } = props.participant
  const { type, currentLap } = props.competition

  if (type === 'classic') {
    if (status !== 'active' && finishTimeMs !== null) return formatMs(finishTimeMs)
    return null
  }

  // Backyard Ultra: show current lap time when finished
  if (status === 'active' && currentLapFinished && currentLap !== null) {
    const lapRecord = laps.find(l => l.lapNumber === currentLap)
    return lapRecord ? formatMs(lapRecord.lapTimeMs) : null
  }

  return null
})

function handleClick() {
  if (!isClickable.value || isLoading.value) return
  const { status, currentLapFinished } = props.participant
  const { type } = props.competition

  if (type === 'classic') {
    if (status === 'active') emit('finish', props.participant.bibNumber)
    else emit('undo', props.participant.bibNumber)
  } else {
    if (status === 'active' && !currentLapFinished) emit('finish', props.participant.bibNumber)
    else if (status === 'active' && currentLapFinished) emit('undo', props.participant.bibNumber)
  }
}
</script>
