import { join } from 'path'
import { app, BrowserWindow, ipcMain } from 'electron'
import type { Platform, ProviderId, Settings } from '@shared/types'
import { loadSettings, saveSettings } from './config'
import { fetchStats } from './providers'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 480,
    height: 760,
    minWidth: 420,
    minHeight: 560,
    title: 'Apex 队友战绩助手',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  ipcMain.handle('settings:get', () => loadSettings())
  ipcMain.handle('settings:set', (_e, settings: Settings) => {
    saveSettings(settings)
    return loadSettings()
  })

  ipcMain.handle(
    'stats:fetch',
    async (_e, arg: { provider: ProviderId; platform: Platform; username: string }) => {
      try {
        const settings = loadSettings()
        const apiKey =
          arg.provider === 'trn' ? settings.keys.trn : settings.keys.mozambique
        const data = await fetchStats(arg.provider, arg.username, arg.platform, apiKey)
        return { ok: true, data }
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : String(err)
        }
      }
    }
  )

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
