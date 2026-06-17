import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js'
import { app } from 'electron'
import { join } from 'path'
import * as fs from 'fs'

let db: SqlJsDatabase | null = null
let dbPath: string = ''
let initPromise: Promise<void> | null = null

export function getDatabase(): SqlJsDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

export function getDatabasePath(): string {
  return dbPath
}

export async function initDatabase(): Promise<void> {
  // Prevent concurrent initialization
  if (initPromise) return initPromise
  if (db) return

  initPromise = (async () => {
  const userDataPath = app.getPath('userData')
  const dbDir = join(userDataPath, 'data')

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  dbPath = join(dbDir, 'poker-gto.db')

  // Locate WASM file — in packaged app it's in Resources/, in dev it's in node_modules
  let wasmPath: string | undefined
  if (app.isPackaged) {
    wasmPath = join(process.resourcesPath, 'sql-wasm.wasm')
  } else {
    wasmPath = join(__dirname, '../../node_modules/sql.js/dist/sql-wasm.wasm')
  }
  const SQL = await initSqlJs({ locateFile: () => wasmPath! })

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  db.run('PRAGMA journal_mode = WAL')
  db.run('PRAGMA foreign_keys = ON')
  db.run('PRAGMA cache_size = -64000')

  runMigrations(db)

  console.log(`Database initialized at ${dbPath}`)
  })()
  await initPromise
}

const CURRENT_DB_VERSION = 2

function runMigrations(database: SqlJsDatabase): void {
  // Check current version
  let version = 0
  try {
    const vStmt = database.prepare('PRAGMA user_version')
    if (vStmt.step()) version = (vStmt.getAsObject() as any).user_version || 0
    vStmt.free()
  } catch { /* pragma might fail on very old sql.js */ }

  if (version >= CURRENT_DB_VERSION) return

  database.run('BEGIN')
  try {
    database.run(`
      CREATE TABLE IF NOT EXISTS scenarios (
      id TEXT PRIMARY KEY,
      game_type TEXT NOT NULL,
      hero_position INTEGER NOT NULL,
      villain_position INTEGER NOT NULL,
      effective_stack INTEGER NOT NULL,
      ante REAL DEFAULT 0,
      board TEXT DEFAULT '',
      street TEXT NOT NULL,
      pot_size REAL NOT NULL,
      actions TEXT NOT NULL DEFAULT '[]',
      sizing_schema_id TEXT NOT NULL DEFAULT 'gto-wizard',
      icm_payouts TEXT,
      metadata TEXT DEFAULT '{}',
      created_at INTEGER DEFAULT (unixepoch())
    )
  `)

  database.run(`
    CREATE INDEX IF NOT EXISTS idx_scenarios_lookup
      ON scenarios(game_type, hero_position, effective_stack, street)
  `)

  database.run(`
    CREATE TABLE IF NOT EXISTS strategies (
      scenario_id TEXT PRIMARY KEY REFERENCES scenarios(id),
      data TEXT NOT NULL,
      format_version INTEGER DEFAULT 1,
      compressed_size INTEGER
    )
  `)

  database.run(`
    CREATE TABLE IF NOT EXISTS preflop_ranges (
      id TEXT PRIMARY KEY,
      game_type TEXT NOT NULL,
      position INTEGER NOT NULL,
      stack_depth INTEGER NOT NULL,
      ante REAL DEFAULT 0,
      range_data TEXT NOT NULL,
      description TEXT DEFAULT '',
      source TEXT DEFAULT 'community',
      metadata TEXT DEFAULT '{}'
    )
  `)

  database.run(`
    CREATE INDEX IF NOT EXISTS idx_preflop_ranges_lookup
      ON preflop_ranges(game_type, position, stack_depth)
  `)

  database.run(`
    CREATE TABLE IF NOT EXISTS flop_buckets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flop_text TEXT NOT NULL,
      cluster_id INTEGER NOT NULL,
      texture_type TEXT DEFAULT '',
      metadata TEXT DEFAULT '{}'
    )
  `)

  database.run(`
    CREATE TABLE IF NOT EXISTS hand_histories (
      id TEXT PRIMARY KEY,
      game_type TEXT NOT NULL,
      hand_text TEXT NOT NULL,
      position INTEGER,
      stack REAL,
      actions TEXT NOT NULL DEFAULT '[]',
      analysis TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    )
  `)

  database.run(`
    CREATE TABLE IF NOT EXISTS user_ranges (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      game_type TEXT NOT NULL,
      position INTEGER,
      stack_depth INTEGER,
      range_data TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    )
  `)

  database.run(`
    CREATE TABLE IF NOT EXISTS spot_library (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT 'Untitled Spot',
      category TEXT DEFAULT 'General',
      game_type TEXT NOT NULL,
      hero_position INTEGER NOT NULL,
      villain_position INTEGER NOT NULL,
      stack_depth INTEGER NOT NULL,
      board TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      range_data TEXT,
      tags TEXT DEFAULT '[]',
      created_at INTEGER DEFAULT (unixepoch())
    )
  `)

  database.run(`
    CREATE INDEX IF NOT EXISTS idx_spot_library_category
      ON spot_library(category, created_at DESC)
  `)

  // Sessions table for session review module
  database.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      date TEXT,
      game_type TEXT NOT NULL DEFAULT 'cash',
      stakes TEXT DEFAULT '',
      table_name TEXT DEFAULT '',
      max_players INTEGER DEFAULT 6,
      hero_name TEXT DEFAULT 'Hero',
      hero_position INTEGER DEFAULT 3,
      total_hands INTEGER DEFAULT 0,
      duration_minutes INTEGER DEFAULT 0,
      profit REAL DEFAULT 0,
      gto_alignment REAL DEFAULT 0,
      hand_ids TEXT DEFAULT '[]',
      raw_data TEXT DEFAULT '{}',
      created_at INTEGER DEFAULT (unixepoch())
    )
  `)

  database.run(`
    CREATE INDEX IF NOT EXISTS idx_sessions_created
      ON sessions(created_at DESC)
  `)

  database.run(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER DEFAULT (unixepoch())
    )
  `)

  // Set version
  database.run(`PRAGMA user_version = ${CURRENT_DB_VERSION}`)

  database.run('COMMIT')

  // Save to disk
  saveDatabase()

  console.log(`Database migrations complete (v${CURRENT_DB_VERSION})`)
  } catch (e) {
    database.run('ROLLBACK')
    console.error('Migration failed, rolled back:', e)
    throw e
  }
}

/** Save the in-memory database to disk */
export function saveDatabase(): void {
  if (!db) return
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(dbPath, buffer)
}

/** Close the database connection */
export function closeDatabase(): void {
  if (db) {
    saveDatabase()
    db.close()
    db = null
  }
}
