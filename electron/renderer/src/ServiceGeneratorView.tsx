import { useState, useEffect } from 'react';
import { PlaylistAuditChecklist } from './PlaylistAuditChecklist';

// Stage Audit Types (matching preload types)
type StageLayoutType = 'lyrics' | 'scripture' | 'video' | 'sermon' | 'service_content' | 'blank' | 'custom' | 'unknown';
type ContentType = 'song' | 'scripture' | 'sermon' | 'video' | 'announcements' | 'prayer' | 'service_element' | 'header' | 'unknown';
type VerificationStatus = 'verified' | 'unverified' | 'needs_setup' | 'not_applicable';

type PlaylistAuditItem = {
  playlistItemUuid: string;
  playlistItemName: string;
  presentationUuid: string | null;
  presentationName: string;
  contentType: ContentType;
  isHeader: boolean;
  status: VerificationStatus;
  expectedLayout: StageLayoutType;
  needsAttention: boolean;
  recommendation: string;
};

type PlaylistAuditSummary = {
  total: number;
  verified: number;
  unverified: number;
  needsSetup: number;
  notApplicable: number;
  headers: number;
  byContentType: Record<ContentType, { total: number; verified: number }>;
};

type PlaylistAuditReport = {
  playlistId: string;
  playlistName: string;
  generatedAt: string;
  summary: PlaylistAuditSummary;
  items: PlaylistAuditItem[];
  actionRequired: PlaylistAuditItem[];
  readinessScore: number;
};

type ServiceGeneratorViewProps = {
  settings: {
    worshipLibraryId: string;
    kidsLibraryId: string;
    serviceContentLibraryId: string;
    templatePlaylistId: string;
  };
  libraryOptions: Array<{ uuid: string; name: string }>;
  templatePlaylists: Array<{ uuid: string; name: string }>;
  connectionState: 'idle' | 'testing' | 'connecting' | 'connected' | 'error';
  onSettingsChange: (updates: Partial<ServiceGeneratorViewProps['settings']>) => void;
  onSaveSettings: () => void;
  onCreatePlaylist: (playlistName: string) => Promise<{ success: boolean; error?: string }>;
  onBack: () => void;
};

type Notification = {
  message: string;
  type: 'success' | 'error' | 'info';
};

type Step = 'setup' | 'upload' | 'parse' | 'match' | 'verse' | 'build' | 'stage';

const STEPS: { id: Step; label: string }[] = [
  { id: 'setup', label: 'Setup' },
  { id: 'upload', label: 'Upload PDF' },
  { id: 'parse', label: 'Parse' },
  { id: 'match', label: 'Match Songs' },
  { id: 'verse', label: 'Verses' },
  { id: 'build', label: 'Build' },
  { id: 'stage', label: 'Stage Check' },
];

type PraiseSlot = 'praise1' | 'praise2' | 'praise3' | 'kids';

type ParsedItem = {
  type: 'song' | 'kids_video' | 'verse' | 'heading';
  text: string;
  reference?: string;
  isKidsVideo?: boolean;
  praiseSlot?: PraiseSlot;
};

// Helper to format praise slot for display
function formatPraiseSlot(slot?: PraiseSlot): string {
  switch (slot) {
    case 'praise1': return 'Praise 1';
    case 'praise2': return 'Praise 2';
    case 'praise3': return 'Praise 3';
    case 'kids': return 'Kids';
    default: return '';
  }
}

type MatchResult = {
  songName: string;
  matches: Array<{ uuid: string; name: string; confidence: number }>;
  selectedMatch?: { uuid: string; name: string };
};

type VerseResult = {
  reference: string;
  text: string;
  error?: string;
};

export function ServiceGeneratorView(props: ServiceGeneratorViewProps) {
  const [currentStep, setCurrentStep] = useState<Step>('setup');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('');
  const [selectedPlaylistName, setSelectedPlaylistName] = useState<string>('');

  // Workflow state
  const [pdfPath, setPdfPath] = useState<string>('');
  const [pdfName, setPdfName] = useState<string>('');
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [verseResults, setVerseResults] = useState<VerseResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Stage audit state
  const [auditReport, setAuditReport] = useState<PlaylistAuditReport | null>(null);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // Auto-dismiss notification after 4 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Load audit report when entering stage step
  async function loadAuditReport() {
    if (!selectedPlaylistId || !selectedPlaylistName) {
      setNotification({ message: 'No playlist selected', type: 'error' });
      return;
    }

    setIsLoadingAudit(true);
    try {
      // Build mock playlist items from parsed items for demo
      // In production, this would fetch actual playlist items from ProPresenter
      const playlistItems = parsedItems.map((item, index) => ({
        id: {
          uuid: `item-${index}`,
          name: item.text,
          index,
        },
        type: item.type === 'heading' ? 'header' : 'presentation',
        is_hidden: false,
        is_pco: false,
        presentation_info: {
          presentation_uuid: matchResults.find(m => m.songName === item.text)?.selectedMatch?.uuid || `pres-${index}`,
          arrangement_name: '',
          arrangement_uuid: '',
        },
        destination: 'presentation',
      }));

      const result = await window.api.getStageAuditReport(
        selectedPlaylistId,
        selectedPlaylistName,
        playlistItems
      );

      if (result.success && result.report) {
        setAuditReport(result.report);
      } else {
        setNotification({
          message: result.error || 'Failed to load audit report',
          type: 'error',
        });
      }
    } catch (error: any) {
      setNotification({
        message: error?.message || 'Error loading audit report',
        type: 'error',
      });
    } finally {
      setIsLoadingAudit(false);
    }
  }

  async function handleMarkVerified(
    presentationUuid: string,
    layoutType: StageLayoutType,
    contentType: ContentType
  ) {
    const item = auditReport?.items.find(i => i.presentationUuid === presentationUuid);
    const presentationName = item?.presentationName || 'Unknown';

    const result = await window.api.markStageVerified(
      presentationUuid,
      presentationName,
      layoutType,
      contentType
    );

    if (result.success) {
      setNotification({ message: `Marked "${presentationName}" as verified`, type: 'success' });
      // Reload audit report to reflect changes
      await loadAuditReport();
    } else {
      setNotification({ message: result.error || 'Failed to mark as verified', type: 'error' });
    }
  }

  async function handleMarkNeedsSetup(
    presentationUuid: string,
    layoutType: StageLayoutType,
    contentType: ContentType
  ) {
    const item = auditReport?.items.find(i => i.presentationUuid === presentationUuid);
    const presentationName = item?.presentationName || 'Unknown';

    const result = await window.api.markStageNeedsSetup(
      presentationUuid,
      presentationName,
      layoutType,
      contentType
    );

    if (result.success) {
      setNotification({ message: `Marked "${presentationName}" as needs setup`, type: 'success' });
      await loadAuditReport();
    } else {
      setNotification({ message: result.error || 'Failed to mark as needs setup', type: 'error' });
    }
  }

  async function handleMarkNotApplicable(
    presentationUuid: string,
    contentType: ContentType
  ) {
    const item = auditReport?.items.find(i => i.presentationUuid === presentationUuid);
    const presentationName = item?.presentationName || 'Unknown';

    const result = await window.api.markStageNotApplicable(
      presentationUuid,
      presentationName,
      contentType
    );

    if (result.success) {
      setNotification({ message: `Marked "${presentationName}" as N/A`, type: 'success' });
      await loadAuditReport();
    } else {
      setNotification({ message: result.error || 'Failed to mark as N/A', type: 'error' });
    }
  }

  function renderStepContent() {
    switch (currentStep) {
      case 'setup':
        return (
          <div className="service-step-content">
            <h2>Configuration</h2>
            <p className="hint">Configure libraries and template for automated service generation</p>

            <div className="form-grid">
              <label>
                Worship Library
                <select
                  name="worshipLibraryId"
                  value={props.settings.worshipLibraryId}
                  onChange={(e) => props.onSettingsChange({ worshipLibraryId: e.target.value })}
                >
                  <option value="">-- Select Library --</option>
                  {props.libraryOptions.map(lib => (
                    <option key={lib.uuid} value={lib.uuid}>
                      {lib.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Kids Songs Library
                <select
                  name="kidsLibraryId"
                  value={props.settings.kidsLibraryId}
                  onChange={(e) => props.onSettingsChange({ kidsLibraryId: e.target.value })}
                >
                  <option value="">-- Select Library --</option>
                  {props.libraryOptions.map(lib => (
                    <option key={lib.uuid} value={lib.uuid}>
                      {lib.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Service Content Library
                <select
                  name="serviceContentLibraryId"
                  value={props.settings.serviceContentLibraryId}
                  onChange={(e) => props.onSettingsChange({ serviceContentLibraryId: e.target.value })}
                >
                  <option value="">-- Select Library --</option>
                  {props.libraryOptions.map(lib => (
                    <option key={lib.uuid} value={lib.uuid}>
                      {lib.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Template Playlist
                <select
                  name="templatePlaylistId"
                  value={props.settings.templatePlaylistId}
                  onChange={(e) => props.onSettingsChange({ templatePlaylistId: e.target.value })}
                >
                  <option value="">-- Select Playlist --</option>
                  {props.templatePlaylists.map(playlist => (
                    <option key={playlist.uuid} value={playlist.uuid}>
                      {playlist.name}
                    </option>
                  ))}
                </select>
                {props.templatePlaylists.length === 0 && props.connectionState === 'connected' && (
                  <span className="hint">No templates found. Create a folder named "TEMPLATE" and add playlists inside it.</span>
                )}
              </label>
            </div>

            {/* Selected Working Playlist */}
            {selectedPlaylistName && (
              <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(47, 212, 194, 0.1)', borderRadius: '12px', border: '1px solid rgba(47, 212, 194, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '20px' }}>✓</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: '4px' }}>Selected Playlist</div>
                    <div style={{ fontSize: '14px', color: 'var(--text)' }}>{selectedPlaylistName}</div>
                  </div>
                  <button
                    className="ghost small"
                    onClick={() => {
                      setSelectedPlaylistName('');
                      setSelectedPlaylistId('');
                    }}
                    type="button"
                  >
                    Change
                  </button>
                </div>
              </div>
            )}

            <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
              <button className="accent" onClick={props.onSaveSettings} type="button">
                Save Configuration
              </button>
              <button
                className="primary"
                onClick={() => setShowCreatePlaylist(true)}
                type="button"
                disabled={!props.settings.templatePlaylistId}
              >
                Create Playlist from Template
              </button>
            </div>

            {/* Create Playlist Inline Form */}
            {showCreatePlaylist && (
              <div style={{ marginTop: '24px', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: '1px solid var(--panel-border)' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '18px' }}>Create Playlist from Template</h3>
                <label>
                  Playlist Name
                  <input
                    type="text"
                    placeholder="e.g., St Andrews - Feb 10th"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                  />
                </label>
                <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
                  <button
                    className="ghost"
                    onClick={() => {
                      setShowCreatePlaylist(false);
                      setNewPlaylistName('');
                    }}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="primary"
                    onClick={async () => {
                      if (newPlaylistName.trim()) {
                        const playlistName = newPlaylistName.trim();
                        setIsCreating(true);
                        setNotification({ message: 'Creating playlist...', type: 'info' });
                        try {
                          const result = await props.onCreatePlaylist(playlistName);
                          if (result.success) {
                            // Auto-select the newly created playlist
                            setSelectedPlaylistName(playlistName);
                            setNotification({
                              message: `Playlist "${playlistName}" created and selected`,
                              type: 'success'
                            });
                            setNewPlaylistName('');
                            setShowCreatePlaylist(false);
                          } else {
                            setNotification({
                              message: result.error || 'Failed to create playlist',
                              type: 'error'
                            });
                          }
                        } catch (error: any) {
                          setNotification({
                            message: error?.message || 'Error creating playlist',
                            type: 'error'
                          });
                        } finally {
                          setIsCreating(false);
                        }
                      }
                    }}
                    type="button"
                    disabled={!newPlaylistName.trim() || isCreating}
                  >
                    {isCreating ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      case 'upload':
        return (
          <div className="service-step-content">
            <h2>Upload PDF</h2>
            <p className="hint">Upload your service order PDF for parsing</p>
            {!selectedPlaylistName ? (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📋</div>
                <h3 style={{ margin: '0 0 8px', color: 'var(--muted)' }}>No Playlist Selected</h3>
                <p style={{ margin: 0, color: 'var(--muted)', fontSize: '14px' }}>
                  Go back to Setup and create or select a working playlist first
                </p>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'rgba(47, 212, 194, 0.1)', borderRadius: '10px', border: '1px solid rgba(47, 212, 194, 0.3)' }}>
                  <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' }}>Working Playlist</div>
                  <div style={{ fontWeight: 600, color: 'var(--accent)' }}>{selectedPlaylistName}</div>
                </div>

                {!pdfPath ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
                    <h3 style={{ margin: '0 0 12px' }}>Select Service Order PDF</h3>
                    <p style={{ margin: '0 0 24px', color: 'var(--muted)', fontSize: '14px' }}>
                      Choose your PDF file to extract songs and verses
                    </p>
                    <button
                      className="primary"
                      onClick={async () => {
                        setIsProcessing(true);
                        try {
                          const result = await window.api.choosePDF();
                          if (!result.canceled && result.filePath) {
                            setPdfPath(result.filePath);
                            setPdfName(result.filePath.split('/').pop() || 'service-order.pdf');
                            setNotification({ message: 'PDF selected, parsing...', type: 'info' });

                            // Auto-parse the PDF
                            const parseResult = await window.api.parsePDF(result.filePath);
                            if (parseResult.success) {
                              setParsedItems(parseResult.items);
                              setNotification({
                                message: `Found ${parseResult.items.length} items in PDF`,
                                type: 'success'
                              });
                              setCurrentStep('parse');
                            } else {
                              setNotification({
                                message: parseResult.error || 'Failed to parse PDF',
                                type: 'error'
                              });
                            }
                          }
                        } catch (error: any) {
                          setNotification({
                            message: error?.message || 'Error selecting PDF',
                            type: 'error'
                          });
                        } finally {
                          setIsProcessing(false);
                        }
                      }}
                      disabled={isProcessing}
                      type="button"
                    >
                      {isProcessing ? 'Processing...' : 'Select PDF File'}
                    </button>
                  </div>
                ) : (
                  <div style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <span style={{ fontSize: '24px' }}>✓</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, marginBottom: '4px' }}>{pdfName}</div>
                        <div style={{ fontSize: '13px', color: 'var(--muted)' }}>{parsedItems.length} items parsed</div>
                      </div>
                      <button
                        className="ghost small"
                        onClick={() => {
                          setPdfPath('');
                          setPdfName('');
                          setParsedItems([]);
                          setMatchResults([]);
                          setVerseResults([]);
                        }}
                        type="button"
                      >
                        Clear
                      </button>
                    </div>
                    <button
                      className="primary"
                      onClick={() => setCurrentStep('parse')}
                      type="button"
                    >
                      Review Parsed Items →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'parse':
        return (
          <div className="service-step-content">
            <h2>Parse Service Order</h2>
            <p className="hint">Review extracted songs and verses</p>
            {selectedPlaylistName && (
              <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'rgba(47, 212, 194, 0.1)', borderRadius: '10px', border: '1px solid rgba(47, 212, 194, 0.3)' }}>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' }}>Working Playlist</div>
                <div style={{ fontWeight: 600, color: 'var(--accent)' }}>{selectedPlaylistName}</div>
              </div>
            )}

            {parsedItems.length === 0 ? (
              <div className="empty-state" style={{ padding: '60px 20px' }}>
                No items parsed yet. Go back to Upload to select a PDF.
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', fontSize: '14px' }}>
                  <strong>{parsedItems.length} items found:</strong>{' '}
                  {parsedItems.filter(i => i.type === 'song').length} songs,{' '}
                  {parsedItems.filter(i => i.type === 'kids_video').length} kids videos,{' '}
                  {parsedItems.filter(i => i.type === 'verse').length} verses
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                  {parsedItems.map((item, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '12px 16px',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '10px',
                        border: '1px solid var(--panel-border)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                    >
                      <span style={{ fontSize: '18px' }}>
                        {item.type === 'song' ? '🎵' : item.type === 'kids_video' ? '🎬' : item.type === 'verse' ? '📖' : '📋'}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{item.type === 'kids_video' ? 'Kids Video' : item.type === 'verse' ? 'Verse' : 'Song'}</span>
                          {item.praiseSlot && (
                            <span style={{
                              padding: '2px 8px',
                              background: item.praiseSlot === 'kids' ? 'rgba(255, 193, 7, 0.2)' : 'rgba(47, 212, 194, 0.2)',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              color: item.praiseSlot === 'kids' ? '#ffc107' : 'var(--accent)'
                            }}>
                              {formatPraiseSlot(item.praiseSlot)}
                            </span>
                          )}
                        </div>
                        <div style={{ fontWeight: 500 }}>{item.text}</div>
                        {item.reference && (
                          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                            {item.reference}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    className="ghost"
                    onClick={() => setCurrentStep('upload')}
                    type="button"
                  >
                    ← Back
                  </button>
                  <button
                    className="primary"
                    onClick={async () => {
                      setIsProcessing(true);
                      setCurrentStep('match');

                      // Auto-start matching (includes both regular songs and kids videos)
                      try {
                        const songs = parsedItems
                          .filter(item => item.type === 'song' || item.type === 'kids_video')
                          .map(item => item.text);

                        if (songs.length > 0) {
                          setNotification({ message: `Matching ${songs.length} items...`, type: 'info' });

                          const libraryIds = [
                            props.settings.worshipLibraryId,
                            props.settings.kidsLibraryId
                          ].filter(Boolean);

                          const result = await window.api.matchSongs(songs, {
                            host: '192.168.68.58', // TODO: get from settings
                            port: 61166
                          }, libraryIds);

                          if (result.success) {
                            setMatchResults(result.results);
                            setNotification({
                              message: `Matched ${result.results.length} songs`,
                              type: 'success'
                            });
                          } else {
                            setNotification({
                              message: result.error || 'Failed to match songs',
                              type: 'error'
                            });
                          }
                        }
                      } catch (error: any) {
                        setNotification({
                          message: error?.message || 'Error matching songs',
                          type: 'error'
                        });
                      } finally {
                        setIsProcessing(false);
                      }
                    }}
                    disabled={isProcessing}
                    type="button"
                  >
                    {isProcessing ? 'Processing...' : 'Continue to Matching →'}
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      case 'match':
        return (
          <div className="service-step-content">
            <h2>Match Songs</h2>
            <p className="hint">Match parsed songs to your ProPresenter libraries</p>
            {selectedPlaylistName && (
              <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'rgba(47, 212, 194, 0.1)', borderRadius: '10px', border: '1px solid rgba(47, 212, 194, 0.3)' }}>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' }}>Working Playlist</div>
                <div style={{ fontWeight: 600, color: 'var(--accent)' }}>{selectedPlaylistName}</div>
              </div>
            )}
            <div className="empty-state" style={{ padding: '60px 20px' }}>
              Song matching interface coming soon...
            </div>
          </div>
        );

      case 'verse':
        return (
          <div className="service-step-content">
            <h2>Fetch Verses</h2>
            <p className="hint">Retrieve Bible verses from API</p>
            {selectedPlaylistName && (
              <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'rgba(47, 212, 194, 0.1)', borderRadius: '10px', border: '1px solid rgba(47, 212, 194, 0.3)' }}>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' }}>Working Playlist</div>
                <div style={{ fontWeight: 600, color: 'var(--accent)' }}>{selectedPlaylistName}</div>
              </div>
            )}
            <div className="empty-state" style={{ padding: '60px 20px' }}>
              Verse fetching interface coming soon...
            </div>
          </div>
        );

      case 'build':
        return (
          <div className="service-step-content">
            <h2>Build Playlist</h2>
            <p className="hint">Review and finalize your service playlist</p>
            {selectedPlaylistName && (
              <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'rgba(47, 212, 194, 0.1)', borderRadius: '10px', border: '1px solid rgba(47, 212, 194, 0.3)' }}>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' }}>Working Playlist</div>
                <div style={{ fontWeight: 600, color: 'var(--accent)' }}>{selectedPlaylistName}</div>
              </div>
            )}
            <div className="empty-state" style={{ padding: '60px 20px' }}>
              Playlist building interface coming soon...
            </div>
            <div style={{ marginTop: '24px' }}>
              <button
                className="primary"
                onClick={() => {
                  setCurrentStep('stage');
                  loadAuditReport();
                }}
                type="button"
              >
                Continue to Stage Check →
              </button>
            </div>
          </div>
        );

      case 'stage':
        return (
          <div className="service-step-content">
            <h2>Stage Display Check</h2>
            <p className="hint">Verify stage display settings for all playlist items</p>

            {!selectedPlaylistName ? (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📺</div>
                <h3 style={{ margin: '0 0 8px', color: 'var(--muted)' }}>No Playlist Selected</h3>
                <p style={{ margin: 0, color: 'var(--muted)', fontSize: '14px' }}>
                  Go back to Setup and create or select a working playlist first
                </p>
              </div>
            ) : isLoadingAudit ? (
              <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '16px' }}>⏳</div>
                <p>Loading stage audit...</p>
              </div>
            ) : !auditReport ? (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                <h3 style={{ margin: '0 0 12px' }}>Generate Stage Audit</h3>
                <p style={{ margin: '0 0 24px', color: 'var(--muted)', fontSize: '14px' }}>
                  Check stage display settings for all items in "{selectedPlaylistName}"
                </p>
                <button
                  className="primary"
                  onClick={loadAuditReport}
                  type="button"
                >
                  Generate Audit Report
                </button>
              </div>
            ) : (
              <div>
                <PlaylistAuditChecklist
                  playlistName={auditReport.playlistName}
                  items={auditReport.items}
                  summary={auditReport.summary}
                  readinessScore={auditReport.readinessScore}
                  onMarkVerified={handleMarkVerified}
                  onMarkNeedsSetup={handleMarkNeedsSetup}
                  onMarkNotApplicable={handleMarkNotApplicable}
                />

                <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                  <button
                    className="ghost"
                    onClick={() => setCurrentStep('build')}
                    type="button"
                  >
                    ← Back to Build
                  </button>
                  <button
                    className="accent"
                    onClick={loadAuditReport}
                    type="button"
                  >
                    Refresh Audit
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className="service-generator-container">
      {/* Header */}
      <div className="service-header">
        <button className="icon-button" onClick={props.onBack} title="Back to Export" type="button">
          ←
        </button>
        <div>
          <h1>Service Generator</h1>
          <p className="eyebrow">Automated service playlist creation</p>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`service-notification service-notification-${notification.type}`}>
          {notification.message}
        </div>
      )}

      {/* Main Content */}
      <div className="service-layout">
        {/* Sidebar Navigation */}
        <aside className="service-sidebar">
          <h3 style={{ margin: '0 0 16px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)' }}>
            Steps
          </h3>
          <nav className="service-nav">
            {STEPS.map((step) => (
              <button
                key={step.id}
                type="button"
                className={`service-nav-item ${currentStep === step.id ? 'active' : ''}`}
                onClick={() => setCurrentStep(step.id)}
              >
                {step.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="service-main">
          {renderStepContent()}
        </main>
      </div>
    </div>
  );
}
