import { existsSync, mkdirSync, createWriteStream, unlinkSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';
import { execFileSync } from 'node:child_process';
import https from 'node:https';
import http from 'node:http';

const YTDLP_RELEASE_URL = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
const YTDLP_FILENAME = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';

let resolvedPath: string | null = null;
let ensurePromise: Promise<string> | null = null;

function getDataDir(): string {
  try {
    return app.getPath('userData');
  } catch {
    return join(process.cwd(), 'data');
  }
}

function getBinDir(): string {
  const dir = join(getDataDir(), 'bin');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Resolve yt-dlp binary path synchronously (for callers that already ensured it).
 */
export function ytdlpPath(): string {
  if (resolvedPath) return resolvedPath;
  resolvedPath = findExisting();
  return resolvedPath;
}

/**
 * Ensure yt-dlp is available — downloads if not found. Call once at startup.
 */
export async function ensureYtdlp(): Promise<string> {
  if (resolvedPath) return resolvedPath;

  const found = findExisting();
  if (found !== 'yt-dlp') {
    resolvedPath = found;
    return resolvedPath;
  }

  // Need to download — deduplicate concurrent calls
  if (!ensurePromise) {
    ensurePromise = downloadYtdlp().finally(() => { ensurePromise = null; });
  }
  resolvedPath = await ensurePromise;
  return resolvedPath;
}

function findExisting(): string {
  // 1. Check our own bin directory (previously downloaded)
  const local = join(getBinDir(), YTDLP_FILENAME);
  if (existsSync(local)) return local;

  // 2. Check bundled location
  try {
    const bundled = join(app.getAppPath(), '..', 'resources', YTDLP_FILENAME);
    if (existsSync(bundled)) return bundled;
  } catch {
    // app not ready yet
  }

  // 3. Check common Python Scripts dirs (Windows)
  if (process.platform === 'win32') {
    const home = process.env.USERPROFILE ?? process.env.HOME ?? '';
    const candidates = [
      join(home, 'AppData', 'Local', 'Programs', 'Python', 'Python310', 'Scripts', 'yt-dlp.exe'),
      join(home, 'AppData', 'Local', 'Programs', 'Python', 'Python311', 'Scripts', 'yt-dlp.exe'),
      join(home, 'AppData', 'Local', 'Programs', 'Python', 'Python312', 'Scripts', 'yt-dlp.exe'),
      join(home, 'AppData', 'Local', 'Programs', 'Python', 'Python313', 'Scripts', 'yt-dlp.exe'),
      join(home, 'AppData', 'Roaming', 'Python', 'Scripts', 'yt-dlp.exe'),
    ];
    for (const p of candidates) {
      if (existsSync(p)) return p;
    }
  }

  // 4. Try `where` (Windows) or `which` (Unix)
  try {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    const result = execFileSync(cmd, ['yt-dlp'], { encoding: 'utf-8', timeout: 5000 }).trim();
    const firstLine = result.split('\n')[0].trim();
    if (firstLine && existsSync(firstLine)) return firstLine;
  } catch {
    // not found
  }

  return 'yt-dlp';
}

function downloadYtdlp(): Promise<string> {
  const dest = join(getBinDir(), YTDLP_FILENAME);
  const tempDest = dest + '.tmp';

  console.log('[yt-dlp] Downloading from', YTDLP_RELEASE_URL);

  return new Promise((resolve, reject) => {
    const follow = (url: string, redirects = 0) => {
      if (redirects > 5) { reject(new Error('Too many redirects')); return; }

      const client = url.startsWith('https') ? https : http;
      client.get(url, (res) => {
        // Follow redirects
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          follow(res.headers.location, redirects + 1);
          return;
        }

        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`Download failed: HTTP ${res.statusCode}`));
          return;
        }

        const file = createWriteStream(tempDest);
        res.pipe(file);
        file.on('finish', () => {
          file.close(() => {
            try {
              // Atomic rename
              if (existsSync(dest)) unlinkSync(dest);
              const { renameSync } = require('node:fs');
              renameSync(tempDest, dest);
              if (process.platform !== 'win32') chmodSync(dest, 0o755);
              console.log('[yt-dlp] Downloaded to', dest);
              resolve(dest);
            } catch (err) {
              reject(err);
            }
          });
        });
        file.on('error', (err) => {
          try { unlinkSync(tempDest); } catch {}
          reject(err);
        });
      }).on('error', (err) => {
        try { unlinkSync(tempDest); } catch {}
        reject(err);
      });
    };

    follow(YTDLP_RELEASE_URL);
  });
}
