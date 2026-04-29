<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <p class="text-2xl font-bold text-gray-900 dark:text-white">RaceTrack</p>
        <p class="text-gray-500 dark:text-gray-400 mt-1">Admin access — enter your PIN</p>
      </div>

      <form class="space-y-4" @submit.prevent="submit">
        <UInput
          v-model="pin"
          type="password"
          placeholder="PIN"
          size="lg"
          autofocus
          :disabled="loading"
          :ui="{ base: 'text-center tracking-[0.5em] text-xl' }"
          @keydown.enter="submit"
        />

        <UAlert
          v-if="error"
          color="error"
          variant="soft"
          :description="error"
          icon="i-lucide-circle-x"
        />

        <UButton
          type="submit"
          block
          size="lg"
          :loading="loading"
          :disabled="!pin"
        >
          Sign in
        </UButton>
      </form>

      <p class="text-center mt-6">
        <NuxtLink to="/" class="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          ← Back to public results
        </NuxtLink>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const { login, isAuthenticated } = useAdminAuth()

if (isAuthenticated.value) {
  await navigateTo('/admin/competitions', { replace: true })
}

const pin = ref('')
const loading = ref(false)
const error = ref('')

async function submit() {
  if (!pin.value) return
  loading.value = true
  error.value = ''
  try {
    await login(pin.value)
    await navigateTo('/admin/competitions', { replace: true })
  } catch {
    error.value = 'Invalid PIN. Please try again.'
    pin.value = ''
  } finally {
    loading.value = false
  }
}
</script>
