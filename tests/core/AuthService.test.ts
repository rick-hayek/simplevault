import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthServiceImpl } from '@ethervault/core';
import {
    createMockCryptoService,
    createMockStorageService,
    createMockVaultService
} from '../mocks';
import type { ICryptoService, IStorageService, IVaultService } from '@ethervault/core';

describe('AuthServiceImpl', () => {
    let authService: AuthServiceImpl;
    let mockCrypto: ICryptoService;
    let mockStorage: IStorageService;
    let mockVault: IVaultService;

    beforeEach(() => {
        mockCrypto = createMockCryptoService();
        mockStorage = createMockStorageService();
        mockVault = createMockVaultService();
        authService = new AuthServiceImpl(mockCrypto, mockStorage, mockVault);
    });

    // =========================================================================
    // 1. Account Setup Tests
    // =========================================================================
    describe('setupAccount', () => {
        it('should generate and store salt', async () => {
            await authService.setupAccount('TestPassword123');

            expect(mockCrypto.generateSalt).toHaveBeenCalled();
            expect(mockStorage.setItem).toHaveBeenCalledWith(
                'metadata',
                'salt',
                expect.any(Uint8Array)
            );
        });

        it('should derive key from password and salt', async () => {
            await authService.setupAccount('TestPassword123');

            expect(mockCrypto.deriveKey).toHaveBeenCalledWith(
                'TestPassword123',
                expect.any(Uint8Array)
            );
        });

        it('should store setup_complete flag', async () => {
            await authService.setupAccount('TestPassword123');

            expect(mockStorage.setItem).toHaveBeenCalledWith(
                'metadata',
                'setup_complete',
                true
            );
        });

        it('should create and store auth verifier', async () => {
            await authService.setupAccount('TestPassword123');

            expect(mockCrypto.encrypt).toHaveBeenCalledWith(
                'VALID',
                expect.any(Uint8Array)
            );
            expect(mockStorage.setItem).toHaveBeenCalledWith(
                'metadata',
                'auth_verifier',
                expect.objectContaining({
                    payload: expect.any(String),
                    nonce: expect.any(String)
                })
            );
        });

        it('should set authenticated state after setup', async () => {
            expect(authService.checkAuth()).toBe(false);

            await authService.setupAccount('TestPassword123');

            expect(authService.checkAuth()).toBe(true);
        });

        it('should make master key available after setup', async () => {
            await authService.setupAccount('TestPassword123');

            const key = authService.getMasterKey();
            expect(key).toBeInstanceOf(Uint8Array);
            expect(key.length).toBe(32);
        });
    });

    // =========================================================================
    // 2. Authentication Tests
    // =========================================================================
    describe('authenticate', () => {
        it('should return false when no salt exists', async () => {
            const result = await authService.authenticate('AnyPassword');

            expect(result).toBe(false);
            expect(authService.checkAuth()).toBe(false);
        });

        it('should authenticate with valid password and verifier', async () => {
            // Pre-populate storage with valid auth data
            mockStorage = createMockStorageService({
                metadata: {
                    salt: new Uint8Array(16),
                    auth_verifier: { payload: 'encrypted', nonce: 'nonce' }
                }
            });
            authService = new AuthServiceImpl(mockCrypto, mockStorage, mockVault);

            const result = await authService.authenticate('CorrectPassword');

            expect(result).toBe(true);
            expect(authService.checkAuth()).toBe(true);
        });

        it('should return false for invalid password (decrypt fails)', async () => {
            mockCrypto = createMockCryptoService({
                decrypt: vi.fn().mockImplementation(() => {
                    throw new Error('Decryption failed');
                })
            });
            mockStorage = createMockStorageService({
                metadata: {
                    salt: new Uint8Array(16),
                    auth_verifier: { payload: 'encrypted', nonce: 'nonce' }
                }
            });
            authService = new AuthServiceImpl(mockCrypto, mockStorage, mockVault);

            const result = await authService.authenticate('WrongPassword');

            expect(result).toBe(false);
            expect(authService.checkAuth()).toBe(false);
        });

        it('should return false for decrypted value not equal to VALID', async () => {
            mockCrypto = createMockCryptoService({
                decrypt: vi.fn().mockReturnValue('INVALID')
            });
            mockStorage = createMockStorageService({
                metadata: {
                    salt: new Uint8Array(16),
                    auth_verifier: { payload: 'encrypted', nonce: 'nonce' }
                }
            });
            authService = new AuthServiceImpl(mockCrypto, mockStorage, mockVault);

            const result = await authService.authenticate('SomePassword');

            expect(result).toBe(false);
        });

        it('should fallback to vault item when verifier fails but vault has entries', async () => {
            // Verifier fails, but vault item can be decrypted
            let decryptCallCount = 0;
            mockCrypto = createMockCryptoService({
                decrypt: vi.fn().mockImplementation(() => {
                    decryptCallCount++;
                    if (decryptCallCount === 1) {
                        throw new Error('Verifier decryption failed');
                    }
                    return '{"title":"Test"}'; // Vault item decryption succeeds
                })
            });
            mockStorage = createMockStorageService({
                metadata: {
                    salt: new Uint8Array(16),
                    auth_verifier: { payload: 'stale', nonce: 'nonce' }
                },
                vault: {
                    entry1: { payload: 'encrypted_entry', nonce: 'entry_nonce' }
                }
            });
            authService = new AuthServiceImpl(mockCrypto, mockStorage, mockVault);

            const result = await authService.authenticate('CorrectPassword');

            expect(result).toBe(true);
            // Should have created a new verifier
            expect(mockStorage.setItem).toHaveBeenCalledWith(
                'metadata',
                'auth_verifier',
                expect.any(Object)
            );
        });

        it('should authenticate via legacy fallback when no verifier exists', async () => {
            mockStorage = createMockStorageService({
                metadata: {
                    salt: new Uint8Array(16)
                    // No auth_verifier
                },
                vault: {
                    entry1: { payload: 'encrypted_entry', nonce: 'entry_nonce' }
                }
            });
            mockCrypto = createMockCryptoService({
                decrypt: vi.fn().mockReturnValue('{"title":"Test"}')
            });
            authService = new AuthServiceImpl(mockCrypto, mockStorage, mockVault);

            const result = await authService.authenticate('LegacyPassword');

            expect(result).toBe(true);
            // Should migrate to verifier
            expect(mockStorage.setItem).toHaveBeenCalledWith(
                'metadata',
                'auth_verifier',
                expect.any(Object)
            );
        });

        it('should return false when no verifier AND no vault entries (security)', async () => {
            mockStorage = createMockStorageService({
                metadata: {
                    salt: new Uint8Array(16)
                    // No verifier, no vault
                }
            });
            authService = new AuthServiceImpl(mockCrypto, mockStorage, mockVault);

            const result = await authService.authenticate('AnyPassword');

            expect(result).toBe(false);
        });
    });

    // =========================================================================
    // 3. Session Management Tests
    // =========================================================================
    describe('lock', () => {
        it('should clear authentication state', async () => {
            await authService.setupAccount('TestPassword');
            expect(authService.checkAuth()).toBe(true);

            authService.lock();

            expect(authService.checkAuth()).toBe(false);
        });

        it('should make getMasterKey throw after lock', async () => {
            await authService.setupAccount('TestPassword');
            expect(() => authService.getMasterKey()).not.toThrow();

            authService.lock();

            expect(() => authService.getMasterKey()).toThrow('Vault is locked');
        });
    });

    describe('checkAuth', () => {
        it('should return false initially', () => {
            expect(authService.checkAuth()).toBe(false);
        });

        it('should return true after successful setup', async () => {
            await authService.setupAccount('TestPassword');
            expect(authService.checkAuth()).toBe(true);
        });

        it('should return true after successful authentication', async () => {
            mockStorage = createMockStorageService({
                metadata: {
                    salt: new Uint8Array(16),
                    auth_verifier: { payload: 'encrypted', nonce: 'nonce' }
                }
            });
            authService = new AuthServiceImpl(mockCrypto, mockStorage, mockVault);

            await authService.authenticate('Password');

            expect(authService.checkAuth()).toBe(true);
        });
    });

    describe('getMasterKey', () => {
        it('should throw when not authenticated', () => {
            expect(() => authService.getMasterKey()).toThrow('Vault is locked');
        });

        it('should return key when authenticated', async () => {
            await authService.setupAccount('TestPassword');

            const key = authService.getMasterKey();

            expect(key).toBeInstanceOf(Uint8Array);
        });
    });

    // =========================================================================
    // 4. Account Setup Check Tests
    // =========================================================================
    describe('isAccountSetup', () => {
        it('should return false when setup_complete is not set', async () => {
            const result = await authService.isAccountSetup();
            expect(result).toBe(false);
        });

        it('should return true when setup_complete is set', async () => {
            await authService.setupAccount('TestPassword');

            const result = await authService.isAccountSetup();

            expect(result).toBe(true);
        });
    });

    // =========================================================================
    // 5. Password Verification Tests
    // =========================================================================
    describe('verifyPassword', () => {
        it('should return true for correct password when authenticated', async () => {
            await authService.setupAccount('CorrectPassword');

            const result = await authService.verifyPassword('CorrectPassword');

            expect(result).toBe(true);
        });

        it('should fall back to authenticate when not authenticated', async () => {
            mockStorage = createMockStorageService({
                metadata: {
                    salt: new Uint8Array(16),
                    auth_verifier: { payload: 'encrypted', nonce: 'nonce' }
                }
            });
            authService = new AuthServiceImpl(mockCrypto, mockStorage, mockVault);

            // Not authenticated yet, should call authenticate internally
            const result = await authService.verifyPassword('TestPassword');

            expect(result).toBe(true);
            expect(authService.checkAuth()).toBe(true); // Side effect of authenticate
        });
    });

    // =========================================================================
    // 6. Password Change Tests
    // =========================================================================
    describe('changeMasterPassword', () => {
        it('should throw when account not set up', async () => {
            await expect(
                authService.changeMasterPassword('old', 'new')
            ).rejects.toThrow('Account not set up');
        });

        it('should return true and re-encrypt vault on success', async () => {
            await authService.setupAccount('OldPassword');

            const result = await authService.changeMasterPassword(
                'OldPassword',
                'NewPassword123'
            );

            expect(result).toBe(true);
            expect(mockVault.reencryptVault).toHaveBeenCalled();
        });

        it('should generate new salt for new password', async () => {
            await authService.setupAccount('OldPassword');
            vi.mocked(mockCrypto.generateSalt).mockClear();

            await authService.changeMasterPassword('OldPassword', 'NewPassword');

            expect(mockCrypto.generateSalt).toHaveBeenCalled();
        });

        it('should update auth verifier with new key', async () => {
            await authService.setupAccount('OldPassword');
            vi.mocked(mockStorage.setItem).mockClear();

            await authService.changeMasterPassword('OldPassword', 'NewPassword');

            expect(mockStorage.setItem).toHaveBeenCalledWith(
                'metadata',
                'auth_verifier',
                expect.any(Object)
            );
        });

        it('should update stored salt', async () => {
            await authService.setupAccount('OldPassword');
            vi.mocked(mockStorage.setItem).mockClear();

            await authService.changeMasterPassword('OldPassword', 'NewPassword');

            expect(mockStorage.setItem).toHaveBeenCalledWith(
                'metadata',
                'salt',
                expect.any(Uint8Array)
            );
        });
    });

    // =========================================================================
    // 7. Cloud Credential Import Tests
    // =========================================================================
    describe('importCloudCredentials', () => {
        it('should throw when verifier is missing', async () => {
            await expect(
                authService.importCloudCredentials('c2FsdA==', '')
            ).rejects.toThrow('MISSING_VERIFIER');
        });

        it('should throw when verifier is invalid JSON', async () => {
            await expect(
                authService.importCloudCredentials('c2FsdA==', 'not-json')
            ).rejects.toThrow('INVALID_VERIFIER');
        });

        it('should throw when verifier structure is invalid', async () => {
            await expect(
                authService.importCloudCredentials('c2FsdA==', '{"foo":"bar"}')
            ).rejects.toThrow('INVALID_VERIFIER');
        });

        it('should store salt and verifier on valid import', async () => {
            const verifier = JSON.stringify({ payload: 'enc', nonce: 'n' });

            await authService.importCloudCredentials('c2FsdA==', verifier);

            expect(mockStorage.setItem).toHaveBeenCalledWith(
                'metadata',
                'salt',
                expect.any(Uint8Array)
            );
            expect(mockStorage.setItem).toHaveBeenCalledWith(
                'metadata',
                'auth_verifier',
                { payload: 'enc', nonce: 'n' }
            );
        });

        it('should clear auth state after import', async () => {
            await authService.setupAccount('TestPassword');
            expect(authService.checkAuth()).toBe(true);

            const verifier = JSON.stringify({ payload: 'enc', nonce: 'n' });
            await authService.importCloudCredentials('c2FsdA==', verifier);

            expect(authService.checkAuth()).toBe(false);
        });
    });

    // =========================================================================
    // 8. Key Derivation Helper Tests
    // =========================================================================
    describe('deriveKeyWithSalt', () => {
        it('should derive key using provided salt', async () => {
            const result = await authService.deriveKeyWithSalt('password', 'c2FsdA==');

            expect(mockCrypto.deriveKey).toHaveBeenCalledWith(
                'password',
                expect.any(Uint8Array)
            );
            expect(result).toBeInstanceOf(Uint8Array);
        });
    });

    describe('getSaltBase64', () => {
        it('should return null when no salt exists', async () => {
            const result = await authService.getSaltBase64();
            expect(result).toBeNull();
        });

        it('should return base64 salt when exists', async () => {
            await authService.setupAccount('TestPassword');

            const result = await authService.getSaltBase64();

            expect(typeof result).toBe('string');
        });
    });

    describe('getVerifierJson', () => {
        it('should return null when no verifier exists', async () => {
            const result = await authService.getVerifierJson();
            expect(result).toBeNull();
        });

        it('should return JSON string when verifier exists', async () => {
            await authService.setupAccount('TestPassword');

            const result = await authService.getVerifierJson();

            expect(typeof result).toBe('string');
            const parsed = JSON.parse(result!);
            expect(parsed).toHaveProperty('payload');
            expect(parsed).toHaveProperty('nonce');
        });
    });
});
