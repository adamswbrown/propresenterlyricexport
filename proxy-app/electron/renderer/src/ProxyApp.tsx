import React, { useEffect, useState, useRef } from 'react';

declare global {
  interface Window {
    api: {
      loadSettings: () => Promise<any>;
      saveSettings: (data: Record<string, any>) => Promise<{ success: boolean }>;
      getStatus: () => Promise<any>;
      testConnection: (host: string, port: number) => Promise<{ success: boolean; version?: string; error?: string }>;
      startServer: () => Promise<void>;
      stopServer: () => Promise<void>;
      startTunnel: () => Promise<void>;
      stopTunnel: () => Promise<void>;
      openUrl: () => Promise<{ success: boolean }>;
      copyUrl: () => Promise<{ success: boolean }>;
      getToken: () => Promise<{ token: string | null }>;
      copyToken: () => Promise<{ success: boolean }>;
      onStatusUpdate: (cb: (data: any) => void) => () => void;
      onLogEntry: (cb: (entry: any) => void) => () => void;
      onServerError: (cb: (data: any) => void) => () => void;
    };
  }
}

interface LogEntry {
  time: string;
  message: string;
  level: string;
}

export default function ProxyApp() {
  // Settings
  const [ppHost, setPpHost] = useState('127.0.0.1');
  const [ppPort, setPpPort] = useState(1025);
  const [webPort, setWebPort] = useState(3100);
  const [tunnelUrl, setTunnelUrl] = useState('');
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleClientSecret, setGoogleClientSecret] = useState('');
  const [autoStart, setAutoStart] = useState(true);

  // Status
  const [webServerRunning, setWebServerRunning] = useState(false);
  const [tunnelConnected, setTunnelConnected] = useState(false);
  const [ppConnected, setPpConnected] = useState(false);
  const [ppVersion, setPpVersion] = useState<string | null>(null);

  // UI state
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const [bearerToken, setBearerToken] = useState<string | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);

  // Load initial settings and status
  useEffect(() => {
    window.api.loadSettings().then((s) => {
      setPpHost(s.ppHost);
      setPpPort(s.ppPort);
      setWebPort(s.webPort);
      setTunnelUrl(s.tunnelUrl);
      setGoogleClientId(s.googleClientId);
      setGoogleClientSecret(s.googleClientSecret);
      setAutoStart(s.autoStart);
    });

    window.api.getStatus().then((s) => {
      setWebServerRunning(s.webServerRunning);
      setTunnelConnected(s.tunnelConnected);
      setPpConnected(s.ppConnected);
      setPpVersion(s.ppVersion);
      if (s.logs) setLogs(s.logs);
    });

    window.api.getToken().then((t) => setBearerToken(t.token));

    const unsub1 = window.api.onStatusUpdate((data) => {
      setWebServerRunning(data.webServerRunning);
      setTunnelConnected(data.tunnelConnected);
      setPpConnected(data.ppConnected);
      setPpVersion(data.ppVersion);
      // Refresh token when server starts (token file gets created)
      if (data.webServerRunning) {
        window.api.getToken().then((t) => setBearerToken(t.token));
      }
    });

    const unsub2 = window.api.onLogEntry((entry) => {
      setLogs((prev) => [...prev.slice(-49), entry]);
    });

    return () => { unsub1(); unsub2(); };
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const handleSave = async () => {
    setSaving(true);
    await window.api.saveSettings({
      ppHost, ppPort, webPort, tunnelUrl,
      googleClientId, googleClientSecret, autoStart,
    });
    setSaving(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await window.api.testConnection(ppHost, ppPort);
    setTestResult(result.success ? `Connected (v${result.version})` : result.error || 'Failed');
    setTesting(false);
  };

  return (
    <div className="proxy-app">
      <div className="title-bar">
        <div className="title-text">ProPresenter Web Proxy</div>
      </div>

      {/* Status */}
      <div className="section">
        <div className="section-header">Status</div>
        <div className="status-row">
          <div className={`dot ${ppConnected ? 'green' : 'red'}`} />
          <span className="status-text">
            ProPresenter: {ppConnected ? `Connected${ppVersion ? ` (v${ppVersion})` : ''}` : 'Not running'}
          </span>
        </div>
        <div className="status-row">
          <div className={`dot ${webServerRunning ? 'green' : 'red'}`} />
          <span className="status-text">
            Web Server: {webServerRunning ? `Running (:${webPort})` : 'Stopped'}
          </span>
        </div>
        <div className="status-row">
          <div className={`dot ${tunnelConnected ? 'green' : tunnelUrl ? 'red' : 'yellow'}`} />
          <span className="status-text">
            Tunnel: {tunnelConnected ? 'Connected' : tunnelUrl ? 'Disconnected' : 'Not configured'}
          </span>
        </div>
        <div className="button-row">
          <button className="btn btn-primary" onClick={() => window.api.openUrl()} disabled={!webServerRunning}>
            Open Web UI
          </button>
          <button className="btn btn-secondary" onClick={() => window.api.copyUrl()} disabled={!webServerRunning}>
            Copy URL
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="section">
        <div className="section-header">Controls</div>
        <div className="button-row">
          {webServerRunning ? (
            <button className="btn btn-danger" onClick={() => window.api.stopServer()}>Stop Server</button>
          ) : (
            <button className="btn btn-success" onClick={() => window.api.startServer()}>Start Server</button>
          )}
          {tunnelConnected ? (
            <button className="btn btn-danger" onClick={() => window.api.stopTunnel()}>Stop Tunnel</button>
          ) : (
            <button className="btn btn-success" onClick={() => window.api.startTunnel()} disabled={!tunnelUrl}>
              Start Tunnel
            </button>
          )}
        </div>
      </div>

      {/* Bearer Token */}
      {bearerToken && (
        <div className="section">
          <div className="section-header">API Token</div>
          <div className="token-row">
            <code className="token-value">{bearerToken}</code>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                window.api.copyToken().then(() => {
                  setTokenCopied(true);
                  setTimeout(() => setTokenCopied(false), 2000);
                });
              }}
            >
              {tokenCopied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="token-hint">Share this token for API access without Google login</div>
        </div>
      )}

      {/* Connection */}
      <div className="section">
        <div className="section-header">ProPresenter</div>
        <div className="field-row">
          <label>Host</label>
          <input value={ppHost} onChange={(e) => setPpHost(e.target.value)} placeholder="127.0.0.1" />
        </div>
        <div className="field-row">
          <label>Port</label>
          <input type="number" value={ppPort} onChange={(e) => setPpPort(Number(e.target.value))} />
        </div>
        <div className="button-row">
          <button className="btn btn-secondary" onClick={handleTest} disabled={testing}>
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
        </div>
        {testResult && (
          <div className={`alert ${testResult.startsWith('Connected') ? 'alert-success' : 'alert-error'}`} style={{ marginTop: 8 }}>
            {testResult}
          </div>
        )}
      </div>

      {/* Server & Tunnel */}
      <div className="section">
        <div className="section-header">Server & Tunnel</div>
        <div className="field-row">
          <label>Web Port</label>
          <input type="number" value={webPort} onChange={(e) => setWebPort(Number(e.target.value))} />
        </div>
        <div className="field-row">
          <label>Tunnel URL</label>
          <input value={tunnelUrl} onChange={(e) => setTunnelUrl(e.target.value)} placeholder="https://pp.example.com" />
        </div>
      </div>

      {/* OAuth */}
      <div className="section">
        <div className="section-header">Google OAuth</div>
        <div className="field-row">
          <label>Client ID</label>
          <input value={googleClientId} onChange={(e) => setGoogleClientId(e.target.value)} placeholder="Optional" />
        </div>
        <div className="field-row">
          <label>Client Secret</label>
          <input type="password" value={googleClientSecret} onChange={(e) => setGoogleClientSecret(e.target.value)} placeholder="Optional" />
        </div>
      </div>

      {/* Options */}
      <div className="section">
        <div className="toggle-row">
          <label>Auto-start on launch</label>
          <div className={`toggle ${autoStart ? 'active' : ''}`} onClick={() => setAutoStart(!autoStart)} />
        </div>
        <div className="button-row">
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Logs */}
      <div className="section section-log">
        <div className="section-header">Log</div>
        <div className="log-area" ref={logRef}>
          {logs.length === 0 && <div className="log-muted">No log entries yet</div>}
          {logs.map((entry, i) => (
            <div key={i} className={`log-line log-${entry.level}`}>
              <span className="log-time">{entry.time}</span>
              <span className="log-msg">{entry.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
