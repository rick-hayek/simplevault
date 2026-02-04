import { vi } from 'vitest';
import type { IVaultService } from '@ethervault/core';

export function createMockVaultService(): IVaultService {
    return {
        reencryptVault: vi.fn().mockResolvedValue(undefined)
    };
}
