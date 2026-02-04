import { vi } from 'vitest';
import type { ICryptoService } from '@ethervault/core';

export function createMockCryptoService(
    overrides: Partial<ICryptoService> = {}
): ICryptoService {
    const mockSalt = new Uint8Array(16).fill(1);
    const mockKey = new Uint8Array(32).fill(2);

    return {
        generateSalt: vi.fn().mockReturnValue(mockSalt),
        deriveKey: vi.fn().mockResolvedValue(mockKey),
        encrypt: vi.fn().mockReturnValue({
            ciphertext: 'encrypted_data_base64',
            nonce: 'nonce_base64'
        }),
        decrypt: vi.fn().mockReturnValue('VALID'),
        ...overrides
    };
}
