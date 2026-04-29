<template>
  <UModal v-model:open="open" :title="title" description="Individual lap times">
    <template #body>
      <div v-if="participant && participant.laps.length > 0">
        <div class="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th class="text-left px-4 py-2.5 font-medium text-gray-500 dark:text-gray-400">Lap</th>
                <th class="text-right px-4 py-2.5 font-medium text-gray-500 dark:text-gray-400">Lap Time</th>
                <th class="text-right px-4 py-2.5 font-medium text-gray-500 dark:text-gray-400">Race Time</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-900">
              <tr v-for="lap in participant.laps" :key="lap.lapNumber">
                <td class="px-4 py-2.5 text-gray-500">{{ lap.lapNumber }}</td>
                <td class="px-4 py-2.5 font-mono text-right font-medium">{{ formatMs(lap.lapTimeMs) }}</td>
                <td class="px-4 py-2.5 font-mono text-right text-gray-400">{{ formatMs(lap.finishTimeMs) }}</td>
              </tr>
            </tbody>
            <tfoot class="bg-gray-50 dark:bg-gray-900">
              <tr>
                <td class="px-4 py-2.5 font-medium text-gray-700 dark:text-gray-300">Total</td>
                <td class="px-4 py-2.5 font-mono text-right font-semibold">{{ formatMs(participant.totalTimeMs) }}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      <p v-else class="text-gray-500 text-sm text-center py-4">No laps recorded yet.</p>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { ParticipantResult } from '~/server/utils/competition'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  participant: ParticipantResult | null
  competition: { lapDurationMinutes: number }
}>()

const { formatMs } = useFormatTime()

const title = computed(() => {
  if (!props.participant) return 'Lap Times'
  return props.participant.name
    ? `${props.participant.name} — Lap Times`
    : `#${props.participant.bibNumber} — Lap Times`
})
</script>
