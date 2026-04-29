import { createClient } from '@libsql/client'
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql'
import * as schema from './schema'

let _db: LibSQLDatabase<typeof schema> | null = null

export function getDb() {
  if (!_db) {
    const url = process.env.TURSO_DATABASE_URL ?? 'file:./race.db'
    const authToken = process.env.TURSO_AUTH_TOKEN
    const client = createClient(authToken ? { url, authToken } : { url })
    _db = drizzle(client, { schema })
  }
  return _db
}
