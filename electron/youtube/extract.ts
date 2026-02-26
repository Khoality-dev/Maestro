import { execFile } from 'node:child_process';
import { ytdlpPath } from './bin.js';

/**
 * Extract a direct streaming URL for the best audio format.
 * Returns a CDN URL that HTMLAudioElement can stream directly.
 * The URL is temporary (expires after some time).
 */
export function extractStreamUrl(videoId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const args = [
      url,
      '-f', 'bestaudio',
      '--get-url',
      '--no-playlist',
      '--no-warnings',
    ];

    execFile(ytdlpPath(), args, { timeout: 30_000 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`yt-dlp extract failed: ${stderr || error.message}`));
        return;
      }

      const streamUrl = stdout.trim().split('\n')[0];
      if (!streamUrl) {
        reject(new Error('yt-dlp returned empty URL'));
        return;
      }

      resolve(streamUrl);
    });
  });
}
