export interface PasswordEntry {
    id: string;
    title: string;
    username: string;
    password?: string;
    website?: string;
    url?: string;
    notes?: string;
    category: Category;
    tags?: string[];
    otpSecret?: string;
    strength?: 'Secure' | 'Strong' | 'Medium' | 'Weak';
    lastUpdated?: string;
    createdAt: number;
    updatedAt: number;
    favorite: boolean;
    icon?: string;
}

export type Category = 'All' | 'Personal' | 'Work' | 'Others';

export type CloudProvider = 'none' | 'dropbox' | 'google' | 'drive' | 'webdav' | 'icloud' | 'onedrive';

export interface AppSettings {
    biometricsEnabled: boolean;
    autoLockTimeout: number;
    twoFactorEnabled: boolean;
    theme: 'dark' | 'light' | 'system';
    cloudProvider: CloudProvider;
    lastSync: string;
    masterLogEnabled?: boolean;
}
