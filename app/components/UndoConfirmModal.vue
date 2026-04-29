<template>
  <UModal v-model:open="open" title="Undo finish?">
    <template #body>
      <p class="text-gray-700 dark:text-gray-300">
        Remove the finish record for
        <strong class="font-semibold">#{{ bibNumber }}{{ participantName ? ` — ${participantName}` : '' }}</strong>?
      </p>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
        Their finish time will be removed and the tile will become active again.
      </p>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="ghost" color="neutral" @click="open = false">Cancel</UButton>
        <UButton color="error" :loading="loading" @click="emit('confirm')">Remove finish</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const open = defineModel<boolean>('open', { required: true })

defineProps<{
  bibNumber: number | null
  participantName: string | null
  loading?: boolean
}>()

const emit = defineEmits<{ confirm: [] }>()
</script>
