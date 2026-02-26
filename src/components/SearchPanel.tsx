import { useState } from 'react';
import { usePlayerStore } from '../store/playerStore';
import type { Track } from '../../electron/player/types';

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function TrackRow({ track, onEnqueue }: { track: Track; onEnqueue: (t: Track) => void }) {
  return (
    <li className="search-result-item">
      <div className="search-result-thumb">
        {track.thumbnail ? (
          <img src={track.thumbnail} alt="" />
        ) : (
          <div className="search-result-thumb-placeholder" />
        )}
      </div>
      <div className="search-result-info">
        <div className="search-result-title">{track.title}</div>
        <div className="search-result-meta">
          {track.artist && <span>{track.artist}</span>}
          {track.duration != null && <span>{formatDuration(track.duration)}</span>}
        </div>
      </div>
      <button
        className="enqueue-btn"
        onClick={() => onEnqueue(track)}
        title="Add to queue"
      >
        +
      </button>
    </li>
  );
}

export function SearchPanel() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Track[]>([]);
  const search = usePlayerStore((s) => s.search);
  const enqueue = usePlayerStore((s) => s.enqueue);
  const history = usePlayerStore((s) => s.history);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    try {
      const tracks = await search(trimmed);
      setResults(tracks);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
  };

  const showHistory = results.length === 0 && !loading && history.length > 0;

  return (
    <div className="panel search-panel">
      <h2 className="panel-header">Search</h2>
      <form className="search-bar" onSubmit={handleSearch}>
        <div className="search-input-wrap">
          <input
            type="text"
            placeholder="Search YouTube..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
          />
          {(query || results.length > 0) && !loading && (
            <button type="button" className="search-clear-btn" onClick={clearSearch} title="Clear search">
              &times;
            </button>
          )}
        </div>
        <button type="submit" disabled={!query.trim() || loading}>
          {loading ? '...' : 'Go'}
        </button>
      </form>

      <div className="search-results-scroll">
        {results.length > 0 && (
          <>
            <h3 className="section-label">Results</h3>
            <ul className="search-results">
              {results.map((track) => (
                <TrackRow key={track.id} track={track} onEnqueue={enqueue} />
              ))}
            </ul>
          </>
        )}

        {showHistory && (
          <>
            <h3 className="section-label">Recent</h3>
            <ul className="search-results">
              {history.map((track) => (
                <TrackRow key={track.id} track={track} onEnqueue={enqueue} />
              ))}
            </ul>
          </>
        )}

        {results.length === 0 && !loading && history.length === 0 && (
          <p className="panel-empty">Search for music to add to queue</p>
        )}
      </div>
    </div>
  );
}
