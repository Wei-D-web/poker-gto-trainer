import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { join } from 'path'
import { registerAllIpcHandlers } from './ipc/register'
import { initDatabase, getDatabase, closeDatabase } from './data/database'
import { generateSamplePreflopData } from './data/generate-sample-data'
import { generatePresetSolutions } from './data/preset-solutions'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'PokerGTO Trainer',
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0A0A0A',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  // Register IPC FIRST so it's always available
  registerAllIpcHandlers()

  // Create window
  createWindow()

  // Init database in background (window shows regardless)
  try {
    await initDatabase()
    const db = getDatabase()
    const stmt = db.prepare('SELECT COUNT(*) as count FROM preflop_ranges')
    stmt.step()
    const row = stmt.getAsObject()
    stmt.free()
    if ((row.count as number) === 0) {
      generateSamplePreflopData()
    }
    // Also generate postflop preset solutions if needed
    try {
      generatePresetSolutions()
    } catch (e) {
      console.error('Preset generation error (non-critical):', e)
    }
  } catch (e) {
    console.error('DB init error (window still works):', e)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Persist database on quit to prevent data loss
app.on('before-quit', () => {
  closeDatabase()
})

export { mainWindow }
