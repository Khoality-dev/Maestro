import { useEffect, useRef } from 'react';
import { usePlayerStore } from '../store/playerStore';
import type { PlayStreamMessage } from '../../electron/player/types';

export function useAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const volume = usePlayerStore((s) => s.volume);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;

    audio.addEventListener('ended', () => {
      console.log('[useAudio] Track ended');
      window.maestro.trackFinished();
    });

    audio.addEventListener('error', (e) => {
      const err = audio.error;
      console.error('[useAudio] Audio error:', err?.code, err?.message, e);
      // If the stream errors out mid-playback (e.g. CDN URL expired),
      // treat it as track finished so queue advances
      if (audio.currentTime > 0) {
        console.log('[useAudio] Stream errored after partial play, advancing queue');
        window.maestro.trackFinished();
      }
    });

    // Listen for play-stream from main process
    const unsubPlay = window.maestro.onPlayStream((msg: PlayStreamMessage) => {
      console.log('[useAudio] Playing stream:', msg.track.title);
      audio.src = msg.streamUrl;
      audio.play().catch((err) => console.error('[useAudio] play() failed:', err));
    });

    const unsubPause = window.maestro.onPause(() => {
      audio.pause();
    });

    const unsubResume = window.maestro.onResume(() => {
      audio.play().catch(console.error);
    });

    const unsubStop = window.maestro.onStop(() => {
      audio.pause();
      audio.src = '';
    });

    const unsubVolume = window.maestro.onSetVolume((v: number) => {
      audio.volume = v;
    });

    return () => {
      audio.pause();
      audio.src = '';
      unsubPlay();
      unsubPause();
      unsubResume();
      unsubStop();
      unsubVolume();
    };
  }, []);

  // Sync volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);
}
