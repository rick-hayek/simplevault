import { CryptoService } from './CryptoService';
import { StorageService } from './StorageService';
import { VaultService } from './VaultService';

export class AuthService {
    private static masterKey: Uint8Array | null = null;
    private static isAuthenticated: boolean = false;

    static async setupAccount(password: string): Promise<void> {
        const salt = CryptoService.generateSalt();
        const derivedKey = await CryptoService.deriveKey(password, salt);

        // Store salt
        await StorageService.setItem('metadata', 'salt', salt);
        await StorageService.setItem('metadata', 'setup_complete', true);

        // Create Verifier (Encrypted string "VALID")
        const { ciphertext, nonce } = CryptoService.encrypt('VALID', derivedKey);
        await StorageService.setItem('metadata', 'auth_verifier', { payload: ciphertext, nonce });

        this.masterKey = derivedKey;
        this.isAuthenticated = true;
    }

    static async setSalt(salt: Uint8Array): Promise<void> {
        await StorageService.setItem('metadata', 'salt', salt);
    }

    static async authenticate(password: string): Promise<boolean> {
        try {
            const salt = await StorageService.getItem('metadata', 'salt');
            if (!salt) return false;

            const derivedKey = await CryptoService.deriveKey(password, salt);

            // 1. Check for Verifier (New Standard)
            const verifier = await StorageService.getItem('metadata', 'auth_verifier');
            if (verifier && verifier.payload && verifier.nonce) {
                try {
                    const decrypted = CryptoService.decrypt(verifier.payload, verifier.nonce, derivedKey);
                    if (decrypted === 'VALID') {
                        this.masterKey = derivedKey;
                        this.isAuthenticated = true;
                        return true;
                    }
                } catch {
                    // FIX: Don't fail immediately. Verifier might be stale (e.g. after bug).
                    // Fall through to legacy check to see if we can decrypt the vault.
                    console.warn('[AUTH] Verifier failed. Falling back to vault decryption check.');
                }
            }

            // 2. Legacy Fallback (Check against actual Vault Data)
            // If no verifier exists, check if we can decrypt a vault item
            const vaultItems = await StorageService.getAll('vault');
            if (vaultItems.length > 0) {
                const testItem = vaultItems[0];
                try {
                    CryptoService.decrypt(testItem.payload, testItem.nonce, derivedKey);
                    // Success! Migrate to Verifier for future O(1) checks
                    const { ciphertext, nonce } = CryptoService.encrypt('VALID', derivedKey);
                    await StorageService.setItem('metadata', 'auth_verifier', { payload: ciphertext, nonce });

                    this.masterKey = derivedKey;
                    this.isAuthenticated = true;
                    return true;
                } catch {
                    return false; // Decryption failed
                }
            }

            // 3. Empty Vault + No Verifier = REJECT
            // This is a security measure: we cannot verify the password without data.
            // The user must have set up their account incorrectly or data was wiped.
            // Do NOT accept any password here - it would create a verifier for the wrong password.
            console.warn('[AUTH] Cannot authenticate: No verifier and no vault data to validate against.');
            return false;
        } catch (error) {
            console.error('Authentication failed:', error);
            return false;
        }
    }

    static async isAccountSetup(): Promise<boolean> {
        return !!(await StorageService.getItem('metadata', 'setup_complete'));
    }

    static lock() {
        this.masterKey = null;
        this.isAuthenticated = false;
    }

    static getMasterKey(): Uint8Array {
        if (!this.masterKey || !this.isAuthenticated) {
            throw new Error('Vault is locked');
        }
        return this.masterKey;
    }

    static checkAuth(): boolean {
        return this.isAuthenticated;
    }

    static async verifyPassword(password: string): Promise<boolean> {
        // 1. If already authenticated, check against in-memory key (Secure & Correct)
        if (this.isAuthenticated && this.masterKey) {
            try {
                const sodium = await this.getSodium();
                const salt = await StorageService.getItem('metadata', 'salt');
                if (!salt) return false;

                const checkKey = await CryptoService.deriveKey(password, salt);
                return sodium.memcmp(checkKey, this.masterKey);
            } catch (e) {
                console.error('Password verification error:', e);
                return false;
            }
        }

        // 2. If not authenticated, fall back to standard authentication attempt
        // Note: This WILL set the masterKey if successful.
        return this.authenticate(password);
    }

    static async changeMasterPassword(oldPassword: string, newPassword: string): Promise<boolean> {
        const sodium = await this.getSodium();
        // 1. Verify old password
        const salt = await StorageService.getItem('metadata', 'salt');
        if (!salt) throw new Error('Account not set up');

        const currentKey = await CryptoService.deriveKey(oldPassword, salt);
        // Compare against in-memory key
        if (this.masterKey && !sodium.memcmp(currentKey, this.masterKey)) {
            return false;
        }

        // 2. Derive new key with new salt
        const newSalt = CryptoService.generateSalt();
        const newKey = await CryptoService.deriveKey(newPassword, newSalt);

        // 3. Re-encrypt all entries
        await VaultService.reencryptVault(newKey);

        // 4. Update metadata
        await StorageService.setItem('metadata', 'salt', newSalt);

        // FIX: Update Verifier with new key
        const { ciphertext, nonce } = CryptoService.encrypt('VALID', newKey);
        await StorageService.setItem('metadata', 'auth_verifier', { payload: ciphertext, nonce });

        // 5. Update session
        this.masterKey = newKey;
        return true;
    }

    private static sodium: any = null;
    private static async getSodium() {
        if (!this.sodium) {
            const _sodium = (await import('libsodium-wrappers-sumo')).default;
            await _sodium.ready;
            this.sodium = _sodium;
        }
        return this.sodium;
    }

    /**
     * Import cloud credentials (salt + verifier) during sync.
     * Used when adopting a cloud vault on a new device.
     * 
     * IMPORTANT: Both salt AND verifier are required. Without a verifier,
     * the user cannot authenticate after salt import.
     */
    static async importCloudCredentials(saltB64: string, verifierJson: string): Promise<void> {
        // Validate verifier is present and valid
        if (!verifierJson || !verifierJson.trim()) {
            throw new Error('MISSING_VERIFIER: Cloud vault has no password verifier. Cannot sync without it.');
        }

        let verifier;
        try {
            verifier = JSON.parse(verifierJson);
            if (!verifier.payload || !verifier.nonce) {
                throw new Error('Invalid verifier structure');
            }
        } catch (e) {
            throw new Error('INVALID_VERIFIER: Cloud vault has invalid password verifier. Cannot sync.');
        }

        // Decode base64 salt
        const saltBytes = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));

        // Store both salt and verifier atomically
        await StorageService.setItem('metadata', 'salt', saltBytes);
        await StorageService.setItem('metadata', 'auth_verifier', verifier);

        // Clear current auth state (force re-login)
        this.masterKey = null;
        this.isAuthenticated = false;

        console.log('[AuthService] Imported cloud credentials. Re-login required.');
    }

    /**
     * Derive a key using a specific salt (for decrypting cloud data with cloud password).
     */
    static async deriveKeyWithSalt(password: string, saltB64: string): Promise<Uint8Array> {
        const saltBytes = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
        return CryptoService.deriveKey(password, saltBytes);
    }

    /**
     * Get the current salt as base64 string
     */
    static async getSaltBase64(): Promise<string | null> {
        const salt = await StorageService.getItem('metadata', 'salt');
        if (!salt) return null;

        let saltArr = salt;
        if (!(salt instanceof Uint8Array)) {
            saltArr = new Uint8Array(Object.values(salt));
        }

        return btoa(String.fromCharCode(...saltArr));
    }

    /**
     * Get the current verifier as JSON string
     */
    static async getVerifierJson(): Promise<string | null> {
        const verifier = await StorageService.getItem('metadata', 'auth_verifier');
        if (!verifier) return null;
        return JSON.stringify(verifier);
    }
}
