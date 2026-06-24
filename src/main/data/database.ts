import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js'
import { join } from 'path'
import * as fs from 'fs'

let db: SqlJsDatabase | null = null
let dbPath: string = ''
let initPromise: Promise<void> | null = null

// ============================================================
// Detect runtime environment
// ============================================================
let _isElectron: boolean | null = null

export function isElectron(): boolean {
  if (_isElectron !== null) return _isElectron
  try {
    // Check if electron is available — in web/Node.js without Electron,
    // requiring 'electron' will throw.
    require.resolve('electron')
    const { app } = require('electron')
    _isElectron = typeof app?.getPath === 'function'
  } catch {
    _isElectron = false
  }
  return _isElectron
}

// ============================================================
// Injectable options — call before initDatabase() when NOT in Electron
// ============================================================
export interface DatabaseOptions {
  /** Absolute path to the directory where poker-gto.db is stored. */
  dbDir?: string
  /** Absolute path to the sql-wasm.wasm file. */
  wasmPath?: string
  /** If true, use in-memory database only (no disk persistence). */
  inMemory?: boolean
}

let customOptions: DatabaseOptions = {}

/**
 * Configure database paths before initialization.
 * Only needed in non-Electron environments (web, Node.js scripts).
 * In Electron, paths are auto-detected from app.getPath('userData').
 */
export function configureDatabase(options: DatabaseOptions): void {
  customOptions = options
}

// ============================================================
// Public API
// ============================================================

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
    let dataDir: string
    let wasmPath: string | undefined

    if (isElectron()) {
      // ── Electron: auto-detect paths ──
      const { app } = require('electron')
      const userDataPath = app.getPath('userData')
      dataDir = join(userDataPath, 'data')

      if (app.isPackaged) {
        wasmPath = join(process.resourcesPath, 'sql-wasm.wasm')
      } else {
        wasmPath = join(__dirname, '../../node_modules/sql.js/dist/sql-wasm.wasm')
      }
    } else if (customOptions.dbDir) {
      // ── Explicit config (web, Node.js scripts) ──
      dataDir = customOptions.dbDir
      wasmPath = customOptions.wasmPath
    } else {
      throw new Error(
        'Not running in Electron and no custom database path configured. ' +
        'Call configureDatabase({ dbDir, wasmPath }) before initDatabase().'
      )
    }

    // Ensure directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    dbPath = join(dataDir, 'poker-gto.db')

    // Locate WASM file
    if (!wasmPath) {
      // Fallback for Node.js: try node_modules
      wasmPath = join(__dirname, '../../node_modules/sql.js/dist/sql-wasm.wasm')
    }

    const SQL = await initSqlJs({ locateFile: () => wasmPath! })

    // Load existing database or create new one
    if (!customOptions.inMemory && fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath)
      db = new SQL.Database(buffer)
    } else {
      db = new SQL.Database()
    }

    db.run('PRAGMA journal_mode = WAL')
    db.run('PRAGMA foreign_keys = ON')
    db.run('PRAGMA cache_size = -64000')

    runMigrations(db)

    console.log(`Database initialized at ${customOptions.inMemory ? '(in-memory)' : dbPath}`)
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

/** Save the in-memory database to disk (no-op in inMemory mode). */
export function saveDatabase(): void {
  if (!db || customOptions.inMemory) return
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
