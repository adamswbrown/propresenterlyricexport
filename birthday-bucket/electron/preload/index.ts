import { contextBridge, ipcRenderer } from 'electron'
import type { AppSettings, ChurchSuiteConfig, SyncResult, BirthdayEntry } from '../../src/types'

const api = {
  getSettings: (): Promise<AppSettings> =>
    ipcRenderer.invoke('get-settings'),

  saveSettings: (settings: AppSettings): Promise<boolean> =>
    ipcRenderer.invoke('save-settings', settings),

  sync: (config: ChurchSuiteConfig): Promise<SyncResult> =>
    ipcRenderer.invoke('sync', config),

  getBirthdays: (weekOffset: number): Promise<{ entries: BirthdayEntry[]; range: { start: string; end: string } }> =>
    ipcRenderer.invoke('get-birthdays', weekOffset),

  exportPptx: (weekOffset: number): Promise<string> =>
    ipcRenderer.invoke('export-pptx', weekOffset),

  openOutput: (): Promise<void> =>
    ipcRenderer.invoke('open-output')
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
