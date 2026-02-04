import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock libsodium-wrappers-sumo for tests
vi.mock('libsodium-wrappers-sumo', () => ({
    default: {
        ready: Promise.resolve(),
        crypto_pwhash: vi.fn().mockReturnValue(new Uint8Array(32).fill(2)),
        crypto_secretbox_easy: vi.fn().mockReturnValue(new Uint8Array(32)),
        crypto_secretbox_open_easy: vi.fn().mockReturnValue(new Uint8Array([86, 65, 76, 73, 68])), // "VALID"
        randombytes_buf: vi.fn().mockReturnValue(new Uint8Array(16).fill(1)),
        to_base64: vi.fn().mockReturnValue('base64_encoded'),
        from_base64: vi.fn().mockReturnValue(new Uint8Array(32)),
        to_string: vi.fn().mockReturnValue('VALID'),
        memcmp: vi.fn().mockReturnValue(true),
        crypto_secretbox_KEYBYTES: 32,
        crypto_secretbox_NONCEBYTES: 24,
        crypto_pwhash_SALTBYTES: 16,
        crypto_pwhash_OPSLIMIT_INTERACTIVE: 2,
        crypto_pwhash_MEMLIMIT_INTERACTIVE: 67108864,
        crypto_pwhash_ALG_ARGON2ID13: 2,
    }
}));

// Global test utilities
globalThis.atob = (str: string) => Buffer.from(str, 'base64').toString('binary');
globalThis.btoa = (str: string) => Buffer.from(str, 'binary').toString('base64');
