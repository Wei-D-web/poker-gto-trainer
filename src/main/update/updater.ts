import { autoUpdater } from 'electron-updater'
import { BrowserWindow } from 'electron'

let updateCheckInterval: ReturnType<typeof setInterval> | null = null

export function setupAutoUpdater(mainWindow: BrowserWindow): void {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    mainWindow.webContents.send('update:status', { status: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('update:status', {
      status: 'available',
      version: info.version,
      releaseDate: info.releaseDate,
    })
  })

  autoUpdater.on('update-not-available', () => {
    mainWindow.webContents.send('update:status', { status: 'up-to-date' })
  })

  autoUpdater.on('download-progress', (progress) => {
    mainWindow.webContents.send('update:status', {
      status: 'downloading',
      percent: progress.percent,
      speed: progress.bytesPerSecond,
    })
  })

  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('update:status', { status: 'downloaded' })
  })

  autoUpdater.on('error', (error) => {
    mainWindow.webContents.send('update:status', {
      status: 'error',
      message: error.message,
    })
  })

  // Check for updates every 4 hours
  updateCheckInterval = setInterval(() => {
    autoUpdater.checkForUpdates().catch(console.error)
  }, 4 * 60 * 60 * 1000)
}

export function checkForUpdates(): void {
  autoUpdater.checkForUpdates().catch(console.error)
}

export function downloadUpdate(): void {
  autoUpdater.downloadUpdate().catch(console.error)
}

export function quitAndInstall(): void {
  autoUpdater.quitAndInstall()
}

export function stopAutoUpdater(): void {
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval)
    updateCheckInterval = null
  }
}
