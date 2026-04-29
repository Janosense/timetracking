<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <header class="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div class="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <NuxtLink to="/" class="font-semibold text-lg tracking-tight">
          RaceTrack
        </NuxtLink>
        <nav class="flex items-center gap-4">
          <NuxtLink to="/" class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
            Results
          </NuxtLink>
          <UButton to="/admin/login" size="sm" variant="outline" color="neutral">
            Admin
          </UButton>
        </nav>
      </div>
    </header>
    <main class="max-w-7xl mx-auto px-4 py-8">
      <slot />
    </main>
  </div>
</template>
