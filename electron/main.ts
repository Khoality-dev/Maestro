import { app, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage } from 'electron';
import * as path from 'node:path';
import { autoUpdater } from 'electron-updater';
import { playerController } from './player/controller.js';
import { createMcpServer } from './mcp/server.js';
import { startMcpTransport } from './mcp/transport.js';
import { ensureYtdlp } from './youtube/index.js';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

function createTray(): void {
  // Use app icon if available, otherwise fall back to empty icon
  const iconPath = process.platform === 'win32'
    ? path.join(__dirname, '../resources/icon.ico')
    : path.join(__dirname, '../resources/icon.png');
  const trayIcon = nativeImage.createFromPath(iconPath);
  // If icon file doesn't exist, createFromPath returns empty — that's fine

  tray = new Tray(trayIcon);
  tray.setToolTip('Maestro');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 600,
    minHeight: 400,
    title: 'Maestro',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  playerController.setWindow(mainWindow);

  // In dev, load from vite dev server; in prod, load built files
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Hide to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function registerIpcHandlers(): void {
  ipcMain.handle('player:play', async (_event, query: string) => {
    return playerController.play(query);
  });

  ipcMain.handle('player:pause', async () => {
    playerController.pause();
  });

  ipcMain.handle('player:resume', async () => {
    playerController.resume();
  });

  ipcMain.handle('player:skip', async () => {
    playerController.skip();
  });

  ipcMain.handle('player:stop', async () => {
    playerController.stop();
  });

  ipcMain.handle('player:add-to-queue', async (_event, query: string) => {
    return playerController.addToQueue(query);
  });

  ipcMain.handle('player:remove-from-queue', async (_event, index: number) => {
    return playerController.removeFromQueue(index);
  });

  ipcMain.handle('player:clear-queue', async () => {
    playerController.clearQueue();
  });

  ipcMain.handle('player:move-in-queue', async (_event, fromIndex: number, toIndex: number) => {
    playerController.moveInQueue(fromIndex, toIndex);
  });

  ipcMain.handle('player:set-volume', async (_event, volume: number) => {
    playerController.setVolume(volume);
  });

  ipcMain.handle('player:set-loop-mode', async (_event, mode: string) => {
    playerController.setLoopMode(mode as any);
  });

  ipcMain.handle('player:search', async (_event, query: string) => {
    return playerController.search(query);
  });

  ipcMain.handle('player:enqueue', async (_event, track: any) => {
    playerController.enqueue(track);
  });

  ipcMain.handle('player:get-state', async () => {
    return playerController.getState();
  });

  ipcMain.on('player:track-finished', () => {
    playerController.onTrackFinished();
  });
}

app.whenReady().then(async () => {
  registerIpcHandlers();
  createTray();
  createWindow();

  // Ensure yt-dlp is available (downloads if needed)
  ensureYtdlp().catch((err) => console.error('[yt-dlp] Auto-install failed:', err));

  // Auto-update (skip in dev)
  if (!process.env.VITE_DEV_SERVER_URL) {
    setupAutoUpdater();
  }

  // Start MCP server — factory creates fresh server per transport connection
  await startMcpTransport(createMcpServer);

  app.on('activate', () => {
    if (mainWindow) {
      mainWindow.show();
    } else {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  // Don't quit — tray keeps the app running
});

function setupAutoUpdater(): void {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-downloaded', (info) => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: `Version ${info.version} has been downloaded. Restart to apply the update.`,
      buttons: ['Restart Now', 'Later'],
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });

  autoUpdater.checkForUpdatesAndNotify().catch((err) => {
    console.error('[AutoUpdater] Check failed:', err);
  });
}
