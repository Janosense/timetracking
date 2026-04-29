<template>
  <div>
    <div v-if="pending && !competition" class="space-y-4">
      <div class="h-8 w-64 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
      <div class="h-4 w-40 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
      <div class="h-64 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
    </div>

    <div v-else-if="competition">
      <!-- Header -->
      <div class="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ competition.name }}</h1>
            <UBadge :label="typeLabel" color="neutral" variant="subtle" size="sm" />
          </div>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {{ startedLabel }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <span v-if="competition.status === 'active'" class="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 font-medium">
            <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
            Live
          </span>
          <UBadge v-else :label="statusLabel" color="neutral" variant="soft" />
        </div>
      </div>

      <!-- Active race info -->
      <div
        v-if="competition.status === 'active'"
        class="mb-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4 flex flex-wrap gap-x-8 gap-y-2 text-sm"
      >
        <template v-if="competition.type === 'classic'">
          <div>
            <span class="text-gray-500">Control time</span>
            <span class="ml-2 font-medium">{{ competition.controlTimeMinutes }} min</span>
          </div>
          <div>
            <span class="text-gray-500">Finishers</span>
            <span class="ml-2 font-medium">{{ finisherCount }}</span>
          </div>
        </template>
        <template v-else>
          <div>
            <span class="text-gray-500">Current lap</span>
            <span class="ml-2 font-medium">
              {{ competition.currentLap }}{{ competition.targetLaps ? `/${competition.targetLaps}` : '' }}
            </span>
          </div>
          <div>
            <span class="text-gray-500">Active</span>
            <span class="ml-2 font-medium">{{ competition.activeCount }} / {{ competition.totalCount }}</span>
          </div>
        </template>
        <div class="text-gray-400 text-xs self-end ml-auto">Updates every 4s</div>
      </div>

      <!-- Results table -->
      <ResultsTable :competition="competition" />
    </div>

    <div v-else class="text-center py-20 text-gray-400">
      <p class="font-medium">Competition not found</p>
      <NuxtLink to="/" class="text-sm text-primary-500 hover:underline mt-2 inline-block">Back to list</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CompetitionResponse } from '~/server/utils/competition'

definePageMeta({ layout: 'default' })

const route = useRoute()
const id = route.params.id as string
const { formatDateTime } = useFormatTime()

const { data: competition, pending, refresh } = await useAsyncData<CompetitionResponse>(
  `competition-${id}`,
  () => $fetch(`/api/competitions/${id}`)
)

// Poll every 4 seconds while competition is active
let interval: ReturnType<typeof setInterval>
onMounted(() => {
  interval = setInterval(() => {
    if (competition.value?.status === 'active') refresh()
  }, 4000)
})
onUnmounted(() => clearInterval(interval))

const typeLabel = computed(() =>
  competition.value?.type === 'classic' ? 'Classic' : 'Backyard Ultra'
)

const statusLabel = computed(() => {
  switch (competition.value?.status) {
    case 'pending': return 'Upcoming'
    case 'active': return 'Live'
    case 'completed': return 'Finished'
    default: return ''
  }
})

const startedLabel = computed(() => {
  const c = competition.value
  if (!c) return ''
  if (c.actualStart) return `Started ${formatDateTime(c.actualStart)}`
  if (c.scheduledStart) return `Scheduled for ${formatDateTime(c.scheduledStart)}`
  return `Created ${formatDateTime(c.createdAt)}`
})

const finisherCount = computed(() =>
  competition.value?.participants.filter(p => p.finishTimeMs !== null).length ?? 0
)
</script>
