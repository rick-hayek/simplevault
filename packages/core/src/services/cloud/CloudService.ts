import { CloudProvider } from './models';
import { ICloudProvider } from './providers/ICloudProvider';
import { PasswordEntry, VaultStorageItem } from '../../types';

class CloudServiceManager {
    private provider: CloudProvider | null = null;
    private providers: Map<string, CloudProvider> = new Map();

    constructor() {
        // Register default providers
        this.registerProvider(new ICloudProvider());
    }

    registerProvider(provider: CloudProvider) {
        this.providers.set(provider.id, provider);
    }

    useProvider(id: string) {
        const provider = this.providers.get(id);
        if (!provider) {
            console.error(`Cloud Provider '${id}' not found.`);
            return;
        }
        this.provider = provider;
        console.log(`[CloudService] Switched to provider: ${provider.name}`);
    }

    async connect(): Promise<boolean> {
        if (!this.provider) return false;
        return this.provider.connect();
    }

    async sync(localEntries: VaultStorageItem[]) {
        if (!this.provider || !this.provider.isConnected()) {
            return { updatedEntries: [], deletedIds: [] };
        }
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
