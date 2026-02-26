import { execFile } from 'node:child_process';
import { ytdlpPath } from './bin.js';
import type { Track } from '../player/types.js';

interface YtdlpSearchResult {
  id: string;
  title: string;
  channel?: string;
  uploader?: string;
  duration?: number;
  thumbnails?: { url: string }[];
  url?: string;
  webpage_url?: string;
}

function parseSearchResults(stdout: string): YtdlpSearchResult[] {
  const results: YtdlpSearchResult[] = [];
  for (const line of stdout.trim().split('\n')) {
    if (!line) continue;
    try {
      results.push(JSON.parse(line));
    } catch {
      // skip malformed lines
    }
  }
  return results;
}

export function searchTracks(query: string, limit = 5): Promise<Track[]> {
  return new Promise((resolve, reject) => {
    const args = [
      `ytsearch${limit}:${query}`,
      '--dump-json',
      '--flat-playlist',
      '--no-warnings',
      '--default-search', 'ytsearch',
    ];

    execFile(ytdlpPath(), args, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`yt-dlp search failed: ${stderr || error.message}`));
        return;
      }

      const results = parseSearchResults(stdout);
      const tracks: Track[] = results.map((r) => ({
        id: r.id,
        title: r.title,
        artist: r.channel ?? r.uploader ?? null,
        duration: r.duration ?? null,
        thumbnail: r.thumbnails?.at(-1)?.url ?? null,
        url: r.webpage_url ?? r.url ?? `https://www.youtube.com/watch?v=${r.id}`,
      }));

      resolve(tracks);
    });
  });
}
