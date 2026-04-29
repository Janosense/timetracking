<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <header class="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div class="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div class="flex items-center gap-6">
          <NuxtLink to="/admin/competitions" class="font-semibold text-lg tracking-tight">
            RaceTrack <span class="text-sm font-normal text-gray-500">Admin</span>
          </NuxtLink>
          <NuxtLink
            to="/admin/competitions"
            class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            Competitions
          </NuxtLink>
        </div>
        <div class="flex items-center gap-3">
          <NuxtLink to="/" class="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            Public site
          </NuxtLink>
          <UButton size="sm" variant="ghost" color="neutral" @click="logout">
            Logout
          </UButton>
        </div>
      </div>
    </header>
    <main class="max-w-7xl mx-auto px-4 py-8">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const { logout } = useAdminAuth()
</script>
