export interface Track {
  id: string;              // YouTube video ID
  title: string;
  artist: string | null;
  duration: number | null; // seconds
  thumbnail: string | null;
  url: string;             // YouTube watch URL
}

export type PlaybackState = 'stopped' | 'playing' | 'paused';
export type LoopMode = 'off' | 'queue' | 'one';

export interface PlayerState {
  state: PlaybackState;
  currentTrack: Track | null;
  queue: Track[];
  volume: number;          // 0.0–1.0
  history: Track[];        // recently played, newest first
  loopMode: LoopMode;
}

export interface PlayStreamMessage {
  streamUrl: string;
  track: Track;
}
