import { migrate } from 'drizzle-orm/libsql/migrator'
import { getDb } from '../db'

export default defineNitroPlugin(async () => {
  await migrate(getDb(), { migrationsFolder: './server/db/migrations' })
})
