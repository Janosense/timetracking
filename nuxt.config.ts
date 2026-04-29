// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
    adminPin: process.env.NUXT_ADMIN_PIN || '1234',
    jwtSecret: process.env.NUXT_JWT_SECRET || 'change-me-in-production-secret-key'
  }
})
