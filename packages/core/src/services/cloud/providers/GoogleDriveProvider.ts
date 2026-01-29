/// <reference types="vite/client" />
import { CloudProviderInterface, SyncResult } from '../models';
import { VaultStorageItem, Logger } from '../../../types';
import { AuthService } from '../../../AuthService';
import { StorageService } from '../../../StorageService';

// Declare global Google API types
declare global {
    interface Window {
        google?: any;
        gapi?: any;
    }
}

export class GoogleDriveProvider implements CloudProviderInterface {
    readonly id = 'google';
    readonly name = 'Google Drive';

    private clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
    private scope = 'https://www.googleapis.com/auth/drive.appdata';

    private tokenClient: any;
    private accessToken: string | null = null;
    private tokenExpiresAt: number = 0; // #19: Token expiration timestamp
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
                        // #19: Store token expiration time (typically 1 hour)
                        this.tokenExpiresAt = Date.now() + (response.expires_in || 3600) * 1000;

                        // Check Scopes
                        const hasScope = window.google?.accounts?.oauth2?.hasGrantedAllScopes(
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

                // 3. Trigger Popup (use empty prompt for seamless reconnection if token cached)
                this.log('info', '[GoogleDrive] Requesting Access Token...');
                this.tokenClient.requestAccessToken({ prompt: '' });
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
        this.log('info', '[GoogleDrive] Disconnecting...');
        if (this.accessToken) {
            // Revoke token if needed
            window.google?.accounts?.oauth2?.revoke(this.accessToken, () => {
                this.log('info', '[GoogleDrive] Token revoked');
            });
        }
        this.accessToken = null;
        this.tokenExpiresAt = 0;
        this.connected = false;
        console.log(`disconnect:this.connected: ${this.connected}`);
    }

    /**
     * #19: Check if the access token is still valid (not expired)
     * Tokens typically expire after 1 hour
     */
    isTokenValid(): boolean {
        if (!this.accessToken) return false;
        // Consider token invalid if it expires in less than 60 seconds
        return this.tokenExpiresAt > Date.now() + 60000;
    }

    isConnected(): boolean {
        // #19: Also check token validity
        return this.connected && this.isTokenValid();
    }

    /**
     * Fetch cloud metadata (salt + verifier) without full sync.
     * Used to check if cloud has existing data before enabling sync.
     */
    async fetchMetadata(): Promise<{ salt: string; verifier: string } | null> {
        if (!this.connected || !this.accessToken) return null;

        try {
            const fileId = await this.findFileId('metadata');
            if (!fileId) return null;

            const data = await this.downloadJson(fileId);
            if (data && data.salt) {
                return {
                    salt: data.salt,
                    verifier: data.verifier || ''
                };
            }
            return null;
        } catch (e) {
            this.log('error', '[GoogleDrive] fetchMetadata error:', e);
            return null;
        }
    }

    /**
     * Download all vault entries from cloud (for merge operation).
     * Returns raw encrypted entries - caller must decrypt with appropriate key.
     */
    async downloadAllEntries(): Promise<VaultStorageItem[]> {
        if (!this.connected || !this.accessToken) return [];

        const entries: VaultStorageItem[] = [];

        try {
            // List all files in appDataFolder
            const listUrl = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id,name)&pageSize=1000`;
            const listRes = await fetch(listUrl, {
                headers: { 'Authorization': `Bearer ${this.accessToken}` }
            });

            if (!listRes.ok) return [];
            const data = await listRes.json();

            for (const file of data.files || []) {
                // Skip metadata.json
                if (file.name === 'metadata.json') continue;

                // Download each entry
                const downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
                const downloadRes = await fetch(downloadUrl, {
                    headers: { 'Authorization': `Bearer ${this.accessToken}` }
                });

                if (downloadRes.ok) {
                    const entry = await downloadRes.json();
                    if (entry && entry.id) {
                        entries.push(entry);
                    }
                }
            }

            this.log('info', `[GoogleDrive] Downloaded ${entries.length} entries for merge.`);
            return entries;
        } catch (e) {
            this.log('error', '[GoogleDrive] downloadAllEntries error:', e);
            return [];
        }
    }

    async uploadEntry(entry: VaultStorageItem, knownFileId?: string): Promise<boolean> {
        console.log(`uploadEntry: this.connected: ${this.connected}`);
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

    // --- Metadata Sync Helpers ---

    private uint8ToBase64(arr: Uint8Array): string {
        return btoa(String.fromCharCode(...arr));
    }

    private base64ToUint8(str: string): Uint8Array {
        return Uint8Array.from(atob(str), c => c.charCodeAt(0));
    }

    private async uploadJson(name: string, content: any, knownFileId?: string): Promise<boolean> {
        if (!this.accessToken) return false;
        try {
            const fileId = knownFileId || await this.findFileId(name);
            const filename = `${name}.json`;
            const contentType = 'application/json';
            const metadata = {
                name: filename,
                parents: fileId ? [] : ['appDataFolder']
            };

            const boundary = '-------314159265358979323846';
            const delimiter = `\r\n--${boundary}\r\n`;
            const closeDelim = `\r\n--${boundary}--`;

            const multipartBody =
                delimiter +
                'Content-Type: application/json\r\n\r\n' +
                JSON.stringify(metadata) +
                delimiter +
                'Content-Type: ' + contentType + '\r\n\r\n' +
                JSON.stringify(content) +
                closeDelim;

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

            return response.ok;
        } catch (e) {
            console.error(`[GoogleDrive] Failed to upload ${name}`, e);
            return false;
        }
    }

    private async downloadJson(fileId: string): Promise<any | null> {
        try {
            const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                headers: { 'Authorization': `Bearer ${this.accessToken}` }
            });
            if (response.ok) return await response.json();
            return null;
        } catch {
            return null;
        }
    }

    private async syncMetadata(): Promise<boolean> {
        try {
            const localSalt = await StorageService.getItem('metadata', 'salt');
            // If local salt is an object (raw) or buffer, handle correct type.
            // StorageService returns what was stored. It's usually Uint8Array or object resembling it.
            // If it's a "buffer" from JSON reload, it might need conversion. 
            // Assuming Uint8Array for now as it's set in AuthService.

            let localSaltArr = localSalt;
            if (localSalt && !(localSalt instanceof Uint8Array)) {
                // Convert object to array if needed (Electron serialization quirks)
                localSaltArr = new Uint8Array(Object.values(localSalt));
            }

            const localSaltB64 = localSaltArr ? this.uint8ToBase64(localSaltArr) : null;

            // #17: Get local verifier for cloud storage
            const localVerifier = await StorageService.getItem('metadata', 'auth_verifier');
            const verifierB64 = localVerifier ? JSON.stringify(localVerifier) : null;

            const fileId = await this.findFileId('metadata');

            if (fileId) {
                const remoteData = await this.downloadJson(fileId);
                if (remoteData && remoteData.salt) {
                    if (remoteData.salt !== localSaltB64) {
                        // Fix #1: Check if we have local vault data that would become unreadable
                        const localVaultItems = await StorageService.getAll('vault');
                        if (localVaultItems.length > 0) {
                            this.log('error', '[GoogleDrive] CRITICAL: Salt mismatch with existing local data!');
                            this.log('error', '[GoogleDrive] Local vault has ' + localVaultItems.length + ' items that will become unreadable.');
                            // Do NOT adopt remote salt - this would destroy local data
                            // Instead, throw an error to alert the user
                            throw new Error('SALT_CONFLICT: Local data exists with different encryption key. Clear local data first or use the original device.');
                        }

                        this.log('warn', '[GoogleDrive] Adopting remote salt (no local data to lose).');
                        const newSalt = this.base64ToUint8(remoteData.salt);
                        await AuthService.setSalt(newSalt);

                        // #17: Also adopt remote verifier if available
                        if (remoteData.verifier) {
                            try {
                                const verifierObj = JSON.parse(remoteData.verifier);
                                await StorageService.setItem('metadata', 'auth_verifier', verifierObj);
                                this.log('info', '[GoogleDrive] Adopted remote verifier for password validation.');
                            } catch (e) {
                                this.log('warn', '[GoogleDrive] Failed to parse remote verifier');
                            }
                        }
                        return true; // Salt Changed
                    }
                }
            } else {
                // Upload local salt to cloud as source of truth
                if (localSaltB64) {
                    this.log('info', '[GoogleDrive] Initializing cloud metadata...');
                    // #17: Include verifier in metadata for new device password validation
                    await this.uploadJson('metadata', {
                        salt: localSaltB64,
                        verifier: verifierB64
                    });
                }
            }
        } catch (e) {
            console.error('[GoogleDrive] Metadata sync error', e);
            throw e; // Re-throw to let caller handle
        }
        return false;
    }

    async sync(localEntries: VaultStorageItem[]): Promise<{ updatedEntries: VaultStorageItem[]; deletedIds: string[] }> {
        if (!this.connected || !this.accessToken) return { updatedEntries: [], deletedIds: [] };
        console.log('[GoogleDrive] Syncing...');

        // 1. Check Metadata/Salt Consistency
        const saltUpdated = await this.syncMetadata();
        if (saltUpdated) {
            this.log('warn', '[GoogleDrive] CRITICAL: Encryption Salt updated. Session invalid.');
            AuthService.lock();
            throw new Error('SALT_UPDATED');
            // Calling code (SettingsView) must catch this and prompt re-login.
        }

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

            // Map for O(1) Lookup
            const remoteMap = new Map<string, any>();
            remoteFiles.forEach((f: any) => remoteMap.set(f.name, f));

            const localMap = new Map<string, VaultStorageItem>();
            localEntries.forEach(e => localMap.set(`${e.id}.json`, e));

            let uploadCount = 0;
            const updatedEntries: VaultStorageItem[] = [];

            // --- 1. DOWNSTREAM SYNC (Cloud -> Local) ---
            for (const remoteFile of remoteFiles) {
                const filename = remoteFile.name;

                // Fix #4: Skip metadata.json - it's not a vault entry
                if (filename === 'metadata.json') continue;

                const localEntry = localMap.get(filename);
                let shouldDownload = false;

                if (!localEntry) {
                    shouldDownload = true; // New remote file
                } else {
                    const remoteTime = new Date(remoteFile.modifiedTime).getTime();
                    // If remote is significantly newer (> 2s)
                    if (remoteTime > (localEntry.updatedAt + 2000)) {
                        shouldDownload = true;
                    }
                }

                if (shouldDownload) {
                    try {
                        const downloadUrl = `https://www.googleapis.com/drive/v3/files/${remoteFile.id}?alt=media`;
                        const res = await fetch(downloadUrl, {
                            headers: { 'Authorization': `Bearer ${this.accessToken}` }
                        });

                        if (res.ok) {
                            const content = await res.json();
                            // Validate content structure roughly?
                            if (content.id && content.payload) {
                                updatedEntries.push(content);
                            }
                        }
                    } catch (e) {
                        console.error(`[GoogleDrive] Failed to download ${filename}`, e);
                    }
                }
            }

            if (updatedEntries.length > 0) {
                this.log('info', `[GoogleDrive] Downloaded ${updatedEntries.length} new/updated entries.`);
            }

            // --- 2. UPSTREAM SYNC (Local -> Cloud) ---
            for (const entry of localEntries) {
                const filename = `${entry.id}.json`;
                const remoteFile = remoteMap.get(filename);

                let shouldUpload = false;
                let fileId: string | null = null;

                // If we just downloaded it, don't upload it back! 
                const justDownloaded = updatedEntries.some(e => e.id === entry.id);
                if (justDownloaded) continue;

                if (!remoteFile) {
                    shouldUpload = true; // New Entry
                } else {
                    fileId = remoteFile.id;
                    const remoteTime = new Date(remoteFile.modifiedTime).getTime();
                    if (entry.updatedAt > (remoteTime + 2000)) {
                        shouldUpload = true; // Local is newer
                    }
                }

                if (shouldUpload) {
                    const success = await this.uploadEntry(entry, fileId || undefined);
                    if (success) uploadCount++;
                }
            }

            if (uploadCount > 0) {
                this.log('info', `[GoogleDrive] Uploaded ${uploadCount} entries.`);
            }

            if (uploadCount === 0 && updatedEntries.length === 0) {
                this.log('info', '[GoogleDrive] Sync complete. No changes.');
            }

            return { updatedEntries, deletedIds: [] };
        } catch (e) {
            console.error('[GoogleDrive] Sync Exception:', e);
            return { updatedEntries: [], deletedIds: [] };
        }
    }

    // Fix #8: Parallel deletion for performance
    async clearRemoteData(): Promise<void> {
        if (!this.connected || !this.accessToken) return;
        this.log('warn', '[GoogleDrive] CLEARING ALL REMOTE DATA...');

        try {
            const query = `'appDataFolder' in parents and trashed = false`;
            const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&spaces=appDataFolder&fields=files(id, name)`;
            const response = await fetch(url, { headers: { 'Authorization': `Bearer ${this.accessToken}` } });
            const data = await response.json();

            if (data.files && data.files.length > 0) {
                // Parallel deletion for performance
                const deletePromises = data.files.map((file: any) =>
                    fetch(`https://www.googleapis.com/drive/v3/files/${file.id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${this.accessToken}` }
                    })
                );
                await Promise.all(deletePromises);
                this.log('info', `[GoogleDrive] Deleted ${data.files.length} remote files.`);
            }
        } catch (e) {
            console.error('Failed to clear data', e);
            throw e;
        }
    }
}
