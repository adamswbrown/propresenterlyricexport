import React from 'react';
import '../styles/PlaylistSelector.css';

interface Playlist {
  name: string;
  uuid: string;
}

interface PlaylistSelectorProps {
  playlists: Playlist[];
  selectedPlaylist: string | null;
  onSelect: (uuid: string) => void;
}

export default function PlaylistSelector({
  playlists,
  selectedPlaylist,
  onSelect,
}: PlaylistSelectorProps) {
  return (
    <div className="playlist-selector">
      <h2>Select Playlist</h2>

      {playlists.length === 0 ? (
        <div className="no-playlists">
          <p>No playlists found. Make sure ProPresenter is running.</p>
        </div>
      ) : (
        <div className="playlist-list">
          {playlists.map((playlist, index) => (
            <label key={playlist.uuid} className="playlist-item">
              <input
                type="radio"
                name="playlist"
                value={playlist.uuid}
                checked={selectedPlaylist === playlist.uuid}
                onChange={() => onSelect(playlist.uuid)}
              />
              <span className="playlist-number">{index + 1}.</span>
              <span className="playlist-name">{playlist.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
