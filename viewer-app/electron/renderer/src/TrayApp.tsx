import React, { useEffect, useState, useCallback, useRef } from 'react';

declare global {
  interface Window {
    api: {
      loadSettings: () => Promise<{ ppHost: string; ppPort: number; serverPort: number }>;
      saveSettings: (data: { ppHost?: string; ppPort?: number; serverPort?: number }) => Promise<any>;
      getStatus: () => Promise<{
        ppConnected: boolean;
        ppVersion: string | null;
        serverRunning: boolean;
        serverPort: number;
        viewerUrl: string;
        localIP: string;
        logs: Array<{ time: string; message: string; level: string }>;
      }>;
      testConnection: (host: string, port: number) => Promise<{ success: boolean; version?: string; error?: string }>;
      copyUrl: () => Promise<{ success: boolean }>;
      openUrl: () => Promise<{ success: boolean }>;
      onStatusUpdate: (cb: (data: any) => void) => () => void;
      onLogEntry: (cb: (data: any) => void) => () => void;
      onServerError: (cb: (data: any) => void) => () => void;
    };
  }
}

interface LogEntry {
  time: string;
  message: string;
  level: string;
}

export function TrayApp() {
  const [ppHost, setPpHost] = useState('127.0.0.1');
  const [ppPort, setPpPort] = useState(1025);
  const [serverPort, setServerPort] = useState(3100);
  const [ppConnected, setPpConnected] = useState(false);
  const [ppVersion, setPpVersion] = useState<string | null>(null);
  const [serverRunning, setServerRunning] = useState(false);
  const [viewerUrl, setViewerUrl] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [copied, setCopied] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  // Load initial state
  useEffect(() => {
    window.api.getStatus().then((status) => {
      setPpConnected(status.ppConnected);
      setPpVersion(status.ppVersion);
      setServerRunning(status.serverRunning);
      setViewerUrl(status.viewerUrl);
      setLogs(status.logs || []);
    });
    window.api.loadSettings().then((settings) => {
      setPpHost(settings.ppHost);
      setPpPort(settings.ppPort);
      setServerPort(settings.serverPort);
    });
  }, []);

  // Listen for status updates
  useEffect(() => {
    const unsub = window.api.onStatusUpdate((data) => {
      setPpConnected(data.ppConnected);
      setPpVersion(data.ppVersion);
      setServerRunning(data.serverRunning);
      if (data.viewerUrl) setViewerUrl(data.viewerUrl);
    });
    return unsub;
  }, []);

  // Listen for log entries
  useEffect(() => {
    const unsub = window.api.onLogEntry((entry) => {
      setLogs((prev) => {
        const next = [...prev, entry];
        return next.length > 20 ? next.slice(-20) : next;
      });
    });
    return unsub;
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  // Listen for server errors
  useEffect(() => {
    const unsub = window.api.onServerError((data) => {
      setServerError(data.message);
      setServerRunning(false);
    });
    return unsub;
  }, []);

  const handleTestConnection = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await window.api.testConnection(ppHost, ppPort);
      setTestResult({
        success: result.success,
        message: result.success
          ? `Connected to ProPresenter ${result.version}`
          : result.error || 'Connection failed',
      });
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
    }
    setTesting(false);
  }, [ppHost, ppPort]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setServerError(null);
    setTestResult(null);
    try {
      await window.api.saveSettings({ ppHost, ppPort, serverPort });
    } catch (err: any) {
      setServerError(err.message);
    }
    setSaving(false);
  }, [ppHost, ppPort, serverPort]);

  const handleCopyUrl = useCallback(async () => {
    await window.api.copyUrl();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleOpenUrl = useCallback(() => {
    window.api.openUrl();
  }, []);

  return (
    <div className="tray-app">
      {/* Draggable title bar region */}
      <div className="title-bar">
        <span className="title-text">ProPresenter Viewer</span>
      </div>

      {/* Connection Status */}
      <div className="section">
        <div className="section-header">Connection</div>
        <div className="status-row">
          <span className={`dot ${ppConnected ? 'green' : 'red'}`} />
          <span className="status-text">
            {ppConnected
              ? `Connected${ppVersion ? ` (v${ppVersion})` : ''}`
              : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Settings */}
      <div className="section">
        <div className="field-row">
          <label>Host</label>
          <input
            type="text"
            value={ppHost}
            onChange={(e) => setPpHost(e.target.value)}
            placeholder="192.168.1.100"
          />
        </div>
        <div className="field-row">
          <label>API Port</label>
          <input
            type="number"
            value={ppPort}
            onChange={(e) => setPpPort(parseInt(e.target.value) || 0)}
            min={1}
            max={65535}
          />
        </div>
        <div className="field-row">
          <label>Server Port</label>
          <input
            type="number"
            value={serverPort}
            onChange={(e) => setServerPort(parseInt(e.target.value) || 0)}
            min={1}
            max={65535}
          />
        </div>

        {testResult && (
          <div className={`alert ${testResult.success ? 'alert-success' : 'alert-error'}`}>
            {testResult.message}
          </div>
        )}
        {serverError && (
          <div className="alert alert-error">{serverError}</div>
        )}

        <div className="button-row">
          <button className="btn btn-secondary" onClick={handleTestConnection} disabled={testing}>
            {testing ? 'Testing...' : 'Test'}
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save & Restart'}
          </button>
        </div>
      </div>

      {/* Viewer URL */}
      <div className="section">
        <div className="section-header">Viewer</div>
        <div className="status-row">
          <span className={`dot ${serverRunning ? 'green' : 'red'}`} />
          <span className="status-text">
            {serverRunning ? 'Running' : 'Stopped'}
          </span>
        </div>
        {serverRunning && viewerUrl && (
          <>
            <div className="url-display">{viewerUrl}</div>
            <div className="button-row">
              <button className="btn btn-secondary" onClick={handleCopyUrl}>
                {copied ? 'Copied!' : 'Copy URL'}
              </button>
              <button className="btn btn-secondary" onClick={handleOpenUrl}>
                Open in Browser
              </button>
            </div>
          </>
        )}
      </div>

      {/* Log */}
      <div className="section section-log">
        <div className="section-header">Log</div>
        <div className="log-area" ref={logRef}>
          {logs.map((entry, i) => (
            <div key={i} className={`log-line log-${entry.level}`}>
              <span className="log-time">{entry.time}</span>
              <span className="log-msg">{entry.message}</span>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="log-line log-muted">No log entries yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
