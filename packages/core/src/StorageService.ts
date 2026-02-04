import { IStorageService } from './interfaces';

/**
 * Instance-based StorageService implementation.
 * Use getStorageService() singleton for production, or instantiate directly for testing.
 */
export class StorageServiceImpl implements IStorageService {
    private dbName = 'EtherVaultDB';
    private version = 1;
    private dbPromise: Promise<IDBDatabase> | null = null;

    async init(): Promise<IDBDatabase> {
        if (this.dbPromise) return this.dbPromise;

        this.dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onupgradeneeded = (event: any) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('vault')) {
                    db.createObjectStore('vault', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata');
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => {
                this.dbPromise = null;
                reject(request.error);
            };
        });

        return this.dbPromise;
    }

    async setItem(storeName: string, key: string, value: any): Promise<void> {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            // If the store is 'vault', the key is already in the value object (keyPath: 'id')
            // If it's 'metadata', we use the provided key.
            const request = store.put(value, store.keyPath === null ? key : undefined);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getItem(storeName: string, key: string): Promise<any> {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAll(storeName: string): Promise<any[]> {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteItem(storeName: string, key: string): Promise<void> {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Clear all items from an object store.
     */
    async clear(storeName: string): Promise<void> {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let _storageServiceInstance: StorageServiceImpl | null = null;

/**
 * Get the singleton StorageService instance.
 * Lazy initialization on first call.
 */
export function getStorageService(): StorageServiceImpl {
    if (!_storageServiceInstance) {
        _storageServiceInstance = new StorageServiceImpl();
    }
    return _storageServiceInstance;
}

/**
 * Reset the singleton instance (for testing only).
 */
export function resetStorageService(): void {
    _storageServiceInstance = null;
}

// =============================================================================
// Backward-Compatible Static Facade (Deprecated)
// =============================================================================

/**
 * @deprecated Use getStorageService() or inject StorageServiceImpl for testing.
 * This static facade is maintained for backward compatibility.
 */
export class StorageService {
    static async init(): Promise<IDBDatabase> {
        return getStorageService().init();
    }

    static async setItem(storeName: string, key: string, value: any): Promise<void> {
        return getStorageService().setItem(storeName, key, value);
    }

    static async getItem(storeName: string, key: string): Promise<any> {
        return getStorageService().getItem(storeName, key);
    }

    static async getAll(storeName: string): Promise<any[]> {
        return getStorageService().getAll(storeName);
    }

    static async deleteItem(storeName: string, key: string): Promise<void> {
        return getStorageService().deleteItem(storeName, key);
    }

    static async clear(storeName: string): Promise<void> {
        return getStorageService().clear(storeName);
    }
}
