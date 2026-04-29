<template>
  <div>
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Competitions</h1>
      <p class="mt-1 text-gray-500 dark:text-gray-400">Live and past race results</p>
    </div>

    <div v-if="pending" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="i in 3"
        :key="i"
        class="h-28 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse"
      />
    </div>

    <div v-else-if="competitions && competitions.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <CompetitionCard
        v-for="c in competitions"
        :key="c.id"
        :competition="c"
      />
    </div>

    <div v-else class="text-center py-20 text-gray-400">
      <p class="text-4xl mb-3">🏁</p>
      <p class="text-lg font-medium">No competitions yet</p>
      <p class="text-sm mt-1">Check back soon</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { data: competitions, pending } = await useAsyncData('competitions', () =>
  $fetch('/api/competitions')
)
</script>
