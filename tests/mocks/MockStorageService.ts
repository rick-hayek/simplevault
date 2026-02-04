import { vi } from 'vitest';
import type { IStorageService } from '@ethervault/core';

export function createMockStorageService(
    initialData: Record<string, Record<string, any>> = {}
): IStorageService {
    // Deep clone initial data to avoid mutations affecting the original
    const stores: Record<string, Record<string, any>> = JSON.parse(
        JSON.stringify(initialData, (_, value) => {
            // Handle Uint8Array serialization
            if (value instanceof Uint8Array) {
                return { __type: 'Uint8Array', data: Array.from(value) };
            }
            return value;
        }),
        (_, value) => {
            // Handle Uint8Array deserialization
            if (value && value.__type === 'Uint8Array') {
                return new Uint8Array(value.data);
            }
            return value;
        }
    );

    return {
        setItem: vi.fn(async (storeName: string, key: string, value: any) => {
            if (!stores[storeName]) stores[storeName] = {};
            stores[storeName][key] = value;
        }),
        getItem: vi.fn(async (storeName: string, key: string) => {
            return stores[storeName]?.[key];
        }),
        getAll: vi.fn(async (storeName: string) => {
            return Object.values(stores[storeName] || {});
        }),
        deleteItem: vi.fn(async (storeName: string, key: string) => {
            if (stores[storeName]) {
                delete stores[storeName][key];
            }
        }),
        clear: vi.fn(async (storeName: string) => {
            stores[storeName] = {};
        })
    };
}
