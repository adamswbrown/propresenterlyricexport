/// <reference path="./env.d.ts" />
import { useState, useEffect, useCallback } from 'react';

type BirthdayBucketViewProps = {
  churchSuiteConfig: {
    account: string;
    apiKey: string;
    appName: string;
  };
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
  const [weekOffset, setWeekOffset] = useState(0);
  const [birthdays, setBirthdays] = useState<BirthdayEntry[]>([]);
  const [weekRange, setWeekRange] = useState<{ start: string; end: string } | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  // Local config state for inputs
  const [account, setAccount] = useState(props.churchSuiteConfig.account);
  const [apiKey, setApiKey] = useState(props.churchSuiteConfig.apiKey);
  const [appName, setAppName] = useState(props.churchSuiteConfig.appName || 'birthday-bucket');

  // Auto-dismiss notifications
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 5000);
    return () => clearTimeout(timer);
  }, [notification]);

  // Load birthdays when weekOffset changes (if synced)
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

  const handleSync = async () => {
    if (!account || !apiKey) {
      setNotification({ message: 'Please enter account and API key', type: 'error' });
      return;
    }

    setIsSyncing(true);
    setNotification({ message: 'Syncing with ChurchSuite...', type: 'info' });

    // Persist config
    props.onConfigChange({
      churchSuiteAccount: account,
      churchSuiteApiKey: apiKey,
      churchSuiteAppName: appName,
    });

    try {
      const result = await window.api.churchSuiteSync({ account, apiKey, appName });

      if (result.success) {
        setSyncResult({
          contacts: result.contacts,
          children: result.children,
          syncedAt: result.syncedAt,
        });
        setNotification({
          message: `Synced ${result.contacts} contacts and ${result.children} children`,
          type: 'success',
        });
        // Reload birthdays
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
          <div style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            color: 'var(--success)',
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--success)',
              display: 'inline-block',
            }} />
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
        {/* Sidebar - Connection & Export */}
        <aside className="service-sidebar" style={{ gap: '24px' }}>
          {/* Connection Panel */}
          <div style={{
            background: 'var(--panel)',
            border: '1px solid var(--panel-border)',
            borderRadius: '18px',
            padding: '24px',
          }}>
            <h3 style={{
              margin: '0 0 4px',
              fontSize: '14px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--text)',
            }}>Connection</h3>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--muted)' }}>
              ChurchSuite API credentials
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
                  Account
                </label>
                <input
                  type="text"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  placeholder="gracechurch"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: 'var(--text)',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
                  API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="your-api-key"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: 'var(--text)',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
                  App Name
                </label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="birthday-bucket"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: 'var(--text)',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>

              <button
                className="primary"
                onClick={handleSync}
                disabled={isSyncing}
                type="button"
                style={{ width: '100%', marginTop: '4px' }}
              >
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </button>
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
          <div style={{
            background: 'var(--panel)',
            border: '1px solid var(--panel-border)',
            borderRadius: '18px',
            padding: '24px',
          }}>
            <h3 style={{
              margin: '0 0 4px',
              fontSize: '14px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--text)',
            }}>Export</h3>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--muted)' }}>
              Generate PowerPoint for service display
            </p>

            <button
              className="accent"
              onClick={handleExport}
              disabled={isExporting || birthdays.length === 0}
              type="button"
              style={{ width: '100%' }}
            >
              {isExporting ? 'Exporting...' : 'Export PPTX'}
            </button>

            <button
              className="ghost"
              onClick={() => window.api.churchSuiteOpenOutput()}
              type="button"
              style={{ width: '100%', marginTop: '8px', fontSize: '12px' }}
            >
              Open Output Folder
            </button>
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
            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '24px',
            }}>
              <button
                className={weekOffset === 0 ? 'primary' : 'ghost'}
                onClick={() => setWeekOffset(0)}
                type="button"
                style={{ flex: 1 }}
              >
                This Week
              </button>
              <button
                className={weekOffset === 1 ? 'primary' : 'ghost'}
                onClick={() => setWeekOffset(1)}
                type="button"
                style={{ flex: 1 }}
              >
                Next Week
              </button>
            </div>

            {/* Birthday cards */}
            {birthdays.length === 0 ? (
              <div style={{
                padding: '60px 20px',
                textAlign: 'center',
                color: 'var(--muted)',
                fontSize: '14px',
              }}>
                {syncResult
                  ? 'No birthdays this week'
                  : 'Sync with ChurchSuite to see birthdays'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {birthdays.map((entry) => (
                  <div
                    key={`${entry.source}-${entry.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 20px',
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.06)',
                      transition: 'background 0.15s',
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
                      <span style={{
                        fontSize: '20px',
                        fontWeight: 600,
                        color: 'var(--accent)',
                      }}>
                        {entry.turningAge}
                      </span>
                      {entry.source === 'child' && (
                        <span style={{
                          fontSize: '11px',
                          padding: '3px 8px',
                          background: 'rgba(245, 193, 86, 0.15)',
                          borderRadius: '6px',
                          color: 'var(--warning)',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}>
                          child
                        </span>
                      )}
                      {entry.source === 'contact' && (
                        <span style={{
                          fontSize: '11px',
                          padding: '3px 8px',
                          background: 'rgba(47, 212, 194, 0.12)',
                          borderRadius: '6px',
                          color: 'var(--accent)',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}>
                          contact
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                <div style={{
                  marginTop: '8px',
                  fontSize: '13px',
                  color: 'var(--muted)',
                  textAlign: 'center',
                }}>
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
