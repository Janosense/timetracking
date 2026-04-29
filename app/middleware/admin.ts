export default defineNuxtRouteMiddleware(async () => {
  const { checkAuth } = useAdminAuth()
  const ok = await checkAuth()
  if (!ok) {
    return navigateTo('/admin/login')
  }
})
