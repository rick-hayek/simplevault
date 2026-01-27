import { PasswordEntry, Category } from './types';
import { CryptoService } from './CryptoService';
import { AuthService } from './AuthService';
import { StorageService } from './StorageService';
import { SecurityService } from './SecurityService';
import { CloudService } from './services/cloud/CloudService';

export class VaultService {
    private static entries: PasswordEntry[] = [];

    static async setInitialEntries(entries: PasswordEntry[]) {
        this.entries = entries;
    }

    static async getEntries(): Promise<PasswordEntry[]> {
        if (this.entries.length > 0) return [...this.entries];

        const key = AuthService.getMasterKey();
        const encryptedEntries = await StorageService.getAll('vault');

        this.entries = encryptedEntries.map(e => {
            if (!e.payload || !e.nonce) return e;
            const decryptedData = CryptoService.decrypt(e.payload, e.nonce, key);
            return { ...e, ...JSON.parse(decryptedData) };
        });

        return [...this.entries];
    }

    static async addEntry(entry: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<PasswordEntry> {
        const key = AuthService.getMasterKey();
        const id = crypto.randomUUID();
        const newEntry: PasswordEntry = {
            ...entry,
            id,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            favorite: entry.favorite || false,
            strength: entry.password ? SecurityService.calculateStrength(entry.password) : 'Weak'
        };

        // Encrypt sensitive fields (everything except ID and metadata for filtering)
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

        const { ciphertext, nonce } = CryptoService.encrypt(JSON.stringify(sensitiveFields), key);

        const storageItem = {
            id,
            payload: ciphertext,
            nonce,
            category: newEntry.category, // Stored unencrypted for fast filtering? Optional.
            createdAt: newEntry.createdAt,
            updatedAt: newEntry.updatedAt,
            favorite: newEntry.favorite,
            icon: newEntry.icon
        };

        await StorageService.setItem('vault', id, storageItem);
        this.entries = [newEntry, ...this.entries];

        // Sync to Cloud (Background)
        // @ts-ignore
        CloudService.uploadEntry(storageItem).catch(e => console.error('Cloud Sync Failed:', e));

        return newEntry;
    }

    static async updateEntry(id: string, updates: Partial<PasswordEntry>): Promise<PasswordEntry> {
        const key = AuthService.getMasterKey();
        const existing = this.entries.find(e => e.id === id);
        if (!existing) throw new Error('Entry not found');

        const updated = { ...existing, ...updates, updatedAt: Date.now() };
        if (updates.password) {
            updated.strength = SecurityService.calculateStrength(updates.password);
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

        const { ciphertext, nonce } = CryptoService.encrypt(JSON.stringify(sensitiveFields), key);

        const storageItem = {
            id,
            payload: ciphertext,
            nonce,
            category: updated.category,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
            favorite: updated.favorite,
            icon: updated.icon
        };

        await StorageService.setItem('vault', id, storageItem);
        this.entries = this.entries.map(e => e.id === id ? updated : e);

        // Sync to Cloud (Background)
        // @ts-ignore
        CloudService.uploadEntry(storageItem).catch(e => console.error('Cloud Sync Failed:', e));

        return updated;
    }

    static async deleteEntry(id: string): Promise<void> {
        await StorageService.deleteItem('vault', id);
        this.entries = this.entries.filter(e => e.id !== id);

        // Sync to Cloud (Background)
        CloudService.deleteEntry(id).catch(e => console.error('Cloud Sync Failed:', e));
    }

    static async exportVault(key: Uint8Array): Promise<string> {
        const data = JSON.stringify(this.entries);
        const encrypted = CryptoService.encrypt(data, key);
        return JSON.stringify(encrypted);
    }

    static async importVault(encryptedJson: string, key: Uint8Array): Promise<void> {
        const { ciphertext, nonce } = JSON.parse(encryptedJson);
        const decrypted = CryptoService.decrypt(ciphertext, nonce, key);
        this.entries = JSON.parse(decrypted);
    }

    static async reencryptVault(newKey: Uint8Array): Promise<void> {
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

            const { ciphertext, nonce } = CryptoService.encrypt(JSON.stringify(sensitiveFields), newKey);

            const storageItem = {
                id: entry.id,
                payload: ciphertext,
                nonce,
                category: entry.category,
                createdAt: entry.createdAt,
                updatedAt: entry.updatedAt,
                favorite: entry.favorite
            };

            await StorageService.setItem('vault', entry.id, storageItem);
        });

        await Promise.all(updates);
    }
}
