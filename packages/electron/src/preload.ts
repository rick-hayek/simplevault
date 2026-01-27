import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    platform: process.platform,
    version: process.versions.electron,
    onVaultLock: (callback: () => void) => ipcRenderer.on('vault-lock', callback),
    clearCache: () => ipcRenderer.invoke('app-clear-cache'),
    getVersion: () => ipcRenderer.invoke('app-get-version'),
    log: {
        info: (...args: any[]) => ipcRenderer.send('log-message', 'info', ...args),
        warn: (...args: any[]) => ipcRenderer.send('log-message', 'warn', ...args),
        error: (...args: any[]) => ipcRenderer.send('log-message', 'error', ...args),
        setEnabled: (enabled: boolean) => ipcRenderer.send('log-set-enabled', enabled),
        openLogFile: () => ipcRenderer.send('log-open'),
        getRecentLogs: () => ipcRenderer.invoke('log-read-recent'),
    },
    utils: {
        fetchIcon: (url: string) => ipcRenderer.invoke('fetch-icon', url),
    }
});

console.log('EtherVault Preload Script Loaded');
