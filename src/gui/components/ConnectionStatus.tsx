import React from 'react';
import '../styles/ConnectionStatus.css';

interface ConnectionStatusProps {
  connected: boolean;
  host: string;
  port: string;
  onHostChange: (host: string) => void;
  onPortChange: (port: string) => void;
  onReconnect: () => void;
}

export default function ConnectionStatus({
  connected,
  host,
  port,
  onHostChange,
  onPortChange,
  onReconnect,
}: ConnectionStatusProps) {
  return (
    <div className="connection-status">
      <div className="status-header">
        <h2>Connection Settings</h2>
        <div className={`status-indicator ${connected ? 'connected' : 'disconnected'}`}>
          {connected ? '● Connected' : '● Disconnected'}
        </div>
      </div>

      <div className="input-group">
        <label htmlFor="host">ProPresenter Host</label>
        <input
          id="host"
          type="text"
          value={host}
          onChange={(e) => onHostChange(e.target.value)}
          placeholder="127.0.0.1"
        />
      </div>

      <div className="input-group">
        <label htmlFor="port">Port</label>
        <input
          id="port"
          type="number"
          value={port}
          onChange={(e) => onPortChange(e.target.value)}
          placeholder="1025"
          min="1"
          max="65535"
        />
      </div>

      <button className="reconnect-button" onClick={onReconnect}>
        Test Connection
      </button>
    </div>
  );
}
