import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CryptoServiceImpl, resetCryptoService } from '@ethervault/core';

describe('CryptoServiceImpl', () => {
    let cryptoService: CryptoServiceImpl;

    beforeEach(async () => {
        resetCryptoService();
        cryptoService = new CryptoServiceImpl();
        await cryptoService.init();
    });

    // =========================================================================
    // 1. Initialization Tests
    // =========================================================================
    describe('init', () => {
        it('should initialize libsodium', async () => {
            const fresh = new CryptoServiceImpl();
            await expect(fresh.init()).resolves.not.toThrow();
        });
    });

    // =========================================================================
    // 2. Salt Generation Tests
    // =========================================================================
    describe('generateSalt', () => {
        it('should generate a Uint8Array salt', () => {
            const salt = cryptoService.generateSalt();
            expect(salt).toBeInstanceOf(Uint8Array);
        });

        it('should generate 16-byte salt', () => {
            const salt = cryptoService.generateSalt();
            expect(salt.length).toBe(16);
        });

        it('should generate different salts each time', () => {
            const salt1 = cryptoService.generateSalt();
            const salt2 = cryptoService.generateSalt();
            expect(salt1).not.toEqual(salt2);
        });

        it('should throw if not initialized', () => {
            const uninitializedService = new CryptoServiceImpl();
            expect(() => uninitializedService.generateSalt()).toThrow('Sodium not initialized');
        });
    });

    // =========================================================================
    // 3. Key Derivation Tests
    // =========================================================================
    describe('deriveKey', () => {
        it('should derive a 32-byte key', async () => {
            const salt = cryptoService.generateSalt();
            const key = await cryptoService.deriveKey('password123', salt);
            expect(key).toBeInstanceOf(Uint8Array);
            expect(key.length).toBe(32);
        });

        it('should produce consistent keys for same password and salt', async () => {
            const salt = cryptoService.generateSalt();
            const key1 = await cryptoService.deriveKey('password123', salt);
            const key2 = await cryptoService.deriveKey('password123', salt);
            expect(key1).toEqual(key2);
        });

        it('should produce different keys for different passwords', async () => {
            const salt = cryptoService.generateSalt();
            const key1 = await cryptoService.deriveKey('password1', salt);
            const key2 = await cryptoService.deriveKey('password2', salt);
            expect(key1).not.toEqual(key2);
        });

        it('should produce different keys for different salts', async () => {
            const salt1 = cryptoService.generateSalt();
            const salt2 = cryptoService.generateSalt();
            const key1 = await cryptoService.deriveKey('password', salt1);
            const key2 = await cryptoService.deriveKey('password', salt2);
            expect(key1).not.toEqual(key2);
        });
    });

    // =========================================================================
    // 4. Encryption Tests
    // =========================================================================
    describe('encrypt', () => {
        it('should return ciphertext and nonce as base64 strings', async () => {
            const salt = cryptoService.generateSalt();
            const key = await cryptoService.deriveKey('password', salt);
            const result = cryptoService.encrypt('Hello, World!', key);

            expect(result).toHaveProperty('ciphertext');
            expect(result).toHaveProperty('nonce');
            expect(typeof result.ciphertext).toBe('string');
            expect(typeof result.nonce).toBe('string');
        });

        it('should produce different ciphertexts for same message (random nonce)', async () => {
            const salt = cryptoService.generateSalt();
            const key = await cryptoService.deriveKey('password', salt);

            const result1 = cryptoService.encrypt('Hello', key);
            const result2 = cryptoService.encrypt('Hello', key);

            expect(result1.ciphertext).not.toBe(result2.ciphertext);
            expect(result1.nonce).not.toBe(result2.nonce);
        });

        it('should throw if not initialized', async () => {
            const uninitializedService = new CryptoServiceImpl();
            const key = new Uint8Array(32);
            expect(() => uninitializedService.encrypt('test', key)).toThrow('Sodium not initialized');
        });
    });

    // =========================================================================
    // 5. Decryption Tests
    // =========================================================================
    describe('decrypt', () => {
        it('should decrypt encrypted message correctly', async () => {
            const salt = cryptoService.generateSalt();
            const key = await cryptoService.deriveKey('password', salt);
            const original = 'Hello, World!';

            const { ciphertext, nonce } = cryptoService.encrypt(original, key);
            const decrypted = cryptoService.decrypt(ciphertext, nonce, key);

            expect(decrypted).toBe(original);
        });

        it('should decrypt complex JSON objects', async () => {
            const salt = cryptoService.generateSalt();
            const key = await cryptoService.deriveKey('password', salt);
            const original = JSON.stringify({ title: 'My Entry', password: 'secret123' });

            const { ciphertext, nonce } = cryptoService.encrypt(original, key);
            const decrypted = cryptoService.decrypt(ciphertext, nonce, key);

            expect(JSON.parse(decrypted)).toEqual({ title: 'My Entry', password: 'secret123' });
        });

        it('should throw for wrong key', async () => {
            const salt = cryptoService.generateSalt();
            const key1 = await cryptoService.deriveKey('password1', salt);
            const key2 = await cryptoService.deriveKey('password2', salt);

            const { ciphertext, nonce } = cryptoService.encrypt('secret', key1);

            expect(() => cryptoService.decrypt(ciphertext, nonce, key2)).toThrow();
        });

        it('should throw for corrupted ciphertext', async () => {
            const salt = cryptoService.generateSalt();
            const key = await cryptoService.deriveKey('password', salt);
            const { ciphertext, nonce } = cryptoService.encrypt('test', key);

            // Corrupt the ciphertext
            const corruptedCiphertext = ciphertext.slice(0, -4) + 'XXXX';

            expect(() => cryptoService.decrypt(corruptedCiphertext, nonce, key)).toThrow();
        });
    });

    // =========================================================================
    // 6. Password Generation Tests
    // =========================================================================
    describe('generatePassword', () => {
        it('should generate password of default length (20)', () => {
            const password = cryptoService.generatePassword();
            expect(password.length).toBe(20);
        });

        it('should generate password of specified length', () => {
            const password = cryptoService.generatePassword(32);
            expect(password.length).toBe(32);
        });

        it('should include lowercase when enabled', () => {
            const password = cryptoService.generatePassword(100, {
                lowercase: true,
                uppercase: false,
                numbers: false,
                symbols: false
            });
            expect(password).toMatch(/^[a-z]+$/);
        });

        it('should include uppercase when enabled', () => {
            const password = cryptoService.generatePassword(100, {
                lowercase: false,
                uppercase: true,
                numbers: false,
                symbols: false
            });
            expect(password).toMatch(/^[A-Z]+$/);
        });

        it('should include numbers when enabled', () => {
            const password = cryptoService.generatePassword(100, {
                lowercase: false,
                uppercase: false,
                numbers: true,
                symbols: false
            });
            expect(password).toMatch(/^[0-9]+$/);
        });

        it('should include symbols when enabled', () => {
            const password = cryptoService.generatePassword(100, {
                lowercase: false,
                uppercase: false,
                numbers: false,
                symbols: true
            });
            // Just verify it contains only non-alphanumeric characters
            expect(password).not.toMatch(/[a-zA-Z0-9]/);
            expect(password.length).toBe(100);
        });

        it('should return empty string when no charset selected', () => {
            const password = cryptoService.generatePassword(20, {
                lowercase: false,
                uppercase: false,
                numbers: false,
                symbols: false
            });
            expect(password).toBe('');
        });

        it('should generate different passwords each time', () => {
            const password1 = cryptoService.generatePassword();
            const password2 = cryptoService.generatePassword();
            expect(password1).not.toBe(password2);
        });
    });
});
