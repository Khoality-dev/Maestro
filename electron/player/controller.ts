import { BrowserWindow, app } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { searchTracks, extractStreamUrl } from '../youtube/index.js';
import type { Track, PlayerState, PlaybackState, LoopMode } from './types.js';

const MAX_HISTORY = 50;

function getDataDir(): string {
  try {
    return app.getPath('userData');
  } catch {
    return path.join(process.cwd(), 'data');
  }
}

function ensureDataDir(): void {
  const dir = getDataDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadJson<T>(filename: string, fallback: T): T {
  try {
    const data = fs.readFileSync(path.join(getDataDir(), filename), 'utf-8');
    return JSON.parse(data);
  } catch {
    return fallback;
  }
}

function saveJson(filename: string, data: unknown): void {
  try {
    ensureDataDir();
    fs.writeFileSync(path.join(getDataDir(), filename), JSON.stringify(data));
  } catch (err) {
    console.error(`Failed to save ${filename}:`, err);
  }
}

interface PersistedState {
  queue: Track[];
  volume: number;
  loopMode: LoopMode;
}


export class PlayerController {
  private state: PlaybackState = 'stopped';
  private currentTrack: Track | null = null;
  private queue: Track[] = [];
  private volume = 1.0;
  private loopMode: LoopMode = 'off';
  private history: Track[] = [];
  private window: BrowserWindow | null = null;

  constructor() {
    this.history = loadJson<Track[]>('history.json', []);
    const saved = loadJson<PersistedState>('player-state.json', { queue: [], volume: 1.0, loopMode: 'off' });
    this.queue = saved.queue;
    this.volume = saved.volume;
    this.loopMode = saved.loopMode ?? 'off';
  }

  setWindow(window: BrowserWindow): void {
    this.window = window;
  }

  getState(): PlayerState {
    return {
      state: this.state,
      currentTrack: this.currentTrack,
      queue: [...this.queue],
      volume: this.volume,
      history: [...this.history],
      loopMode: this.loopMode,
    };
  }

  async play(query: string): Promise<Track> {
    const tracks = await searchTracks(query, 1);
    if (tracks.length === 0) {
      throw new Error(`No results found for: ${query}`);
    }

    const track = tracks[0];

    if (this.state === 'playing' && this.currentTrack) {
      this.queue.push(track);
      this.broadcastState();
      return track;
    }

    await this.playTrack(track);
    return track;
  }

  async addToQueue(query: string): Promise<Track> {
    const tracks = await searchTracks(query, 1);
    if (tracks.length === 0) {
      throw new Error(`No results found for: ${query}`);
    }

    const track = tracks[0];
    this.queue.push(track);
    this.broadcastState();
    return track;
  }

  removeFromQueue(index: number): Track | null {
    if (index < 0 || index >= this.queue.length) {
      return null;
    }
    const [removed] = this.queue.splice(index, 1);
    this.broadcastState();
    return removed;
  }

  clearQueue(): void {
    this.queue = [];
    this.broadcastState();
  }

  moveInQueue(fromIndex: number, toIndex: number): void {
    if (fromIndex < 0 || fromIndex >= this.queue.length) return;
    if (toIndex < 0 || toIndex >= this.queue.length) return;
    if (fromIndex === toIndex) return;
    const [item] = this.queue.splice(fromIndex, 1);
    this.queue.splice(toIndex, 0, item);
    this.broadcastState();
  }

  pause(): void {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.sendToRenderer('pause');
    this.broadcastState();
  }

  resume(): void {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.sendToRenderer('resume');
    this.broadcastState();
  }

  skip(): void {
    this.advanceQueue().catch((err) => {
      console.error('Skip/advance failed:', err);
      this.sendToRenderer('error', { message: String(err) });
    });
  }

  stop(): void {
    this.state = 'stopped';
    this.currentTrack = null;
    this.queue = [];
    this.sendToRenderer('stop');
    this.broadcastState();
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.sendToRenderer('set-volume', this.volume);
    this.broadcastState();
  }

  setLoopMode(mode: LoopMode): void {
    this.loopMode = mode;
    this.broadcastState();
  }

  enqueue(track: Track): void {
    this.queue.push(track);
    this.addToHistory(track);
    this.broadcastState();
    if (this.state === 'stopped') {
      this.advanceQueue().catch((err) => {
        console.error('Auto-start failed:', err);
        this.sendToRenderer('error', { message: String(err) });
      });
    }
  }

  async search(query: string): Promise<Track[]> {
    return searchTracks(query, 5);
  }

  onTrackFinished(): void {
    console.log('[PlayerController] Track finished, advancing queue...');

    // Loop one: replay the same track
    if (this.loopMode === 'one' && this.currentTrack) {
      this.playTrack(this.currentTrack).catch((err) => {
        console.error('Loop-one replay failed:', err);
        this.sendToRenderer('error', { message: String(err) });
      });
      return;
    }

    // Loop queue: re-add finished track to end of queue
    if (this.loopMode === 'queue' && this.currentTrack) {
      this.queue.push(this.currentTrack);
    }

    this.advanceQueue().catch((err) => {
      console.error('Auto-advance failed:', err);
      this.sendToRenderer('error', { message: String(err) });
    });
  }

  private addToHistory(track: Track): void {
    this.history = this.history.filter((t) => t.id !== track.id);
    this.history.unshift(track);
    if (this.history.length > MAX_HISTORY) {
      this.history = this.history.slice(0, MAX_HISTORY);
    }
    saveJson('history.json', this.history);
  }

  private persistState(): void {
    saveJson('player-state.json', { queue: this.queue, volume: this.volume, loopMode: this.loopMode });
  }

  private async playTrack(track: Track): Promise<void> {
    this.currentTrack = track;
    this.state = 'playing';
    this.addToHistory(track);
    this.broadcastState();

    try {
      const streamUrl = await extractStreamUrl(track.id);
      this.sendToRenderer('play-stream', { streamUrl, track });
    } catch (error) {
      this.state = 'stopped';
      this.currentTrack = null;
      this.broadcastState();
      throw error;
    }
  }

  private async advanceQueue(): Promise<void> {
    if (this.queue.length === 0) {
      this.state = 'stopped';
      this.currentTrack = null;
      this.sendToRenderer('stop');
      this.broadcastState();
      return;
    }

    const next = this.queue.shift()!;
    await this.playTrack(next);
  }

  private broadcastState(): void {
    this.persistState();
    this.sendToRenderer('state-update', this.getState());
  }

  private sendToRenderer(channel: string, data?: unknown): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send(channel, data);
    }
  }
}

export const playerController = new PlayerController();
