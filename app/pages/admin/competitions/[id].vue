<template>
  <div v-if="competition">
    <!-- Page header -->
    <div class="mb-6 flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
      <div>
        <div class="flex items-center gap-2 flex-wrap">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ competition.name }}</h1>
          <UBadge :label="typeLabel" color="neutral" variant="subtle" size="sm" />
          <span v-if="competition.status === 'active'" class="flex items-center gap-1 text-sm text-green-600 dark:text-green-400 font-medium">
            <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
            Live
          </span>
          <UBadge v-else :label="statusLabel" color="neutral" variant="soft" size="sm" />
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ startLabel }}</p>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <UButton
          :to="`/competitions/${competition.id}`"
          target="_blank"
          size="sm"
          variant="ghost"
          color="neutral"
          icon="i-lucide-external-link"
        >
          Public results
        </UButton>
        <UButton
          v-if="competition.status !== 'completed'"
          size="sm"
          variant="outline"
          color="error"
          icon="i-lucide-square"
          @click="endModalOpen = true"
        >
          End
        </UButton>
      </div>
    </div>

    <!-- Pending state -->
    <template v-if="competition.status === 'pending'">
      <CountdownTimer :scheduled-start="competition.scheduledStart" />
      <div class="flex justify-center mt-4">
        <UButton
          size="xl"
          icon="i-lucide-play"
          :loading="starting"
          @click="startCompetition"
        >
          Start Competition Now
        </UButton>
      </div>
      <!-- Show grid as preview but not clickable -->
      <div class="mt-8">
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">{{ competition.totalCount }} participants</p>
        <ParticipantGrid :competition="competition" />
      </div>
    </template>

    <!-- Active state -->
    <template v-else-if="competition.status === 'active'">
      <RaceTimer :competition="competition" />

      <div class="mt-5">
        <ParticipantGrid
          :competition="competition"
          :loading-bib="pendingBib"
          @finish="recordFinish"
          @undo="openUndo"
        />
      </div>
    </template>

    <!-- Completed state -->
    <template v-else>
      <div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-8 text-center mb-5">
        <p class="text-lg font-medium text-gray-700 dark:text-gray-300">Competition Ended</p>
        <div class="mt-3 flex justify-center gap-3 flex-wrap">
          <UButton :to="`/competitions/${competition.id}`" target="_blank" icon="i-lucide-external-link">
            View Final Results
          </UButton>
          <UButton to="/admin/competitions" variant="ghost" color="neutral" icon="i-lucide-arrow-left">
            All Competitions
          </UButton>
        </div>
      </div>
      <ParticipantGrid :competition="competition" />
    </template>
  </div>

  <!-- Skeleton while loading -->
  <div v-else class="space-y-4">
    <div class="h-8 w-72 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
    <div class="h-24 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
    <div class="grid grid-cols-8 gap-2">
      <div v-for="i in 40" :key="i" class="aspect-square rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
    </div>
  </div>

  <!-- Undo modal -->
  <UndoConfirmModal
    v-model:open="undoModalOpen"
    :bib-number="undoBib"
    :participant-name="undoParticipantName"
    :loading="undoing"
    @confirm="confirmUndo"
  />

  <!-- End competition modal -->
  <UModal v-model:open="endModalOpen" title="End competition?">
    <template #body>
      <p class="text-gray-700 dark:text-gray-300">
        This will mark <strong>{{ competition?.name }}</strong> as completed.
      </p>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
        All participants who haven't finished will receive DNF status.
        This action cannot be undone.
      </p>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="ghost" color="neutral" @click="endModalOpen = false">Cancel</UButton>
        <UButton color="error" :loading="ending" @click="confirmEnd">End Competition</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { CompetitionResponse } from '~/server/utils/competition'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const route = useRoute()
const id = route.params.id as string
const toast = useToast()
const { formatDateTime } = useFormatTime()

const { data: competition, refresh } = await useAsyncData<CompetitionResponse>(
  `admin-competition-${id}`,
  () => $fetch(`/api/competitions/${id}`)
)

// Poll every 2s while active
const mutating = ref(false)
let pollInterval: ReturnType<typeof setInterval>
onMounted(() => {
  pollInterval = setInterval(() => {
    if (!mutating.value && competition.value?.status === 'active') refresh()
  }, 2000)
})
onUnmounted(() => clearInterval(pollInterval))

// ─── Labels ───────────────────────────────��────────────────────────────────
const typeLabel = computed(() => competition.value?.type === 'classic' ? 'Classic' : 'Backyard Ultra')
const statusLabel = computed(() => ({ pending: 'Upcoming', active: 'Live', completed: 'Finished' }[competition.value?.status ?? ''] ?? ''))
const startLabel = computed(() => {
  const c = competition.value
  if (!c) return ''
  if (c.actualStart) return `Started ${formatDateTime(c.actualStart)}`
  if (c.scheduledStart) return `Scheduled for ${formatDateTime(c.scheduledStart)}`
  return 'No scheduled time'
})

// ─── Start competition ──────────────────────────────────────────────────────
const starting = ref(false)
async function startCompetition() {
  starting.value = true
  try {
    await $fetch(`/api/competitions/${id}/start`, { method: 'POST' })
    await refresh()
    toast.add({ title: 'Competition started!', color: 'success', duration: 3000 })
  } catch {
    toast.add({ title: 'Failed to start competition', color: 'error', duration: 4000 })
  } finally {
    starting.value = false
  }
}

// ─── Record finish ──────────────────────────────────────────────────────────
const pendingBib = ref<number | null>(null)

async function recordFinish(bibNumber: number) {
  if (pendingBib.value !== null) return
  pendingBib.value = bibNumber
  mutating.value = true
  try {
    await $fetch(`/api/competitions/${id}/participants/${bibNumber}/finish`, { method: 'POST' })
    await refresh()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to record finish'
    toast.add({ title: msg, color: 'error', duration: 4000 })
  } finally {
    pendingBib.value = null
    mutating.value = false
  }
}

// ─── Undo finish ────────────────────────────────────────────────────────────
const undoModalOpen = ref(false)
const undoBib = ref<number | null>(null)
const undoing = ref(false)

const undoParticipantName = computed(() => {
  if (!undoBib.value || !competition.value) return null
  return competition.value.participants.find(p => p.bibNumber === undoBib.value)?.name ?? null
})

function openUndo(bibNumber: number) {
  undoBib.value = bibNumber
  undoModalOpen.value = true
}

async function confirmUndo() {
  if (!undoBib.value) return
  undoing.value = true
  mutating.value = true
  try {
    await $fetch(`/api/competitions/${id}/participants/${undoBib.value}/finish`, { method: 'DELETE' })
    undoModalOpen.value = false
    undoBib.value = null
    await refresh()
    toast.add({ title: 'Finish removed', color: 'neutral', duration: 3000 })
  } catch {
    toast.add({ title: 'Failed to undo', color: 'error', duration: 4000 })
  } finally {
    undoing.value = false
    mutating.value = false
  }
}

// ─── End competition ────────────────────────────────────────────────────────
const endModalOpen = ref(false)
const ending = ref(false)

async function confirmEnd() {
  ending.value = true
  try {
    await $fetch(`/api/competitions/${id}`, { method: 'DELETE' })
    endModalOpen.value = false
    await refresh()
    toast.add({ title: 'Competition ended', color: 'neutral', duration: 3000 })
  } catch {
    toast.add({ title: 'Failed to end competition', color: 'error', duration: 4000 })
  } finally {
    ending.value = false
  }
}
</script>
