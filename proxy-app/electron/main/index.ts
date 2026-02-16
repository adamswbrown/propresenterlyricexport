/**
 * ProPresenter Web Proxy — Menu Bar / Tray App
 *
 * Manages the pp-web-server executable and cloudflared tunnel as child
 * processes. Lives in the macOS menu bar / Windows system tray.
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
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import http from 'http';
import fs from 'fs';
import os from 'os';
import Store from 'electron-store';

// ── Settings ──

interface ProxySettings {
  ppHost: string;
  ppPort: number;
  webPort: number;
  tunnelUrl: string;
  googleClientId: string;
  googleClientSecret: string;
  autoStart: boolean;
}

const store = new Store<ProxySettings>({
  name: 'propresenter-proxy',
  defaults: {
    ppHost: '127.0.0.1',
    ppPort: 1025,
    webPort: 3100,
    tunnelUrl: '',
    googleClientId: '',
    googleClientSecret: '',
    autoStart: true,
  },
});

// ── State ──

let tray: Tray | null = null;
let settingsWindow: BrowserWindow | null = null;
let webServerProcess: ChildProcess | null = null;
let tunnelProcess: ChildProcess | null = null;
let webServerRunning = false;
let tunnelConnected = false;
let ppConnected = false;
let ppVersion: string | null = null;
let restartCount = 0;
let healthPollTimer: ReturnType<typeof setInterval> | null = null;

// In-memory log buffer (last 100 entries)
const logBuffer: Array<{ time: string; message: string; level: string }> = [];

function addLog(message: string, level = 'info') {
  const entry = { time: new Date().toLocaleTimeString(), message, level };
  logBuffer.push(entry);
  if (logBuffer.length > 100) logBuffer.shift();
  notifyRenderer('log:entry', entry);
}

// ── Path Resolution ──

function getWebServerPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'pp-web-server');
  }
  return path.join(__dirname, '..', '..', '..', 'executables', 'pp-web-server');
}

function getCloudflaredPath(): string {
  // macOS GUI apps don't inherit full shell PATH, check common locations
  const candidates = [
    '/opt/homebrew/bin/cloudflared',   // Homebrew (Apple Silicon)
    '/usr/local/bin/cloudflared',      // Homebrew (Intel) or manual install
    '/usr/bin/cloudflared',
    'cloudflared',                     // fallback to PATH
  ];
  for (const candidate of candidates) {
    try {
      if (require('fs').existsSync(candidate)) return candidate;
    } catch { /* skip */ }
  }
  return 'cloudflared';
}

// ── Web Server Process ──

function getWebServerEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  env.PROPRESENTER_HOST = store.get('ppHost');
  env.PROPRESENTER_PORT = String(store.get('ppPort'));
  env.WEB_PORT = String(store.get('webPort'));

  const tunnelUrl = store.get('tunnelUrl');
  if (tunnelUrl) env.TUNNEL_URL = tunnelUrl;

  const clientId = store.get('googleClientId')?.trim();
  const clientSecret = store.get('googleClientSecret')?.trim();
  if (clientId) env.GOOGLE_CLIENT_ID = clientId;
  if (clientSecret) env.GOOGLE_CLIENT_SECRET = clientSecret;

  return env;
}

function startWebServer(): void {
  if (webServerProcess) return;

  const execPath = getWebServerPath();
  addLog(`Starting web server: ${execPath}`);

  try {
    webServerProcess = spawn(execPath, [], {
      env: getWebServerEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    webServerProcess.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(Boolean);
      for (const line of lines) {
        addLog(`[server] ${line.trim()}`);
      }
    });

    webServerProcess.stderr?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(Boolean);
      for (const line of lines) {
        addLog(`[server] ${line.trim()}`, 'error');
      }
    });

    webServerProcess.on('exit', (code) => {
      webServerProcess = null;
      webServerRunning = false;
      addLog(`Web server exited (code ${code})`, code === 0 ? 'info' : 'error');
      updateTrayMenu();
      notifyRenderer('status:update', getStatus());

      // Auto-restart on crash (with backoff, max 5 retries)
      if (code !== 0 && code !== null && restartCount < 5) {
        restartCount++;
        const delay = Math.min(restartCount * 2000, 10000);
        addLog(`Restarting in ${delay / 1000}s (attempt ${restartCount}/5)`);
        setTimeout(() => startWebServer(), delay);
      }
    });

    // Give it a moment to start, then check health
    setTimeout(() => {
      checkWebServerHealth();
    }, 2000);
  } catch (err: any) {
    addLog(`Failed to start web server: ${err.message}`, 'error');
    notifyRenderer('server:error', { message: err.message });
  }
}

function stopWebServer(): Promise<void> {
  return new Promise((resolve) => {
    restartCount = 5; // Prevent auto-restart
    if (!webServerProcess) {
      webServerRunning = false;
      updateTrayMenu();
      resolve();
      return;
    }

    webServerProcess.once('exit', () => {
      webServerProcess = null;
      webServerRunning = false;
      updateTrayMenu();
      resolve();
    });

    webServerProcess.kill('SIGTERM');

    // Force kill after 5s
    setTimeout(() => {
      if (webServerProcess) {
        webServerProcess.kill('SIGKILL');
        webServerProcess = null;
        webServerRunning = false;
        updateTrayMenu();
        resolve();
      }
    }, 5000);
  });
}

// ── Tunnel Process ──

function startTunnel(): void {
  if (tunnelProcess) return;
  if (!store.get('tunnelUrl')) {
    addLog('Tunnel URL not configured — skipping tunnel start', 'warn');
    return;
  }

  addLog('Starting cloudflared tunnel...');

  try {
    tunnelProcess = spawn(getCloudflaredPath(), ['tunnel', 'run', 'propresenter-web'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    tunnelProcess.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      if (text.includes('Connection') && text.includes('registered')) {
        tunnelConnected = true;
        updateTrayMenu();
        notifyRenderer('status:update', getStatus());
      }
      const lines = text.split('\n').filter(Boolean);
      for (const line of lines) {
        addLog(`[tunnel] ${line.trim()}`);
      }
    });

    tunnelProcess.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      // cloudflared logs to stderr by default
      if (text.includes('Registered tunnel connection') || text.includes('connectionID')) {
        tunnelConnected = true;
        updateTrayMenu();
        notifyRenderer('status:update', getStatus());
      }
      const lines = text.split('\n').filter(Boolean);
      for (const line of lines) {
        // cloudflared INF messages are normal, not errors
        const level = text.includes('ERR') ? 'error' : 'info';
        addLog(`[tunnel] ${line.trim()}`, level);
      }
    });

    tunnelProcess.on('error', (err: NodeJS.ErrnoException) => {
      tunnelProcess = null;
      tunnelConnected = false;
      if (err.code === 'ENOENT') {
        addLog('cloudflared not found — install with: brew install cloudflared', 'error');
      } else {
        addLog(`Tunnel error: ${err.message}`, 'error');
      }
      updateTrayMenu();
      notifyRenderer('status:update', getStatus());
    });

    tunnelProcess.on('exit', (code) => {
      tunnelProcess = null;
      tunnelConnected = false;
      addLog(`Tunnel exited (code ${code})`, code === 0 ? 'info' : 'warn');
      updateTrayMenu();
      notifyRenderer('status:update', getStatus());
    });
  } catch (err: any) {
    addLog(`Failed to start tunnel: ${err.message}`, 'error');
  }
}

function stopTunnel(): Promise<void> {
  return new Promise((resolve) => {
    if (!tunnelProcess) {
      tunnelConnected = false;
      updateTrayMenu();
      resolve();
      return;
    }

    tunnelProcess.once('exit', () => {
      tunnelProcess = null;
      tunnelConnected = false;
      updateTrayMenu();
      resolve();
    });

    tunnelProcess.kill('SIGTERM');

    setTimeout(() => {
      if (tunnelProcess) {
        tunnelProcess.kill('SIGKILL');
        tunnelProcess = null;
        tunnelConnected = false;
        updateTrayMenu();
        resolve();
      }
    }, 5000);
  });
}

// ── Health Check ──

function checkWebServerHealth(): void {
  const port = store.get('webPort');
  const url = `http://127.0.0.1:${port}/health`;

  const req = http.get(url, { timeout: 3000 }, (res) => {
    let data = '';
    res.on('data', (chunk: string) => { data += chunk; });
    res.on('end', () => {
      webServerRunning = true;
      updateTrayMenu();
      notifyRenderer('status:update', getStatus());
    });
  });
  req.on('error', () => {
    webServerRunning = false;
    updateTrayMenu();
  });
  req.on('timeout', () => {
    req.destroy();
    webServerRunning = false;
  });
}

function checkProPresenterStatus(): void {
  const host = store.get('ppHost');
  const port = store.get('ppPort');
  const url = `http://${host}:${port}/version`;

  const req = http.get(url, { timeout: 3000 }, (res) => {
    let data = '';
    res.on('data', (chunk: string) => { data += chunk; });
    res.on('end', () => {
      try {
        const ver = JSON.parse(data);
        ppConnected = true;
        ppVersion = ver.host_description || 'ProPresenter';
      } catch {
        ppConnected = false;
        ppVersion = null;
      }
      updateTrayMenu();
      notifyRenderer('status:update', getStatus());
    });
  });
  req.on('error', () => {
    ppConnected = false;
    ppVersion = null;
    updateTrayMenu();
  });
  req.on('timeout', () => {
    req.destroy();
    ppConnected = false;
    ppVersion = null;
  });
}

function startHealthPolling(): void {
  if (healthPollTimer) return;
  healthPollTimer = setInterval(() => {
    checkWebServerHealth();
    checkProPresenterStatus();
  }, 5000);
}

// ── Status ──

function getStatus() {
  return {
    webServerRunning,
    tunnelConnected,
    ppConnected,
    ppVersion,
    tunnelUrl: store.get('tunnelUrl'),
    webPort: store.get('webPort'),
    logs: logBuffer.slice(-30),
  };
}

function getWebUrl(): string {
  const tunnelUrl = store.get('tunnelUrl');
  if (tunnelUrl) return tunnelUrl;
  return `http://127.0.0.1:${store.get('webPort')}`;
}

// ── Tray ──

function createTray(): void {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'tray-iconTemplate.png')
    : path.join(__dirname, '..', '..', 'proxy-app', 'assets', 'tray-iconTemplate.png');
  let icon: Electron.NativeImage;
  try {
    icon = nativeImage.createFromPath(iconPath);
    if (process.platform === 'darwin') {
      icon.setTemplateImage(true);
    }
  } catch {
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip('ProPresenter Web Proxy');

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

  const ppLabel = ppConnected
    ? `ProPresenter: Connected${ppVersion ? ` (v${ppVersion})` : ''}`
    : 'ProPresenter: Not running';

  const serverLabel = webServerRunning
    ? `Web Server: Running (:${store.get('webPort')})`
    : 'Web Server: Stopped';

  const tunnelUrl = store.get('tunnelUrl');
  let tunnelLabel: string;
  if (!tunnelUrl) {
    tunnelLabel = 'Tunnel: Not configured';
  } else if (tunnelConnected) {
    tunnelLabel = 'Tunnel: Connected';
  } else if (tunnelProcess) {
    tunnelLabel = 'Tunnel: Connecting...';
  } else {
    tunnelLabel = 'Tunnel: Disconnected';
  }

  const contextMenu = Menu.buildFromTemplate([
    { label: ppLabel, enabled: false },
    { type: 'separator' },
    { label: serverLabel, enabled: false },
    { label: tunnelLabel, enabled: false },
    { type: 'separator' },
    {
      label: 'Open Web UI',
      enabled: webServerRunning,
      click: () => shell.openExternal(getWebUrl()),
    },
    {
      label: 'Copy Web URL',
      enabled: webServerRunning,
      click: () => clipboard.writeText(getWebUrl()),
    },
    { type: 'separator' },
    {
      label: webServerRunning ? 'Stop Server' : 'Start Server',
      click: async () => {
        if (webServerRunning || webServerProcess) {
          await stopWebServer();
        } else {
          restartCount = 0;
          startWebServer();
        }
      },
    },
    {
      label: tunnelProcess ? 'Stop Tunnel' : 'Start Tunnel',
      enabled: !!tunnelUrl,
      click: async () => {
        if (tunnelProcess) {
          await stopTunnel();
        } else {
          startTunnel();
        }
      },
    },
    { type: 'separator' },
    { label: 'Settings...', click: () => showSettingsWindow() },
    { type: 'separator' },
    {
      label: 'Quit',
      click: async () => {
        addLog('Shutting down...');
        await Promise.all([stopWebServer(), stopTunnel()]);
        app.exit(0);
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
    width: 480,
    height: 640,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    title: 'ProPresenter Web Proxy',
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
  webPort: store.get('webPort'),
  tunnelUrl: store.get('tunnelUrl'),
  googleClientId: store.get('googleClientId'),
  googleClientSecret: store.get('googleClientSecret'),
  autoStart: store.get('autoStart'),
}));

ipcMain.handle('settings:save', async (_event, data: Partial<ProxySettings>) => {
  const needsRestart =
    data.ppHost !== undefined && data.ppHost !== store.get('ppHost') ||
    data.ppPort !== undefined && data.ppPort !== store.get('ppPort') ||
    data.webPort !== undefined && data.webPort !== store.get('webPort') ||
    data.googleClientId !== undefined && data.googleClientId !== store.get('googleClientId') ||
    data.googleClientSecret !== undefined && data.googleClientSecret !== store.get('googleClientSecret') ||
    data.tunnelUrl !== undefined && data.tunnelUrl !== store.get('tunnelUrl');

  if (data.ppHost !== undefined) store.set('ppHost', data.ppHost.trim());
  if (data.ppPort !== undefined) store.set('ppPort', data.ppPort);
  if (data.webPort !== undefined) store.set('webPort', data.webPort);
  if (data.tunnelUrl !== undefined) store.set('tunnelUrl', data.tunnelUrl.trim().replace(/\/+$/, ''));
  if (data.googleClientId !== undefined) store.set('googleClientId', data.googleClientId.trim());
  if (data.googleClientSecret !== undefined) store.set('googleClientSecret', data.googleClientSecret.trim());
  if (data.autoStart !== undefined) store.set('autoStart', data.autoStart);

  if (needsRestart && webServerProcess) {
    addLog('Settings changed — restarting server');
    restartCount = 0;
    await stopWebServer();
    startWebServer();

    // Restart tunnel if URL changed
    if (data.tunnelUrl !== undefined && tunnelProcess) {
      await stopTunnel();
      startTunnel();
    }
  }

  return { success: true };
});

ipcMain.handle('status:get', () => getStatus());

ipcMain.handle('connection:test', async (_event, host: string, port: number) => {
  return new Promise<{ success: boolean; version?: string; error?: string }>((resolve) => {
    const url = `http://${host}:${port}/version`;
    const req = http.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', (chunk: string) => { data += chunk; });
      res.on('end', () => {
        try {
          const ver = JSON.parse(data);
          resolve({
            success: true,
            version: ver.host_description || 'ProPresenter',
          });
        } catch {
          resolve({ success: false, error: 'Invalid response' });
        }
      });
    });
    req.on('error', (err) => resolve({ success: false, error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ success: false, error: 'Timed out' }); });
  });
});

ipcMain.handle('server:start', () => { restartCount = 0; startWebServer(); });
ipcMain.handle('server:stop', () => stopWebServer());
ipcMain.handle('tunnel:start', () => startTunnel());
ipcMain.handle('tunnel:stop', () => stopTunnel());

ipcMain.handle('url:open', () => {
  shell.openExternal(getWebUrl());
  return { success: true };
});

ipcMain.handle('url:copy', () => {
  clipboard.writeText(getWebUrl());
  return { success: true };
});

ipcMain.handle('token:get', () => {
  try {
    const authFile = path.join(os.homedir(), '.propresenter-words', 'web-auth.json');
    if (fs.existsSync(authFile)) {
      const data = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
      return { token: data.token || null };
    }
  } catch { /* ignore */ }
  return { token: null };
});

ipcMain.handle('token:copy', () => {
  try {
    const authFile = path.join(os.homedir(), '.propresenter-words', 'web-auth.json');
    if (fs.existsSync(authFile)) {
      const data = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
      if (data.token) {
        clipboard.writeText(data.token);
        return { success: true };
      }
    }
  } catch { /* ignore */ }
  return { success: false };
});

// ── App Lifecycle ──

app.whenReady().then(() => {
  if (process.platform === 'darwin') {
    app.dock.hide();
  }

  createTray();
  startHealthPolling();

  if (store.get('autoStart')) {
    startWebServer();
    if (store.get('tunnelUrl')) {
      // Small delay so server starts first
      setTimeout(() => startTunnel(), 3000);
    }
  }
});

app.on('window-all-closed', () => {
  // intentionally empty — tray app keeps running
});

app.on('before-quit', async () => {
  if (healthPollTimer) clearInterval(healthPollTimer);
  await Promise.all([stopWebServer(), stopTunnel()]);
});
