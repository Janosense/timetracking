<template>
  <UModal v-model:open="open" title="Delete competition?">
    <template #body>
      <p class="text-gray-700 dark:text-gray-300">
        Permanently delete <strong class="font-semibold">{{ competitionName ?? 'this competition' }}</strong>?
      </p>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
        All participants and finish records will be removed. This cannot be undone.
      </p>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="ghost" color="neutral" @click="open = false">Cancel</UButton>
        <UButton color="error" :loading="loading" @click="emit('confirm')">Delete</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const open = defineModel<boolean>('open', { required: true })

defineProps<{
  competitionName: string | null
  loading?: boolean
}>()

const emit = defineEmits<{ confirm: [] }>()
</script>
