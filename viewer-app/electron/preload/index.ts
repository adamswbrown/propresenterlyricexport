import { contextBridge, ipcRenderer } from 'electron';

const api = {
  loadSettings: () => ipcRenderer.invoke('settings:load'),
  saveSettings: (data: { ppHost?: string; ppPort?: number; serverPort?: number }) =>
    ipcRenderer.invoke('settings:save', data),
  getStatus: () => ipcRenderer.invoke('status:get'),
  testConnection: (host: string, port: number) =>
    ipcRenderer.invoke('connection:test', host, port),
  copyUrl: () => ipcRenderer.invoke('url:copy'),
  openUrl: () => ipcRenderer.invoke('url:open'),

  onStatusUpdate: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('status:update', handler);
    return () => { ipcRenderer.removeListener('status:update', handler); };
  },
  onLogEntry: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('log:entry', handler);
    return () => { ipcRenderer.removeListener('log:entry', handler); };
  },
  onServerError: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('server:error', handler);
    return () => { ipcRenderer.removeListener('server:error', handler); };
  },
};

contextBridge.exposeInMainWorld('api', api);

export type ViewerAPI = typeof api;
