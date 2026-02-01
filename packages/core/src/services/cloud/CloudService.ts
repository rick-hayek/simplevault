import { CloudProviderInterface } from './models';
import { ICloudProvider } from './providers/ICloudProvider';
import { GoogleDriveProvider } from './providers/GoogleDriveProvider';
import { OneDriveProvider } from './providers/OneDriveProvider';
import { PasswordEntry, VaultStorageItem, Logger } from '../../types';

class CloudServiceManager {
    private provider: CloudProviderInterface | null = null;
    private providers: Map<string, CloudProviderInterface> = new Map();
    private logger: Logger | null = null;
    private listeners: ((isConnected: boolean) => void)[] = [];

    constructor() {
        // Register default providers
        this.registerProvider(new ICloudProvider());
        this.registerProvider(new GoogleDriveProvider());
        this.registerProvider(new OneDriveProvider());
    }

    setLogger(logger: Logger) {
        this.logger = logger;
        // Propagate to all providers
        this.providers.forEach(p => p.setLogger(logger));
    }

    private log(level: 'info' | 'warn' | 'error', ...args: any[]) {
        if (this.logger) {
            this.logger[level](...args);
        } else {
            console[level](...args);
        }
    }

    registerProvider(provider: CloudProviderInterface) {
        if (this.logger) provider.setLogger(this.logger);
        this.providers.set(provider.id, provider);
    }

    useProvider(id: string) {
        const provider = this.providers.get(id);
        if (!provider) {
            this.log('error', `Cloud Provider '${id}' not found.`);
            return;
        }
        this.provider = provider;
        this.provider = provider;
        this.log('info', `[CloudService] Switched to provider: ${provider.name}`);
        this.notifyListeners();
    }

    get activeProvider(): CloudProviderInterface | null {
        return this.provider;
    }

    async connect(): Promise<boolean> {
        if (!this.provider) return false;
        const result = await this.provider.connect();
        this.notifyListeners();
        return result;
    }

    async disconnect() {
        if (!this.provider) return;
        await this.provider.disconnect?.();
        this.notifyListeners();
    }

    public onConnectionChange(listener: (isConnected: boolean) => void) {
        this.listeners.push(listener);
        // Immediate callback with current state
        listener(this.isSyncEnabled());
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners() {
        const isConnected = this.isSyncEnabled();
        this.listeners.forEach(l => l(isConnected));
    }

    async sync(localEntries: VaultStorageItem[]) {
        if (!this.provider || !this.provider.isConnected()) {
            return { updatedEntries: [], deletedIds: [] };
        }
        this.log('info', '[CloudService] specific sync triggered.');
        return this.provider.sync(localEntries);
    }

    async uploadEntry(entry: VaultStorageItem) {
        if (!this.provider || !this.provider.isConnected()) return false;
        return this.provider.uploadEntry(entry);
    }

    async deleteEntry(id: string) {
        if (!this.provider || !this.provider.isConnected()) return false;
        return this.provider.deleteEntry(id);
    }

    isSyncEnabled(): boolean {
        return !!this.provider && this.provider.isConnected();
    }

    /**
     * Fetch cloud metadata (salt + verifier) without full sync.
     */
    async fetchMetadata(): Promise<{ salt: string; verifier: string } | null> {
        if (!this.provider) return null;
        return (this.provider as any).fetchMetadata?.() ?? null;
    }

    /**
     * Download all vault entries from cloud for merge operation.
     */
    async downloadAllEntries(): Promise<VaultStorageItem[]> {
        if (!this.provider) return [];
        return (this.provider as any).downloadAllEntries?.() ?? [];
    }

    /**
     * Clear all remote data (for conflict resolution).
     */
    async clearRemoteData(): Promise<void> {
        if (!this.provider) return;
        await (this.provider as any).clearRemoteData?.();
    }

    /**
     * Handle OAuth redirects for native flows.
     */
    async handleRedirect(url: string): Promise<boolean> {
        if (!this.provider) return false;
        const result = await (this.provider as any).handleRedirect?.(url) ?? false;
        if (result) {
            this.notifyListeners();
        }
        return result;
    }
}

export const CloudService = new CloudServiceManager();
