<template>
  <div class="max-w-2xl">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">New Competition</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Set up a new race for tracking</p>
    </div>

    <form class="space-y-6" @submit.prevent="submit">

      <!-- Basic Info -->
      <section class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-5">
        <h2 class="font-semibold text-gray-800 dark:text-gray-100">Basic Information</h2>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Competition Name *</label>
          <UInput v-model="form.name" placeholder="e.g. City Marathon 2025" size="md" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Competition Type *</label>
          <div class="grid grid-cols-2 gap-3 mt-1.5">
            <button
              v-for="opt in typeOptions"
              :key="opt.value"
              type="button"
              :class="typeCardClass(opt.value)"
              @click="form.type = opt.value as typeof form.type"
            >
              <p class="font-medium text-sm">{{ opt.label }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{{ opt.desc }}</p>
            </button>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Scheduled Start
            <span class="text-gray-400 font-normal">(optional)</span>
          </label>
          <div class="flex gap-2 mt-1.5">
            <input v-model="form.scheduledDate" type="date" :class="inputClass" class="flex-1" />
            <input v-model="form.scheduledTime" type="time" :class="inputClass" class="w-28" :disabled="!form.scheduledDate" />
          </div>
        </div>
      </section>

      <!-- Participants -->
      <section class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-5">
        <h2 class="font-semibold text-gray-800 dark:text-gray-100">Participants</h2>

        <div class="flex gap-2">
          <button
            v-for="opt in participantModeOptions"
            :key="opt.value"
            type="button"
            :class="modeBtnClass(opt.value)"
            @click="form.participantMode = opt.value as typeof form.participantMode"
          >
            {{ opt.label }}
          </button>
        </div>

        <!-- Number range -->
        <div v-if="form.participantMode === 'range'" class="flex items-end gap-3">
          <div class="w-28">
            <label class="block text-xs text-gray-500 mb-1">From *</label>
            <input v-model.number="form.rangeFrom" type="number" min="1" :class="inputClass" />
          </div>
          <span class="pb-2 text-gray-400">—</span>
          <div class="w-28">
            <label class="block text-xs text-gray-500 mb-1">To *</label>
            <input v-model.number="form.rangeTo" type="number" :min="form.rangeFrom" :class="inputClass" />
          </div>
          <p class="pb-2 text-sm text-gray-500">{{ rangeCount }} participants</p>
        </div>

        <!-- CSV upload -->
        <div v-else class="space-y-3">
          <div class="relative border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
            <input
              type="file"
              accept=".csv,.txt"
              class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              @change="onCsvUpload"
            />
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Drop a CSV file here or click to browse</p>
            <p class="text-xs text-gray-400 mt-1">Format: <code class="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">number;name</code> (one per line)</p>
          </div>
          <p v-if="csvError" class="text-sm text-red-500">{{ csvError }}</p>
          <div v-if="form.csvParticipants.length > 0" class="text-sm text-green-600 dark:text-green-400">
            ✓ {{ form.csvParticipants.length }} participants loaded
            ({{ form.csvParticipants.filter(p => p.name).length }} with names)
          </div>
          <div v-if="form.csvParticipants.length > 0" class="rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
            <table class="w-full text-xs">
              <thead class="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th class="text-left px-3 py-2 text-gray-500 font-medium">Bib</th>
                  <th class="text-left px-3 py-2 text-gray-500 font-medium">Name</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50 dark:divide-gray-900">
                <tr v-for="p in form.csvParticipants.slice(0, 5)" :key="p.number">
                  <td class="px-3 py-1.5 font-mono">{{ p.number }}</td>
                  <td class="px-3 py-1.5 text-gray-600 dark:text-gray-400">{{ p.name || '—' }}</td>
                </tr>
                <tr v-if="form.csvParticipants.length > 5">
                  <td colspan="2" class="px-3 py-1.5 text-gray-400 italic">… and {{ form.csvParticipants.length - 5 }} more</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- Type-specific settings -->
      <section class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-5">
        <h2 class="font-semibold text-gray-800 dark:text-gray-100">
          {{ form.type === 'classic' ? 'Classic Settings' : 'Backyard Ultra Settings' }}
        </h2>

        <template v-if="form.type === 'classic'">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Control Time (minutes) *</label>
            <div class="flex items-center gap-3">
              <input v-model.number="form.controlTimeMinutes" type="number" min="1" :class="inputClass" class="w-28" />
              <span class="text-sm text-gray-500">= {{ controlTimeHours }}</span>
            </div>
            <p class="text-xs text-gray-400 mt-1.5">Race ends after this time; non-finishers receive DNF</p>
          </div>
        </template>

        <template v-else>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Lap Duration (minutes)</label>
            <div class="flex items-center gap-3">
              <input v-model.number="form.lapDurationMinutes" type="number" min="1" :class="inputClass" class="w-28" />
              <span class="text-sm text-gray-500">default: 60 min</span>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Target Laps <span class="text-gray-400 font-normal">(optional)</span>
            </label>
            <input v-model="targetLapsInput" type="number" min="1" placeholder="Unlimited" :class="inputClass" class="w-28" />
            <p class="text-xs text-gray-400 mt-1.5">
              Leave empty for last-person-standing. If set, all who finish the last lap become finishers; best total time wins.
            </p>
          </div>
        </template>
      </section>

      <!-- Error + Actions -->
      <UAlert v-if="formError" color="error" variant="soft" :description="formError" icon="i-lucide-circle-x" />

      <div class="flex justify-between items-center">
        <UButton variant="ghost" color="neutral" type="button" @click="router.back()">Cancel</UButton>
        <UButton type="submit" :loading="loading" icon="i-lucide-check">Create Competition</UButton>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const router = useRouter()
const { readCsvFile } = useCsvParser()

const inputClass = 'block w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:border-transparent'

const form = reactive({
  name: '',
  type: 'classic' as 'classic' | 'backyard_ultra',
  scheduledDate: '',
  scheduledTime: '',
  participantMode: 'range' as 'range' | 'csv',
  rangeFrom: 1,
  rangeTo: 50,
  csvParticipants: [] as { number: number; name?: string }[],
  controlTimeMinutes: 60,
  lapDurationMinutes: 60
})

const targetLapsInput = ref('')
const loading = ref(false)
const formError = ref('')
const csvError = ref('')

const typeOptions = [
  { value: 'classic', label: 'Classic', desc: 'Start → Finish, best time wins' },
  { value: 'backyard_ultra', label: 'Backyard Ultra', desc: 'Multiple laps, last person standing' }
]
const participantModeOptions = [
  { value: 'range', label: 'Number Range' },
  { value: 'csv', label: 'Upload CSV' }
]

function typeCardClass(value: string) {
  const base = 'text-left rounded-xl border p-4 transition-all cursor-pointer select-none'
  return form.type === value
    ? `${base} border-primary-500 ring-1 ring-primary-500 bg-primary-50 dark:bg-primary-950/30`
    : `${base} border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600`
}

function modeBtnClass(value: string) {
  return form.participantMode === value
    ? 'px-4 py-2 rounded-lg text-sm font-medium bg-primary-500 text-white'
    : 'px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
}

const rangeCount = computed(() => Math.max(0, form.rangeTo - form.rangeFrom + 1))

const controlTimeHours = computed(() => {
  const h = Math.floor(form.controlTimeMinutes / 60)
  const m = form.controlTimeMinutes % 60
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
})

async function onCsvUpload(e: Event) {
  csvError.value = ''
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    const parsed = await readCsvFile(file)
    if (parsed.length === 0) { csvError.value = 'No valid rows found. Expected: number;name'; return }
    form.csvParticipants = parsed.map(p => ({ number: p.number, name: p.name || undefined }))
  } catch {
    csvError.value = 'Failed to read the file'
  }
}

async function submit() {
  formError.value = ''

  if (!form.name.trim()) { formError.value = 'Competition name is required'; return }

  let participants: { number: number; name?: string }[]
  if (form.participantMode === 'range') {
    if (form.rangeFrom < 1) { formError.value = 'Range must start at 1 or above'; return }
    if (form.rangeTo < form.rangeFrom) { formError.value = '"To" must be ≥ "From"'; return }
    if (rangeCount.value > 2000) { formError.value = 'Range too large (max 2000)'; return }
    participants = Array.from({ length: rangeCount.value }, (_, i) => ({ number: form.rangeFrom + i }))
  } else {
    if (form.csvParticipants.length === 0) { formError.value = 'Please upload a CSV file'; return }
    participants = form.csvParticipants
  }

  if (form.type === 'classic' && (!form.controlTimeMinutes || form.controlTimeMinutes < 1)) {
    formError.value = 'Control time must be at least 1 minute'; return
  }

  let scheduledStart: number | undefined
  if (form.scheduledDate) {
    scheduledStart = new Date(`${form.scheduledDate}T${form.scheduledTime || '00:00'}`).getTime()
  }

  loading.value = true
  try {
    const { id } = await $fetch('/api/competitions', {
      method: 'POST',
      body: {
        name: form.name.trim(),
        type: form.type,
        scheduledStart,
        controlTimeMinutes: form.type === 'classic' ? form.controlTimeMinutes : undefined,
        lapDurationMinutes: form.type === 'backyard_ultra' ? form.lapDurationMinutes : undefined,
        targetLaps: form.type === 'backyard_ultra' && targetLapsInput.value ? parseInt(targetLapsInput.value) : undefined,
        participants
      }
    }) as { id: string }
    await navigateTo(`/admin/competitions/${id}`)
  } catch (err: unknown) {
    formError.value = err instanceof Error ? err.message : 'Failed to create competition'
  } finally {
    loading.value = false
  }
}
</script>
