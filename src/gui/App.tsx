import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import PlaylistSelector from './components/PlaylistSelector';
import ExportOptions from './components/ExportOptions';
import ConnectionStatus from './components/ConnectionStatus';
import ExportProgress from './components/ExportProgress';
import './styles/App.css';

interface Playlist {
  name: string;
  uuid: string;
}

export default function App() {
  const [host, setHost] = useState('127.0.0.1');
  const [port, setPort] = useState('1025');
  const [connected, setConnected] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<'pptx' | 'text' | 'json'>('pptx');
  const [outputPath, setOutputPath] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');

  // Check connection on mount and when host/port change
  useEffect(() => {
    checkConnection();
  }, [host, port]);

  const checkConnection = async () => {
    try {
      const response = await invoke('check_connection', {
        host,
        port: parseInt(port),
      });
      setConnected(true);
      loadPlaylists();
    } catch (error) {
      setConnected(false);
      setPlaylists([]);
    }
  };

  const loadPlaylists = async () => {
    try {
      const response = await invoke('get_playlists', {
        host,
        port: parseInt(port),
      });
      // Parse the response and extract playlists
      // This is a simplified version - actual parsing depends on CLI output
      setPlaylists([]);
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
      const response = await invoke('export_playlist', {
        playlist_uuid: selectedPlaylist,
        export_format: exportFormat,
        host,
        port: parseInt(port),
        output_path: outputPath || null,
      });

      setExportMessage('Export completed successfully!');
    } catch (error) {
      setExportMessage(`Export failed: ${error}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="app-container">
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
