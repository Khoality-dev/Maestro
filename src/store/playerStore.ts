import { create } from 'zustand';
import type { PlayerState, Track, LoopMode } from '../../electron/player/types';

interface PlayerStore extends PlayerState {
  error: string | null;
  setState(ps: PlayerState): void;
  setError(error: string | null): void;
  enqueue(track: Track): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  skip(): Promise<void>;
  stop(): Promise<void>;
  removeFromQueue(index: number): Promise<void>;
  clearQueue(): Promise<void>;
  moveInQueue(fromIndex: number, toIndex: number): Promise<void>;
  setVolume(volume: number): Promise<void>;
  setLoopMode(mode: LoopMode): Promise<void>;
  search(query: string): Promise<Track[]>;
  init(): () => void;
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  state: 'stopped',
  currentTrack: null,
  queue: [],
  volume: 1.0,
  history: [],
  loopMode: 'off',
  error: null,

  setState: (ps) => set({
    state: ps.state,
    currentTrack: ps.currentTrack,
    queue: ps.queue,
    volume: ps.volume,
    history: ps.history,
    loopMode: ps.loopMode,
  }),

  setError: (error) => set({ error }),

  enqueue: async (track) => {
    try {
      set({ error: null });
      await window.maestro.enqueue(track);
    } catch (e: any) {
      set({ error: e.message ?? 'Failed to enqueue' });
    }
  },

  pause: async () => { await window.maestro.pause(); },
  resume: async () => { await window.maestro.resume(); },
  skip: async () => { await window.maestro.skip(); },
  stop: async () => { await window.maestro.stop(); },

  removeFromQueue: async (index) => {
    await window.maestro.removeFromQueue(index);
  },

  clearQueue: async () => {
    await window.maestro.clearQueue();
  },

  moveInQueue: async (fromIndex, toIndex) => {
    await window.maestro.moveInQueue(fromIndex, toIndex);
  },

  setVolume: async (volume) => {
    await window.maestro.setVolume(volume);
  },

  setLoopMode: async (mode) => {
    await window.maestro.setLoopMode(mode);
  },

  search: async (query) => {
    return window.maestro.search(query);
  },

  init: () => {
    const unsubs = [
      window.maestro.onStateUpdate((state) => {
        usePlayerStore.getState().setState(state);
      }),
      window.maestro.onError((message) => {
        usePlayerStore.getState().setError(message);
      }),
    ];

    window.maestro.getState().then((state) => {
      usePlayerStore.getState().setState(state);
    });

    return () => unsubs.forEach((unsub) => unsub());
  },
}));
