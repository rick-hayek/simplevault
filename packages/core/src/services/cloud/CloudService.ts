import { CloudProviderInterface } from './models';
import { ICloudProvider } from './providers/ICloudProvider';
import { GoogleDriveProvider } from './providers/GoogleDriveProvider';
import { PasswordEntry, VaultStorageItem, Logger } from '../../types';

class CloudServiceManager {
    private provider: CloudProviderInterface | null = null;
    private providers: Map<string, CloudProviderInterface> = new Map();
    private logger: Logger | null = null;

    constructor() {
        // Register default providers
        this.registerProvider(new ICloudProvider());
        this.registerProvider(new GoogleDriveProvider());
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
        this.log('info', `[CloudService] Switched to provider: ${provider.name}`);
    }

    async connect(): Promise<boolean> {
        if (!this.provider) return false;
        return this.provider.connect();
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
}

export const CloudService = new CloudServiceManager();
