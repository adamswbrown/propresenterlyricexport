import { useState, useEffect, useCallback } from 'react'

interface BirthdayEntry {
  id: number
  firstName: string
  lastName: string
  dateOfBirth: string
  source: 'contact' | 'child'
  dayName: string
  dateFormatted: string
  turningAge: number
  daysUntil: number
}

interface WeekRange {
  start: string
  end: string
}

type NotificationType = 'success' | 'error' | 'info'

export default function App() {
  const [account, setAccount] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [appName, setAppName] = useState('birthday-bucket')

  const [syncing, setSyncing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [contactCount, setContactCount] = useState(0)
  const [childCount, setChildCount] = useState(0)

  const [weekOffset, setWeekOffset] = useState(0)
  const [birthdays, setBirthdays] = useState<BirthdayEntry[]>([])
  const [weekRange, setWeekRange] = useState<WeekRange | null>(null)

  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null)
  const [exportPath, setExportPath] = useState<string | null>(null)

  // Show notification with auto-dismiss
  const notify = useCallback((message: string, type: NotificationType) => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 5000)
  }, [])

  // Load settings on mount
  useEffect(() => {
    window.api.getSettings().then((settings) => {
      setAccount(settings.account || '')
      setApiKey(settings.apiKey || '')
      setAppName(settings.appName || 'birthday-bucket')
      setLastSync(settings.lastSync)
      if (settings.cachedData) {
        setContactCount(settings.cachedData.contacts.length)
        setChildCount(settings.cachedData.children.length)
      }
    })
  }, [])

  // Load birthdays when week offset changes or after sync
  const loadBirthdays = useCallback(async () => {
    try {
      const result = await window.api.getBirthdays(weekOffset)
      setBirthdays(result.entries)
      setWeekRange(result.range)
    } catch {
      // No data yet
      setBirthdays([])
    }
  }, [weekOffset])

  useEffect(() => {
    loadBirthdays()
  }, [loadBirthdays])

  // Sync handler
  const handleSync = async () => {
    if (!account || !apiKey) {
      notify('Please enter your account and API key', 'error')
      return
    }

    setSyncing(true)
    try {
      const result = await window.api.sync({ account, apiKey, appName })
      setContactCount(result.contacts.length)
      setChildCount(result.children.length)
      setLastSync(result.syncedAt)
      notify(`Synced ${result.contacts.length} contacts and ${result.children.length} children`, 'success')
      loadBirthdays()
    } catch (err) {
      notify(`Sync failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error')
    } finally {
      setSyncing(false)
    }
  }

  // Export handler
  const handleExport = async () => {
    setExporting(true)
    try {
      const path = await window.api.exportPptx(weekOffset)
      setExportPath(path)
      notify('PPTX exported successfully', 'success')
    } catch (err) {
      notify(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error')
    } finally {
      setExporting(false)
    }
  }

  // Format last sync time
  const formatLastSync = (iso: string | null): string => {
    if (!iso) return 'Never'
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  const hasSyncedData = contactCount > 0 || childCount > 0

  return (
    <>
      <div className="titlebar-drag" />
      <div className="app-shell">
        {/* Header */}
        <div className="app-header">
          <div>
            <h1>Birthday Bucket</h1>
            <p className="eyebrow">ChurchSuite Birthday Manager</p>
          </div>
          <div className="header-actions">
            <div className={`status-pill ${hasSyncedData ? 'status-synced' : ''}`}>
              <span className="dot" />
              {hasSyncedData ? 'Synced' : 'Not synced'}
            </div>
          </div>
        </div>

        {/* Notification */}
        {notification && (
          <div className={`notification notification-${notification.type}`}>
            {notification.message}
          </div>
        )}

        {/* Content Grid */}
        <div className="content-grid">
          {/* Left Column */}
          <div className="left-column">
            {/* Connection Panel */}
            <div className="panel">
              <div className="panel-heading">
                <h2>Connection</h2>
                <span className="hint">ChurchSuite API credentials</span>
              </div>

              <label>
                Account
                <input
                  type="text"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  placeholder="your-subdomain"
                  disabled={syncing}
                />
              </label>

              <label>
                API Key
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="your-api-key"
                  disabled={syncing}
                />
              </label>

              <label>
                App Name
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="birthday-bucket"
                  disabled={syncing}
                />
              </label>

              <button className="primary" onClick={handleSync} disabled={syncing || !account || !apiKey}>
                {syncing ? <><span className="spinner" /> Syncing...</> : 'Sync Now'}
              </button>

              {hasSyncedData && (
                <div className="sync-stats">
                  <div className="stat-row">
                    <span className="stat-dot" />
                    <span>{contactCount} contacts</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-dot" />
                    <span>{childCount} children</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Last sync: {formatLastSync(lastSync)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Export Panel */}
            <div className="panel">
              <div className="panel-heading">
                <h2>Export</h2>
                <span className="hint">Generate PowerPoint for service display</span>
              </div>

              <button
                className="accent"
                onClick={handleExport}
                disabled={exporting || !hasSyncedData}
              >
                {exporting ? <><span className="spinner" /> Exporting...</> : 'Export PPTX'}
              </button>

              {exportPath && (
                <div className="output-path" onClick={() => window.api.openOutput()}>
                  {exportPath}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Birthday List */}
          <div className="panel">
            <div className="panel-heading">
              <h2>Birthdays</h2>
              {weekRange && (
                <span className="hint">{weekRange.start} — {weekRange.end}</span>
              )}
            </div>

            <div className="week-toggle">
              <button
                className={weekOffset === 0 ? 'active' : ''}
                onClick={() => setWeekOffset(0)}
              >
                This Week
              </button>
              <button
                className={weekOffset === 1 ? 'active' : ''}
                onClick={() => setWeekOffset(1)}
              >
                Next Week
              </button>
            </div>

            {birthdays.length > 0 ? (
              <>
                <div className="birthday-list">
                  {birthdays.map((b) => (
                    <div key={`${b.source}-${b.id}`} className="birthday-card">
                      <div className="birthday-info">
                        <span className="birthday-name">{b.firstName} {b.lastName}</span>
                        <span className="birthday-date">{b.dayName}, {b.dateFormatted}</span>
                      </div>
                      <div className="birthday-meta">
                        <span className="birthday-age">{b.turningAge}</span>
                        <span className={`badge badge-${b.source}`}>{b.source}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="summary-text">
                  {birthdays.length} birthday{birthdays.length !== 1 ? 's' : ''} {weekOffset === 0 ? 'this' : 'next'} week
                </p>
              </>
            ) : (
              <p className="empty-state">
                {hasSyncedData
                  ? `No birthdays ${weekOffset === 0 ? 'this' : 'next'} week`
                  : 'Sync your ChurchSuite data to see birthdays'
                }
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
