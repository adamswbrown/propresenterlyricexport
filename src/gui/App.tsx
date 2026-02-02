import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './components/ThemeProvider';
import ThemeToggle from './components/ThemeToggle';
import PlaylistSelector from './components/PlaylistSelector';
import ExportOptions from './components/ExportOptions';
import ConnectionStatus from './components/ConnectionStatus';
import ExportProgress from './components/ExportProgress';
import LogoUploader from './components/LogoUploader';
import './styles/App.css';

interface Playlist {
  name: string;
  uuid: string;
}

interface AppContentProps {}

function AppContent() {
  const [host, setHost] = useState('127.0.0.1');
  const [port, setPort] = useState('1025');
  const [connected, setConnected] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<'pptx' | 'text' | 'json'>('pptx');
  const [outputPath, setOutputPath] = useState('');
  const [logoPath, setLogoPath] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');

  // Check connection on mount and when host/port change
  useEffect(() => {
    checkConnection();
  }, [host, port]);

  const checkConnection = async () => {
    try {
      // For now, mock the connection check - will be replaced with actual API call
      // TODO: Replace with real ProPresenter API call
      setConnected(true);
      loadPlaylists();
    } catch (error) {
      setConnected(false);
      setPlaylists([]);
    }
  };

  const loadPlaylists = async () => {
    try {
      // TODO: Replace with actual CLI or API call
      // For now, mock some playlists
      setPlaylists([
        { name: 'Sunday Service', uuid: '1' },
        { name: 'Worship Set', uuid: '2' },
        { name: 'Testing', uuid: '3' },
      ]);
    } catch (error) {
      console.error('Failed to load playlists:', error);
    }
  };

  const handleExport = async () => {
    if (!selectedPlaylist) {
      alert('Please select a playlist');
      return;
    }

    setExporting(true);
    setExportMessage('Starting export...');

    try {
      // TODO: Replace with actual export implementation
      // Simulate export delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      setExportMessage('Export completed successfully!');
      setTimeout(() => setExportMessage(''), 3000);
    } catch (error) {
      setExportMessage(`Export failed: ${error}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="app-container">
      <ThemeToggle />

      <header className="app-header">
        <h1>ProPresenter Lyrics Export</h1>
        <p>Export worship lyrics to PowerPoint and more</p>
      </header>

      <div className="app-content">
        <div className="panel">
          <ConnectionStatus
            connected={connected}
            host={host}
            port={port}
            onHostChange={setHost}
            onPortChange={setPort}
            onReconnect={checkConnection}
          />
        </div>

        {connected && (
          <>
            <div className="panel">
              <PlaylistSelector
                playlists={playlists}
                selectedPlaylist={selectedPlaylist}
                onSelect={setSelectedPlaylist}
              />
            </div>

            <div className="panel">
              <ExportOptions
                format={exportFormat}
                outputPath={outputPath}
                onFormatChange={setExportFormat}
                onOutputPathChange={setOutputPath}
              />
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                <LogoUploader onLogoSelect={setLogoPath} />
              </div>
            </div>

            {exporting && (
              <div className="panel">
                <ExportProgress message={exportMessage} />
              </div>
            )}

            <button
              className="export-button"
              onClick={handleExport}
              disabled={!selectedPlaylist || exporting}
            >
              {exporting ? 'Exporting...' : 'Export Now'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
