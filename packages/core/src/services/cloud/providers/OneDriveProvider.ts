/// <reference types="vite/client" />
import { CloudProviderInterface } from '../models';
import { VaultStorageItem, Logger } from '../../../types';

declare global {
    interface Window {
        msal?: any;
    }
}

export class OneDriveProvider implements CloudProviderInterface {
    readonly id = 'onedrive';
    readonly name = 'OneDrive';

    private clientId = import.meta.env.VITE_ONEDRIVE_CLIENT_ID || '';
    private authority = 'https://login.microsoftonline.com/common';
    // Use window.location.origin for redirect, assuming SPA handles it
    private redirectUri = typeof window !== 'undefined' ? window.location.origin : '';

    // Scopes needed for App Folder access
    // Files.ReadWrite.AppFolder is preferred for isolation.
    // User.Read needed for account info.
    private scopes = ['Files.ReadWrite.AppFolder', 'User.Read'];

    private msalInstance: any;
    private account: any = null;
    private logger: Logger | null = null;
    private msalLoaded = false;

    setLogger(logger: Logger) {
        this.logger = logger;
    }

    private log(level: 'info' | 'warn' | 'error', ...args: any[]) {
        if (this.logger) {
            this.logger[level](...args);
        } else {
            console[level](...args);
        }
    }

    private async loadScript(src: string): Promise<void> {
        if (document.querySelector(`script[src="${src}"]`)) return;
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
            document.head.appendChild(script);
        });
    }

    private async ensureMsalInitialized(): Promise<boolean> {
        if (this.msalInstance) return true;

        try {
            await this.loadScript('https://alcdn.msauth.net/browser/2.30.0/js/msal-browser.min.js');

            if (!window.msal) {
                this.log('error', '[OneDrive] MSAL.js not loaded.');
                return false;
            }

            if (!this.clientId) {
                this.log('error', '[OneDrive] Missing Client ID. Please set VITE_ONEDRIVE_CLIENT_ID.');
                return false;
            }

            const msalConfig = {
                auth: {
                    clientId: this.clientId,
                    authority: this.authority,
                    redirectUri: this.redirectUri,
                },
                cache: {
                    cacheLocation: 'localStorage',
                    storeAuthStateInCookie: false,
                }
            };

            this.msalInstance = new window.msal.PublicClientApplication(msalConfig);
            await this.msalInstance.initialize();
            this.msalLoaded = true;
            return true;
        } catch (e) {
            this.log('error', '[OneDrive] Failed to initialize MSAL:', e);
            return false;
        }
    }

    async connect(): Promise<boolean> {
        if (this.isConnected()) {
            this.log('info', '[OneDrive] Already connected.');
            return true;
        }

        if (!await this.ensureMsalInitialized()) return false;

        try {
            // Try silent login first (if cached)
            const accounts = this.msalInstance.getAllAccounts();
            if (accounts.length > 0) {
                this.account = accounts[0];
                this.msalInstance.setActiveAccount(this.account);
                this.log('info', '[OneDrive] Restored session for:', this.account.username);
                return true;
            }

            // Interactive login
            this.log('info', '[OneDrive] Starting login popup...');
            const result = await this.msalInstance.loginPopup({
                scopes: this.scopes,
                prompt: 'select_account'
            });

            if (result && result.account) {
                this.account = result.account;
                this.msalInstance.setActiveAccount(this.account);
                this.log('info', '[OneDrive] Connected:', this.account.username);
                return true;
            }

            return false;
        } catch (e) {
            this.log('error', '[OneDrive] Connection failed:', e);
            return false;
        }
    }

    async disconnect(): Promise<void> {
        if (this.msalInstance) {
            await this.msalInstance.logoutPopup();
            this.account = null;
        }
    }

    isConnected(): boolean {
        return !!this.account;
    }

    private async getToken(): Promise<string | null> {
        if (!this.account || !this.msalInstance) return null;
        try {
            const response = await this.msalInstance.acquireTokenSilent({
                scopes: this.scopes,
                account: this.account
            });
            return response.accessToken;
        } catch (e) {
            this.log('warn', '[OneDrive] Silent token acquisition failed, trying popup:', e);
            try {
                const response = await this.msalInstance.acquireTokenPopup({
                    scopes: this.scopes
                });
                return response.accessToken;
            } catch (e2) {
                this.log('error', '[OneDrive] Token acquisition failed:', e2);
                return null;
            }
        }
    }

    // --- Sync Implementation Stubs ---

    async uploadEntry(entry: VaultStorageItem): Promise<boolean> {
        // TODO: Implement single entry upload? 
        return true;
    }

    async deleteEntry(id: string): Promise<boolean> {
        return true;
    }

    async sync(localEntries: VaultStorageItem[]): Promise<{ updatedEntries: VaultStorageItem[]; deletedIds: string[]; }> {
        const token = await this.getToken();
        if (!token) return { updatedEntries: [], deletedIds: [] };

        this.log('info', '[OneDrive] Sync triggered (Not fully implemented yet)');

        // Placeholder for real sync logic
        return { updatedEntries: [], deletedIds: [] };
    }
}
