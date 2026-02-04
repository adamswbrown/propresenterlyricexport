/// <reference path="./env.d.ts" />
import { useState, useEffect } from 'react';

type ServiceGeneratorViewProps = {
  settings: {
    worshipLibraryId: string;
    kidsLibraryId: string;
    serviceContentLibraryId: string;
    templatePlaylistId: string;
  };
  connectionConfig: { host: string; port: number };
  libraryOptions: Array<{ uuid: string; name: string }>;
  templatePlaylists: Array<{ uuid: string; name: string }>;
  connectionState: 'idle' | 'testing' | 'connecting' | 'connected' | 'error';
  onSettingsChange: (updates: Partial<ServiceGeneratorViewProps['settings']>) => void;
  onSaveSettings: () => void;
  onCreatePlaylist: (playlistName: string) => Promise<{ success: boolean; error?: string; playlistId?: string }>;
  onBack: () => void;
};

type Notification = {
  message: string;
  type: 'success' | 'error' | 'info';
};

type Step = 'setup' | 'upload' | 'parse' | 'match' | 'verse' | 'build';

const STEPS: { id: Step; label: string }[] = [
  { id: 'setup', label: 'Setup' },
  { id: 'upload', label: 'Upload PDF' },
  { id: 'parse', label: 'Parse' },
  { id: 'match', label: 'Match Songs' },
  { id: 'verse', label: 'Bible' },
  { id: 'build', label: 'Build' },
];

type PraiseSlot = 'praise1' | 'praise2' | 'praise3' | 'kids';

type ParsedItem = {
  type: 'song' | 'kids_video' | 'verse' | 'heading';
  text: string;
  reference?: string;
  isKidsVideo?: boolean;
  praiseSlot?: PraiseSlot;
  specialServiceType?: string | null;  // Type of special service (remembrance, christmas, etc.)
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
  praiseSlot?: PraiseSlot;
  matches: Array<{ uuid: string; name: string; library: string; confidence: number }>;
  bestMatch?: { uuid: string; name: string; library: string; confidence: number };
  requiresReview: boolean;
  selectedMatch?: { uuid: string; name: string };
};

type VerseResult = {
  reference: string;
  text: string;
  error?: string;
};

type BibleMatch = {
  reference: string;
  matches: Array<{ uuid: string; name: string; confidence: number }>;
  bestMatch?: { uuid: string; name: string; confidence: number };
  requiresReview: boolean;
  selectedMatch?: { uuid: string; name: string };
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
  const [bibleMatches, setBibleMatches] = useState<BibleMatch[]>([]);
  const [verseResults, setVerseResults] = useState<VerseResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [specialServiceType, setSpecialServiceType] = useState<string | null>(null);  // Track special service type

  // Step validation - check if step is complete
  const isStepComplete = (step: Step): boolean => {
    switch (step) {
      case 'setup':
        return Boolean(selectedPlaylistId && props.settings.worshipLibraryId && props.settings.templatePlaylistId);
      case 'upload':
        return Boolean(pdfPath);
      case 'parse':
        return parsedItems.length > 0;
      case 'match':
        // All songs must have a selected match
        const songsToMatch = matchResults.length;
        const matchedSongs = matchResults.filter(r => r.selectedMatch).length;
        return songsToMatch > 0 && matchedSongs === songsToMatch;
      case 'verse':
        // Verses are complete if:
        // - No verses to match, OR
        // - All verses with library matches have a selection (verses with no matches = manual workflow, OK to skip)
        const versesWithMatches = bibleMatches.filter(v => v.matches.length > 0);
        const versesWithSelection = versesWithMatches.filter(v => v.selectedMatch).length;
        return bibleMatches.length === 0 || versesWithSelection === versesWithMatches.length;
      case 'build':
        return true; // Final step
      default:
        return false;
    }
  };

  // Check if user can navigate to a step
  const canNavigateToStep = (targetStep: Step): boolean => {
    const stepOrder: Step[] = ['setup', 'upload', 'parse', 'match', 'verse', 'build'];
    const targetIndex = stepOrder.indexOf(targetStep);
    const currentIndex = stepOrder.indexOf(currentStep);

    // Can always go back
    if (targetIndex <= currentIndex) return true;

    // Check all previous steps are complete
    for (let i = 0; i < targetIndex; i++) {
      if (!isStepComplete(stepOrder[i])) return false;
    }
    return true;
  };

  // Auto-dismiss notification after 4 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

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
                            if (result.playlistId) {
                              setSelectedPlaylistId(result.playlistId);
                            }
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
                              setSpecialServiceType(parseResult.specialServiceType || null);
                              
                              let notificationMessage = `Found ${parseResult.items.length} items in PDF`;
                              if (parseResult.specialServiceType) {
                                notificationMessage += ` (${parseResult.specialServiceType} service)`;
                              }
                              setNotification({
                                message: notificationMessage,
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
                          setSpecialServiceType(null);
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
                {specialServiceType && (
                  <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'rgba(251, 191, 36, 0.1)', borderRadius: '10px', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(251, 191, 36, 0.8)' }}>
                      <span style={{ fontSize: '16px' }}>⚠️</span>
                      <span><strong>Special Service Detected:</strong> This is a {specialServiceType} service. Service Generator may handle videos and structure differently.</span>
                    </div>
                  </div>
                )}
                <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', fontSize: '14px' }}>
                  <strong>{parsedItems.length} items found:</strong>{' '}
                  {parsedItems.filter(i => i.type === 'song').length} songs,{' '}
                  {parsedItems.filter(i => i.type === 'kids_video').length} videos,{' '}
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
                        const songsToMatch = parsedItems
                          .filter(item => item.type === 'song' || item.type === 'kids_video');

                        // Build item objects with type info for proper library matching
                        const songItems = songsToMatch.map(item => ({
                          text: item.text,
                          isKidsVideo: item.type === 'kids_video' || item.isKidsVideo,
                          praiseSlot: item.praiseSlot,
                          specialServiceType: specialServiceType  // Include service type for context-aware matching
                        }));

                        if (songItems.length > 0) {
                          setNotification({ message: `Matching ${songItems.length} items...`, type: 'info' });

                          // Pass worship library IDs (kids library passed separately)
                          const libraryIds = [
                            props.settings.worshipLibraryId
                          ].filter(Boolean);

                          const result = await window.api.matchSongs(
                            songItems,
                            props.connectionConfig,
                            libraryIds,
                            props.settings.kidsLibraryId || undefined
                          );

                          if (result.success) {
                            // Add praiseSlot from parsed items to match results
                            const resultsWithSlots = result.results.map((r: MatchResult, idx: number) => ({
                              ...r,
                              praiseSlot: songsToMatch[idx]?.praiseSlot
                            }));
                            setMatchResults(resultsWithSlots);
                            const autoMatched = resultsWithSlots.filter((r: MatchResult) => r.selectedMatch).length;
                            const needsReview = resultsWithSlots.filter((r: MatchResult) => r.requiresReview).length;
                            setNotification({
                              message: `${autoMatched} auto-matched, ${needsReview} need review`,
                              type: needsReview > 0 ? 'info' : 'success'
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
        const autoMatchedCount = matchResults.filter(r => r.selectedMatch && !r.requiresReview).length;
        const needsReviewCount = matchResults.filter(r => r.requiresReview).length;
        const noMatchCount = matchResults.filter(r => r.matches.length === 0).length;

        // Helper: Copy song name to clipboard
        const copyToClipboard = async (text: string) => {
          try {
            await navigator.clipboard.writeText(text);
            setNotification({ message: `Copied "${text}" to clipboard`, type: 'success' });
          } catch {
            setNotification({ message: 'Failed to copy to clipboard', type: 'error' });
          }
        };

        // Helper: Open CCLI SongSelect search
        const searchCCLI = async (songName: string) => {
          const searchUrl = `https://songselect.ccli.com/search/results?SearchText=${encodeURIComponent(songName)}`;
          try {
            await window.api.openExternal(searchUrl);
            setNotification({ message: 'Opening CCLI SongSelect in browser...', type: 'info' });
          } catch {
            setNotification({ message: 'Failed to open browser', type: 'error' });
          }
        };

        // Rescan libraries function
        const rescanLibraries = async () => {
          setIsProcessing(true);
          setNotification({ message: 'Rescanning libraries...', type: 'info' });

          try {
            const songsToMatch = parsedItems
              .filter(item => item.type === 'song' || item.type === 'kids_video');

            // Build item objects with type info for proper library matching
            const songItems = songsToMatch.map(item => ({
              text: item.text,
              isKidsVideo: item.type === 'kids_video' || item.isKidsVideo,
              praiseSlot: item.praiseSlot
            }));

            if (songItems.length > 0) {
              // Pass worship library IDs (kids library passed separately)
              const libraryIds = [
                props.settings.worshipLibraryId
              ].filter(Boolean);

              const result = await window.api.matchSongs(
                songItems,
                props.connectionConfig,
                libraryIds,
                props.settings.kidsLibraryId || undefined
              );

              if (result.success) {
                // Add praiseSlot from parsed items to match results
                const resultsWithSlots = result.results.map((r: MatchResult, idx: number) => ({
                  ...r,
                  praiseSlot: songsToMatch[idx]?.praiseSlot
                }));
                setMatchResults(resultsWithSlots);
                const autoMatched = resultsWithSlots.filter((r: MatchResult) => r.selectedMatch).length;
                const needsReview = resultsWithSlots.filter((r: MatchResult) => r.requiresReview).length;
                const notFound = resultsWithSlots.filter((r: MatchResult) => r.matches.length === 0).length;
                setNotification({
                  message: `Rescan complete: ${autoMatched} matched, ${needsReview} need review, ${notFound} not found`,
                  type: notFound < noMatchCount ? 'success' : 'info'
                });
              } else {
                setNotification({
                  message: result.error || 'Failed to rescan libraries',
                  type: 'error'
                });
              }
            }
          } catch (error: any) {
            setNotification({
              message: error?.message || 'Error rescanning libraries',
              type: 'error'
            });
          } finally {
            setIsProcessing(false);
          }
        };

        return (
          <div className="service-step-content">
            <h2>Match Songs</h2>
            <p className="hint">Review and confirm song matches from your ProPresenter libraries</p>
            {selectedPlaylistName && (
              <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'rgba(47, 212, 194, 0.1)', borderRadius: '10px', border: '1px solid rgba(47, 212, 194, 0.3)' }}>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' }}>Working Playlist</div>
                <div style={{ fontWeight: 600, color: 'var(--accent)' }}>{selectedPlaylistName}</div>
              </div>
            )}

            {matchResults.length === 0 ? (
              <div className="empty-state" style={{ padding: '60px 20px' }}>
                {isProcessing ? 'Matching songs...' : 'No songs to match. Go back to Parse step.'}
              </div>
            ) : (
              <div>
                {/* Statistics and Rescan */}
                <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', fontSize: '14px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <span><strong>{matchResults.length}</strong> total songs</span>
                    <span style={{ color: 'var(--accent)' }}>✓ <strong>{autoMatchedCount}</strong> auto-matched</span>
                    {needsReviewCount > 0 && (
                      <span style={{ color: '#ffc107' }}>⚠ <strong>{needsReviewCount}</strong> need review</span>
                    )}
                    {noMatchCount > 0 && (
                      <span style={{ color: '#f44336' }}>✗ <strong>{noMatchCount}</strong> not found</span>
                    )}
                  </div>
                  {(noMatchCount > 0 || needsReviewCount > 0) && (
                    <button
                      className="ghost small"
                      onClick={rescanLibraries}
                      disabled={isProcessing}
                      type="button"
                      title="Rescan libraries after adding songs to ProPresenter"
                    >
                      {isProcessing ? 'Scanning...' : '↻ Rescan Libraries'}
                    </button>
                  )}
                </div>

                {/* Match List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                  {matchResults.map((result, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '16px',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '12px',
                        border: `1px solid ${
                          result.selectedMatch && !result.requiresReview ? 'rgba(47, 212, 194, 0.3)'
                          : result.requiresReview ? 'rgba(255, 193, 7, 0.3)'
                          : 'rgba(244, 67, 54, 0.3)'
                        }`
                      }}
                    >
                      {/* Song header */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '18px' }}>
                          {result.selectedMatch && !result.requiresReview ? '✓' : result.requiresReview ? '⚠' : '✗'}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 600 }}>{result.songName}</span>
                            {result.praiseSlot && (
                              <span style={{
                                padding: '2px 8px',
                                background: result.praiseSlot === 'kids' ? 'rgba(255, 193, 7, 0.2)' : 'rgba(47, 212, 194, 0.2)',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 600,
                                color: result.praiseSlot === 'kids' ? '#ffc107' : 'var(--accent)'
                              }}>
                                {formatPraiseSlot(result.praiseSlot)}
                              </span>
                            )}
                          </div>
                          {result.bestMatch && (
                            <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                              Best match: {result.bestMatch.confidence}% confidence
                              {result.bestMatch.library && ` • ${result.bestMatch.library}`}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Match selection dropdown */}
                      <div style={{ marginLeft: '30px' }}>
                        <select
                          value={result.selectedMatch?.uuid || ''}
                          onChange={(e) => {
                            const uuid = e.target.value;
                            const match = result.matches.find(m => m.uuid === uuid);
                            setMatchResults(prev => prev.map((r, i) =>
                              i === index
                                ? { ...r, selectedMatch: match ? { uuid: match.uuid, name: match.name } : undefined }
                                : r
                            ));
                          }}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: '1px solid var(--panel-border)',
                            background: 'var(--bg)',
                            color: 'var(--text)',
                            fontSize: '14px'
                          }}
                        >
                          <option value="">-- Select a match --</option>
                          {result.matches.map((match) => (
                            <option key={match.uuid} value={match.uuid}>
                              {match.name} ({match.confidence}%){match.library ? ` - ${match.library}` : ''}
                            </option>
                          ))}
                        </select>
                        {/* CCLI lookup for songs with no matches OR low confidence (needs review) */}
                        {(result.matches.length === 0 || result.requiresReview) && (
                          <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '13px', color: result.matches.length === 0 ? '#f44336' : '#ffc107', marginBottom: '10px' }}>
                              {result.matches.length === 0
                                ? 'No matches found in libraries.'
                                : 'Can\'t find the right match? Add it from CCLI:'}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              <button
                                className="ghost small"
                                onClick={() => copyToClipboard(result.songName)}
                                type="button"
                                title="Copy song name to clipboard"
                                style={{ fontSize: '12px', padding: '6px 12px' }}
                              >
                                📋 Copy Name
                              </button>
                              <button
                                className="ghost small"
                                onClick={() => searchCCLI(result.songName)}
                                type="button"
                                title="Search CCLI SongSelect for this song"
                                style={{ fontSize: '12px', padding: '6px 12px' }}
                              >
                                🔍 Search CCLI
                              </button>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '8px' }}>
                              Add the song to ProPresenter, then click "Rescan Libraries" above.
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    className="ghost"
                    onClick={() => setCurrentStep('parse')}
                    type="button"
                  >
                    ← Back
                  </button>
                  <button
                    className="primary"
                    onClick={() => setCurrentStep('verse')}
                    disabled={!isStepComplete('match')}
                    type="button"
                  >
                    {isStepComplete('match')
                      ? `Continue to Bible (${matchResults.filter(r => r.selectedMatch).length} songs matched) →`
                      : `Match all songs first (${matchResults.filter(r => r.selectedMatch).length}/${matchResults.length})`
                    }
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      case 'verse':
        // Extract Bible verses from parsed items
        const verseItems = parsedItems.filter(item => item.type === 'verse');

        // Statistics
        const autoMatchedVerses = bibleMatches.filter(v => v.selectedMatch && !v.requiresReview).length;
        const needsReviewVerses = bibleMatches.filter(v => v.requiresReview && v.matches.length > 0).length;
        const noMatchVerses = bibleMatches.filter(v => v.matches.length === 0).length;

        // Helper: Copy Bible reference to clipboard
        const copyVerseRef = async (reference: string) => {
          try {
            await navigator.clipboard.writeText(reference);
            setNotification({ message: `Copied "${reference}" to clipboard`, type: 'success' });
          } catch {
            setNotification({ message: 'Failed to copy to clipboard', type: 'error' });
          }
        };

        // Helper: Open Bible Gateway
        const openVerseInBibleGateway = async (reference: string) => {
          const searchRef = encodeURIComponent(reference);
          const url = `https://www.biblegateway.com/passage/?search=${searchRef}&version=NIV`;
          try {
            await window.api.openExternal(url);
            setNotification({ message: 'Opening Bible Gateway...', type: 'info' });
          } catch {
            setNotification({ message: 'Failed to open browser', type: 'error' });
          }
        };

        // Helper: Focus ProPresenter on Reading section
        const focusReading = async () => {
          if (!selectedPlaylistId) {
            setNotification({ message: 'No playlist selected', type: 'error' });
            return;
          }
          try {
            const result = await window.api.focusPlaylistItem(
              props.connectionConfig,
              selectedPlaylistId,
              'reading'
            );
            if (result.success) {
              setNotification({ message: 'Focused ProPresenter on Reading section', type: 'success' });
            } else {
              setNotification({ message: result.error || 'Could not find Reading section', type: 'error' });
            }
          } catch (error: any) {
            setNotification({ message: error?.message || 'Failed to focus ProPresenter', type: 'error' });
          }
        };

        // Match verses against service content library
        const matchBibleVerses = async () => {
          if (verseItems.length === 0) return;

          setIsProcessing(true);
          setNotification({ message: 'Searching for Bible verses in library...', type: 'info' });

          try {
            const references = verseItems.map(v => v.text || v.reference || '');
            const result = await window.api.matchVerses(
              references,
              props.connectionConfig,
              props.settings.serviceContentLibraryId
            );

            if (result.success && result.results) {
              setBibleMatches(result.results);
              const matched = result.results.filter(r => r.selectedMatch).length;
              const needReview = result.results.filter(r => r.requiresReview).length;
              setNotification({
                message: matched > 0
                  ? `Found ${matched} verse(s) in library, ${needReview} need review`
                  : 'No verses found in library - use manual workflow below',
                type: matched > 0 ? 'success' : 'info'
              });
            } else {
              setNotification({
                message: result.error || 'Failed to search for verses',
                type: 'error'
              });
            }
          } catch (error: any) {
            setNotification({
              message: error?.message || 'Error searching for verses',
              type: 'error'
            });
          } finally {
            setIsProcessing(false);
          }
        };

        return (
          <div className="service-step-content">
            <h2>Bible Verses</h2>
            <p className="hint">Match Bible verses from your service content library or add manually</p>
            {selectedPlaylistName && (
              <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'rgba(47, 212, 194, 0.1)', borderRadius: '10px', border: '1px solid rgba(47, 212, 194, 0.3)' }}>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' }}>Working Playlist</div>
                <div style={{ fontWeight: 600, color: 'var(--accent)' }}>{selectedPlaylistName}</div>
              </div>
            )}

            {verseItems.length === 0 ? (
              <div className="empty-state" style={{ padding: '60px 20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📖</div>
                <h3 style={{ margin: '0 0 8px', color: 'var(--muted)' }}>No Bible Verses Found</h3>
                <p style={{ margin: '0 0 24px', color: 'var(--muted)', fontSize: '14px' }}>
                  No Bible references were detected in the PDF.
                </p>
                <button
                  className="primary"
                  onClick={() => setCurrentStep('build')}
                  type="button"
                >
                  Continue to Build →
                </button>
              </div>
            ) : (
              <div>
                {/* Search Button */}
                {bibleMatches.length === 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <button
                      className="primary"
                      onClick={matchBibleVerses}
                      disabled={isProcessing || !props.settings.serviceContentLibraryId}
                      type="button"
                      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      {isProcessing ? 'Searching...' : '🔍 Search Service Content Library'}
                    </button>
                    {!props.settings.serviceContentLibraryId && (
                      <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '8px' }}>
                        Configure a Service Content Library in Setup to enable automatic matching.
                      </div>
                    )}
                  </div>
                )}

                {/* Statistics (after search) */}
                {bibleMatches.length > 0 && (
                  <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', fontSize: '14px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      <span><strong>{bibleMatches.length}</strong> verses</span>
                      {autoMatchedVerses > 0 && (
                        <span style={{ color: 'var(--accent)' }}>✓ <strong>{autoMatchedVerses}</strong> matched</span>
                      )}
                      {needsReviewVerses > 0 && (
                        <span style={{ color: '#ffc107' }}>⚠ <strong>{needsReviewVerses}</strong> need review</span>
                      )}
                      {noMatchVerses > 0 && (
                        <span style={{ color: '#f44336' }}>✗ <strong>{noMatchVerses}</strong> not found</span>
                      )}
                    </div>
                    <button
                      className="ghost small"
                      onClick={matchBibleVerses}
                      disabled={isProcessing}
                      type="button"
                    >
                      {isProcessing ? 'Searching...' : '↻ Rescan'}
                    </button>
                  </div>
                )}

                {/* Verse List with Matching */}
                <h3 style={{ fontSize: '15px', marginBottom: '12px', color: 'var(--muted)' }}>
                  Bible Verses ({verseItems.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                  {verseItems.map((verse, idx) => {
                    const verseRef = verse.text || verse.reference || '';
                    const match = bibleMatches[idx];
                    const hasMatch = match?.selectedMatch;
                    const needsReview = match?.requiresReview;
                    const noMatches = match && match.matches.length === 0;

                    return (
                      <div key={idx} style={{
                        padding: '16px',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '12px',
                        border: `1px solid ${
                          hasMatch && !needsReview ? 'rgba(47, 212, 194, 0.3)'
                          : needsReview && match?.matches.length > 0 ? 'rgba(255, 193, 7, 0.3)'
                          : noMatches ? 'rgba(244, 67, 54, 0.3)'
                          : 'var(--panel-border)'
                        }`
                      }}>
                        {/* Verse header */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: match ? '12px' : '0' }}>
                          <span style={{ fontSize: '18px' }}>
                            {hasMatch && !needsReview ? '✓' : needsReview && match?.matches.length > 0 ? '⚠' : noMatches ? '✗' : '📖'}
                          </span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: '16px' }}>{verseRef}</div>
                            {match?.bestMatch && (
                              <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
                                Best match: {match.bestMatch.confidence}% confidence
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Match selection or manual workflow */}
                        {match && match.matches.length > 0 ? (
                          <div style={{ marginLeft: '30px' }}>
                            <select
                              value={match.selectedMatch?.uuid || ''}
                              onChange={(e) => {
                                const uuid = e.target.value;
                                const selectedMatchItem = match.matches.find(m => m.uuid === uuid);
                                setBibleMatches(prev => prev.map((v, i) =>
                                  i === idx
                                    ? { ...v, selectedMatch: selectedMatchItem ? { uuid: selectedMatchItem.uuid, name: selectedMatchItem.name } : undefined }
                                    : v
                                ));
                              }}
                              style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: '8px',
                                border: '1px solid var(--panel-border)',
                                background: 'var(--bg)',
                                color: 'var(--text)',
                                fontSize: '14px'
                              }}
                            >
                              <option value="">-- Select a match --</option>
                              {match.matches.map((m) => (
                                <option key={m.uuid} value={m.uuid}>
                                  {m.name} ({m.confidence}%)
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : match ? (
                          /* No matches found - show manual workflow */
                          <div style={{ marginLeft: '30px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '13px', color: '#f44336', marginBottom: '10px' }}>
                              Not found in library. Add manually using ProPresenter's Bible panel:
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                              <button
                                className="ghost small"
                                onClick={() => copyVerseRef(verseRef)}
                                type="button"
                                style={{ fontSize: '12px', padding: '6px 12px' }}
                              >
                                📋 Copy Reference
                              </button>
                              <button
                                className="ghost small"
                                onClick={() => openVerseInBibleGateway(verseRef)}
                                type="button"
                                style={{ fontSize: '12px', padding: '6px 12px' }}
                              >
                                🔗 Bible Gateway
                              </button>
                              <button
                                className="ghost small"
                                onClick={focusReading}
                                type="button"
                                style={{ fontSize: '12px', padding: '6px 12px' }}
                              >
                                🎯 Focus Reading
                              </button>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '8px' }}>
                              Use <kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 4px', borderRadius: '3px', fontSize: '10px' }}>Cmd+B</kbd> to open Bible panel in ProPresenter
                            </div>
                          </div>
                        ) : (
                          /* Not searched yet - show basic buttons */
                          <div style={{ marginLeft: '30px', display: 'flex', gap: '8px' }}>
                            <button
                              className="ghost small"
                              onClick={() => copyVerseRef(verseRef)}
                              type="button"
                              style={{ fontSize: '12px', padding: '6px 12px' }}
                            >
                              📋 Copy
                            </button>
                            <button
                              className="ghost small"
                              onClick={() => openVerseInBibleGateway(verseRef)}
                              type="button"
                              style={{ fontSize: '12px', padding: '6px 12px' }}
                            >
                              🔗 Bible Gateway
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    className="ghost"
                    onClick={() => setCurrentStep('match')}
                    type="button"
                  >
                    ← Back
                  </button>
                  <button
                    className="primary"
                    onClick={() => setCurrentStep('build')}
                    disabled={!isStepComplete('verse')}
                    type="button"
                  >
                    {isStepComplete('verse')
                      ? 'Continue to Build →'
                      : `Select verses with matches first (${bibleMatches.filter(v => v.matches.length > 0 && v.selectedMatch).length}/${bibleMatches.filter(v => v.matches.length > 0).length})`
                    }
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      case 'build':
        const selectedSongs = matchResults.filter(r => r.selectedMatch);
        const songsGroupedBySlot = {
          praise1: selectedSongs.filter(s => s.praiseSlot === 'praise1'),
          praise2: selectedSongs.filter(s => s.praiseSlot === 'praise2'),
          praise3: selectedSongs.filter(s => s.praiseSlot === 'praise3'),
          kids: selectedSongs.filter(s => s.praiseSlot === 'kids'),
          other: selectedSongs.filter(s => !s.praiseSlot)
        };

        // Get matched Bible verses for the build
        const matchedBibleVerses = bibleMatches.filter(v => v.selectedMatch);

        return (
          <div className="service-step-content">
            <h2>Build Playlist</h2>
            <p className="hint">Review and add songs to your working playlist</p>
            {selectedPlaylistName && (
              <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'rgba(47, 212, 194, 0.1)', borderRadius: '10px', border: '1px solid rgba(47, 212, 194, 0.3)' }}>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' }}>Target Playlist</div>
                <div style={{ fontWeight: 600, color: 'var(--accent)' }}>{selectedPlaylistName}</div>
              </div>
            )}

            {selectedSongs.length === 0 ? (
              <div className="empty-state" style={{ padding: '60px 20px' }}>
                No songs selected. Go back to Match step and select songs.
              </div>
            ) : (
              <div>
                {/* Summary by section */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Songs to Add ({selectedSongs.length})</h3>

                  {/* Praise 1 */}
                  {songsGroupedBySlot.praise1.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)', marginBottom: '8px' }}>
                        Praise 1 ({songsGroupedBySlot.praise1.length})
                      </div>
                      {songsGroupedBySlot.praise1.map((song, idx) => (
                        <div key={idx} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>🎵</span>
                          <span>{song.selectedMatch?.name || song.songName}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Kids */}
                  {songsGroupedBySlot.kids.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#ffc107', marginBottom: '8px' }}>
                        Kids ({songsGroupedBySlot.kids.length})
                      </div>
                      {songsGroupedBySlot.kids.map((song, idx) => (
                        <div key={idx} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>🎬</span>
                          <span>{song.selectedMatch?.name || song.songName}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Praise 2 */}
                  {songsGroupedBySlot.praise2.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)', marginBottom: '8px' }}>
                        Praise 2 ({songsGroupedBySlot.praise2.length})
                      </div>
                      {songsGroupedBySlot.praise2.map((song, idx) => (
                        <div key={idx} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>🎵</span>
                          <span>{song.selectedMatch?.name || song.songName}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Praise 3 */}
                  {songsGroupedBySlot.praise3.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)', marginBottom: '8px' }}>
                        Praise 3 ({songsGroupedBySlot.praise3.length})
                      </div>
                      {songsGroupedBySlot.praise3.map((song, idx) => (
                        <div key={idx} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>🎵</span>
                          <span>{song.selectedMatch?.name || song.songName}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Other (no slot) */}
                  {songsGroupedBySlot.other.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)', marginBottom: '8px' }}>
                        Other ({songsGroupedBySlot.other.length})
                      </div>
                      {songsGroupedBySlot.other.map((song, idx) => (
                        <div key={idx} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>🎵</span>
                          <span>{song.selectedMatch?.name || song.songName}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bible Verses Summary */}
                {matchedBibleVerses.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Bible Verses ({matchedBibleVerses.length})</h3>
                    {matchedBibleVerses.map((verse, idx) => (
                      <div key={idx} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>📖</span>
                        <span>{verse.selectedMatch?.name || verse.reference}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    className="ghost"
                    onClick={() => setCurrentStep('verse')}
                    type="button"
                  >
                    ← Back
                  </button>
                  <button
                    className="accent"
                    onClick={async () => {
                      if (!selectedPlaylistId) {
                        setNotification({ message: 'No playlist selected', type: 'error' });
                        return;
                      }

                      setIsProcessing(true);
                      setNotification({ message: 'Adding songs to playlist...', type: 'info' });

                      try {
                        // Build items array for API, including praiseSlot for proper placement
                        const items = [
                          // Add songs with praise slots
                          ...selectedSongs.map(song => ({
                            type: 'presentation',
                            uuid: song.selectedMatch!.uuid,
                            name: song.selectedMatch!.name,
                            praiseSlot: song.praiseSlot // Required for surgical placement in template sections
                          })),
                          // Add Bible verses to "Reading" section
                          ...matchedBibleVerses.map(verse => ({
                            type: 'presentation',
                            uuid: verse.selectedMatch!.uuid,
                            name: verse.selectedMatch!.name,
                            praiseSlot: 'reading' // Bible verses go in Reading section
                          }))
                        ];

                        const result = await window.api.buildServicePlaylist(
                          props.connectionConfig,
                          selectedPlaylistId,
                          items
                        );

                        if (result.success) {
                          setNotification({
                            message: `Added ${items.length} items to playlist!`,
                            type: 'success'
                          });
                        } else {
                          setNotification({
                            message: result.error || 'Failed to build playlist',
                            type: 'error'
                          });
                        }
                      } catch (error: any) {
                        setNotification({
                          message: error?.message || 'Error building playlist',
                          type: 'error'
                        });
                      } finally {
                        setIsProcessing(false);
                      }
                    }}
                    disabled={isProcessing || !selectedPlaylistId}
                    type="button"
                  >
                    {isProcessing
                      ? 'Adding...'
                      : `Add ${selectedSongs.length + matchedBibleVerses.length} Item${(selectedSongs.length + matchedBibleVerses.length) !== 1 ? 's' : ''}`}
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
            {STEPS.map((step) => {
              const canNavigate = canNavigateToStep(step.id);
              const isComplete = isStepComplete(step.id);
              const isCurrent = currentStep === step.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  className={`service-nav-item ${isCurrent ? 'active' : ''} ${!canNavigate ? 'disabled' : ''} ${isComplete && !isCurrent ? 'complete' : ''}`}
                  onClick={() => canNavigate && setCurrentStep(step.id)}
                  disabled={!canNavigate}
                  title={!canNavigate ? 'Complete previous steps first' : undefined}
                >
                  {isComplete && !isCurrent && <span style={{ marginRight: '6px' }}>✓</span>}
                  {step.label}
                </button>
              );
            })}
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
