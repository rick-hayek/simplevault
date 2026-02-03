import { app, BrowserWindow, Tray, Menu, nativeImage, globalShortcut, ipcMain, shell } from 'electron';
import * as path from 'path';
import log from 'electron-log/main';

// Initialize logger
log.initialize();

// Security: Redact sensitive data from logs
log.hooks.push((message, transport) => {
    if (transport !== log.transports.file) return message;

    const SENSITIVE_KEYS = ['password', 'masterKey', 'secret', 'hash', 'payload', 'key', 'token'];

    // Helper to redact object recursively
    const redact = (obj: any): any => {
        if (!obj || typeof obj !== 'object') return obj;

        if (Array.isArray(obj)) {
            return obj.map(redact);
        }

        const newObj = { ...obj };
        for (const key of Object.keys(newObj)) {
            if (SENSITIVE_KEYS.some(k => key.toLowerCase().includes(k))) {
                newObj[key] = '[REDACTED]';
            } else if (typeof newObj[key] === 'object') {
                newObj[key] = redact(newObj[key]);
            }
        }
        return newObj;
    };

    message.data = message.data.map(arg => typeof arg === 'object' ? redact(arg) : arg);
    return message;
});

// Capture unhandled errors
log.errorHandler.startCatching();

// Set the app name explicitly
app.setName('EtherVault');
log.info('App starting: EtherVault');

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        titleBarStyle: 'hiddenInset',
        backgroundColor: '#0f172a', // Matches Slate-900
        icon: path.join(__dirname, '../assets/icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
    });

    // Open external links (target="_blank") in system browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        // Dev Mode: Allow Google Auth Popups to open internal windows (required for GSI Web Client)
        if (!app.isPackaged && (url.includes('accounts.google.com') || url.includes('googleusercontent.com'))) {
            return {
                action: 'allow',
                overrideBrowserWindowOptions: {
                    autoHideMenuBar: true,
                    center: true,
                    width: 600,
                    height: 700,
                    webPreferences: {
                        nodeIntegration: false,
                        contextIsolation: true
                    }
                }
            };
        }

        // Production / Other Links: Force System Browser
        if (url.startsWith('http:') || url.startsWith('https:')) {
            shell.openExternal(url);
        }
        return { action: 'deny' };
    });

    // In development, load from Vite dev server
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools();
    } else {
        // In production, load the built files from the local app-dist folder
        const indexPath = path.join(__dirname, '../app-dist/index.html');
        mainWindow.loadFile(indexPath).catch(err => {
            console.error('Failed to load production UI:', err);
        });

        // mainWindow.webContents.openDevTools();
    }

    // Capture load failures
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error(`Window failed to load: ${errorDescription} (${errorCode})`);
    });

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

function createTray() {
    // Use the official EtherVault tray icon (Template suffix for macOS menu bar)
    const iconPath = path.join(__dirname, '../assets/tray-iconTemplate.png');
    const icon = nativeImage.createFromPath(iconPath);
    icon.setTemplateImage(true); // Mark as template for macOS
    tray = new Tray(icon);

    const contextMenu = Menu.buildFromTemplate([
        { label: 'Open Vault', click: () => mainWindow?.show() },
        { label: 'Lock Vault', click: () => mainWindow?.webContents.send('vault-lock') },
        { type: 'separator' },
        {
            label: 'Exit', click: () => {
                isQuitting = true;
                app.quit();
            }
        }
    ]);

    tray.setToolTip('EtherVault');
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => mainWindow?.show());
}

function registerShortcuts() {
    globalShortcut.register('CommandOrControl+Shift+V', () => {
        if (mainWindow?.isVisible()) {
            mainWindow.hide();
        } else {
            mainWindow?.show();
            mainWindow?.focus();
        }
    });
}

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
    });

    // Handle Deep Links on macOS (Packaged App)
    app.on('open-url', (event, url) => {
        event.preventDefault();
        log.info('Deep Link Received (macOS):', url);
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.webContents.send('deep-link', url);
        }
    });

    app.whenReady().then(() => {
        // Register Custom Protocol (macOS) - ONLY in production
        if (app.isPackaged && !app.isDefaultProtocolClient('com.ethervault.app')) {
            app.setAsDefaultProtocolClient('com.ethervault.app');
        }

        createWindow();
        createTray();
        registerShortcuts();

        app.on('activate', () => {
            // On macOS, it's common to re-create a window in the app when the
            // dock icon is clicked and there are no other windows open.
            if (mainWindow) {
                mainWindow.show();
            } else if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });

        // Handle Quit from Dock or Cmd+Q
        app.on('before-quit', () => {
            isQuitting = true;
        });

        // Quit when all windows are closed, except on macOS. There, it's common
        // for applications and their menu bar to stay active until the user quits
        // explicitly with Cmd + Q.
        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                app.quit();
            }
        });

        // TODO: remove this
        // Set Dock Icon on macOS
        if (process.platform === 'darwin') {
            const dockIconPath = path.join(__dirname, '../assets/icon.png');
            app.dock.setIcon(dockIconPath);
        }
    });
}


// IPC Logger Handler
ipcMain.on('log-message', (event, level: string, ...args: any[]) => {
    if (['info', 'warn', 'error', 'debug'].includes(level)) {
        (log as any)[level](...args);
    }
});

ipcMain.on('log-set-enabled', (event, enabled: boolean) => {
    if (enabled) {
        log.transports.file.level = 'info';
        log.info('Master Log ENABLED by user.');
    } else {
        log.info('Master Log DISABLED by user.');
        log.transports.file.level = false;
    }
});

// Import shell efficiently or reuse if already imported
// import { shell } from 'electron';

import * as fs from 'fs';

ipcMain.on('log-open', () => {
    const logPath = log.transports.file.getFile().path;
    shell.showItemInFolder(logPath);
});

ipcMain.handle('log-read-recent', async () => {
    try {
        const logPath = log.transports.file.getFile().path;
        if (!fs.existsSync(logPath)) return [];

        const content = await fs.promises.readFile(logPath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim() !== '');

        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        const cutoff = Date.now() - ONE_DAY_MS;
        const result: string[] = [];

        // Iterate backwards to find lines within the window
        for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i];
            // Format example: [2024-01-01 12:00:00.000] [info] ...
            const match = line.match(/^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3})\]/);

            if (match) {
                const timestamp = new Date(match[1]).getTime();
                if (timestamp < cutoff) {
                    // We found a log older than 1 day. 
                    // Since logs are chronological, we can stop here.
                    break;
                }
            }
            // Include valid recent lines AND non-timestamped lines (stack traces) encountered during reverse traversal
            result.push(line);
        }

        // result is currently reversed (newest first), which is what we want for display
        return result;
    } catch (error) {
        log.error('Failed to read log file:', error);
        return [];
    }
});

import { net } from 'electron';

const MAX_REDIRECTS = 5;

ipcMain.handle('fetch-icon', async (event, url: string) => {
    return new Promise((resolve) => {
        const request = net.request(url);
        request.on('response', (response) => {
            if (response.statusCode !== 200) {
                resolve(null);
                return;
            }
            const chunks: Buffer[] = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => {
                const buffer = Buffer.concat(chunks);
                const base64 = buffer.toString('base64');
                // Ensure content type is image
                const contentType = response.headers['content-type'] || 'image/png';
                const result = `data:${contentType};base64,${base64}`;
                resolve(result);
            });
        });
        request.on('error', (error) => {
            log.warn('Failed to fetch icon via IPC:', error);
            resolve(null);
        });
        request.end();
    });
});

ipcMain.handle('get-redirect-url', async (event, url: string) => {
    try {
        // Use native fetch to follow redirects
        const response = await fetch(url.startsWith('http') ? url : `https://${url}`, {
            method: 'HEAD', // HEAD is lighter
            redirect: 'follow'
        });
        return response.url;
    } catch (error) {
        log.warn('Failed to follow redirect:', error);
        return null;
    }
});

import { session } from 'electron';

ipcMain.handle('app-clear-cache', async () => {
    try {
        await session.defaultSession.clearCache();

        // Clear log file if it exists
        const logPath = log.transports.file.getFile().path;
        if (fs.existsSync(logPath)) {
            await fs.promises.truncate(logPath, 0);
            log.info('[SYSTEM] Logs cleared by user');
        }

        return true;
    } catch (error) {
        log.error('Failed to clear cache:', error);
        return false;
    }
});

ipcMain.handle('app-get-version', () => {
    return app.getVersion();
});

// Biometric / SafeStorage IPC
import { safeStorage, systemPreferences } from 'electron';

ipcMain.handle('app-is-packaged', () => {
    return app.isPackaged;
});

ipcMain.handle('app-open-external', async (event, url: string) => {
    await shell.openExternal(url);
});

ipcMain.handle('biometrics-is-available', () => {
    return safeStorage.isEncryptionAvailable();
});

ipcMain.handle('biometrics-save', async (event, secret: string) => {
    if (!safeStorage.isEncryptionAvailable()) return false;
    try {
        const encrypted = safeStorage.encryptString(secret);
        const filePath = path.join(app.getPath('userData'), 'biometric_secret.enc');
        await fs.promises.writeFile(filePath, encrypted);
        return true;
    } catch (error) {
        log.error('Failed to save biometric secret:', error);
        return false;
    }
});

ipcMain.handle('biometrics-retrieve', async (event, reason: string) => {
    if (!safeStorage.isEncryptionAvailable()) return null;

    // On macOS, prompt for Touch ID
    if (process.platform === 'darwin') {
        const canPrompt = await systemPreferences.canPromptTouchID();
        if (canPrompt) {
            try {
                await systemPreferences.promptTouchID(reason || 'Unlock your vault');
            } catch (error) {
                log.warn('Touch ID failed or cancelled:', error);
                return null;
            }
        }
    }

    try {
        const filePath = path.join(app.getPath('userData'), 'biometric_secret.enc');
        if (!fs.existsSync(filePath)) return null;

        const buffer = await fs.promises.readFile(filePath);
        const decrypted = safeStorage.decryptString(buffer);
        return decrypted;
    } catch (error) {
        log.error('Failed to retrieve biometric secret:', error);
        return null;
    }
});

ipcMain.handle('biometrics-delete', async () => {
    try {
        const filePath = path.join(app.getPath('userData'), 'biometric_secret.enc');
        if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
        }
        return true;
    } catch (error) {
        log.error('Failed to delete biometric secret:', error);
        return false;
    }
});

ipcMain.handle('biometrics-check-saved', async () => {
    const filePath = path.join(app.getPath('userData'), 'biometric_secret.enc');
    return fs.existsSync(filePath);
});
