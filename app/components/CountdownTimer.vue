<template>
  <div class="text-center py-10">
    <template v-if="scheduledStart && timeRemaining > 0">
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide font-medium">Starts in</p>
      <p class="text-6xl font-mono font-bold text-gray-900 dark:text-white tabular-nums tracking-tight">
        {{ formatted }}
      </p>
      <p class="text-sm text-gray-400 dark:text-gray-500 mt-3">
        {{ new Date(scheduledStart).toLocaleString() }}
      </p>
    </template>
    <template v-else>
      <p class="text-xl font-medium text-gray-600 dark:text-gray-400">Ready to start</p>
      <p class="text-sm text-gray-400 dark:text-gray-500 mt-2">Press the button below when the race begins</p>
    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  scheduledStart: number | null
}>()

const emit = defineEmits<{ started: [] }>()

const { formatMs } = useFormatTime()
const timeRemaining = ref(0)
let fired = false

function update() {
  if (!props.scheduledStart) { timeRemaining.value = 0; return }
  timeRemaining.value = Math.max(0, props.scheduledStart - Date.now())
  if (!fired && timeRemaining.value === 0) {
    fired = true
    emit('started')
  }
}

const formatted = computed(() => formatMs(timeRemaining.value))

let interval: ReturnType<typeof setInterval>
onMounted(() => { update(); interval = setInterval(update, 1000) })
onUnmounted(() => clearInterval(interval))
</script>
