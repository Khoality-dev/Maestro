import { useRef } from 'react';
import { usePlayerStore } from '../store/playerStore';
import type { LoopMode } from '../../electron/player/types';

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function QueuePanel() {
  const playbackState = usePlayerStore((s) => s.state);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const queue = usePlayerStore((s) => s.queue);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);
  const clearQueue = usePlayerStore((s) => s.clearQueue);
  const moveInQueue = usePlayerStore((s) => s.moveInQueue);
  const pause = usePlayerStore((s) => s.pause);
  const resume = usePlayerStore((s) => s.resume);
  const skip = usePlayerStore((s) => s.skip);

  const volume = usePlayerStore((s) => s.volume);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const loopMode = usePlayerStore((s) => s.loopMode);
  const setLoopMode = usePlayerStore((s) => s.setLoopMode);

  const cycleLoop = () => {
    const next: Record<LoopMode, LoopMode> = { off: 'queue', queue: 'one', one: 'off' };
    setLoopMode(next[loopMode]);
  };

  const loopTitle: Record<LoopMode, string> = { off: 'Loop: off', queue: 'Loop: queue', one: 'Loop: one' };

  const dragIndexRef = useRef<number | null>(null);

  const handleDragStart = (index: number) => {
    dragIndexRef.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (index: number) => {
    const from = dragIndexRef.current;
    if (from !== null && from !== index) {
      moveInQueue(from, index);
    }
    dragIndexRef.current = null;
  };

  return (
    <div className="panel queue-panel">
      <div className="panel-header-row">
        <h2 className="panel-header">Queue</h2>
        {queue.length > 0 && (
          <button className="clear-queue-btn" onClick={clearQueue} title="Clear queue">
            Clear
          </button>
        )}
      </div>

      {/* Now Playing + Controls (always visible) */}
      <div className="now-playing-bar">
        {currentTrack ? (
          <div className="now-playing-info">
            {currentTrack.thumbnail && (
              <img className="now-playing-thumb" src={currentTrack.thumbnail} alt="" />
            )}
            <div className="now-playing-text">
              <div className="now-playing-title">{currentTrack.title}</div>
              {currentTrack.artist && <div className="now-playing-artist">{currentTrack.artist}</div>}
            </div>
          </div>
        ) : (
          <div className="now-playing-info">
            <div className="now-playing-text">
              <div className="now-playing-title" style={{ color: 'var(--text-muted)' }}>Not playing</div>
            </div>
          </div>
        )}
        <div className="controls-row">
          {playbackState === 'playing' ? (
            <button className="ctrl-btn" onClick={pause} title="Pause">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
              </svg>
            </button>
          ) : (
            <button className="ctrl-btn" onClick={resume} title="Resume" disabled={playbackState === 'stopped'}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            </button>
          )}
          <button className="ctrl-btn" onClick={skip} title="Skip" disabled={playbackState === 'stopped' && queue.length === 0}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="4,3 14,12 4,21" /><rect x="16" y="3" width="3" height="18" />
            </svg>
          </button>
          <button className={`ctrl-btn loop-btn${loopMode !== 'off' ? ' loop-active' : ''}`} onClick={cycleLoop} title={loopTitle[loopMode]}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
            {loopMode === 'one' && <span className="loop-one-badge">1</span>}
          </button>
          <input
            className="volume-range"
            type="range" min="0" max="1" step="0.01"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            title={`${Math.round(volume * 100)}%`}
          />
        </div>
      </div>

      {/* Queue List */}
      <div className="queue-scroll">
        {queue.length === 0 && !currentTrack && (
          <p className="panel-empty">Queue is empty</p>
        )}
        {queue.length === 0 && currentTrack && (
          <p className="panel-empty">No upcoming tracks</p>
        )}
        <ul className="queue-list">
          {queue.map((track, index) => (
            <li
              key={`${track.id}-${index}`}
              className="queue-item"
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={() => handleDrop(index)}
            >
              <span className="queue-drag-handle" title="Drag to reorder">&#x2630;</span>
              <div className="queue-item-info">
                <div className="queue-item-title">{track.title}</div>
                <div className="queue-item-meta">
                  {track.artist && <span>{track.artist}</span>}
                  {track.duration != null && <span>{formatDuration(track.duration)}</span>}
                </div>
              </div>
              <button
                className="queue-remove-btn"
                onClick={() => removeFromQueue(index)}
                title="Remove"
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
