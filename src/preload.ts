import { contextBridge } from 'electron';

// Expose limited APIs to renderer process
contextBridge.exposeInMainWorld('electron', {
  // We can add IPC calls here if needed later
});
