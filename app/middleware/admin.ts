export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/admin/login') return
  const { checkAuth } = useAdminAuth()
  const ok = await checkAuth()
  if (!ok) return navigateTo('/admin/login')
})
