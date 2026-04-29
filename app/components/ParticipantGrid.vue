<template>
  <div>
    <!-- Backyard Ultra stats bar -->
    <div
      v-if="competition.type === 'backyard_ultra' && competition.status === 'active'"
      class="mb-4 flex items-center gap-6 text-sm"
    >
      <div class="flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full bg-green-500 inline-block" />
        <span class="font-medium text-gray-900 dark:text-white">
          {{ competition.activeCount }}
          <span class="font-normal text-gray-500 dark:text-gray-400">active</span>
          / {{ competition.totalCount }}
        </span>
      </div>
      <div class="text-gray-400 dark:text-gray-500 text-xs">
        {{ competition.totalCount - competition.activeCount }} eliminated
      </div>
    </div>

    <!-- Tile grid -->
    <div class="grid gap-2" :class="gridCols">
      <ParticipantTile
        v-for="p in participants"
        :key="p.id"
        :participant="p"
        :competition="competition"
        :loading="loadingBib === p.bibNumber"
        @finish="emit('finish', $event)"
        @undo="emit('undo', $event)"
      />
    </div>

    <!-- Legend -->
    <div class="mt-4 flex flex-wrap gap-3 text-xs text-gray-400 dark:text-gray-500">
      <span v-if="competition.status === 'active' && competition.type === 'backyard_ultra'" class="flex items-center gap-1">
        <span class="w-3 h-3 rounded border-2 border-green-400 bg-green-50 dark:bg-green-950/40 inline-block" />
        Finished lap
      </span>
      <span v-if="competition.type === 'classic'" class="flex items-center gap-1">
        <span class="w-3 h-3 rounded border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/40 inline-block" />
        Winner
      </span>
      <span class="flex items-center gap-1">
        <span class="w-3 h-3 rounded border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 opacity-50 inline-block" />
        DNF
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CompetitionResponse, ParticipantResult } from '~/server/utils/competition'

const props = defineProps<{
  competition: CompetitionResponse
  loadingBib?: number | null
}>()

const emit = defineEmits<{
  finish: [bibNumber: number]
  undo: [bibNumber: number]
}>()

const participants = computed(() => props.competition.participants)

const gridCols = computed(() => {
  const total = participants.value.length
  if (total <= 10) return 'grid-cols-5 sm:grid-cols-5'
  if (total <= 25) return 'grid-cols-5 sm:grid-cols-7 md:grid-cols-10'
  if (total <= 50) return 'grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12'
  return 'grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-15'
})
</script>
