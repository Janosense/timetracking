<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Competitions</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage and track all competitions</p>
      </div>
      <UButton to="/admin/competitions/new" icon="i-lucide-plus">
        New Competition
      </UButton>
    </div>

    <!-- Skeleton -->
    <div v-if="pending" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-20 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
    </div>

    <!-- Table -->
    <div
      v-else-if="competitions && competitions.length > 0"
      class="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
    >
      <table class="w-full text-sm">
        <thead class="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <tr>
            <th class="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Name</th>
            <th class="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">Date</th>
            <th class="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">Type</th>
            <th class="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
            <th class="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">Participants</th>
            <th class="px-5 py-3" />
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 dark:divide-gray-900 bg-white dark:bg-gray-900">
          <tr v-for="c in competitions" :key="c.id" class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <td class="px-5 py-4">
              <p class="font-medium text-gray-900 dark:text-white">{{ c.name }}</p>
            </td>
            <td class="px-5 py-4 text-gray-500 hidden sm:table-cell">
              {{ formatDate(c.scheduledStart ?? c.actualStart ?? c.createdAt) }}
            </td>
            <td class="px-5 py-4 hidden md:table-cell">
              <UBadge
                :label="c.type === 'classic' ? 'Classic' : 'Backyard Ultra'"
                color="neutral"
                variant="subtle"
                size="sm"
              />
            </td>
            <td class="px-5 py-4">
              <div class="flex items-center gap-1.5">
                <span
                  v-if="c.status === 'active'"
                  class="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block"
                />
                <UBadge
                  :label="statusLabel(c.status)"
                  :color="statusColor(c.status)"
                  variant="soft"
                  size="sm"
                />
              </div>
            </td>
            <td class="px-5 py-4 text-gray-500 hidden sm:table-cell">{{ c.participantCount }}</td>
            <td class="px-5 py-4">
              <div class="flex items-center justify-end gap-2">
                <UButton
                  :to="`/competitions/${c.id}`"
                  size="sm"
                  variant="ghost"
                  color="neutral"
                  icon="i-lucide-external-link"
                  target="_blank"
                >
                  Results
                </UButton>
                <UButton
                  :to="`/admin/competitions/${c.id}`"
                  size="sm"
                  :color="c.status === 'active' ? 'primary' : 'neutral'"
                  :variant="c.status === 'active' ? 'solid' : 'outline'"
                  icon="i-lucide-radio"
                >
                  Track
                </UButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty state -->
    <div v-else class="text-center py-20 text-gray-400">
      <p class="text-4xl mb-3">🏁</p>
      <p class="text-lg font-medium text-gray-600 dark:text-gray-400">No competitions yet</p>
      <p class="text-sm mt-1 mb-6">Create your first competition to get started</p>
      <UButton to="/admin/competitions/new" icon="i-lucide-plus">New Competition</UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { formatDate } = useFormatTime()

const { data: competitions, pending } = await useAsyncData('admin-competitions', () =>
  $fetch('/api/competitions')
)

function statusLabel(status: string) {
  return { pending: 'Upcoming', active: 'Live', completed: 'Finished' }[status] ?? status
}

function statusColor(status: string): 'neutral' | 'success' {
  return status === 'active' ? 'success' : 'neutral'
}
</script>
