import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'node:path';
import { playerController } from './player/controller.js';
import { createMcpServer } from './mcp/server.js';
import { startMcpTransport } from './mcp/transport.js';

let mainWindow: BrowserWindow | null = null;

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
  createWindow();

  // Start MCP server — factory creates fresh server per transport connection
  await startMcpTransport(createMcpServer);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
