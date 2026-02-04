import _sodium from 'libsodium-wrappers-sumo';
import { ICryptoService, PasswordGeneratorOptions } from './interfaces';

/**
 * Instance-based CryptoService implementation.
 * Use getCryptoService() singleton for production, or instantiate directly for testing.
 */
export class CryptoServiceImpl implements ICryptoService {
    private sodium: typeof _sodium | null = null;

    async init(): Promise<void> {
        await _sodium.ready;
        this.sodium = _sodium;
    }

    async deriveKey(password: string, salt: Uint8Array): Promise<Uint8Array> {
        if (!this.sodium) await this.init();

        return this.sodium!.crypto_pwhash(
            this.sodium!.crypto_secretbox_KEYBYTES,
            password,
            salt,
            this.sodium!.crypto_pwhash_OPSLIMIT_INTERACTIVE,
            this.sodium!.crypto_pwhash_MEMLIMIT_INTERACTIVE,
            this.sodium!.crypto_pwhash_ALG_ARGON2ID13
        ) as Uint8Array;
    }

    generateSalt(): Uint8Array {
        if (!this.sodium) throw new Error('Sodium not initialized');
        return this.sodium.randombytes_buf(this.sodium.crypto_pwhash_SALTBYTES) as Uint8Array;
    }

    encrypt(message: string, key: Uint8Array): { ciphertext: string; nonce: string } {
        if (!this.sodium) throw new Error('Sodium not initialized');
        const nonce = this.sodium.randombytes_buf(this.sodium.crypto_secretbox_NONCEBYTES) as Uint8Array;
        const ciphertext = this.sodium.crypto_secretbox_easy(message, nonce, key) as Uint8Array;
        return {
            ciphertext: this.sodium.to_base64(ciphertext),
            nonce: this.sodium.to_base64(nonce)
        };
    }

    decrypt(ciphertextBase64: string, nonceBase64: string, key: Uint8Array): string {
        if (!this.sodium) throw new Error('Sodium not initialized');
        const ciphertext = this.sodium.from_base64(ciphertextBase64);
        const nonce = this.sodium.from_base64(nonceBase64);
        const decrypted = this.sodium.crypto_secretbox_open_easy(ciphertext, nonce, key) as Uint8Array;
        return this.sodium.to_string(decrypted);
    }

    generatePassword(
        length: number = 20,
        options: PasswordGeneratorOptions = { uppercase: true, lowercase: true, numbers: true, symbols: true }
    ): string {
        const charset: string[] = [];
        if (options.lowercase) charset.push('abcdefghijklmnopqrstuvwxyz');
        if (options.uppercase) charset.push('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
        if (options.numbers) charset.push('0123456789');
        if (options.symbols) charset.push('!@#$%^&*()_+~`|}{[]:;?><,./-=');

        const chars = charset.join('');
        if (chars.length === 0) return '';

        let password = '';
        const randomValues = new Uint32Array(length);
        crypto.getRandomValues(randomValues);

        for (let i = 0; i < length; i++) {
            password += chars.charAt(randomValues[i] % chars.length);
        }
        return password;
    }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let _cryptoServiceInstance: CryptoServiceImpl | null = null;

/**
 * Get the singleton CryptoService instance.
 * Lazy initialization on first call.
 */
export function getCryptoService(): CryptoServiceImpl {
    if (!_cryptoServiceInstance) {
        _cryptoServiceInstance = new CryptoServiceImpl();
    }
    return _cryptoServiceInstance;
}

/**
 * Reset the singleton instance (for testing only).
 */
export function resetCryptoService(): void {
    _cryptoServiceInstance = null;
}

// =============================================================================
// Backward-Compatible Static Facade (Deprecated)
// =============================================================================

/**
 * @deprecated Use getCryptoService() or inject CryptoServiceImpl for testing.
 * This static facade is maintained for backward compatibility.
 */
export class CryptoService {
    static async init(): Promise<void> {
        return getCryptoService().init();
    }

    static async deriveKey(password: string, salt: Uint8Array): Promise<Uint8Array> {
        return getCryptoService().deriveKey(password, salt);
    }

    static generateSalt(): Uint8Array {
        return getCryptoService().generateSalt();
    }

    static encrypt(message: string, key: Uint8Array): { ciphertext: string; nonce: string } {
        return getCryptoService().encrypt(message, key);
    }

    static decrypt(ciphertextBase64: string, nonceBase64: string, key: Uint8Array): string {
        return getCryptoService().decrypt(ciphertextBase64, nonceBase64, key);
    }

    static generatePassword(
        length: number = 20,
        options: PasswordGeneratorOptions = { uppercase: true, lowercase: true, numbers: true, symbols: true }
    ): string {
        return getCryptoService().generatePassword(length, options);
    }
}
