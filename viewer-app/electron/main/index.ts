/**
 * ProPresenter Viewer — Menu Bar / Tray App
 *
 * Lightweight Electron app that runs an Express server serving the
 * real-time slide viewer for congregation members' phones and tablets.
 * Lives in the macOS menu bar / Windows system tray.
 */

import {
  app,
  Tray,
  Menu,
  BrowserWindow,
  ipcMain,
  nativeImage,
  shell,
  clipboard,
} from 'electron';
import path from 'path';
import os from 'os';
import express from 'express';
import http from 'http';
import Store from 'electron-store';
import { ViewerService } from '../../../src/server/services/viewer-service';
import { createViewerRoutes } from '../../../src/server/routes/viewer';

// ── Settings ──

interface ViewerSettings {
  ppHost: string;
  ppPort: number;
  serverPort: number;
}

const store = new Store<ViewerSettings>({
  name: 'propresenter-viewer',
  defaults: {
    ppHost: '127.0.0.1',
    ppPort: 1025,
    serverPort: 3100,
  },
});

// ── State ──

let tray: Tray | null = null;
let settingsWindow: BrowserWindow | null = null;
let httpServer: http.Server | null = null;
let viewerSvc: ViewerService | null = null;

// In-memory log buffer (last 50 entries)
const logBuffer: Array<{ time: string; message: string; level: string }> = [];

function addLog(message: string, level = 'info') {
  const entry = { time: new Date().toLocaleTimeString(), message, level };
  logBuffer.push(entry);
  if (logBuffer.length > 50) logBuffer.shift();
  notifyRenderer('log:entry', entry);
}

// ── Connection Config (backed by electron-store) ──

function getConnectionConfig() {
  return { host: store.get('ppHost'), port: store.get('ppPort') };
}

// ── Local IP Detection ──

function getLocalIP(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

function viewerUrl(): string {
  return `http://${getLocalIP()}:${store.get('serverPort')}/viewer`;
}

// ── Viewer Public Dir ──

function getViewerPublicDir(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'viewer-public');
  }
  return path.join(__dirname, '..', '..', '..', 'viewer', 'public');
}

// ── Express Server ──

function startExpressServer(): void {
  if (httpServer) return;

  const expressApp = express();

  viewerSvc = new ViewerService(getConnectionConfig);
  const routes = createViewerRoutes(viewerSvc, getConnectionConfig, getViewerPublicDir());
  expressApp.use(routes);

  // Health check
  expressApp.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Redirect root to /viewer
  expressApp.get('/', (_req, res) => { res.redirect('/viewer'); });

  const port = store.get('serverPort');

  httpServer = expressApp.listen(port, '0.0.0.0', () => {
    viewerSvc!.start();
    addLog(`Server started on port ${port}`);
    addLog(`Viewer URL: ${viewerUrl()}`);
    updateTrayMenu();
    notifyRenderer('server:status', { running: true, port, url: viewerUrl() });
  });

  httpServer.on('error', (err: NodeJS.ErrnoException) => {
    httpServer = null;
    if (err.code === 'EADDRINUSE') {
      addLog(`Port ${port} is already in use`, 'error');
      notifyRenderer('server:error', { message: `Port ${port} is already in use` });
    } else {
      addLog(`Server error: ${err.message}`, 'error');
      notifyRenderer('server:error', { message: err.message });
    }
    updateTrayMenu();
  });

  // Forward viewer service events to renderer
  viewerSvc.on('slideChange', (status) => {
    const text = status.currentText?.substring(0, 60) || '(media)';
    addLog(`Slide: ${text}`);
    updateTrayMenu();
  });

  viewerSvc.on('disconnected', () => {
    addLog('ProPresenter disconnected', 'warn');
    updateTrayMenu();
  });
}

function stopExpressServer(): Promise<void> {
  return new Promise((resolve) => {
    viewerSvc?.stop();
    viewerSvc?.removeAllListeners();
    viewerSvc = null;

    if (httpServer) {
      httpServer.close(() => {
        httpServer = null;
        addLog('Server stopped');
        updateTrayMenu();
        resolve();
      });
    } else {
      resolve();
    }
  });
}

async function restartExpressServer(): Promise<void> {
  await stopExpressServer();
  startExpressServer();
}

// ── Tray ──

function createTray(): void {
  const iconPath = path.join(__dirname, '..', '..', 'viewer-app', 'assets', 'tray-iconTemplate.png');
  console.log('[Tray] Icon path:', iconPath);

  let icon = nativeImage.createFromPath(iconPath);
  console.log('[Tray] Icon loaded, isEmpty:', icon.isEmpty(), 'size:', icon.getSize());

  if (icon.isEmpty()) {
    // Fallback: 16x16 black cross on transparent background
    console.log('[Tray] Using fallback icon');
    const size = { width: 16, height: 16 };
    const buf = Buffer.alloc(16 * 16 * 4, 0);
    // Vertical bar (x=7,8 from y=2 to y=13)
    for (let y = 2; y <= 13; y++) {
      for (let x = 7; x <= 8; x++) {
        const i = (y * 16 + x) * 4;
        buf[i] = 0; buf[i + 1] = 0; buf[i + 2] = 0; buf[i + 3] = 255;
      }
    }
    // Horizontal bar (y=6,7 from x=4 to x=11)
    for (let x = 4; x <= 11; x++) {
      for (let y = 6; y <= 7; y++) {
        const i = (y * 16 + x) * 4;
        buf[i] = 0; buf[i + 1] = 0; buf[i + 2] = 0; buf[i + 3] = 255;
      }
    }
    icon = nativeImage.createFromBuffer(buf, size);
  }

  if (process.platform === 'darwin') {
    icon.setTemplateImage(true);
  }

  tray = new Tray(icon);
  tray.setToolTip('ProPresenter Viewer');

  tray.on('click', () => {
    if (settingsWindow?.isVisible()) {
      settingsWindow.hide();
    } else {
      showSettingsWindow();
    }
  });

  updateTrayMenu();
}

function updateTrayMenu(): void {
  if (!tray) return;

  const connected = viewerSvc?.isConnected() ?? false;
  const serverRunning = !!httpServer;
  const version = viewerSvc?.getVersion();

  const statusLabel = connected
    ? `ProPresenter: Connected${version ? ` (v${version})` : ''}`
    : 'ProPresenter: Disconnected';

  const contextMenu = Menu.buildFromTemplate([
    { label: statusLabel, enabled: false },
    { type: 'separator' },
    {
      label: serverRunning ? `Viewer: ${viewerUrl()}` : 'Server: Stopped',
      enabled: serverRunning,
      click: () => { if (serverRunning) shell.openExternal(viewerUrl()); },
    },
    {
      label: 'Copy Viewer URL',
      enabled: serverRunning,
      click: () => { clipboard.writeText(viewerUrl()); },
    },
    { type: 'separator' },
    { label: 'Settings...', click: () => showSettingsWindow() },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        stopExpressServer().then(() => {
          app.exit(0);
        });
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

// ── Settings Window ──

function showSettingsWindow(): void {
  if (settingsWindow) {
    settingsWindow.show();
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 420,
    height: 560,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    title: 'ProPresenter Viewer',
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0a0a14',
    show: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Position near the tray icon on macOS
  if (tray && process.platform === 'darwin') {
    const trayBounds = tray.getBounds();
    const winBounds = settingsWindow.getBounds();
    const x = Math.round(trayBounds.x + trayBounds.width / 2 - winBounds.width / 2);
    const y = Math.round(trayBounds.y + trayBounds.height + 4);
    settingsWindow.setPosition(x, y, false);
  }

  if (process.env.ELECTRON_RENDERER_URL) {
    settingsWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    settingsWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  }

  settingsWindow.once('ready-to-show', () => settingsWindow?.show());

  settingsWindow.on('close', (e) => {
    // Hide instead of close — tray app keeps running
    e.preventDefault();
    settingsWindow?.hide();
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

function notifyRenderer(channel: string, data: any): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send(channel, data);
  }
}

// ── IPC Handlers ──

ipcMain.handle('settings:load', () => ({
  ppHost: store.get('ppHost'),
  ppPort: store.get('ppPort'),
  serverPort: store.get('serverPort'),
}));

ipcMain.handle('settings:save', async (_event, data: Partial<ViewerSettings>) => {
  if (data.ppHost !== undefined) store.set('ppHost', data.ppHost);
  if (data.ppPort !== undefined) store.set('ppPort', data.ppPort);
  if (data.serverPort !== undefined) store.set('serverPort', data.serverPort);

  addLog('Settings updated — restarting server');
  await restartExpressServer();

  return {
    ppHost: store.get('ppHost'),
    ppPort: store.get('ppPort'),
    serverPort: store.get('serverPort'),
  };
});

ipcMain.handle('status:get', () => ({
  ppConnected: viewerSvc?.isConnected() ?? false,
  ppVersion: viewerSvc?.getVersion() ?? null,
  serverRunning: !!httpServer,
  serverPort: store.get('serverPort'),
  viewerUrl: viewerUrl(),
  localIP: getLocalIP(),
  logs: logBuffer.slice(-20),
}));

ipcMain.handle('connection:test', async (_event, host: string, port: number) => {
  return new Promise<{ success: boolean; version?: string; error?: string }>((resolve) => {
    const url = `http://${host}:${port}/v1/version`;
    const req = http.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', (chunk: string) => { data += chunk; });
      res.on('end', () => {
        try {
          const ver = JSON.parse(data);
          resolve({
            success: true,
            version: `${ver.major || '7'}.${ver.minor || '0'}.${ver.patch || '0'}`,
          });
        } catch {
          resolve({ success: false, error: 'Invalid response from ProPresenter' });
        }
      });
    });
    req.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'Connection timed out' });
    });
  });
});

ipcMain.handle('url:copy', () => {
  clipboard.writeText(viewerUrl());
  return { success: true };
});

ipcMain.handle('url:open', () => {
  shell.openExternal(viewerUrl());
  return { success: true };
});

// ── App Lifecycle ──

app.whenReady().then(() => {
  console.log('[App] Ready. isPackaged:', app.isPackaged, '__dirname:', __dirname);

  // Hide dock icon on macOS (this is a tray-only app)
  if (process.platform === 'darwin') {
    app.dock.hide();
  }

  createTray();
  startExpressServer();

  // Periodically update tray and renderer with connection status
  setInterval(() => {
    updateTrayMenu();
    notifyRenderer('status:update', {
      ppConnected: viewerSvc?.isConnected() ?? false,
      ppVersion: viewerSvc?.getVersion() ?? null,
      serverRunning: !!httpServer,
      viewerUrl: viewerUrl(),
    });
  }, 3000);
});

// Don't quit when all windows are closed — this is a tray app
app.on('window-all-closed', () => {
  // intentionally empty
});
