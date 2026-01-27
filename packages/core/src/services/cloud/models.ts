import { VaultStorageItem } from '../../types';

export interface SyncResult {
    success: boolean;
    error?: string;
    syncedCount?: number;
}

export interface CloudProvider {
    /**
     * Unique identifier for the provider (e.g., 'icloud', 'gdrive')
     */
    readonly id: string;

    /**
     * Display name for the provider
     */
    readonly name: string;

    /**
     * Initialize connection to the provider
     */
    connect(): Promise<boolean>;

    /**
     * Disconnect from the provider
     */
    disconnect(): Promise<void>;

    /**
     * Check if currently connected
     */
    isConnected(): boolean;

    /**
     * Upload a single entry
     */
    uploadEntry(entry: VaultStorageItem): Promise<boolean>;

    /**
     * Delete a single entry
     */
    deleteEntry(id: string): Promise<boolean>;

    /**
     * Perform a full sync (download changes, upload local changes)
     * This is the "heavy" operation called periodically or on demand.
     * @param localEntries Current local entries to verify against
     */
    sync(localEntries: VaultStorageItem[]): Promise<{
        updatedEntries: VaultStorageItem[];
        deletedIds: string[];
    }>;
}
