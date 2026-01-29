import { Capacitor } from '@capacitor/core';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';

// Electron API Interface (from preload)
declare global {
    interface Window {
        electronAPI?: {
            biometrics: {
                isAvailable: () => Promise<boolean>;
                saveSecret: (secret: string) => Promise<boolean>;
                retrieveSecret: (reason: string) => Promise<string | null>;
                deleteSecret: () => Promise<boolean>;
                hasSavedSecret: () => Promise<boolean>;
            };
        };
    }
}

export class BiometricService {
    private static isNative = Capacitor.isNativePlatform();

    static async isAvailable(): Promise<boolean> {
        if (this.isNative) {
            const result = await NativeBiometric.isAvailable();
            return result.isAvailable;
        } else if (window.electronAPI?.biometrics) {
            return await window.electronAPI.biometrics.isAvailable();
        }
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
                await NativeBiometric.verifyIdentity({
                    reason: reason,
                    title: 'Unlock EtherVault',
                    subtitle: 'Use your biometric ID',
                    description: reason,
                });

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
            // NativeBiometric doesn't have a direct 'check' without retrieving.
            // We might need to try retrieve or just rely on a flag if we want to be fast.
            // But for security, we usually just assume available if the device supports it
            // AND we have successfully saved before. 
            // A better way: check if we have a flag in localStorage that WE set when saving.
            return localStorage.getItem('ethervault_bio_enabled') === 'true';
        } else if (window.electronAPI?.biometrics) {
            return await window.electronAPI.biometrics.hasSavedSecret();
        }
        return false;
    }
}
