import { contextBridge, ipcRenderer } from 'electron';

const api = {
  // Settings
  loadSettings: () => ipcRenderer.invoke('settings:load'),
  saveSettings: (data: Record<string, any>) => ipcRenderer.invoke('settings:save', data),

  // Status
  getStatus: () => ipcRenderer.invoke('status:get'),
  testConnection: (host: string, port: number) =>
    ipcRenderer.invoke('connection:test', host, port),

  // Process control
  startServer: () => ipcRenderer.invoke('server:start'),
  stopServer: () => ipcRenderer.invoke('server:stop'),
  startTunnel: () => ipcRenderer.invoke('tunnel:start'),
  stopTunnel: () => ipcRenderer.invoke('tunnel:stop'),

  // URLs
  openUrl: () => ipcRenderer.invoke('url:open'),
  copyUrl: () => ipcRenderer.invoke('url:copy'),

  // Bearer token
  getToken: () => ipcRenderer.invoke('token:get'),
  copyToken: () => ipcRenderer.invoke('token:copy'),

  // Events from main process
  onStatusUpdate: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('status:update', handler);
    return () => ipcRenderer.removeListener('status:update', handler);
  },
  onLogEntry: (callback: (entry: any) => void) => {
    const handler = (_event: any, entry: any) => callback(entry);
    ipcRenderer.on('log:entry', handler);
    return () => ipcRenderer.removeListener('log:entry', handler);
  },
  onServerError: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('server:error', handler);
    return () => ipcRenderer.removeListener('server:error', handler);
  },
};

contextBridge.exposeInMainWorld('api', api);
