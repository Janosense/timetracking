export function useAdminAuth() {
  const isAuthenticated = useState<boolean>('admin_auth', () => false)

  async function checkAuth(): Promise<boolean> {
    try {
      await $fetch('/api/auth/verify')
      isAuthenticated.value = true
      return true
    } catch {
      isAuthenticated.value = false
      return false
    }
  }

  async function login(pin: string): Promise<void> {
    await $fetch('/api/auth/login', { method: 'POST', body: { pin } })
    isAuthenticated.value = true
  }

  async function logout(): Promise<void> {
    await $fetch('/api/auth/logout', { method: 'POST' })
    isAuthenticated.value = false
    await navigateTo('/admin/login')
  }

  return { isAuthenticated, checkAuth, login, logout }
}
