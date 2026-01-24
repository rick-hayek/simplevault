import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    platform: process.platform,
    version: process.versions.electron,
    onVaultLock: (callback: () => void) => ipcRenderer.on('vault-lock', callback),
});

console.log('EtherVault Preload Script Loaded');
