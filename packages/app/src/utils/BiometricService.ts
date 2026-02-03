import { Capacitor } from '@capacitor/core';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import i18next from '../i18n';

// Electron API Interface (from preload)
// Electron API Interface (from preload) - moved to global types

export class BiometricService {
    private static isNative = Capacitor.isNativePlatform();

    static async isAvailable(): Promise<boolean> {
        if (this.isNative) {
            const result = await NativeBiometric.isAvailable();
            return result.isAvailable;
        } else if (window.electronAPI?.biometrics) {
            return await window.electronAPI.biometrics.isAvailable();
        }
        console.log('[Bio] Not available');
        return false;
    }

    static async saveSecret(secret: string): Promise<boolean> {
        if (this.isNative) {
            try {
                await NativeBiometric.setCredentials({
                    username: 'master_auth',
                    password: secret,
                    server: 'com.ethervault.app',
                });
                return true;
            } catch (e) {
                console.error('Biometric save failed', e);
                return false;
            }
        } else if (window.electronAPI?.biometrics) {
            return await window.electronAPI.biometrics.saveSecret(secret);
        }
        return false;
    }

    static async retrieveSecret(reason: string = 'Unlock Vault'): Promise<string | null> {
        if (this.isNative) {
            try {
                // First verify identity
                // Check if i18n is ready and log warning if translations are missing
                const titleKey = 'biometric_prompt.title';
                const title = i18next.t(titleKey);
                if (title === titleKey) {
                    console.warn('[Bio] i18n not ready or translation missing for biometric prompt');
                }

                const bioOptions = {
                    reason: reason,
                    title: title || 'Unlock EtherVault',
                    subtitle: i18next.t('biometric_prompt.subtitle') || 'Use your biometric ID',
                    description: i18next.t('biometric_prompt.reason') || reason,
                    negativeButtonText: i18next.t('biometric_prompt.cancel') || 'Cancel',
                };
                console.log('[Bio] Verify options:', bioOptions);

                await NativeBiometric.verifyIdentity(bioOptions as any);

                // Then get credentials
                const credentials = await NativeBiometric.getCredentials({
                    server: 'com.ethervault.app',
                });

                // Check if we have the specific one
                if (credentials && credentials.username === 'master_auth') {
                    return credentials.password;
                }
                return null;
            } catch (e) {
                console.warn('Biometric retrieve failed', e);
                return null;
            }
        } else if (window.electronAPI?.biometrics) {
            return await window.electronAPI.biometrics.retrieveSecret(reason);
        }
        return null;
    }

    static async deleteSecret(): Promise<boolean> {
        if (this.isNative) {
            try {
                await NativeBiometric.deleteCredentials({
                    server: 'com.ethervault.app',
                });
                return true;
            } catch (e) {
                console.error('Biometric delete failed', e);
                return false;
            }
        } else if (window.electronAPI?.biometrics) {
            return await window.electronAPI.biometrics.deleteSecret();
        }
        return false;
    }

    static async hasSavedSecret(): Promise<boolean> {
        if (this.isNative) {
            // Fix: Actually check if credentials exist in keychain
            // instead of relying on localStorage flag which can be inconsistent
            // (e.g., after app reinstall, keychain persists but localStorage is cleared)
            try {
                // NativeBiometric.getCredentials will throw if no credentials exist
                // We don't need to verify identity, just check if credentials are stored
                const credentials = await NativeBiometric.getCredentials({
                    server: 'com.ethervault.app',
                });
                const hasSecret = !!(credentials && credentials.username === 'master_auth');

                // Sync localStorage flag with actual keychain state
                if (hasSecret) {
                    localStorage.setItem('ethervault_bio_enabled', 'true');
                } else {
                    localStorage.removeItem('ethervault_bio_enabled');
                }

                return hasSecret;
            } catch (e) {
                // No credentials found or error accessing keychain
                localStorage.removeItem('ethervault_bio_enabled');
                return false;
            }
        } else if (window.electronAPI?.biometrics) {
            return await window.electronAPI.biometrics.hasSavedSecret();
        }
        return false;
    }
}
