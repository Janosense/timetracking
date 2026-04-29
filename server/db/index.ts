import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from './schema'

let _db: ReturnType<typeof drizzle> | null = null

export function getDb() {
  if (!_db) {
    const sqlite = new Database('./race.db')
    sqlite.pragma('journal_mode = WAL')
    sqlite.pragma('foreign_keys = ON')
    _db = drizzle(sqlite, { schema })
    migrate(_db, { migrationsFolder: './server/db/migrations' })
  }
  return _db
}
