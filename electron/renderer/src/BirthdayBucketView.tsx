/// <reference path="./env.d.ts" />
import { useState, useEffect, useCallback } from 'react';

type BirthdayBucketViewProps = {
  churchSuiteConfig: {
    account: string;
    clientId: string;
    clientSecret: string;
  };
  churchName: string;
  backgroundImagePath: string;
  onConfigChange: (updates: Record<string, string>) => void;
  onSaveSettings: () => void;
  onBack: () => void;
};

type Notification = {
  message: string;
  type: 'success' | 'error' | 'info';
};

type BirthdayEntry = {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  source: 'contact' | 'child';
  dayName: string;
  dateFormatted: string;
  turningAge: number;
  daysUntil: number;
};

type SyncResult = {
  contacts: number;
  children: number;
  syncedAt: string;
};

export function BirthdayBucketView(props: BirthdayBucketViewProps) {
  const [notification, setNotification] = useState<Notification | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [birthdays, setBirthdays] = useState<BirthdayEntry[]>([]);
  const [weekRange, setWeekRange] = useState<{ start: string; end: string } | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [oauthAuthenticated, setOauthAuthenticated] = useState(false);

  // Local config state
  const [account, setAccount] = useState(props.churchSuiteConfig.account);
  const [clientId, setClientId] = useState(props.churchSuiteConfig.clientId);
  const [clientSecret, setClientSecret] = useState(props.churchSuiteConfig.clientSecret);
  const [churchName, setChurchName] = useState(props.churchName);
  const [backgroundImagePath, setBackgroundImagePath] = useState(props.backgroundImagePath);

  // Auto-dismiss notifications
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 5000);
    return () => clearTimeout(timer);
  }, [notification]);

  // Check OAuth2 status on mount
  useEffect(() => {
    window.api.churchSuiteOAuth2Status().then((status) => {
      setOauthAuthenticated(status.authenticated);
    });
  }, []);

  const loadBirthdays = useCallback(async (offset: number) => {
    try {
      const result = await window.api.churchSuiteGetBirthdays(offset);
      if (result.success) {
        setBirthdays(result.entries);
        setWeekRange(result.range);
      }
    } catch {
      // No cached data yet
    }
  }, []);

  useEffect(() => {
    loadBirthdays(weekOffset);
  }, [weekOffset, loadBirthdays]);

  const handleOAuth2Authorize = async () => {
    if (!account || !clientId || !clientSecret) {
      setNotification({ message: 'Please enter account, client ID, and client secret', type: 'error' });
      return;
    }

    setIsAuthorizing(true);
    setNotification({ message: 'Opening browser for authorization...', type: 'info' });

    props.onConfigChange({
      churchSuiteAccount: account,
      churchSuiteClientId: clientId,
      churchSuiteClientSecret: clientSecret,
    });

    try {
      const result = await window.api.churchSuiteOAuth2Authorize({ account, clientId, clientSecret });
      if (result.success) {
        setOauthAuthenticated(true);
        setNotification({ message: 'Successfully authorized with ChurchSuite', type: 'success' });
      } else {
        setNotification({ message: result.error || 'Authorization failed', type: 'error' });
      }
    } catch (error: any) {
      setNotification({ message: error?.message || 'Authorization failed', type: 'error' });
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleOAuth2Disconnect = async () => {
    await window.api.churchSuiteOAuth2Disconnect();
    setOauthAuthenticated(false);
    setSyncResult(null);
    setBirthdays([]);
    setNotification({ message: 'Disconnected from ChurchSuite', type: 'info' });
  };

  const handleCancelAuth = async () => {
    await window.api.churchSuiteOAuth2Cancel();
    setIsAuthorizing(false);
    setNotification({ message: 'Authorization cancelled', type: 'info' });
  };

  const handleSync = async () => {
    if (!oauthAuthenticated) {
      setNotification({ message: 'Please authorize with ChurchSuite first', type: 'error' });
      return;
    }

    setIsSyncing(true);
    setNotification({ message: 'Syncing with ChurchSuite...', type: 'info' });

    props.onConfigChange({
      churchSuiteAccount: account,
      churchSuiteClientId: clientId,
      churchSuiteClientSecret: clientSecret,
      birthdayChurchName: churchName,
      birthdayBackgroundImagePath: backgroundImagePath,
    });

    try {
      const result = await window.api.churchSuiteSync();

      if (result.success) {
        setSyncResult({ contacts: result.contacts, children: result.children, syncedAt: result.syncedAt });
        setNotification({ message: `Synced ${result.contacts} contacts and ${result.children} children`, type: 'success' });
        await loadBirthdays(weekOffset);
      } else {
        setNotification({ message: result.error || 'Sync failed', type: 'error' });
      }
    } catch (error: any) {
      setNotification({ message: error?.message || 'Sync failed', type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleChooseBackground = async () => {
    const result = await window.api.chooseBirthdayBackground();
    if (result.canceled || !result.filePath) return;
    setBackgroundImagePath(result.filePath);
    props.onConfigChange({ birthdayBackgroundImagePath: result.filePath });
  };

  const handleExport = async () => {
    setIsExporting(true);
    setNotification({ message: 'Generating birthday slides...', type: 'info' });
    try {
      const result = await window.api.churchSuiteExportPptx(weekOffset);
      if (result.success) {
        setNotification({ message: `Exported to ${result.filename}`, type: 'success' });
      } else {
        setNotification({ message: result.error || 'Export failed', type: 'error' });
      }
    } catch (error: any) {
      setNotification({ message: error?.message || 'Export failed', type: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  const formatRelativeTime = (iso: string): string => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: 'var(--text)',
    fontSize: '14px',
    outline: 'none',
  };

  const labelStyle = { display: 'block' as const, fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' };

  const panelStyle = {
    background: 'var(--panel)',
    border: '1px solid var(--panel-border)',
    borderRadius: '18px',
    padding: '24px',
  };

  const panelTitleStyle = {
    margin: '0 0 4px',
    fontSize: '14px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    color: 'var(--text)',
  };

  return (
    <div className="service-generator-container">
      <div className="titlebar-drag" />

      {/* Header */}
      <div className="service-header">
        <button className="icon-button" onClick={props.onBack} title="Back to Export" type="button">
          &larr;
        </button>
        <div>
          <h1>Birthday Bucket</h1>
          <p className="eyebrow">ChurchSuite birthday manager</p>
        </div>
        {syncResult && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--success)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
            Synced
          </div>
        )}
      </div>

      {/* Notification */}
      {notification && (
        <div className={`service-notification service-notification-${notification.type}`}>
          {notification.message}
        </div>
      )}

      {/* Main Content */}
      <div className="service-layout">
        {/* Sidebar */}
        <aside className="service-sidebar" style={{ gap: '24px' }}>
          {/* Connection Panel */}
          <div style={panelStyle}>
            <h3 style={panelTitleStyle}>Connection</h3>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--muted)' }}>
              ChurchSuite OAuth2 credentials
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Account</label>
                <input type="text" value={account} onChange={(e) => setAccount(e.target.value)} placeholder="gracechurch" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Client ID</label>
                <input type="text" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="Your OAuth2 Client ID" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Client Secret</label>
                <input type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} placeholder="Your OAuth2 Client Secret" style={inputStyle} />
              </div>

              {oauthAuthenticated ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 12px', background: 'rgba(47, 212, 194, 0.08)',
                    borderRadius: '10px', fontSize: '13px', color: 'var(--accent)',
                  }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
                    Connected to ChurchSuite
                  </div>
                  <button className="ghost" onClick={handleOAuth2Disconnect} type="button" style={{ width: '100%', fontSize: '12px' }}>
                    Disconnect
                  </button>
                </div>
              ) : isAuthorizing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{
                    padding: '10px 12px', background: 'rgba(245, 193, 86, 0.08)',
                    borderRadius: '10px', fontSize: '13px', color: 'var(--warning)', textAlign: 'center',
                  }}>
                    Waiting for browser authorization...
                  </div>
                  <button className="ghost" onClick={handleCancelAuth} type="button" style={{ width: '100%', fontSize: '12px' }}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  className="primary"
                  onClick={handleOAuth2Authorize}
                  disabled={!account || !clientId || !clientSecret}
                  type="button"
                  style={{ width: '100%', marginTop: '4px' }}
                >
                  Authorize with ChurchSuite
                </button>
              )}

              {/* Sync button */}
              {oauthAuthenticated && (
                <button className="primary" onClick={handleSync} disabled={isSyncing} type="button" style={{ width: '100%', marginTop: '4px' }}>
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </button>
              )}
            </div>

            {/* Sync stats */}
            {syncResult && (
              <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
                  {syncResult.contacts} contacts
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--warning)', display: 'inline-block' }} />
                  {syncResult.children} children
                </div>
                <div style={{ color: 'rgba(242,247,255,0.4)', fontSize: '12px' }}>
                  Last sync: {formatRelativeTime(syncResult.syncedAt)}
                </div>
              </div>
            )}
          </div>

          {/* Export Panel */}
          <div style={panelStyle}>
            <h3 style={panelTitleStyle}>Export</h3>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--muted)' }}>
              Generate PowerPoint for service display
            </p>
            <button className="accent" onClick={handleExport} disabled={isExporting || birthdays.length === 0} type="button" style={{ width: '100%' }}>
              {isExporting ? 'Exporting...' : 'Export PPTX'}
            </button>
            <button className="ghost" onClick={() => window.api.churchSuiteOpenOutput()} type="button" style={{ width: '100%', marginTop: '8px', fontSize: '12px' }}>
              Open Output Folder
            </button>
          </div>

          {/* Presentation Settings Panel */}
          <div style={panelStyle}>
            <h3 style={panelTitleStyle}>Slides</h3>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--muted)' }}>
              Customise exported PPTX appearance
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Church Name</label>
                <input type="text" value={churchName} onChange={(e) => setChurchName(e.target.value)} placeholder="St Andrew's" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Background Image</label>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px', wordBreak: 'break-all' }}>
                  {backgroundImagePath
                    ? backgroundImagePath.split('/').pop() || backgroundImagePath.split('\\').pop()
                    : 'No image set — uses warm amber fallback'}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className="ghost" onClick={handleChooseBackground} type="button" style={{ flex: 1, fontSize: '12px' }}>
                    Choose Image
                  </button>
                  {backgroundImagePath && (
                    <button
                      className="ghost"
                      onClick={() => { setBackgroundImagePath(''); props.onConfigChange({ birthdayBackgroundImagePath: '' }); }}
                      type="button"
                      style={{ fontSize: '12px' }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content - Birthday List */}
        <main className="service-main">
          <div className="service-step-content">
            <h2>Birthdays</h2>
            {weekRange && (
              <p className="hint">{weekRange.start} &mdash; {weekRange.end}</p>
            )}

            {/* Week toggle */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
              <button className={weekOffset === 0 ? 'primary' : 'ghost'} onClick={() => setWeekOffset(0)} type="button" style={{ flex: 1 }}>
                This Week
              </button>
              <button className={weekOffset === 1 ? 'primary' : 'ghost'} onClick={() => setWeekOffset(1)} type="button" style={{ flex: 1 }}>
                Next Week
              </button>
            </div>

            {/* Birthday cards */}
            {birthdays.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: '14px' }}>
                {syncResult
                  ? 'No birthdays this week'
                  : !oauthAuthenticated
                    ? 'Authorize with ChurchSuite to get started'
                    : 'Sync with ChurchSuite to see birthdays'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {birthdays.map((entry) => (
                  <div
                    key={`${entry.source}-${entry.id}`}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '16px 20px', background: 'rgba(255,255,255,0.03)',
                      borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                  >
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>
                        {entry.firstName} {entry.lastName}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
                        {entry.dayName}, {entry.dateFormatted}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '20px', fontWeight: 600, color: 'var(--accent)' }}>
                        {entry.turningAge}
                      </span>
                      {entry.source === 'child' && (
                        <span style={{
                          fontSize: '11px', padding: '3px 8px',
                          background: 'rgba(245, 193, 86, 0.15)', borderRadius: '6px',
                          color: 'var(--warning)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}>
                          child
                        </span>
                      )}
                      {entry.source === 'contact' && (
                        <span style={{
                          fontSize: '11px', padding: '3px 8px',
                          background: 'rgba(47, 212, 194, 0.12)', borderRadius: '6px',
                          color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}>
                          contact
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--muted)', textAlign: 'center' }}>
                  {birthdays.length} birthday{birthdays.length !== 1 ? 's' : ''} this week
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
