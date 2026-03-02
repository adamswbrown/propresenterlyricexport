import { app, BrowserWindow, ipcMain, shell } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import { fetchContacts } from '../../src/api/contacts'
import { fetchChildren } from '../../src/api/children'
import { getWeekBirthdays, getWeekRange } from '../../src/services/birthday'
import { generatePptx } from '../../src/services/pptx'
import type { AppSettings, SyncResult, ChurchSuiteConfig, BirthdayEntry } from '../../src/types'

const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json')
const OUTPUT_DIR = path.join(app.getPath('userData'), 'output')

function loadSettings(): AppSettings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'))
    }
  } catch {
    // ignore
  }
  return {
    account: '',
    apiKey: '',
    appName: 'birthday-bucket',
    lastSync: null,
    cachedData: null
  }
}

function saveSettings(settings: AppSettings): void {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2))
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#04070f',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  return win
}

app.whenReady().then(() => {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  // IPC: Load settings
  ipcMain.handle('get-settings', () => {
    return loadSettings()
  })

  // IPC: Save settings
  ipcMain.handle('save-settings', (_event, settings: AppSettings) => {
    saveSettings(settings)
    return true
  })

  // IPC: Sync data from ChurchSuite
  ipcMain.handle('sync', async (_event, config: ChurchSuiteConfig) => {
    const contacts = await fetchContacts(config)
    const children = await fetchChildren(config)

    const result: SyncResult = {
      contacts,
      children,
      syncedAt: new Date().toISOString()
    }

    // Save to settings
    const settings = loadSettings()
    settings.account = config.account
    settings.apiKey = config.apiKey
    settings.appName = config.appName
    settings.lastSync = result.syncedAt
    settings.cachedData = result
    saveSettings(settings)

    return result
  })

  // IPC: Get birthdays for a given week
  ipcMain.handle('get-birthdays', (_event, weekOffset: number) => {
    const settings = loadSettings()
    if (!settings.cachedData) {
      return { entries: [], range: getWeekRange(weekOffset) }
    }
    const allPeople = [...settings.cachedData.contacts, ...settings.cachedData.children]
    const entries = getWeekBirthdays(allPeople, weekOffset)
    const range = getWeekRange(weekOffset)
    return { entries, range }
  })

  // IPC: Export PPTX
  ipcMain.handle('export-pptx', async (_event, weekOffset: number) => {
    const settings = loadSettings()
    if (!settings.cachedData) {
      throw new Error('No data synced yet. Please sync first.')
    }
    const allPeople = [...settings.cachedData.contacts, ...settings.cachedData.children]
    const entries = getWeekBirthdays(allPeople, weekOffset)
    const range = getWeekRange(weekOffset)
    const weekLabel = `Birthdays — ${range.start} to ${range.end}`

    const filepath = await generatePptx(entries, weekLabel, OUTPUT_DIR)
    return filepath
  })

  // IPC: Open output folder
  ipcMain.handle('open-output', () => {
    shell.openPath(OUTPUT_DIR)
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
