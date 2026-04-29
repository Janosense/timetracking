<template>
  <NuxtLink :to="`/competitions/${competition.id}`" class="block group">
    <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm transition-all">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h3 class="font-semibold text-gray-900 dark:text-white text-base leading-snug group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
            {{ competition.name }}
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {{ formatDate(competition.scheduledStart ?? competition.actualStart ?? competition.createdAt) }}
          </p>
        </div>
        <div class="flex flex-col items-end gap-1.5 shrink-0 pt-0.5">
          <UBadge :label="statusLabel" :color="statusColor" variant="soft" size="sm" />
          <UBadge :label="typeLabel" color="neutral" variant="subtle" size="sm" />
        </div>
      </div>
      <p class="mt-3 text-sm text-gray-500 dark:text-gray-400">
        {{ competition.participantCount }} participants
      </p>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
const props = defineProps<{
  competition: {
    id: string
    name: string
    type: string
    status: string
    scheduledStart: number | null
    actualStart: number | null
    createdAt: number
    participantCount: number
  }
}>()

const { formatDate } = useFormatTime()

const typeLabel = computed(() => props.competition.type === 'classic' ? 'Classic' : 'Backyard Ultra')

const statusLabel = computed(() => {
  switch (props.competition.status) {
    case 'pending': return 'Upcoming'
    case 'active': return 'Live'
    case 'completed': return 'Finished'
    default: return props.competition.status
  }
})

const statusColor = computed(() => {
  switch (props.competition.status) {
    case 'pending': return 'neutral'
    case 'active': return 'success'
    case 'completed': return 'neutral'
    default: return 'neutral'
  }
})
</script>
