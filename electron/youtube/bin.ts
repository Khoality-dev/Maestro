import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';
import { execFileSync } from 'node:child_process';

let resolvedPath: string | null = null;

/**
 * Resolve yt-dlp binary path.
 * Checks (in order):
 *   1. Bundled binary next to the app (resources/yt-dlp.exe)
 *   2. Common Python Scripts locations
 *   3. yt-dlp on system PATH (via `where` on Windows)
 */
export function ytdlpPath(): string {
  if (resolvedPath) return resolvedPath;

  // 1. Check bundled location
  try {
    const bundled = join(app.getAppPath(), '..', 'resources', 'yt-dlp.exe');
    if (existsSync(bundled)) {
      resolvedPath = bundled;
      return resolvedPath;
    }
  } catch {
    // app not ready yet
  }

  // 2. Check common Python Scripts dirs (Windows)
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
      if (existsSync(p)) {
        resolvedPath = p;
        return resolvedPath;
      }
    }
  }

  // 3. Try `where` (Windows) or `which` (Unix) to find it on PATH
  try {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    const result = execFileSync(cmd, ['yt-dlp'], { encoding: 'utf-8', timeout: 5000 }).trim();
    const firstLine = result.split('\n')[0].trim();
    if (firstLine && existsSync(firstLine)) {
      resolvedPath = firstLine;
      return resolvedPath;
    }
  } catch {
    // not found via where/which
  }

  // 4. Fallback — hope it's on PATH at runtime
  resolvedPath = 'yt-dlp';
  return resolvedPath;
}
