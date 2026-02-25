/// <reference path="./env.d.ts" />
import React, { useEffect, useMemo, useState } from 'react';
import { ServiceGeneratorView } from './ServiceGeneratorView';

type AppMode = 'export' | 'serviceGen';

type SettingsState = {
  host: string;
  port: string;
  libraryFilter: string;
  includeSongTitles: boolean;
  textColor: string;
  fontFace: string;
  fontSize: string;
  titleFontSize: string;
  bold: boolean;
  italic: boolean;
  logoPath: string;
  lastPlaylistId?: string;
  // Service Generator
  enableServiceGenerator: boolean;
  worshipLibraryId: string;
  kidsLibraryId: string;
  serviceContentLibraryId: string;
  templatePlaylistId: string;
};

type PlaylistNode = {
  uuid?: string;
  name: string;
  breadcrumb: string[];
  isHeader: boolean;
  isTemplate: boolean;
  parentName?: string;
  children: PlaylistNode[];
};

type LibraryOption = {
  uuid: string;
  name: string;
};

type ConnectionState = 'idle' | 'testing' | 'connected' | 'error';
type ExportState = 'idle' | 'running' | 'complete' | 'error';

type FontStatus = {
  name: string;
  category: 'sans-serif' | 'serif' | 'display';
  installed: boolean;
  downloadUrl?: string;
};

type ProgressEntry = {
  id: string;
  playlistId: string;
  tone: 'info' | 'success' | 'warning' | 'error';
  message: string;
  detail?: string;
  timestamp: number;
};

type RendererProgressEvent = {
  playlistId: string;
  type: string;
  message?: string;
  itemName?: string;
  totalSongs?: number;
  outputPath?: string;
};

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 1025;
const DEFAULT_LIBRARY = 'Worship';
const DEFAULT_FONT = 'Red Hat Display';
const DEFAULT_FONT_SIZE = 44;
const DEFAULT_TITLE_SIZE = 54;
const DEFAULT_COLOR = '#2d6a7a';
const MAX_LOG_ITEMS = 80;

const colorWithHash = (value?: string | null): string => {
  if (!value) return DEFAULT_COLOR;
  return value.startsWith('#') ? value : `#${value}`;
};

const stripHash = (value: string): string => value.replace('#', '');

const findNodeByUuid = (nodes: PlaylistNode[], uuid: string | null): PlaylistNode | null => {
  if (!uuid) return null;
  for (const node of nodes) {
    if (node.uuid === uuid) return node;
    const child = findNodeByUuid(node.children, uuid);
    if (child) return child;
  }
  return null;
};

const removeSystemPlaylists = (nodes: PlaylistNode[]): PlaylistNode[] => {
  const filtered: PlaylistNode[] = [];
  for (const node of nodes) {
    // Skip TEMPLATE folder and instructional playlist
    if (
      node.name === 'TEMPLATE' ||
      node.name === 'TO CREATE A NEW SERVICE USE - CREATE FROM TEMPLATE'
    ) {
      continue;
    }
    // Recursively filter children
    const children = removeSystemPlaylists(node.children);
    filtered.push({ ...node, children });
  }
  return filtered;
};

const filterTree = (nodes: PlaylistNode[], query: string): PlaylistNode[] => {
  if (!query) return nodes;
  const lowered = query.toLowerCase();
  const filtered: PlaylistNode[] = [];
  for (const node of nodes) {
    const children = filterTree(node.children, query);
    if (node.name.toLowerCase().includes(lowered) || children.length > 0) {
      filtered.push({ ...node, children });
    }
  }
  return filtered;
};

const defaultExpansion = (nodes: PlaylistNode[]): Record<string, boolean> => {
  const map: Record<string, boolean> = {};
  
  const expandAll = (nodeList: PlaylistNode[]) => {
    nodeList.forEach(node => {
      const key = node.breadcrumb.join('>');
      // Expand all folders by default (including nested folders)
      map[key] = true;
      if (node.children.length > 0) {
        expandAll(node.children);
      }
    });
  };
  
  expandAll(nodes);
  return map;
};

function App(): JSX.Element {
  const [settings, setSettings] = useState<SettingsState>({
    host: DEFAULT_HOST,
    port: String(DEFAULT_PORT),
    libraryFilter: DEFAULT_LIBRARY,
    includeSongTitles: true,
    textColor: DEFAULT_COLOR,
    fontFace: DEFAULT_FONT,
    fontSize: String(DEFAULT_FONT_SIZE),
    titleFontSize: String(DEFAULT_TITLE_SIZE),
    bold: true,
    italic: true,
    logoPath: '',
    enableServiceGenerator: false,
    worshipLibraryId: '',
    kidsLibraryId: '',
    serviceContentLibraryId: '',
    templatePlaylistId: '',
  });
  const [mode, setMode] = useState<AppMode>('export');
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [playlistTree, setPlaylistTree] = useState<PlaylistNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState('Not connected');
  const [latestOutput, setLatestOutput] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [libraryOptions, setLibraryOptions] = useState<LibraryOption[]>([]);
  const [fontList, setFontList] = useState<FontStatus[]>([]);
  const [fontsLoading, setFontsLoading] = useState(false);
  const [selectedFontStatus, setSelectedFontStatus] = useState<FontStatus | null>(null);
  const [launching, setLaunching] = useState(false);

  // Auto-updater state
  const [updateAvailable, setUpdateAvailable] = useState<{ version: string } | null>(null);
  const [updateDownloading, setUpdateDownloading] = useState(false);
  const [updateDownloadPercent, setUpdateDownloadPercent] = useState(0);
  const [updateReady, setUpdateReady] = useState(false);
  const [updateDismissed, setUpdateDismissed] = useState(false);
  const [appVersion, setAppVersion] = useState('');

  useEffect(() => {
    (async () => {
      const saved = await window.api.loadSettings();
      setSettings(prev => ({
        ...prev,
        host: saved.host ?? DEFAULT_HOST,
        port: String(saved.port ?? DEFAULT_PORT),
        libraryFilter: saved.libraryFilter ?? DEFAULT_LIBRARY,
        includeSongTitles: saved.includeSongTitles ?? true,
        textColor: colorWithHash(saved.textColor ?? stripHash(prev.textColor)),
        fontFace: saved.fontFace ?? DEFAULT_FONT,
        fontSize: String(saved.fontSize ?? DEFAULT_FONT_SIZE),
        titleFontSize: String(saved.titleFontSize ?? DEFAULT_TITLE_SIZE),
        bold: typeof saved.bold === 'boolean' ? saved.bold : true,
        italic: typeof saved.italic === 'boolean' ? saved.italic : true,
        logoPath: saved.logoPath ?? '',
        lastPlaylistId: saved.lastPlaylistId,
        enableServiceGenerator: saved.enableServiceGenerator ?? false,
        worshipLibraryId: saved.worshipLibraryId ?? '',
        kidsLibraryId: saved.kidsLibraryId ?? '',
        serviceContentLibraryId: saved.serviceContentLibraryId ?? '',
        templatePlaylistId: saved.templatePlaylistId ?? '',
      }));
      if (saved.lastPlaylistId) {
        setSelectedId(saved.lastPlaylistId);
      }
    })();
  }, []);

  // Auto-updater listeners
  useEffect(() => {
    window.api.getVersion().then(v => setAppVersion(v));

    const unsubs = [
      window.api.onUpdateAvailable((info) => {
        setUpdateAvailable({ version: info.version });
      }),
      window.api.onUpdateNotAvailable(() => {
        // No update — nothing to show
      }),
      window.api.onUpdateDownloadProgress((progress) => {
        setUpdateDownloadPercent(Math.round(progress.percent));
      }),
      window.api.onUpdateDownloaded(() => {
        setUpdateDownloading(false);
        setUpdateReady(true);
      }),
      window.api.onUpdateError(() => {
        setUpdateDownloading(false);
      }),
    ];

    return () => unsubs.forEach(fn => fn());
  }, []);

  // Load font list when settings modal opens
  useEffect(() => {
    if (showSettings && fontList.length === 0) {
      loadFonts();
    }
  }, [showSettings]);

  // Update selected font status when font changes
  useEffect(() => {
    if (settings.fontFace && fontList.length > 0) {
      const found = fontList.find(f => f.name.toLowerCase() === settings.fontFace.toLowerCase());
      if (found) {
        setSelectedFontStatus(found);
      } else {
        // Check custom font
        window.api.checkFont(settings.fontFace).then(status => {
          setSelectedFontStatus(status);
        });
      }
    }
  }, [settings.fontFace, fontList]);

  async function loadFonts(): Promise<void> {
    setFontsLoading(true);
    try {
      const fonts = await window.api.listFonts();
      setFontList(fonts);
    } catch (error) {
      console.error('Failed to load fonts:', error);
    } finally {
      setFontsLoading(false);
    }
  }

  async function handleRefreshFonts(): Promise<void> {
    await loadFonts();
    // Re-check current font status
    if (settings.fontFace) {
      const status = await window.api.checkFont(settings.fontFace);
      setSelectedFontStatus(status);
    }
  }

  async function handleDownloadFont(url: string): Promise<void> {
    await window.api.downloadFont(url);
  }

  useEffect(() => {
    const unsubscribe = window.api.onExportProgress((event: RendererProgressEvent) => {
      setProgress(prev => {
        const next: ProgressEntry[] = [
          ...prev,
          {
            id: `${event.type}-${Date.now()}-${Math.random()}`,
            playlistId: event.playlistId,
            tone: mapTone(event.type),
            message: buildProgressMessage(event),
            detail: event.itemName,
            timestamp: Date.now(),
          },
        ];
        return next.slice(-MAX_LOG_ITEMS);
      });

      if (event.type === 'pptx:complete' && event.outputPath) {
        setExportState('complete');
        setLatestOutput(event.outputPath);
      } else if (event.type === 'error') {
        setExportState('error');
        setErrorMessage(event.message || 'Export failed');
      } else if (event.type === 'pptx:start') {
        setExportState('running');
      }
    });

    return () => unsubscribe();
  }, []);

  const visibleTree = useMemo(() => {
    const withoutSystem = removeSystemPlaylists(playlistTree);
    return filterTree(withoutSystem, search.trim());
  }, [playlistTree, search]);
  const selectedPlaylist = useMemo(() => findNodeByUuid(playlistTree, selectedId), [playlistTree, selectedId]);
  const librarySuggestions = useMemo(() => {
    const seen = new Set<string>();
    return libraryOptions
      .map(option => option.name?.trim())
      .filter((name): name is string => Boolean(name))
      .filter(name => {
        const lowered = name.toLowerCase();
        if (seen.has(lowered)) return false;
        seen.add(lowered);
        return true;
      })
      .sort((a, b) => a.localeCompare(b));
  }, [libraryOptions]);
  const hasLibrarySuggestions = librarySuggestions.length > 0;

  // Recursively flatten playlist tree and filter for templates
  const templatePlaylists = useMemo(() => {
    const flatten = (nodes: PlaylistNode[]): Array<{ uuid: string; name: string }> => {
      const result: Array<{ uuid: string; name: string }> = [];
      for (const node of nodes) {
        // Include if this playlist is inside a TEMPLATE folder
        if (node.uuid && !node.isHeader && node.parentName === 'TEMPLATE') {
          result.push({ uuid: node.uuid, name: node.name });
        }
        // Recursively check children
        if (node.children.length > 0) {
          result.push(...flatten(node.children));
        }
      }
      return result;
    };
    return flatten(playlistTree);
  }, [playlistTree]);

  function mapTone(type: string): ProgressEntry['tone'] {
    if (type === 'song:success' || type === 'pptx:complete') return 'success';
    if (type === 'warning' || type === 'song:skip') return 'warning';
    if (type === 'song:error' || type === 'error') return 'error';
    return 'info';
  }

  function buildProgressMessage(event: RendererProgressEvent): string {
    switch (event.type) {
      case 'info':
        return event.message || 'Working...';
      case 'warning':
        return event.message || 'Check library settings';
      case 'song:success':
        return `Captured lyrics from ${event.itemName}`;
      case 'song:error':
        return `Skipped ${event.itemName}`;
      case 'song:skip':
        return `${event.itemName} skipped (no lyrics)`;
      case 'collection:complete':
        return `Playlist ready (${event.totalSongs} songs)`;
      case 'pptx:start':
        return 'Building PowerPoint deck';
      case 'pptx:complete':
        return `Export saved to ${event.outputPath}`;
      case 'error':
        return event.message || 'Unexpected error';
      default:
        return event.message || 'Working...';
    }
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const { name, value } = event.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  }

  function handleCheckboxChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const { name, checked } = event.target;
    setSettings(prev => ({ ...prev, [name]: checked }));
  }

  function handleFontSelect(event: React.ChangeEvent<HTMLSelectElement>): void {
    const fontName = event.target.value;
    setSettings(prev => ({ ...prev, fontFace: fontName }));
  }

  // Group fonts by category for the dropdown
  const groupedFonts = useMemo(() => {
    const groups: Record<string, FontStatus[]> = {
      'sans-serif': [],
      'serif': [],
      'display': [],
    };
    fontList.forEach(font => {
      groups[font.category].push(font);
    });
    return groups;
  }, [fontList]);

  async function handleLaunchProPresenter(): Promise<void> {
    if (!window.api.launchProPresenter) return;
    setLaunching(true);
    setErrorMessage(null);
    setStatusNote('Launching ProPresenter...');
    try {
      const result = await window.api.launchProPresenter();
      if (result.success && result.ready) {
        setStatusNote('ProPresenter is running — connecting...');
        // Automatically try to connect now
        setLaunching(false);
        await handleConnect();
        return;
      }
      // Launched but API not ready yet
      if (result.launched && !result.ready) {
        setStatusNote('ProPresenter launched — waiting for API...');
        setErrorMessage(
          result.error || 'ProPresenter was launched but the API is not responding yet. Try connecting in a few seconds.',
        );
      } else {
        setErrorMessage(result.error || 'Could not launch ProPresenter');
        setStatusNote('Launch failed');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to launch ProPresenter');
      setStatusNote('Launch failed');
    } finally {
      setLaunching(false);
    }
  }

  async function handleConnect(): Promise<void> {
    const host = settings.host.trim() || DEFAULT_HOST;
    const port = Number(settings.port) || DEFAULT_PORT;
    const libraryFilter = settings.libraryFilter.trim();

    setConnectionState('testing');
    setStatusNote('Checking ProPresenter...');
    setErrorMessage(null);
    setLibraryOptions([]);

    try {
      await window.api.saveSettings({ host, port, libraryFilter: libraryFilter || null });

      // Enhanced connection with auto-launch and polling
      setStatusNote('Connecting to ProPresenter API...');
      const connectionResult = await window.api.testConnection({ host, port });

      // Check if connection was successful
      if (!connectionResult.success) {
        setConnectionState('error');
        setStatusNote('Connection failed');

        // Provide specific error messages
        let errorMsg = connectionResult.error || 'Could not connect to ProPresenter';
        if (connectionResult.needsManualLaunch) {
          errorMsg += '\n\nPlease launch ProPresenter manually and try again.';
        } else if (connectionResult.error?.includes('Network API')) {
          errorMsg = 'ProPresenter is running but Network API is disabled.\n\nPlease enable it in:\nProPresenter → Preferences → Network → Enable Network';
        }

        setErrorMessage(errorMsg);
        setLibraryOptions([]);
        return;
      }

      // Success - load playlists and libraries
      setStatusNote('Loading playlists...');
      const playlistPromise = window.api.fetchPlaylists({ host, port });
      const librariesPromise = window.api.fetchLibraries({ host, port }).catch(() => []);
      const [playlistData, discoveredLibraries] = await Promise.all([playlistPromise, librariesPromise]);

      setPlaylistTree(playlistData);
      setExpandedNodes(defaultExpansion(playlistData));
      setLibraryOptions(discoveredLibraries);

      // Only show version if we have valid data (not empty or "undefined.undefined.undefined")
      const hasVersion = connectionResult.version &&
                        connectionResult.version !== '' &&
                        !connectionResult.version.includes('undefined');
      const versionInfo = hasVersion
        ? ` (ProPresenter ${connectionResult.version})`
        : '';
      setStatusNote(`Connected to ${host}:${port}${versionInfo}`);
      setConnectionState('connected');
      setExportState('idle');

      if (settings.lastPlaylistId) {
        setSelectedId(settings.lastPlaylistId);
      }
    } catch (error: any) {
      setConnectionState('error');
      setStatusNote('Connection failed');
      setErrorMessage(error?.message || 'Could not connect to ProPresenter');
      setLibraryOptions([]);
    }
  }

  function buildStyleOverrides() {
    const overrides: Record<string, unknown> = {};
    if (settings.textColor.trim()) overrides.textColor = stripHash(settings.textColor.trim());
    if (settings.fontFace.trim()) overrides.fontFace = settings.fontFace.trim();

    const lyricSize = parseInt(settings.fontSize, 10);
    if (!Number.isNaN(lyricSize)) overrides.fontSize = lyricSize;

    const titleSize = parseInt(settings.titleFontSize, 10);
    if (!Number.isNaN(titleSize)) overrides.titleFontSize = titleSize;

    overrides.bold = settings.bold;
    overrides.italic = settings.italic;
    return overrides;
  }

  async function handleExport(): Promise<void> {
    if (!selectedPlaylist || !selectedPlaylist.uuid) {
      setErrorMessage('Select a playlist first.');
      return;
    }

    const host = settings.host.trim() || DEFAULT_HOST;
    const port = Number(settings.port) || DEFAULT_PORT;
    const libraryFilter = settings.libraryFilter.trim();

    setProgress([]);
    setExportState('running');
    setErrorMessage(null);

    try {
      const response = await window.api.startExport({
        host,
        port,
        playlistId: selectedPlaylist.uuid,
        playlistName: selectedPlaylist.breadcrumb.join(' / '),
        libraryFilter: libraryFilter || null,
        includeSongTitles: settings.includeSongTitles,
        styleOverrides: buildStyleOverrides(),
        logoPath: settings.logoPath || null,
      });

      if (response?.canceled) {
        setExportState('idle');
        setStatusNote('Export cancelled');
        return;
      }

      setStatusNote('Export complete');
    } catch (error: any) {
      setExportState('error');
      setErrorMessage(error?.message || 'Export failed');
    }
  }

  async function handleSaveSettings(): Promise<void> {
    const host = settings.host.trim() || DEFAULT_HOST;
    const port = Number(settings.port) || DEFAULT_PORT;
    const libraryFilter = settings.libraryFilter.trim();
    const payload = {
      host,
      port,
      libraryFilter: libraryFilter || null,
      includeSongTitles: settings.includeSongTitles,
      textColor: stripHash(settings.textColor.trim()),
      fontFace: settings.fontFace.trim() || DEFAULT_FONT,
      fontSize: parseInt(settings.fontSize, 10) || DEFAULT_FONT_SIZE,
      titleFontSize: parseInt(settings.titleFontSize, 10) || DEFAULT_TITLE_SIZE,
      bold: settings.bold,
      italic: settings.italic,
      logoPath: settings.logoPath || null,
      enableServiceGenerator: settings.enableServiceGenerator,
      worshipLibraryId: settings.worshipLibraryId || null,
      kidsLibraryId: settings.kidsLibraryId || null,
      serviceContentLibraryId: settings.serviceContentLibraryId || null,
      templatePlaylistId: settings.templatePlaylistId || null,
    };
    await window.api.saveSettings(payload);
    setStatusNote('Settings saved');
    setShowSettings(false);
  }

  async function handleChooseLogo(): Promise<void> {
    const result = await window.api.chooseLogo();
    if (result?.canceled || !result.filePath) return;
    const filePath = result.filePath; // Store for type narrowing
    setSettings(prev => ({ ...prev, logoPath: filePath }));
  }

  async function handleCreatePlaylistFromTemplate(playlistName: string): Promise<{ success: boolean; error?: string; playlistId?: string }> {
    if (!settings.templatePlaylistId) {
      const errorMsg = 'No template playlist selected';
      setStatusNote(errorMsg);
      return { success: false, error: errorMsg };
    }

    const host = settings.host.trim() || DEFAULT_HOST;
    const port = Number(settings.port) || DEFAULT_PORT;

    try {
      const result = await window.api.createPlaylistFromTemplate(
        { host, port },
        settings.templatePlaylistId,
        playlistName
      );

      if (!result.success) {
        const errorMsg = `Failed to create playlist: ${result.error}`;
        setStatusNote(errorMsg);
        return { success: false, error: result.error };
      }

      setStatusNote(`Playlist "${playlistName}" created successfully`);

      // Refresh playlists
      await handleConnect();

      return { success: true, playlistId: result.playlistId };
    } catch (error: any) {
      const errorMsg = error?.message || 'Failed to create playlist';
      setStatusNote(`Error: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  const isExportDisabled =
    connectionState !== 'connected' || !selectedPlaylist || exportState === 'running';

  const renderTree = (nodes: PlaylistNode[], depth = 0): JSX.Element[] => {
    return nodes.map(node => {
      const key = node.breadcrumb.join('>');
      const isLeaf = node.children.length === 0;
      const forcedExpand = Boolean(search.trim());
      const storedState = expandedNodes[key];
      const isExpanded = forcedExpand ? true : storedState ?? (depth === 0);
      const selectable = Boolean(node.uuid && !node.isHeader);
      return (
        <div key={key} className="tree-node">
          <div
            className={`tree-row ${selectable ? 'selectable' : ''} ${selectedId === node.uuid ? 'selected' : ''}`}
            style={{ paddingLeft: depth * 16 }}
            onClick={() => selectable && setSelectedId(node.uuid!)}
          >
            {isLeaf ? (
              <span className="tree-spacer" />
            ) : (
              <button
                className="tree-toggle"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setExpandedNodes(prev => ({ ...prev, [key]: !isExpanded }));
                }}
                aria-label="Toggle children"
              >
                {isExpanded ? '▾' : '▸'}
              </button>
            )}
            <span className={`tree-label ${node.isHeader ? 'header' : ''}`}>{node.name}</span>
          </div>
          {!isLeaf && isExpanded && (
            <div className="tree-children">{renderTree(node.children, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  // Service Generator mode
  if (mode === 'serviceGen') {
    const host = settings.host.trim() || DEFAULT_HOST;
    const port = Number(settings.port) || DEFAULT_PORT;

    return (
      <ServiceGeneratorView
        settings={{
          worshipLibraryId: settings.worshipLibraryId,
          kidsLibraryId: settings.kidsLibraryId,
          serviceContentLibraryId: settings.serviceContentLibraryId,
          templatePlaylistId: settings.templatePlaylistId,
        }}
        connectionConfig={{ host, port }}
        libraryOptions={libraryOptions}
        templatePlaylists={templatePlaylists}
        connectionState={connectionState}
        onSettingsChange={(updates) => setSettings(prev => ({ ...prev, ...updates }))}
        onSaveSettings={handleSaveSettings}
        onCreatePlaylist={handleCreatePlaylistFromTemplate}
        onBack={() => setMode('export')}
      />
    );
  }

  // Export mode (default)
  return (
    <div className="app-shell">
      <div className="titlebar-drag" />

      {/* Auto-update banner */}
      {updateReady && !updateDismissed && (
        <div className="update-banner update-ready">
          <span>Version {updateAvailable?.version} is ready to install.</span>
          <div className="update-actions">
            <button className="update-btn accent" onClick={() => window.api.installUpdate()}>
              Restart &amp; Update
            </button>
            <button className="update-btn dismiss" onClick={() => setUpdateDismissed(true)}>
              Later
            </button>
          </div>
        </div>
      )}
      {updateDownloading && !updateDismissed && (
        <div className="update-banner">
          <span>Downloading update… {updateDownloadPercent}%</span>
          <div className="update-progress-track">
            <div className="update-progress-bar" style={{ width: `${updateDownloadPercent}%` }} />
          </div>
        </div>
      )}
      {updateAvailable && !updateDownloading && !updateReady && !updateDismissed && (
        <div className="update-banner">
          <span>Version {updateAvailable.version} is available.</span>
          <div className="update-actions">
            <button
              className="update-btn accent"
              onClick={() => {
                setUpdateDownloading(true);
                window.api.downloadUpdate();
              }}
            >
              Download Update
            </button>
            <button className="update-btn dismiss" onClick={() => setUpdateDismissed(true)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      <header className="app-header">
        <div>
          <h1>ProPresenter Lyrics</h1>
          <p className="eyebrow">All-playlist PPTX exporter</p>
        </div>
        <div className="header-actions">
          {settings.enableServiceGenerator && (
            <button
              className="icon-button"
              type="button"
              aria-label="Service Generator"
              onClick={() => setMode('serviceGen')}
              title="Service Generator"
            >
              📖
            </button>
          )}
          <button
            className="icon-button"
            type="button"
            aria-label="Formatting settings"
            onClick={() => setShowSettings(true)}
          >
            ⚙
          </button>
          <div className={`status-pill status-${connectionState}`}>
            <span className="dot" />
            {statusNote}
          </div>
        </div>
      </header>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-heading">
            <h2>Connection</h2>
            <span className="hint">Network API must be enabled inside ProPresenter</span>
          </div>
          <div className="form-grid">
            <label>
              Host
              <input name="host" value={settings.host} onChange={handleInputChange} placeholder="127.0.0.1" />
            </label>
            <label>
              Port
              <input name="port" value={settings.port} onChange={handleInputChange} placeholder="1025" />
            </label>
            <label>
              Library filter
              <input
                name="libraryFilter"
                list={hasLibrarySuggestions ? 'library-options' : undefined}
                value={settings.libraryFilter}
                onChange={handleInputChange}
                placeholder="Worship"
              />
              {hasLibrarySuggestions && (
                <span className="hint">Choose from detected libraries or type any name.</span>
              )}
            </label>
          </div>
          <datalist id="library-options">
            {librarySuggestions.map(name => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <button className="accent" onClick={handleConnect} disabled={connectionState === 'testing'}>
            {connectionState === 'testing' ? 'Connecting…' : 'Connect & Load Playlists'}
          </button>
          {errorMessage && (
            <div className="error-block">
              <p className="error-text">{errorMessage}</p>
              {connectionState === 'error' && window.api.launchProPresenter && (
                <button
                  className="launch-btn"
                  type="button"
                  onClick={handleLaunchProPresenter}
                  disabled={launching}
                >
                  {launching ? 'Launching...' : 'Launch ProPresenter'}
                </button>
              )}
            </div>
          )}
          <p className="hint">Leave library blank to include every presentation in the playlist.</p>
          {hasLibrarySuggestions && (
            <p className="hint">Start typing to pick from {librarySuggestions.length} detected libraries.</p>
          )}
        </div>

        <div className="panel">
          <div className="panel-heading">
            <h2>Playlists</h2>
            <span className="hint">Browse by playlist folders</span>
          </div>
          <input
            className="search"
            placeholder="Search playlists"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            disabled={connectionState !== 'connected'}
          />
          <div className="tree-view">
            {visibleTree.length === 0 ? (
              <p className="empty-state">
                {connectionState === 'connected'
                  ? 'No playlists match your search.'
                  : 'Connect to ProPresenter to see playlists.'}
              </p>
            ) : (
              renderTree(visibleTree)
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <h2>Export</h2>
            <span className="hint">Single-playlist PPTX with styling + logo</span>
          </div>
          <div className="summary-card">
            <p className="label">Selected playlist</p>
            <p className="value">
              {selectedPlaylist ? selectedPlaylist.breadcrumb.join(' / ') : 'None selected'}
            </p>
          </div>
          <div className="summary-card">
            <p className="label">Library filter</p>
            <p className="value">
              {settings.libraryFilter.trim() ? settings.libraryFilter : 'All items in playlist'}
            </p>
          </div>
          <button className="primary" disabled={isExportDisabled} onClick={handleExport}>
            {exportState === 'running' ? 'Exporting…' : 'Export to PowerPoint'}
          </button>
          {latestOutput && <p className="output-note">Saved to: {latestOutput}</p>}
          <div className="log-view">
            {progress.length === 0 && <p className="empty-state">Export activity will appear here.</p>}
            {progress.map(entry => (
              <div key={entry.id} className={`log-row tone-${entry.tone}`}>
                <span>{entry.message}</span>
              </div>
            ))}
          </div>
        </div>

        {showSettings && (
          <div className="settings-overlay" role="dialog" aria-modal="true">
            <div className="settings-modal">
              <div className="modal-header">
                <div>
                  <h2>Formatting</h2>
                  <span className="hint">Customize PPTX slides</span>
                </div>
                <button className="icon-button" type="button" aria-label="Close settings" onClick={() => setShowSettings(false)}>
                  ×
                </button>
              </div>
              <label className="checkbox">
                <input
                  type="checkbox"
                  name="includeSongTitles"
                  checked={settings.includeSongTitles}
                  onChange={handleCheckboxChange}
                />
                Include song title slides
              </label>
              <div className="font-section">
                <label>
                  Font family
                  <div className="font-select-row">
                    <select
                      name="fontFace"
                      value={settings.fontFace}
                      onChange={handleFontSelect}
                      className="font-select"
                      disabled={fontsLoading}
                    >
                      {fontsLoading ? (
                        <option>Loading fonts...</option>
                      ) : (
                        <>
                          <optgroup label="Sans-Serif (Clean & Modern)">
                            {groupedFonts['sans-serif'].map(font => (
                              <option key={font.name} value={font.name}>
                                {font.name} {font.installed ? '✓' : '○'}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Serif (Traditional)">
                            {groupedFonts['serif'].map(font => (
                              <option key={font.name} value={font.name}>
                                {font.name} {font.installed ? '✓' : '○'}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Display (Bold Headlines)">
                            {groupedFonts['display'].map(font => (
                              <option key={font.name} value={font.name}>
                                {font.name} {font.installed ? '✓' : '○'}
                              </option>
                            ))}
                          </optgroup>
                        </>
                      )}
                    </select>
                    <button
                      className="icon-button small"
                      type="button"
                      onClick={handleRefreshFonts}
                      disabled={fontsLoading}
                      title="Refresh font list"
                    >
                      ↻
                    </button>
                  </div>
                </label>
                {selectedFontStatus && (
                  <div className={`font-status ${selectedFontStatus.installed ? 'installed' : 'missing'}`}>
                    <span className="font-status-icon">{selectedFontStatus.installed ? '✓' : '!'}</span>
                    <span className="font-status-text">
                      {selectedFontStatus.installed
                        ? `${selectedFontStatus.name} is installed`
                        : `${selectedFontStatus.name} is not installed`}
                    </span>
                    {!selectedFontStatus.installed && selectedFontStatus.downloadUrl && (
                      <button
                        className="ghost small"
                        type="button"
                        onClick={() => handleDownloadFont(selectedFontStatus.downloadUrl!)}
                      >
                        Download
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="form-grid">
                <label>
                  Lyric font size
                  <input name="fontSize" value={settings.fontSize} onChange={handleInputChange} />
                </label>
                <label>
                  Title font size
                  <input name="titleFontSize" value={settings.titleFontSize} onChange={handleInputChange} />
                </label>
              </div>
              <div className="style-row">
                <label className="color-field">
                  Text color
                  <input type="color" name="textColor" value={settings.textColor} onChange={handleInputChange} />
                </label>
                <label className="checkbox inline">
                  <input type="checkbox" name="bold" checked={settings.bold} onChange={handleCheckboxChange} />
                  Bold
                </label>
                <label className="checkbox inline">
                  <input type="checkbox" name="italic" checked={settings.italic} onChange={handleCheckboxChange} />
                  Italic
                </label>
              </div>
              <div className="logo-row">
                <div>
                  <p className="label">Logo</p>
                  <p className="value">
                    {settings.logoPath ? settings.logoPath : 'Using default logo search (logo.png)'}
                  </p>
                </div>
                <div className="logo-actions">
                  <button className="ghost" onClick={handleChooseLogo} type="button">
                    Choose
                  </button>
                  <button
                    className="ghost"
                    type="button"
                    onClick={() => setSettings(prev => ({ ...prev, logoPath: '' }))}
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="settings-section">
                <h3>Advanced Features</h3>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    name="enableServiceGenerator"
                    checked={settings.enableServiceGenerator}
                    onChange={handleCheckboxChange}
                  />
                  Enable Service Generator
                </label>
                <span className="hint">Automated service playlist creation from PDF service orders</span>
              </div>

              <div className="settings-section">
                <h3>About</h3>
                <div className="about-row">
                  <span className="muted">Version {appVersion || '...'}</span>
                  <button
                    className="ghost small"
                    type="button"
                    onClick={async () => {
                      const result = await window.api.checkForUpdates();
                      if (result.success && result.version) {
                        setUpdateAvailable({ version: result.version });
                        setUpdateDismissed(false);
                      } else if (result.success) {
                        setErrorMessage(null);
                        setStatusNote('You are on the latest version');
                        setTimeout(() => setStatusNote(connectionState === 'connected' ? 'Connected' : 'Not connected'), 3000);
                      }
                    }}
                  >
                    Check for Updates
                  </button>
                </div>
              </div>

              <div className="modal-footer">
                <button className="accent" onClick={handleSaveSettings} type="button">
                  Save defaults
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default App;
