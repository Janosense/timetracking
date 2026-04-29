<template>
  <div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sm:p-5">

    <!-- Classic -->
    <template v-if="competition.type === 'classic'">
      <div class="flex flex-wrap items-center gap-4 sm:gap-8">
        <div>
          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-0.5">Elapsed</p>
          <p class="text-3xl font-mono font-bold text-gray-900 dark:text-white tabular-nums">{{ formatMs(elapsed) }}</p>
        </div>
        <div v-if="competition.controlTimeMinutes">
          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-0.5">Remaining</p>
          <p class="text-3xl font-mono font-bold tabular-nums" :class="remaining <= 300_000 ? 'text-red-500' : 'text-gray-900 dark:text-white'">
            {{ formatMs(remaining) }}
          </p>
        </div>
        <div class="ml-auto text-right">
          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-0.5">Control Time</p>
          <p class="text-lg font-medium text-gray-600 dark:text-gray-400">{{ competition.controlTimeMinutes }} min</p>
        </div>
      </div>
      <div v-if="competition.controlTimeMinutes" class="mt-4">
        <div class="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-1000"
            :class="progressPercent > 85 ? 'bg-red-500' : 'bg-primary-500'"
            :style="{ width: `${progressPercent}%` }"
          />
        </div>
        <p class="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">{{ progressPercent.toFixed(0) }}% of control time</p>
      </div>
    </template>

    <!-- Backyard Ultra -->
    <template v-else>
      <div class="flex flex-wrap items-center gap-4 sm:gap-8">
        <div>
          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-0.5">Current Lap</p>
          <p class="text-3xl font-bold text-gray-900 dark:text-white">
            {{ currentLap }}<span v-if="competition.targetLaps" class="text-xl text-gray-400 dark:text-gray-500">/{{ competition.targetLaps }}</span>
          </p>
        </div>
        <div>
          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-0.5">In Lap</p>
          <p class="text-3xl font-mono font-bold text-gray-900 dark:text-white tabular-nums">{{ formatMs(lapElapsed) }}</p>
        </div>
        <div>
          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-0.5">Remaining</p>
          <p class="text-3xl font-mono font-bold tabular-nums" :class="lapRemaining <= 120_000 ? 'text-red-500 animate-pulse' : 'text-gray-900 dark:text-white'">
            {{ formatMs(lapRemaining) }}
          </p>
        </div>
        <div>
          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-0.5">Total</p>
          <p class="text-2xl font-mono font-bold text-gray-600 dark:text-gray-400 tabular-nums">{{ formatMs(elapsed) }}</p>
        </div>
      </div>
      <div class="mt-4">
        <div class="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-1000"
            :class="lapProgressPercent > 85 ? 'bg-orange-500' : 'bg-primary-500'"
            :style="{ width: `${lapProgressPercent}%` }"
          />
        </div>
        <p class="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">Lap progress</p>
      </div>
    </template>

  </div>
</template>

<script setup lang="ts">
import type { CompetitionResponse } from '~/server/utils/competition'

const props = defineProps<{
  competition: CompetitionResponse
}>()

const emit = defineEmits<{ 'lap-end': [], 'control-time-end': [] }>()

const { formatMs } = useFormatTime()

const elapsed = ref(0)
const lapElapsed = ref(0)
const lapRemaining = ref(0)
const remaining = ref(0)

const lapDurationMs = computed(() => props.competition.lapDurationMinutes * 60 * 1000)
const controlTimeMs = computed(() => (props.competition.controlTimeMinutes ?? 0) * 60 * 1000)

const currentLap = computed(() => {
  if (!props.competition.actualStart) return 1
  return Math.floor(elapsed.value / lapDurationMs.value) + 1
})

const progressPercent = computed(() => {
  if (!controlTimeMs.value) return 0
  return Math.min(100, (elapsed.value / controlTimeMs.value) * 100)
})

const lapProgressPercent = computed(() => {
  return Math.min(100, (lapElapsed.value / lapDurationMs.value) * 100)
})

let prevLap = 0
let controlTimeEnded = false

function update() {
  if (!props.competition.actualStart) return
  elapsed.value = Date.now() - props.competition.actualStart
  lapElapsed.value = elapsed.value % lapDurationMs.value
  lapRemaining.value = lapDurationMs.value - lapElapsed.value
  remaining.value = Math.max(0, controlTimeMs.value - elapsed.value)

  if (props.competition.type === 'backyard_ultra') {
    const lap = Math.floor(elapsed.value / lapDurationMs.value) + 1
    if (prevLap && lap > prevLap) emit('lap-end')
    prevLap = lap
  } else if (controlTimeMs.value && !controlTimeEnded && remaining.value === 0) {
    controlTimeEnded = true
    emit('control-time-end')
  }
}

let interval: ReturnType<typeof setInterval>
onMounted(() => { update(); interval = setInterval(update, 1000) })
onUnmounted(() => clearInterval(interval))
</script>
