import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StorageServiceImpl, resetStorageService } from '@ethervault/core';

/**
 * StorageService tests using in-memory IndexedDB mock (fake-indexeddb).
 * Note: jsdom provides a basic IndexedDB implementation suitable for testing.
 */
describe('StorageServiceImpl', () => {
    let storageService: StorageServiceImpl;

    beforeEach(async () => {
        resetStorageService();
        storageService = new StorageServiceImpl();
        // Clear all data before each test
        await storageService.init();
        await storageService.clear('vault');
        await storageService.clear('metadata');
    });

    // =========================================================================
    // 1. Initialization Tests
    // =========================================================================
    describe('init', () => {
        it('should initialize the database', async () => {
            const db = await storageService.init();
            expect(db).toBeDefined();
            expect(db.name).toBe('EtherVaultDB');
        });

        it('should return same database on multiple init calls', async () => {
            const db1 = await storageService.init();
            const db2 = await storageService.init();
            expect(db1).toBe(db2);
        });

        it('should create vault and metadata object stores', async () => {
            const db = await storageService.init();
            expect(db.objectStoreNames.contains('vault')).toBe(true);
            expect(db.objectStoreNames.contains('metadata')).toBe(true);
        });
    });

    // =========================================================================
    // 2. Metadata Store Tests
    // =========================================================================
    describe('metadata store operations', () => {
        it('should set and get metadata item', async () => {
            await storageService.setItem('metadata', 'testKey', 'testValue');
            const result = await storageService.getItem('metadata', 'testKey');
            expect(result).toBe('testValue');
        });

        it('should overwrite existing metadata item', async () => {
            await storageService.setItem('metadata', 'key', 'value1');
            await storageService.setItem('metadata', 'key', 'value2');
            const result = await storageService.getItem('metadata', 'key');
            expect(result).toBe('value2');
        });

        it('should return undefined for non-existent key', async () => {
            const result = await storageService.getItem('metadata', 'nonExistent');
            expect(result).toBeUndefined();
        });

        it('should store and retrieve Uint8Array', async () => {
            const salt = new Uint8Array([1, 2, 3, 4, 5]);
            await storageService.setItem('metadata', 'salt', salt);
            const result = await storageService.getItem('metadata', 'salt');
            // Compare as arrays since IndexedDB may clone the typed array
            expect(Array.from(result)).toEqual(Array.from(salt));
        });

        it('should store and retrieve objects', async () => {
            const verifier = { payload: 'encrypted', nonce: 'abc123' };
            await storageService.setItem('metadata', 'auth_verifier', verifier);
            const result = await storageService.getItem('metadata', 'auth_verifier');
            expect(result).toEqual(verifier);
        });

        it('should delete metadata item', async () => {
            await storageService.setItem('metadata', 'toDelete', 'value');
            await storageService.deleteItem('metadata', 'toDelete');
            const result = await storageService.getItem('metadata', 'toDelete');
            expect(result).toBeUndefined();
        });

        it('should get all metadata items', async () => {
            await storageService.setItem('metadata', 'key1', 'value1');
            await storageService.setItem('metadata', 'key2', 'value2');
            const all = await storageService.getAll('metadata');
            expect(all).toHaveLength(2);
            expect(all).toContain('value1');
            expect(all).toContain('value2');
        });

        it('should clear all metadata', async () => {
            await storageService.setItem('metadata', 'key1', 'value1');
            await storageService.setItem('metadata', 'key2', 'value2');
            await storageService.clear('metadata');
            const all = await storageService.getAll('metadata');
            expect(all).toHaveLength(0);
        });
    });

    // =========================================================================
    // 3. Vault Store Tests
    // =========================================================================
    describe('vault store operations', () => {
        const entry1 = {
            id: 'entry-1',
            payload: 'encrypted-data-1',
            nonce: 'nonce-1',
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        const entry2 = {
            id: 'entry-2',
            payload: 'encrypted-data-2',
            nonce: 'nonce-2',
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        it('should store vault entry with keyPath id', async () => {
            await storageService.setItem('vault', entry1.id, entry1);
            const result = await storageService.getItem('vault', entry1.id);
            expect(result).toEqual(entry1);
        });

        it('should update vault entry', async () => {
            await storageService.setItem('vault', entry1.id, entry1);
            const updated = { ...entry1, payload: 'updated-payload' };
            await storageService.setItem('vault', entry1.id, updated);
            const result = await storageService.getItem('vault', entry1.id);
            expect(result.payload).toBe('updated-payload');
        });

        it('should get all vault entries', async () => {
            await storageService.setItem('vault', entry1.id, entry1);
            await storageService.setItem('vault', entry2.id, entry2);
            const all = await storageService.getAll('vault');
            expect(all).toHaveLength(2);
        });

        it('should delete vault entry', async () => {
            await storageService.setItem('vault', entry1.id, entry1);
            await storageService.deleteItem('vault', entry1.id);
            const result = await storageService.getItem('vault', entry1.id);
            expect(result).toBeUndefined();
        });

        it('should clear all vault entries', async () => {
            await storageService.setItem('vault', entry1.id, entry1);
            await storageService.setItem('vault', entry2.id, entry2);
            await storageService.clear('vault');
            const all = await storageService.getAll('vault');
            expect(all).toHaveLength(0);
        });
    });

    // =========================================================================
    // 4. Store Isolation Tests
    // =========================================================================
    describe('store isolation', () => {
        it('should keep vault and metadata stores separate', async () => {
            await storageService.setItem('metadata', 'shared-key', 'metadata-value');
            await storageService.setItem('vault', 'entry-1', { id: 'entry-1', payload: 'vault-value' });

            const metadataResult = await storageService.getItem('metadata', 'shared-key');
            const vaultResult = await storageService.getItem('vault', 'entry-1');

            expect(metadataResult).toBe('metadata-value');
            expect(vaultResult.payload).toBe('vault-value');
        });

        it('should not affect metadata when clearing vault', async () => {
            await storageService.setItem('metadata', 'key', 'value');
            await storageService.setItem('vault', 'entry-1', { id: 'entry-1' });

            await storageService.clear('vault');

            const metadataResult = await storageService.getItem('metadata', 'key');
            expect(metadataResult).toBe('value');
        });
    });
});
