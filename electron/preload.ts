import { contextBridge, ipcRenderer } from 'electron';
import type { PlayerState, PlayStreamMessage, Track, LoopMode } from './player/types.js';

export interface MaestroAPI {
  play(query: string): Promise<Track>;
  enqueue(track: Track): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  skip(): Promise<void>;
  stop(): Promise<void>;
  addToQueue(query: string): Promise<Track>;
  removeFromQueue(index: number): Promise<Track | null>;
  clearQueue(): Promise<void>;
  moveInQueue(fromIndex: number, toIndex: number): Promise<void>;
  setVolume(volume: number): Promise<void>;
  setLoopMode(mode: LoopMode): Promise<void>;
  search(query: string): Promise<Track[]>;
  getState(): Promise<PlayerState>;
  trackFinished(): void;
  onStateUpdate(callback: (state: PlayerState) => void): () => void;
  onPlayStream(callback: (msg: PlayStreamMessage) => void): () => void;
  onPause(callback: () => void): () => void;
  onResume(callback: () => void): () => void;
  onStop(callback: () => void): () => void;
  onSetVolume(callback: (volume: number) => void): () => void;
  onError(callback: (message: string) => void): () => void;
}

contextBridge.exposeInMainWorld('maestro', {
  play: (query: string) => ipcRenderer.invoke('player:play', query),
  enqueue: (track: Track) => ipcRenderer.invoke('player:enqueue', track),
  pause: () => ipcRenderer.invoke('player:pause'),
  resume: () => ipcRenderer.invoke('player:resume'),
  skip: () => ipcRenderer.invoke('player:skip'),
  stop: () => ipcRenderer.invoke('player:stop'),
  addToQueue: (query: string) => ipcRenderer.invoke('player:add-to-queue', query),
  removeFromQueue: (index: number) => ipcRenderer.invoke('player:remove-from-queue', index),
  clearQueue: () => ipcRenderer.invoke('player:clear-queue'),
  moveInQueue: (fromIndex: number, toIndex: number) => ipcRenderer.invoke('player:move-in-queue', fromIndex, toIndex),
  setVolume: (volume: number) => ipcRenderer.invoke('player:set-volume', volume),
  setLoopMode: (mode: LoopMode) => ipcRenderer.invoke('player:set-loop-mode', mode),
  search: (query: string) => ipcRenderer.invoke('player:search', query),
  getState: () => ipcRenderer.invoke('player:get-state'),
  trackFinished: () => ipcRenderer.send('player:track-finished'),

  onStateUpdate: (callback: (state: PlayerState) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, state: PlayerState) => callback(state);
    ipcRenderer.on('state-update', handler);
    return () => ipcRenderer.removeListener('state-update', handler);
  },
  onPlayStream: (callback: (msg: PlayStreamMessage) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, msg: PlayStreamMessage) => callback(msg);
    ipcRenderer.on('play-stream', handler);
    return () => ipcRenderer.removeListener('play-stream', handler);
  },
  onPause: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('pause', handler);
    return () => ipcRenderer.removeListener('pause', handler);
  },
  onResume: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('resume', handler);
    return () => ipcRenderer.removeListener('resume', handler);
  },
  onStop: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('stop', handler);
    return () => ipcRenderer.removeListener('stop', handler);
  },
  onSetVolume: (callback: (volume: number) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, volume: number) => callback(volume);
    ipcRenderer.on('set-volume', handler);
    return () => ipcRenderer.removeListener('set-volume', handler);
  },
  onError: (callback: (message: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { message: string }) => callback(data.message);
    ipcRenderer.on('error', handler);
    return () => ipcRenderer.removeListener('error', handler);
  },
} satisfies MaestroAPI);
