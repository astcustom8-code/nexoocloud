import { app, BrowserWindow, Menu, Tray, ipcMain } from 'electron';
import * as path from 'path';
import { CacheManager } from './cacheManager';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
const cacheManager = new CacheManager();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    backgroundColor: '#05070B',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../src/renderer/index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  // Use a fallback or custom icon path
  tray = new Tray(path.join(__dirname, '../assets/icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'NEXOO Cloud - Mounted (NEXOO Cloud SSD)', enabled: false },
    { type: 'separator' },
    { label: 'Open Dashboard', click: () => mainWindow?.show() },
    { label: 'Sync Status: Active', enabled: false },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);
  tray.setToolTip('NEXOO Cloud (1TB Active)');
  tray.setContextMenu(contextMenu);
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  ipcMain.handle('get-cache-status', () => {
    return cacheManager.getStatus();
  });

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
