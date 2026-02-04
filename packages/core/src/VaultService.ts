import { PasswordEntry, VaultStorageItem } from './types';
import { CryptoService, getCryptoService } from './CryptoService';
import { AuthService, getAuthService } from './AuthService';
import { StorageService, getStorageService } from './StorageService';
import { SecurityService } from './SecurityService';
import { CloudService } from './services/cloud/CloudService';
import type { ICryptoService, IStorageService, IAuthService, ISecurityService, ICloudService, IVaultService } from './interfaces';

/**
 * Instance-based VaultService implementation.
 * Use getVaultService() singleton for production, or instantiate directly for testing.
 */
export class VaultServiceImpl implements IVaultService {
    private entries: PasswordEntry[] = [];

    constructor(
        private cryptoService: ICryptoService,
        private storageService: IStorageService,
        private authServiceGetter: () => IAuthService,
        private securityService?: ISecurityService,
        private cloudService?: ICloudService
    ) { }

    async setInitialEntries(entries: PasswordEntry[]): Promise<void> {
        this.entries = entries;
    }

    async getEncryptedEntries(): Promise<VaultStorageItem[]> {
        return this.storageService.getAll('vault');
    }

    async getEntries(): Promise<PasswordEntry[]> {
        if (this.entries.length > 0) return [...this.entries];

        const key = this.authServiceGetter().getMasterKey();
        const encryptedEntries = await this.storageService.getAll('vault');

        const decryptedEntries = encryptedEntries.map(e => {
            try {
                if (!e.payload || !e.nonce) return null;
                const decryptedData = this.cryptoService.decrypt(e.payload, e.nonce, key);
                return { ...e, ...JSON.parse(decryptedData) };
            } catch (err) {
                console.warn(`[VaultService] Skipping entry ${e.id}: Decryption failed (Key mismatch)`);
                return null;
            }
        });

        this.entries = decryptedEntries.filter((e): e is PasswordEntry => e !== null);

        return [...this.entries];
    }

    async addEntry(entry: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<PasswordEntry> {
        const key = this.authServiceGetter().getMasterKey();
        const id = crypto.randomUUID();
        const newEntry: PasswordEntry = {
            ...entry,
            id,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            favorite: entry.favorite || false,
            strength: entry.password && this.securityService
                ? this.securityService.calculateStrength(entry.password)
                : 'Weak'
        };

        const sensitiveFields = {
            title: newEntry.title,
            username: newEntry.username,
            password: newEntry.password,
            website: newEntry.website,
            url: newEntry.url,
            notes: newEntry.notes,
            category: newEntry.category,
            tags: newEntry.tags
        };

        const { ciphertext, nonce } = this.cryptoService.encrypt(JSON.stringify(sensitiveFields), key);

        const storageItem: VaultStorageItem = {
            id,
            payload: ciphertext,
            nonce,
            category: newEntry.category,
            createdAt: newEntry.createdAt,
            updatedAt: newEntry.updatedAt,
            favorite: newEntry.favorite,
            icon: newEntry.icon
        };

        await this.storageService.setItem('vault', id, storageItem);
        this.entries = [newEntry, ...this.entries];

        // Sync to Cloud (Background)
        if (this.cloudService) {
            this.cloudService.uploadEntry(storageItem).catch((e: Error) => console.error('Cloud Sync Failed:', e));
        }

        return newEntry;
    }

    async updateEntry(id: string, updates: Partial<PasswordEntry>): Promise<PasswordEntry> {
        const key = this.authServiceGetter().getMasterKey();
        const existing = this.entries.find(e => e.id === id);
        if (!existing) throw new Error('Entry not found');

        const updated = { ...existing, ...updates, updatedAt: Date.now() };
        if (updates.password && this.securityService) {
            updated.strength = this.securityService.calculateStrength(updates.password);
        }

        const sensitiveFields = {
            title: updated.title,
            username: updated.username,
            password: updated.password,
            website: updated.website,
            url: updated.url,
            notes: updated.notes,
            category: updated.category,
            tags: updated.tags
        };

        const { ciphertext, nonce } = this.cryptoService.encrypt(JSON.stringify(sensitiveFields), key);

        const storageItem: VaultStorageItem = {
            id,
            payload: ciphertext,
            nonce,
            category: updated.category,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
            favorite: updated.favorite,
            icon: updated.icon
        };

        await this.storageService.setItem('vault', id, storageItem);
        this.entries = this.entries.map(e => e.id === id ? updated : e);

        // Sync to Cloud (Background)
        if (this.cloudService) {
            this.cloudService.uploadEntry(storageItem).catch((e: Error) => console.error('Cloud Sync Failed:', e));
        }

        return updated;
    }

    async deleteEntry(id: string): Promise<void> {
        await this.storageService.deleteItem('vault', id);
        this.entries = this.entries.filter(e => e.id !== id);

        // Sync to Cloud (Background)
        if (this.cloudService) {
            this.cloudService.deleteEntry(id).catch(e => console.error('Cloud Sync Failed:', e));
        }
    }

    async exportVault(key: Uint8Array): Promise<string> {
        const data = JSON.stringify(this.entries);
        const encrypted = this.cryptoService.encrypt(data, key);
        return JSON.stringify(encrypted);
    }

    async importVault(encryptedJson: string, key: Uint8Array): Promise<void> {
        const { ciphertext, nonce } = JSON.parse(encryptedJson);
        const decrypted = this.cryptoService.decrypt(ciphertext, nonce, key);
        this.entries = JSON.parse(decrypted);
    }

    async reencryptVault(newKey: Uint8Array): Promise<void> {
        const entries = await this.getEntries();

        const updates = entries.map(async (entry) => {
            const sensitiveFields = {
                title: entry.title,
                username: entry.username,
                password: entry.password,
                website: entry.website,
                url: entry.url,
                notes: entry.notes,
                category: entry.category,
                tags: entry.tags
            };

            const { ciphertext, nonce } = this.cryptoService.encrypt(JSON.stringify(sensitiveFields), newKey);

            const storageItem = {
                id: entry.id,
                payload: ciphertext,
                nonce,
                category: entry.category,
                createdAt: entry.createdAt,
                updatedAt: entry.updatedAt,
                favorite: entry.favorite
            };

            await this.storageService.setItem('vault', entry.id, storageItem);
        });

        await Promise.all(updates);
    }

    async processCloudEntries(items: VaultStorageItem[]): Promise<void> {
        if (items.length === 0) return;
        console.log(`[VaultService] Processing ${items.length} incoming cloud entries...`);

        const key = this.authServiceGetter().getMasterKey();
        const savePromises: Promise<void>[] = [];
        let successCount = 0;
        let failCount = 0;

        for (const item of items) {
            try {
                if (!item.payload || !item.nonce) {
                    console.warn(`[VaultService] Item ${item.id} missing payload/nonce - skipping`);
                    failCount++;
                    continue;
                }

                const decryptedData = this.cryptoService.decrypt(item.payload, item.nonce, key);
                const decryptedEntry = { ...item, ...JSON.parse(decryptedData) };

                savePromises.push(this.storageService.setItem('vault', item.id, item));

                const index = this.entries.findIndex(e => e.id === item.id);
                if (index !== -1) {
                    this.entries[index] = decryptedEntry;
                } else {
                    this.entries.push(decryptedEntry);
                }
                successCount++;
            } catch (e) {
                console.error(`[VaultService] Failed to decrypt cloud entry ${item.id}. Skipping save.`);
                failCount++;
            }
        }

        await Promise.all(savePromises);
        console.log(`[VaultService] Cloud Import Result: ${successCount} saved, ${failCount} skipped (decryption failed).`);

        this.entries.sort((a, b) => b.createdAt - a.createdAt);
    }

    async mergeCloudEntries(
        cloudEntries: VaultStorageItem[],
        cloudKey: Uint8Array
    ): Promise<number> {
        const localKey = this.authServiceGetter().getMasterKey();
        let mergedCount = 0;

        for (const item of cloudEntries) {
            try {
                if (!item.payload || !item.nonce) {
                    console.warn(`[VaultService] Merge: Item ${item.id} missing payload/nonce - skipping`);
                    continue;
                }

                const decryptedData = this.cryptoService.decrypt(item.payload, item.nonce, cloudKey);
                const decryptedFields = JSON.parse(decryptedData);

                const existingIndex = this.entries.findIndex(e => e.id === item.id);
                if (existingIndex !== -1) {
                    if (this.entries[existingIndex].updatedAt >= item.updatedAt) {
                        console.log(`[VaultService] Merge: Skipping ${item.id} - local is newer`);
                        continue;
                    }
                }

                const { ciphertext, nonce } = this.cryptoService.encrypt(
                    JSON.stringify(decryptedFields),
                    localKey
                );

                const newStorageItem: VaultStorageItem = {
                    id: item.id,
                    payload: ciphertext,
                    nonce,
                    category: decryptedFields.category || item.category,
                    createdAt: item.createdAt,
                    updatedAt: item.updatedAt,
                    favorite: decryptedFields.favorite ?? item.favorite,
                    icon: item.icon
                };

                await this.storageService.setItem('vault', item.id, newStorageItem);

                const fullEntry = { ...newStorageItem, ...decryptedFields };
                if (existingIndex !== -1) {
                    this.entries[existingIndex] = fullEntry;
                } else {
                    this.entries.push(fullEntry);
                }

                mergedCount++;
            } catch (e) {
                console.error(`[VaultService] Merge: Failed to process ${item.id}:`, e);
            }
        }

        this.entries.sort((a, b) => b.createdAt - a.createdAt);

        console.log(`[VaultService] Merge complete: ${mergedCount}/${cloudEntries.length} entries merged.`);
        return mergedCount;
    }

    async clearLocalVault(): Promise<void> {
        await this.storageService.clear('vault');
        this.entries = [];
        console.log('[VaultService] Local vault cleared.');
    }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let _vaultServiceInstance: VaultServiceImpl | null = null;

/**
 * Get the singleton VaultService instance.
 * Lazy initialization on first call.
 */
export function getVaultService(): VaultServiceImpl {
    if (!_vaultServiceInstance) {
        // Adapt static SecurityService to ISecurityService interface
        const securityAdapter: ISecurityService = {
            calculateStrength: (password: string) => SecurityService.calculateStrength(password)
        };

        _vaultServiceInstance = new VaultServiceImpl(
            getCryptoService(),
            getStorageService(),
            () => getAuthService(),
            securityAdapter,
            CloudService
        );
    }
    return _vaultServiceInstance;
}

/**
 * Reset the singleton instance (for testing only).
 */
export function resetVaultService(): void {
    _vaultServiceInstance = null;
}

// =============================================================================
// Backward-Compatible Static Facade (Deprecated)
// =============================================================================

/**
 * @deprecated Use getVaultService() or inject VaultServiceImpl for testing.
 * This static facade is maintained for backward compatibility.
 */
export class VaultService {
    static async setInitialEntries(entries: PasswordEntry[]): Promise<void> {
        return getVaultService().setInitialEntries(entries);
    }

    static async getEncryptedEntries(): Promise<VaultStorageItem[]> {
        return getVaultService().getEncryptedEntries();
    }

    static async getEntries(): Promise<PasswordEntry[]> {
        return getVaultService().getEntries();
    }

    static async addEntry(entry: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<PasswordEntry> {
        return getVaultService().addEntry(entry);
    }

    static async updateEntry(id: string, updates: Partial<PasswordEntry>): Promise<PasswordEntry> {
        return getVaultService().updateEntry(id, updates);
    }

    static async deleteEntry(id: string): Promise<void> {
        return getVaultService().deleteEntry(id);
    }

    static async exportVault(key: Uint8Array): Promise<string> {
        return getVaultService().exportVault(key);
    }

    static async importVault(encryptedJson: string, key: Uint8Array): Promise<void> {
        return getVaultService().importVault(encryptedJson, key);
    }

    static async reencryptVault(newKey: Uint8Array): Promise<void> {
        return getVaultService().reencryptVault(newKey);
    }

    static async processCloudEntries(items: VaultStorageItem[]): Promise<void> {
        return getVaultService().processCloudEntries(items);
    }

    static async mergeCloudEntries(
        cloudEntries: VaultStorageItem[],
        cloudKey: Uint8Array
    ): Promise<number> {
        return getVaultService().mergeCloudEntries(cloudEntries, cloudKey);
    }

    static async clearLocalVault(): Promise<void> {
        return getVaultService().clearLocalVault();
    }
}
