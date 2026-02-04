import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VaultServiceImpl, resetVaultService } from '@ethervault/core';
import type {
    ICryptoService,
    IStorageService,
    IAuthService,
    ISecurityService,
    ICloudService,
    PasswordStrength
} from '@ethervault/core';
import type { PasswordEntry, VaultStorageItem } from '@ethervault/core';

// =============================================================================
// Mock Factories
// =============================================================================

function createMockCryptoService(overrides: Partial<ICryptoService> = {}): ICryptoService {
    return {
        init: vi.fn().mockResolvedValue(undefined),
        deriveKey: vi.fn().mockResolvedValue(new Uint8Array(32).fill(2)),
        generateSalt: vi.fn().mockReturnValue(new Uint8Array(16).fill(1)),
        encrypt: vi.fn().mockReturnValue({ ciphertext: 'encrypted', nonce: 'nonce123' }),
        decrypt: vi.fn().mockReturnValue('{"title":"Test","username":"user","password":"pass123"}'),
        generatePassword: vi.fn().mockReturnValue('GeneratedPassword123!'),
        ...overrides
    };
}

function createMockStorageService(overrides: Partial<IStorageService> = {}): IStorageService {
    const store: Record<string, Record<string, any>> = { vault: {}, metadata: {} };
    return {
        init: vi.fn().mockResolvedValue({} as IDBDatabase),
        setItem: vi.fn().mockImplementation(async (storeName, key, value) => {
            store[storeName][key] = value;
        }),
        getItem: vi.fn().mockImplementation(async (storeName, key) => store[storeName][key]),
        getAll: vi.fn().mockImplementation(async (storeName) => Object.values(store[storeName])),
        deleteItem: vi.fn().mockImplementation(async (storeName, key) => {
            delete store[storeName][key];
        }),
        clear: vi.fn().mockImplementation(async (storeName) => {
            store[storeName] = {};
        }),
        ...overrides
    };
}

function createMockAuthService(overrides: Partial<IAuthService> = {}): IAuthService {
    return {
        getMasterKey: vi.fn().mockReturnValue(new Uint8Array(32).fill(3)),
        ...overrides
    };
}

function createMockSecurityService(overrides: Partial<ISecurityService> = {}): ISecurityService {
    return {
        calculateStrength: vi.fn().mockReturnValue('Strong' as PasswordStrength),
        ...overrides
    };
}

function createMockCloudService(overrides: Partial<ICloudService> = {}): ICloudService {
    return {
        uploadEntry: vi.fn().mockResolvedValue(undefined),
        deleteEntry: vi.fn().mockResolvedValue(undefined),
        ...overrides
    };
}

// =============================================================================
// Tests
// =============================================================================

describe('VaultServiceImpl', () => {
    let vaultService: VaultServiceImpl;
    let mockCrypto: ICryptoService;
    let mockStorage: IStorageService;
    let mockAuth: IAuthService;
    let mockSecurity: ISecurityService;
    let mockCloud: ICloudService;

    beforeEach(() => {
        resetVaultService();
        mockCrypto = createMockCryptoService();
        mockStorage = createMockStorageService();
        mockAuth = createMockAuthService();
        mockSecurity = createMockSecurityService();
        mockCloud = createMockCloudService();

        vaultService = new VaultServiceImpl(
            mockCrypto,
            mockStorage,
            () => mockAuth,
            mockSecurity,
            mockCloud
        );
    });

    // =========================================================================
    // 1. Entry Management Tests
    // =========================================================================
    describe('addEntry', () => {
        it('should create entry with generated ID and timestamps', async () => {
            const entry = await vaultService.addEntry({
                title: 'Test Entry',
                username: 'testuser',
                password: 'testpass123',
                category: 'Personal',
                favorite: false
            });

            expect(entry.id).toBeDefined();
            expect(entry.createdAt).toBeDefined();
            expect(entry.updatedAt).toBeDefined();
            expect(entry.title).toBe('Test Entry');
        });

        it('should encrypt sensitive fields', async () => {
            await vaultService.addEntry({
                title: 'Test Entry',
                username: 'testuser',
                password: 'secret123',
                category: 'Work',
                favorite: false
            });

            expect(mockCrypto.encrypt).toHaveBeenCalledWith(
                expect.stringContaining('testuser'),
                expect.any(Uint8Array)
            );
        });

        it('should calculate password strength', async () => {
            const entry = await vaultService.addEntry({
                title: 'Test',
                username: 'user',
                password: 'strongPass123!',
                category: 'Personal',
                favorite: false
            });

            expect(mockSecurity.calculateStrength).toHaveBeenCalledWith('strongPass123!');
            expect(entry.strength).toBe('Strong');
        });

        it('should store encrypted entry', async () => {
            await vaultService.addEntry({
                title: 'Test',
                username: 'user',
                password: 'pass',
                category: 'Personal',
                favorite: false
            });

            expect(mockStorage.setItem).toHaveBeenCalledWith(
                'vault',
                expect.any(String),
                expect.objectContaining({
                    payload: 'encrypted',
                    nonce: 'nonce123'
                })
            );
        });

        it('should sync to cloud after adding', async () => {
            await vaultService.addEntry({
                title: 'Test',
                username: 'user',
                password: 'pass',
                category: 'Personal',
                favorite: false
            });

            expect(mockCloud.uploadEntry).toHaveBeenCalled();
        });
    });

    describe('getEntries', () => {
        it('should return cached entries if available', async () => {
            await vaultService.setInitialEntries([
                { id: '1', title: 'Cached', username: 'u', category: 'Personal', createdAt: 1, updatedAt: 1, favorite: false }
            ]);

            const entries = await vaultService.getEntries();

            expect(entries).toHaveLength(1);
            expect(entries[0].title).toBe('Cached');
            expect(mockStorage.getAll).not.toHaveBeenCalled();
        });

        it('should decrypt entries from storage when cache is empty', async () => {
            mockStorage = createMockStorageService({
                getAll: vi.fn().mockResolvedValue([
                    { id: '1', payload: 'enc1', nonce: 'n1', category: 'Work', createdAt: 1, updatedAt: 1, favorite: false }
                ])
            });
            vaultService = new VaultServiceImpl(mockCrypto, mockStorage, () => mockAuth, mockSecurity, mockCloud);

            const entries = await vaultService.getEntries();

            expect(mockCrypto.decrypt).toHaveBeenCalled();
            expect(entries).toHaveLength(1);
        });

        it('should skip entries that fail to decrypt', async () => {
            mockCrypto = createMockCryptoService({
                decrypt: vi.fn().mockImplementation((payload) => {
                    if (payload === 'bad') throw new Error('Decrypt failed');
                    return '{"title":"Good"}';
                })
            });
            mockStorage = createMockStorageService({
                getAll: vi.fn().mockResolvedValue([
                    { id: '1', payload: 'good', nonce: 'n1', category: 'Work', createdAt: 1, updatedAt: 1, favorite: false },
                    { id: '2', payload: 'bad', nonce: 'n2', category: 'Work', createdAt: 2, updatedAt: 2, favorite: false }
                ])
            });
            vaultService = new VaultServiceImpl(mockCrypto, mockStorage, () => mockAuth, mockSecurity, mockCloud);

            const entries = await vaultService.getEntries();

            expect(entries).toHaveLength(1);
            expect(entries[0].id).toBe('1');
        });
    });

    describe('updateEntry', () => {
        beforeEach(async () => {
            await vaultService.setInitialEntries([
                { id: 'entry-1', title: 'Original', username: 'user', password: 'pass', category: 'Personal', createdAt: 1000, updatedAt: 1000, favorite: false }
            ]);
        });

        it('should update entry with new values', async () => {
            const updated = await vaultService.updateEntry('entry-1', { title: 'Updated' });

            expect(updated.title).toBe('Updated');
            expect(updated.updatedAt).toBeGreaterThan(1000);
        });

        it('should throw if entry not found', async () => {
            await expect(
                vaultService.updateEntry('nonexistent', { title: 'X' })
            ).rejects.toThrow('Entry not found');
        });

        it('should recalculate strength when password changes', async () => {
            await vaultService.updateEntry('entry-1', { password: 'newPassword123!' });

            expect(mockSecurity.calculateStrength).toHaveBeenCalledWith('newPassword123!');
        });

        it('should sync updated entry to cloud', async () => {
            await vaultService.updateEntry('entry-1', { title: 'Changed' });

            expect(mockCloud.uploadEntry).toHaveBeenCalled();
        });
    });

    describe('deleteEntry', () => {
        beforeEach(async () => {
            await vaultService.setInitialEntries([
                { id: 'entry-1', title: 'ToDelete', username: 'u', category: 'Work', createdAt: 1, updatedAt: 1, favorite: false }
            ]);
        });

        it('should remove entry from storage', async () => {
            await vaultService.deleteEntry('entry-1');

            expect(mockStorage.deleteItem).toHaveBeenCalledWith('vault', 'entry-1');
        });

        it('should remove entry from cache', async () => {
            await vaultService.deleteEntry('entry-1');

            const entries = await vaultService.getEntries();
            expect(entries).toHaveLength(0);
        });

        it('should sync deletion to cloud', async () => {
            await vaultService.deleteEntry('entry-1');

            expect(mockCloud.deleteEntry).toHaveBeenCalledWith('entry-1');
        });
    });

    // =========================================================================
    // 2. Vault Operations Tests
    // =========================================================================
    describe('reencryptVault', () => {
        beforeEach(async () => {
            await vaultService.setInitialEntries([
                { id: 'e1', title: 'Entry1', username: 'u1', password: 'p1', category: 'Personal', createdAt: 1, updatedAt: 1, favorite: false },
                { id: 'e2', title: 'Entry2', username: 'u2', password: 'p2', category: 'Work', createdAt: 2, updatedAt: 2, favorite: true }
            ]);
        });

        it('should re-encrypt all entries with new key', async () => {
            const newKey = new Uint8Array(32).fill(9);

            await vaultService.reencryptVault(newKey);

            expect(mockCrypto.encrypt).toHaveBeenCalledTimes(2);
            expect(mockStorage.setItem).toHaveBeenCalledTimes(2);
        });
    });

    describe('exportVault / importVault', () => {
        it('should export vault as encrypted JSON', async () => {
            await vaultService.setInitialEntries([
                { id: 'e1', title: 'Test', username: 'u', category: 'Personal', createdAt: 1, updatedAt: 1, favorite: false }
            ]);
            const key = new Uint8Array(32);

            const exported = await vaultService.exportVault(key);

            expect(JSON.parse(exported)).toHaveProperty('ciphertext');
            expect(JSON.parse(exported)).toHaveProperty('nonce');
        });

        it('should import vault from encrypted JSON', async () => {
            const exportData = JSON.stringify({ ciphertext: 'enc', nonce: 'n' });
            mockCrypto = createMockCryptoService({
                decrypt: vi.fn().mockReturnValue('[{"id":"imported","title":"Imported Entry"}]')
            });
            vaultService = new VaultServiceImpl(mockCrypto, mockStorage, () => mockAuth, mockSecurity, mockCloud);

            await vaultService.importVault(exportData, new Uint8Array(32));

            const entries = await vaultService.getEntries();
            expect(entries[0].id).toBe('imported');
        });
    });

    describe('clearLocalVault', () => {
        it('should clear storage and cache', async () => {
            await vaultService.setInitialEntries([
                { id: 'e1', title: 'Test', username: 'u', category: 'Personal', createdAt: 1, updatedAt: 1, favorite: false }
            ]);

            await vaultService.clearLocalVault();

            expect(mockStorage.clear).toHaveBeenCalledWith('vault');
            const entries = await vaultService.getEntries();
            expect(entries).toHaveLength(0);
        });
    });

    // =========================================================================
    // 3. Cloud Sync Tests
    // =========================================================================
    describe('processCloudEntries', () => {
        it('should decrypt and store valid cloud entries', async () => {
            const cloudItems: VaultStorageItem[] = [
                { id: 'cloud-1', payload: 'enc1', nonce: 'n1', category: 'Work', createdAt: 1, updatedAt: 1, favorite: false }
            ];

            await vaultService.processCloudEntries(cloudItems);

            expect(mockCrypto.decrypt).toHaveBeenCalled();
            expect(mockStorage.setItem).toHaveBeenCalledWith('vault', 'cloud-1', cloudItems[0]);
        });

        it('should skip entries that fail to decrypt', async () => {
            mockCrypto = createMockCryptoService({
                decrypt: vi.fn().mockImplementation(() => {
                    throw new Error('Decrypt failed');
                })
            });
            vaultService = new VaultServiceImpl(mockCrypto, mockStorage, () => mockAuth, mockSecurity, mockCloud);

            await vaultService.processCloudEntries([
                { id: 'bad-1', payload: 'enc', nonce: 'n', category: 'Work', createdAt: 1, updatedAt: 1, favorite: false }
            ]);

            expect(mockStorage.setItem).not.toHaveBeenCalled();
        });
    });

    describe('mergeCloudEntries', () => {
        beforeEach(async () => {
            await vaultService.setInitialEntries([
                { id: 'local-1', title: 'Local', username: 'u', category: 'Personal', createdAt: 1000, updatedAt: 2000, favorite: false }
            ]);
        });

        it('should merge newer cloud entries', async () => {
            const cloudItems: VaultStorageItem[] = [
                { id: 'cloud-new', payload: 'enc', nonce: 'n', category: 'Work', createdAt: 3000, updatedAt: 3000, favorite: false }
            ];
            const cloudKey = new Uint8Array(32).fill(5);

            const count = await vaultService.mergeCloudEntries(cloudItems, cloudKey);

            expect(count).toBe(1);
            expect(mockStorage.setItem).toHaveBeenCalled();
        });

        it('should skip if local is newer', async () => {
            const cloudItems: VaultStorageItem[] = [
                { id: 'local-1', payload: 'enc', nonce: 'n', category: 'Work', createdAt: 500, updatedAt: 1500, favorite: false }
            ];
            const cloudKey = new Uint8Array(32);

            const count = await vaultService.mergeCloudEntries(cloudItems, cloudKey);

            expect(count).toBe(0);
        });
    });
});
