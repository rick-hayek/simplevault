/// <reference types="vite/client" />
import { CloudProviderInterface, SyncResult } from '../models';
import { VaultStorageItem, Logger } from '../../../types';

// Declare global Google API types
declare global {
    interface Window {
        google?: any;
    }
}
declare const google: any;
declare const gapi: any;

export class GoogleDriveProvider implements CloudProviderInterface {
    readonly id = 'google';
    readonly name = 'Google Drive';

    private clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
    private apiKey = ''; // Optional
    private discoveryDocs = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
    private scope = 'https://www.googleapis.com/auth/drive.appdata';

    private tokenClient: any;
    private accessToken: string | null = null;
    private connected = false;
    private logger: Logger | null = null;

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

    async connect(): Promise<boolean> {
        if (this.connected && this.accessToken) {
            this.log('info', '[GoogleDrive] Already connected.');
            return true;
        }

        this.log('info', '[GoogleDrive] Starting connection flow...');

        try {
            // 1. Load Google Identity Services (GIS) and GAPI
            await this.loadScript('https://accounts.google.com/gsi/client');
            await this.loadScript('https://apis.google.com/js/api.js');

            if (!window.google || !window.google.accounts) {
                this.log('error', '[GoogleDrive] Google Identity Services not available.');
                return false;
            }

            // 2. Initialize Token Client
            this.log('info', '[GoogleDrive] Initializing Token Client...');
            return new Promise((resolve) => {
                this.tokenClient = window.google.accounts.oauth2.initTokenClient({
                    client_id: this.clientId,
                    scope: this.scope,
                    callback: (response: any) => {
                        if (response.error) {
                            this.log('error', '[GoogleDrive] Auth Error:', response);
                            resolve(false);
                            return;
                        }

                        this.accessToken = response.access_token;

                        // Check Scopes
                        const hasScope = google.accounts.oauth2.hasGrantedAllScopes(
                            response,
                            this.scope
                        );

                        if (!hasScope) {
                            this.log('warn', '[GoogleDrive] WARNING: drive.appdata scope NOT granted by user!');
                        } else {
                            this.log('info', '[GoogleDrive] drive.appdata scope confirmed.');
                        }

                        this.connected = true;
                        this.log('info', '[GoogleDrive] Connected! Token received.');
                        resolve(true);
                    },
                });

                // 3. Trigger Popup
                this.log('info', '[GoogleDrive] Requesting Access Token...');
                this.tokenClient.requestAccessToken({ prompt: 'consent' });
            });
        } catch (e) {
            console.error('[GoogleDrive] Initialization failed:', e);
            return false;
        }
    }

    private loadScript(src: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                this.log('info', `[GoogleDrive] Script already loaded: ${src}`);
                resolve();
                return;
            }

            this.log('info', `[GoogleDrive] Loading script: ${src}`);
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.defer = true;

            script.onload = () => {
                this.log('info', `[GoogleDrive] Script loaded: ${src}`);
                resolve();
            };

            script.onerror = (e) => {
                this.log('error', `[GoogleDrive] Script failed to load: ${src}`, e);
                reject(new Error(`Failed to load ${src}`));
            };

            document.body.appendChild(script);
        });
    }

    async disconnect(): Promise<void> {
        console.log('[GoogleDrive] Disconnecting...');
        if (this.accessToken) {
            // Revoke token if needed
            google?.accounts?.oauth2?.revoke(this.accessToken, () => {
                console.log('Token revoked');
            });
        }
        this.accessToken = null;
        this.connected = false;
    }

    isConnected(): boolean {
        return this.connected;
    }

    async uploadEntry(entry: VaultStorageItem, knownFileId?: string): Promise<boolean> {
        if (!this.connected || !this.accessToken) return false;
        // console.log(`[GoogleDrive] Uploading entry: ${entry.id}`); // Reduce noise

        try {
            // 1. Check if file exists (or use provided ID)
            const fileId = knownFileId || await this.findFileId(entry.id);

            // 2. Prepare Metadata and Content
            const filename = `${entry.id}.json`;
            const contentType = 'application/json';
            const metadata = {
                name: filename,
                parents: fileId ? [] : ['appDataFolder'] // Only set parent on creation
            };

            const fileContent = JSON.stringify(entry);

            // 3. Construct Multipart Request (Simple, without external libraries)
            const boundary = '-------314159265358979323846';
            const delimiter = `\r\n--${boundary}\r\n`;
            const closeDelim = `\r\n--${boundary}--`;

            const multipartBody =
                delimiter +
                'Content-Type: application/json\r\n\r\n' +
                JSON.stringify(metadata) +
                delimiter +
                'Content-Type: ' + contentType + '\r\n\r\n' +
                fileContent +
                closeDelim;

            // 4. Send Request (POST for create, PATCH for update)
            const method = fileId ? 'PATCH' : 'POST';
            const endpoint = fileId
                ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
                : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

            const response = await fetch(endpoint, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': `multipart/related; boundary=${boundary}`
                },
                body: multipartBody
            });

            if (!response.ok) {
                const err = await response.json();
                console.error('[GoogleDrive] Upload API Error:', err);
                return false;
            }

            console.log(`[GoogleDrive] Entry ${entry.id} uploaded successfully.`);
            return true;
        } catch (e) {
            console.error('[GoogleDrive] Upload Exception:', e);
            return false;
        }
    }

    private async findFileId(entryId: string): Promise<string | null> {
        const query = `name = '${entryId}.json' and 'appDataFolder' in parents and trashed = false`;
        const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&spaces=appDataFolder&fields=files(id)`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${this.accessToken}` }
        });

        if (!response.ok) return null;

        const data = await response.json();
        if (data.files && data.files.length > 0) {
            return data.files[0].id;
        }
        return null;
    }

    async deleteEntry(id: string): Promise<boolean> {
        if (!this.connected || !this.accessToken) return false;
        console.log(`[GoogleDrive] Deleting entry: ${id}`);

        try {
            const fileId = await this.findFileId(id);
            if (!fileId) {
                console.warn('[GoogleDrive] File not found for deletion.');
                return true; // Treat as success
            }

            const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.accessToken}` }
            });

            if (!response.ok) {
                console.error('[GoogleDrive] Delete API Error');
                return false;
            }
            return true;
        } catch (e) {
            console.error('[GoogleDrive] Delete Exception:', e);
            return false;
        }
    }

    async sync(localEntries: VaultStorageItem[]): Promise<{ updatedEntries: VaultStorageItem[]; deletedIds: string[] }> {
        if (!this.connected || !this.accessToken) return { updatedEntries: [], deletedIds: [] };
        console.log('[GoogleDrive] Syncing...');

        try {
            // List all files in appDataFolder
            const query = `'appDataFolder' in parents and trashed = false`;
            const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&spaces=appDataFolder&fields=files(id, name, modifiedTime)`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${this.accessToken}` }
            });

            if (!response.ok) {
                const errorText = await response.text();
                this.log('error', `[GoogleDrive] Sync failed (${response.status}):`, errorText);
                return { updatedEntries: [], deletedIds: [] };
            }

            const data = await response.json();
            const remoteFiles = data.files || [];
            console.log(`[GoogleDrive] Found ${remoteFiles.length} remote files.`);

            // Map for O(1) Lookup: "entryID.json" -> File Object
            const remoteMap = new Map<string, any>();
            remoteFiles.forEach((f: any) => remoteMap.set(f.name, f));

            let uploadCount = 0;

            // --- UPSTREAM SYNC (Local -> Cloud) ---
            for (const entry of localEntries) {
                const filename = `${entry.id}.json`;
                const remoteFile = remoteMap.get(filename);

                let shouldUpload = false;
                let fileId: string | null = null;

                if (!remoteFile) {
                    shouldUpload = true; // New Entry
                } else {
                    fileId = remoteFile.id;
                    // Check timestamp
                    // entry.updatedAt is ms epoch. remoteFile.modifiedTime is ISO string.
                    const remoteTime = new Date(remoteFile.modifiedTime).getTime();
                    // Allow 2 second drift tolerance
                    if (entry.updatedAt > (remoteTime + 2000)) {
                        shouldUpload = true; // Local is newer
                    }
                }

                if (shouldUpload) {
                    // Sequential upload to avoid rate limits
                    const success = await this.uploadEntry(entry, fileId || undefined);
                    if (success) uploadCount++;
                }
            }

            if (uploadCount > 0) {
                this.log('info', `[GoogleDrive] Sync Complete. Uploaded ${uploadCount} entries.`);
            } else {
                this.log('info', '[GoogleDrive] specific sync triggered. No local changes to upload.');
            }

            return { updatedEntries: [], deletedIds: [] };
        } catch (e) {
            console.error('[GoogleDrive] Sync Exception:', e);
            return { updatedEntries: [], deletedIds: [] };
        }
    }
}
