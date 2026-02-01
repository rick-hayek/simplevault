
import React, { useState, useEffect } from 'react';
import { logger } from '../utils/logger';
import {
  Fingerprint,
  Shield,
  Clock,
  Moon,
  Smartphone,
  Cloud,
  Check,
  RefreshCcw,
  Database,
  Lock,
  Globe,
  Bell,
  Languages,
  FileText,
  Activity,
  X,
  Trash2,
  Loader2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BiometricService } from '../utils/BiometricService';
import { AppSettings, CloudProvider, AuthService, VaultService, CloudService, NETWORK_TIMEOUT_MS } from '@ethervault/core';
import { ImportModal } from './ImportModal';
import { ExportModal } from './ExportModal';
import { SyncWarningModal } from './SyncWarningModal';
import { SyncConflictModal, ConflictResolution } from './SyncConflictModal';
import { useAlert } from '../hooks/useAlert';
import { useBackHandler } from '../hooks/useBackHandler';
import { MobileFileService } from '../utils/MobileFileService';

interface SettingsViewProps {
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
  onDataChange: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, setSettings, onDataChange }) => {
  const { t, i18n } = useTranslation();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Sync Warning State
  const [isSyncWarningModalOpen, setIsSyncWarningModalOpen] = useState(false);
  const [pendingProvider, setPendingProvider] = useState<CloudProvider | null>(null);

  // Connection State
  const [cloudConnected, setCloudConnected] = useState(() => CloudService.isSyncEnabled());

  // Password Change State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordChangeStatus, setPasswordChangeStatus] = useState('');

  useEffect(() => {
    // Subscribe to CloudService connection changes
    const unsubscribe = CloudService.onConnectionChange((connected) => {
      setCloudConnected(connected);
    });
    return () => unsubscribe();
  }, []);

  const { showAlert, showSuccess, showError, showWarning, showInfo } = useAlert();

  const [passwordForm, setPasswordForm] = useState({ old: '', new: '', confirm: '' });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [activityLogs, setActivityLogs] = useState<string[]>([]);
  const [cacheMessage, setCacheMessage] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState<string>(__APP_VERSION__);

  // Conflict Resolution State
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [conflictCloudMeta, setConflictCloudMeta] = useState<{ salt: string; verifier: string } | null>(null);
  const [localEntryCount, setLocalEntryCount] = useState(0);

  // Biometric Modal State
  const [isBioModalOpen, setIsBioModalOpen] = useState(false);
  const [bioPassword, setBioPassword] = useState('');
  const [bioError, setBioError] = useState<string | null>(null);

  useBackHandler('settings-view', async () => {
    if (isCacheConfirmOpen) { setIsCacheConfirmOpen(false); return true; }
    if (isActivityModalOpen) { setIsActivityModalOpen(false); return true; }
    if (isPasswordModalOpen) { setIsPasswordModalOpen(false); return true; }
    if (isBioModalOpen) { setIsBioModalOpen(false); return true; }
    if (isExportModalOpen) { setIsExportModalOpen(false); return true; }
    if (isImportModalOpen) { setIsImportModalOpen(false); return true; }
    if (isSyncWarningModalOpen) { setIsSyncWarningModalOpen(false); return true; }
    if (isConflictModalOpen) { setIsConflictModalOpen(false); return true; }
    return false;
  }, true); // Enabled by default

  useEffect(() => {
    // Runtime check for version (Desktop overrides Web build version)
    const checkVersion = async () => {
      if (window.electronAPI?.getVersion) {
        const ver = await window.electronAPI.getVersion();
        setAppVersion(ver);
      }
    };
    checkVersion();
  }, []);

  const fetchLogs = async () => {
    if (logger.getRecentLogs) {
      const logs = await logger.getRecentLogs();
      setActivityLogs(logs);
    }
  };

  const [isCacheConfirmOpen, setIsCacheConfirmOpen] = useState(false);

  const performClearCache = async () => {
    // 1. Clear Local Storage Logs
    localStorage.removeItem('ethervault_logs');

    // 2. Clear Electron Cache
    if (window.electronAPI?.clearCache) {
      await window.electronAPI.clearCache();
    }

    // 3. Clear State immediately
    setActivityLogs([]);

    // 4. Show Feedback
    setCacheMessage(t('settings.success.cache_cleared') || 'Cache Cleared!');
    setTimeout(() => setCacheMessage(null), 2000);
  };

  useEffect(() => {
    if (isActivityModalOpen) {
      fetchLogs();
    }
  }, [isActivityModalOpen]);

  // Wrapper to fetch entries for export
  const ExportModalWrapper = ({ onClose }: { onClose: () => void }) => {
    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    React.useEffect(() => {
      VaultService.getEntries()
        .then(data => {
          setEntries(data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to load entries for export:', err);
          setLoading(false);
          setError('Failed to decrypt vault data. Please log in again with the correct master password.');
        });
    }, []);

    if (error) {
      return (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl border border-rose-200 dark:border-rose-900/30 shadow-2xl p-6 text-center space-y-4 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/20 flex items-center justify-center mx-auto text-rose-500">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Export Failed</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{error}</p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black rounded-xl uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              Close
            </button>
          </div>
        </div>
      );
    }

    if (loading) return null;

    return (
      <ExportModal
        entries={entries}
        onClose={onClose}
        onExport={async (format) => {
          try {
            const date = new Date().toISOString().split('T')[0];
            const filename = `ethervault-backup-${date}.${format}`;
            let content = '';

            if (format === 'json') {
              content = JSON.stringify(entries, null, 2);
            } else {
              const headers = ['Title', 'Username', 'Password', 'Website', 'Category', 'Notes'];
              const rows = entries.map(e =>
                [e.title, e.username, e.password, e.website, e.category, e.notes]
                  .map(field => `"${(field || '').replace(/"/g, '""')}"`) // Escape quotes
                  .join(',')
              );
              content = [headers.join(','), ...rows].join('\n');
            }

            // Mobile Native Export
            if (await MobileFileService.exportFile(filename, content)) {
              showSuccess(t('export.success_mobile', 'Export successful! Saved to device storage (Downloads/Documents).'));
              onClose();
              return;
            }

            const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            onClose();
          } catch (err: any) {
            console.error('Export failed', err);
            showError(err.message || 'Export failed');
          }
        }}
      />
    );
  };

  const toggleBiometrics = async () => {
    // If disabling
    if (settings.biometricsEnabled) {
      const success = await BiometricService.deleteSecret();
      if (success) {
        setSettings({ ...settings, biometricsEnabled: false });
        localStorage.removeItem('ethervault_bio'); // Clear legacy flag if any
      } else {
        showError(t('settings.error.failed'));
      }
      return;
    }

    // If enabling, check if available first
    const available = await BiometricService.isAvailable();
    if (!available) {
      showError(t('settings.error.no_bio', 'Biometrics not available on this device.'));
      return;
    }

    // Open modal to get password
    setIsBioModalOpen(true);
    setBioPassword('');
    setBioError(null);
  };

  const handleBioConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setBioError(null);

    // Verify password against current auth
    const isValid = await AuthService.verifyPassword(bioPassword);
    if (!isValid) {
      setBioError(t('settings.error.incorrect'));
      return;
    }

    // Save secret
    const success = await BiometricService.saveSecret(bioPassword);
    if (success) {
      setSettings({ ...settings, biometricsEnabled: true });
      localStorage.setItem('ethervault_bio', 'true'); // legacy/flag
      setIsBioModalOpen(false);
      showSuccess(t('settings.success.biometric_enabled'));
    } else {
      setBioError(t('settings.error.failed'));
    }
  };

  const connectToProvider = async (provider: CloudProvider) => {
    logger.info('[SettingsView] connectToProvider called for:', provider);
    setIsSyncing(true);
    try {
      CloudService.useProvider(provider);
      const connected = await CloudService.connect();
      logger.info('[SettingsView] CloudService.connect result:', connected);

      if (!connected) {
        console.warn('Failed to connect to provider', provider);
        logger.info('[SettingsView] Calling showError with literal string...');
        showError(t('settings.cloud.connection_failed', 'Connection failed. Please check your network.'));
        return;
      }

      // Check if cloud has existing metadata
      const cloudMeta = await CloudService.fetchMetadata();

      if (cloudMeta?.salt) {
        // Cloud has data - check if salt matches local
        const localSalt = await AuthService.getSaltBase64();

        if (localSalt && cloudMeta.salt !== localSalt) {
          // Salt mismatch - check if we have local entries
          const localEntries = await VaultService.getEncryptedEntries();

          if (localEntries.length > 0) {
            // CONFLICT: Both local and cloud have different salts
            setLocalEntryCount(localEntries.length);
            setConflictCloudMeta(cloudMeta);
            setIsConflictModalOpen(true);
            return;
          } else {
            // No local entries - adopt cloud credentials silently
            await AuthService.importCloudCredentials(cloudMeta.salt, cloudMeta.verifier);
            showSuccess(
              t('sync.credentials_imported', 'Cloud vault found. Please log in again with your original password.'),
              undefined,
              () => window.location.reload()
            );
            return;
          }
        }
      }

      // No conflict - proceed normally
      setSettings({ ...settings, cloudProvider: provider, lastSync: t('sync.syncing') });

      // Auto-trigger sync after successful connection
      const entries = await VaultService.getEncryptedEntries();
      const result = await CloudService.sync(entries);

      if (result && result.updatedEntries.length > 0) {
        await VaultService.processCloudEntries(result.updatedEntries);
        onDataChange(); // Refresh UI with new entries
      }

      setSettings({ ...settings, cloudProvider: provider, lastSync: t('sync.just_now') });
    } catch (e: any) {
      console.error('Provider connection error', e);

      // Handle specific errors
      if (e.message?.includes('MISSING_VERIFIER') || e.message?.includes('INVALID_VERIFIER')) {
        showError(t('sync.error.missing_verifier',
          'Cloud vault is missing password verification data. Please sync from the original device first to update cloud metadata.'));
      } else {
        showError(e.message || t('settings.error.failed', 'Connection failed. Please try again.'));
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncConfirm = () => {
    if (pendingProvider) {
      localStorage.setItem(`ethervault_sync_warning_${pendingProvider}`, 'true');
      setIsSyncWarningModalOpen(false);
      connectToProvider(pendingProvider);
      setPendingProvider(null);
    }
  };

  const handleConflictResolve = async (resolution: ConflictResolution, cloudPassword?: string) => {
    if (resolution === 'cancel') {
      setIsConflictModalOpen(false);
      setConflictCloudMeta(null);
      return;
    }

    setIsSyncing(true);

    try {
      switch (resolution) {
        case 'merge':
          if (!cloudPassword || !conflictCloudMeta) {
            showError(t('sync.error.missing_password', 'Cloud password is required for merge.'));
            setIsSyncing(false);
            return;
          }

          // 1. Derive cloud key
          const cloudKey = await AuthService.deriveKeyWithSalt(cloudPassword, conflictCloudMeta.salt);

          // 2. Download all cloud entries
          const cloudEntries = await CloudService.downloadAllEntries();

          if (cloudEntries.length === 0) {
            showError(t('sync.error.no_cloud_entries', 'No cloud entries found to merge.'));
            setIsSyncing(false);
            return;
          }

          // 3. Merge: decrypt with cloud key, re-encrypt with local key
          const mergedCount = await VaultService.mergeCloudEntries(cloudEntries, cloudKey);

          // CRITICAL: Validate merge succeeded before clearing cloud
          // If cloudEntries existed but mergedCount is 0, decryption failed (wrong password)
          if (mergedCount === 0) {
            showError(t('sync.error.wrong_password', 'Incorrect cloud password. Decryption failed. Please try again.'));
            setIsSyncing(false);
            return; // Do NOT clear cloud data! Keep modal open for retry
          }

          // 4. Clear cloud and re-upload with local credentials
          await CloudService.clearRemoteData();

          // 5. Trigger full sync to upload merged data
          const localEntries = await VaultService.getEncryptedEntries();
          await CloudService.sync(localEntries);

          setSettings({ ...settings, cloudProvider: pendingProvider || settings.cloudProvider, lastSync: t('sync.just_now') });
          onDataChange();
          setIsConflictModalOpen(false); // Close modal on success
          setConflictCloudMeta(null); // Cleanup
          showSuccess(t('sync.merge_complete', `Successfully merged ${mergedCount} entries from cloud.`));
          break;

        case 'use_cloud':
          if (!conflictCloudMeta) return;

          // Clear local vault and adopt cloud credentials
          await VaultService.clearLocalVault();
          await AuthService.importCloudCredentials(conflictCloudMeta.salt, conflictCloudMeta.verifier);

          showSuccess(t('sync.use_cloud_complete', 'Switched to cloud vault. Please log in again with your cloud password.'));
          setIsConflictModalOpen(false);
          setConflictCloudMeta(null);
          window.location.reload();
          break;

        case 'use_local':
          // Clear cloud and upload local data
          await CloudService.clearRemoteData();

          // Trigger sync to upload local data
          const entries = await VaultService.getEncryptedEntries();
          await CloudService.sync(entries);

          setSettings({ ...settings, cloudProvider: pendingProvider || settings.cloudProvider, lastSync: t('sync.just_now') });
          setIsConflictModalOpen(false); // Close modal on success
          setConflictCloudMeta(null);
          showSuccess(t('sync.use_local_complete', 'Cloud has been overwritten with local data.'));
          break;
      }
    } catch (e: any) {
      console.error('Conflict resolution error:', e);
      if (e.message?.includes('wrong secret key') || e.message?.includes('decryption failed')) {
        showError(t('sync.error.wrong_password', 'Incorrect cloud password. Decryption failed.'));
      } else {
        showError(t('settings.error.failed'));
      }
    } finally {
      setIsSyncing(false);
      // NOTE: Do NOT clear conflictCloudMeta here, as we might be in a retry-able error state (wrong password)
    }
  };

  const handleSync = async (provider: CloudProvider) => {
    // If same provider, Force Sync
    if (settings.cloudProvider === provider) {
      setIsSyncing(true);
      try {
        // Ensure we're connected before syncing
        const connected = await CloudService.connect();
        logger.info('[SettingsView] handleSync: connect result:', connected);

        if (!connected) {
          showError(t('settings.cloud.connection_failed', 'Connection failed. Please check your network.'));
          return;
        }

        const entries = await VaultService.getEncryptedEntries();

        // // Race sync against timeout logic (using shared constant)
        // const syncPromise = CloudService.sync(entries);
        // const timeoutPromise = new Promise<any>((_, reject) =>
        //   setTimeout(() => reject(new Error('SYNC_TIMEOUT')), NETWORK_TIMEOUT_MS)
        // );

        // const result = await Promise.race([syncPromise, timeoutPromise]);

        // Directly await sync, allowing it to take as long as needed for large batches
        // We removed the artificial timeout because batch uploads can take minutes
        const result = await CloudService.sync(entries);

        if (result && result.updatedEntries.length > 0) {
          await VaultService.processCloudEntries(result.updatedEntries);
          setSettings({ ...settings, lastSync: t('sync.just_now') }); // Update timestamp
          onDataChange(); // Refresh UI with new entries
        }
        setSettings({ ...settings, lastSync: t('sync.just_now') });
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
      } catch (err: any) {
        if (err.message === 'SALT_UPDATED') {
          // Force reload to clear memory and re-login with new salt
          showInfo(
            t('sync.salt_updated') || 'Cloud security settings updated. You must log in again.',
            undefined,
            () => window.location.reload()
          );
          return;
        }

        if (err.message?.includes('SALT_CONFLICT')) {
          logger.warn('[SettingsView] Salt conflict detected during sync. Triggering resolution flow.');
          connectToProvider(settings.cloudProvider);
          return;
        }
        console.error('Sync failed', err);
        logger.error('[SettingsView] Sync failed', err);

        if (err.message === 'SYNC_TIMEOUT') {
          showError(t('settings.cloud.connection_failed', 'Connection failed. Please check your network.'));
        } else {
          showError(err.message || t('settings.error.failed', 'Operation failed.'));
        }
      } finally {
        setIsSyncing(false);
      }
      return;
    }

    // Switch Provider Logic
    if (provider === 'none') {
      setSettings({ ...settings, cloudProvider: provider, lastSync: '' });
      return;
    }

    // Check for First Time Warning
    const hasSeenWarning = localStorage.getItem(`ethervault_sync_warning_${provider}`);
    if (!hasSeenWarning) {
      setPendingProvider(provider);
      setIsSyncWarningModalOpen(true);
      return;
    }

    // Already authorized, connect immediately
    connectToProvider(provider);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (passwordForm.new !== passwordForm.confirm) {
      setError(t('settings.error.match'));
      return;
    }

    setIsChangingPassword(true);
    setPasswordChangeStatus(t('settings.status.encrypting', 'Re-encrypting vault...'));

    try {
      // Allow UI to update
      await new Promise(r => setTimeout(r, 50));

      const result = await AuthService.changeMasterPassword(passwordForm.old, passwordForm.new);
      if (result) {
        // Fix: If cloud is connected, we must clear old data as key has changed
        if (CloudService.isSyncEnabled()) {
          try {
            setPasswordChangeStatus(t('settings.status.resyncing', 'Syncing new data to cloud...'));
            await CloudService.clearRemoteData();
            const entries = await VaultService.getEncryptedEntries();
            await CloudService.sync(entries);
            logger.info('[SettingsView] Cloud data reset and re-synced after password change.');
          } catch (e) {
            logger.error('[SettingsView] Failed to reset cloud after password change', e);
          }
        }

        setSuccess(true);
        setPasswordChangeStatus(t('settings.status.done', 'Done!'));
        setTimeout(() => {
          setIsPasswordModalOpen(false);
          setPasswordForm({ old: '', new: '', confirm: '' });
          setSuccess(false);
          setIsChangingPassword(false);
          setPasswordChangeStatus('');
        }, 1500);
      } else {
        setError(t('settings.error.incorrect'));
        setIsChangingPassword(false);
      }
    } catch (err: any) {
      setError(err.message || t('settings.error.failed'));
      setIsChangingPassword(false);
    }
  };

  const CompactSetting = ({ icon: Icon, label, value, onClick, type = 'toggle' }: any) => (
    <div
      onClick={type === 'toggle' ? onClick : undefined}
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl flex items-center justify-between group transition-all ${type === 'toggle' ? 'cursor-pointer active:scale-[0.99] hover:border-indigo-500/30' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-400 group-hover:text-indigo-500 transition-colors">
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight">{label}</span>
      </div>
      {type === 'toggle' ? (
        <div className={`w-10 h-6 rounded-full relative transition-all duration-300 ${value ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 shadow-sm ${value ? 'right-1' : 'left-1'}`} />
        </div>
      ) : (
        <button onClick={(e) => { e.stopPropagation(); onClick?.(); }} disabled={!onClick} className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 capitalize disabled:cursor-default px-2 py-1">
          {value}
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-full">
      <div className="sticky top-0 z-30 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm px-4 pt-[calc(env(safe-area-inset-top)+4px)] pb-2 md:sticky md:px-8 md:pt-8 md:pb-4 transition-all">
        <div className="flex items-center justify-between">
          <div className="block">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{t('settings.title')}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{t('settings.subtitle')}</p>
          </div>
          <div className="hidden md:block text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] px-2 py-1 rounded-lg">VER {appVersion}</div>
        </div>
      </div>

      <div className="px-4 md:px-8 space-y-4 pb-6 md:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Cloud Config - Tighter */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{t('settings.sync_provider')}</h2>
              {settings.lastSync && <span className="text-[8px] text-emerald-500 font-bold uppercase">{settings.lastSync}</span>}
            </div>

            <div className="space-y-3">
              {[
                {
                  id: 'google', name: 'Google Drive', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'hover:border-blue-200 dark:hover:border-blue-800', icon: () => (
                    <svg viewBox="0 0 87.3 78" className="w-6 h-6">
                      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
                      <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47" />
                      <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335" />
                      <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
                      <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
                      <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
                    </svg>
                  )
                },
                // OneDrive (Postponed)
                // {
                //   id: 'onedrive', name: 'OneDrive', color: 'text-[#0078D4]', bg: 'bg-[#0078D4]/10', border: 'hover:border-[#0078D4]/30', icon: () => (...)
                // }
              ].map(p => {
                const isActive = settings.cloudProvider === p.id;

                return (
                  <div
                    key={p.id}
                    className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${isActive
                      ? 'border-indigo-500/50 bg-indigo-50/50 dark:bg-indigo-500/10 dark:border-indigo-500/30 shadow-md ring-1 ring-indigo-500/20'
                      : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm'
                      }`}
                  >
                    <div className="p-4 flex items-start gap-4">
                      <div className={`p-2.5 rounded-xl shrink-0 ${isActive ? 'bg-white dark:bg-slate-800 shadow-sm' : 'bg-white dark:bg-slate-800'}`}>
                        <p.icon />
                      </div>

                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-none">{p.name}</h3>
                          {isActive && cloudConnected && (
                            <span className="flex items-center gap-1 text-[9px] font-black text-emerald-500 uppercase tracking-wider bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              {t('settings.cloud.connected')}
                            </span>
                          )}
                          {isActive && !cloudConnected && (
                            <span className="flex items-center gap-1 text-[9px] font-black text-amber-500 uppercase tracking-wider bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              {t('settings.cloud.paused', 'Paused')}
                            </span>
                          )}
                        </div>

                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-[90%]">
                          {isActive
                            ? t('settings.cloud.connected_desc', { provider: p.name })
                            : t('settings.cloud.connect_desc', { provider: p.name })
                          }
                        </p>

                        {isActive && settings.lastSync && (
                          <div className="mt-3 flex items-center gap-1.5 text-[9px] font-medium text-slate-400">
                            <RefreshCcw className="w-3 h-3 text-slate-300" />
                            {t('settings.cloud.last_synced')} <span className="text-slate-600 dark:text-slate-300 font-bold">
                              {settings.lastSync === 'Just now' || settings.lastSync === '刚刚'
                                ? t('sync.just_now')
                                : settings.lastSync}
                            </span>
                          </div>
                        )}

                        <div className="mt-4 flex items-center gap-2">
                          {isActive && cloudConnected ? (
                            <>
                              <button
                                onClick={() => handleSync(p.id as CloudProvider)}
                                disabled={isSyncing}
                                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 shadow-sm shadow-indigo-200 dark:shadow-none"
                              >
                                <RefreshCcw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                                {isSyncing ? t('settings.cloud.syncing') : t('settings.cloud.sync_now')}
                              </button>
                              <button
                                onClick={() => handleSync('none')} // Disconnect
                                disabled={isSyncing}
                                className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:border-rose-200 dark:hover:border-rose-900/50 text-[11px] font-bold rounded-xl transition-all active:scale-95"
                              >
                                {t('settings.cloud.disconnect')}
                              </button>
                            </>
                          ) : isActive && !cloudConnected ? (
                            <button
                              onClick={() => handleSync(p.id as CloudProvider)} // Will trigger connect flow
                              disabled={isSyncing}
                              className="w-full py-3 bg-amber-500 text-white text-[11px] font-bold rounded-xl hover:bg-amber-600 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm shadow-amber-500/20 disabled:opacity-50 disabled:cursor-wait"
                            >
                              {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                              {t('settings.cloud.reconnect', 'Resume Connection')}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSync(p.id as CloudProvider)}
                              disabled={isSyncing}
                              className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[11px] font-bold rounded-xl hover:shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait"
                            >
                              {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                              {t('settings.cloud.connect_account')}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DEV ONLY BUTTON - Only visible in development mode */}
            {import.meta.env.DEV && CloudService.activeProvider?.isConnected() && (
              <button
                onClick={async () => {
                  if (confirm('DANGER: This will PERMANENTLY DELETE all cloud data. Are you sure?')) {
                    try {
                      const provider = CloudService.activeProvider as any;
                      if (provider && typeof provider.clearRemoteData === 'function') {
                        await provider.clearRemoteData();
                        showSuccess('Cloud data wiped successfully.');
                      }
                    } catch (e) {
                      showError('Failed to wipe data.');
                    }
                  }
                }}
                className="w-full py-2 mt-2 border border-rose-200 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-[9px] font-bold rounded-xl uppercase tracking-widest transition-colors"
              >
                Reset Cloud Data (Dev)
              </button>
            )}
          </div>

          {/* Access Settings - High Density Grid */}
          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <CompactSetting icon={Fingerprint} label={t('settings.option.biometric')} value={settings.biometricsEnabled} onClick={toggleBiometrics} />
              <CompactSetting icon={Shield} label={t('settings.option.2fa')} value={settings.twoFactorEnabled} />
              {/* Lock Timer Dropdown */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-400 group-hover:text-indigo-500 transition-colors">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight">{t('settings.option.lock_timer')}</span>
                </div>
                <select
                  value={settings.autoLockTimeout}
                  onChange={(e) => setSettings({ ...settings, autoLockTimeout: Number(e.target.value) })}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase rounded-lg py-1 px-2 outline-none focus:border-indigo-500 transition-all cursor-pointer"
                >
                  {[1, 5, 15, 30, 60].map(val => (
                    <option key={val} value={val}>
                      {val === 60 ? t('settings.option.time.1h') : t(`settings.option.time.${val}m`)}
                    </option>
                  ))}
                </select>
              </div>
              {/* Recent Activity Button */}
              <div
                onClick={() => setIsActivityModalOpen(true)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl flex items-center justify-between group cursor-pointer hover:border-indigo-500/50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-400 group-hover:text-indigo-500 transition-colors">
                    <Activity className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight">{t('settings.option.recent_activity')}</span>
                </div>
                <div className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                </div>
              </div>
              <CompactSetting
                icon={Moon}
                label={t('settings.option.appearance', 'Appearance')}
                value={
                  settings.theme === 'system' ? t('settings.theme.system', 'System') :
                    settings.theme === 'light' ? t('settings.theme.light', 'Light') :
                      t('settings.theme.dark', 'Dark')
                }
                type="value"
                onClick={() => {
                  const next = settings.theme === 'dark' ? 'light' : (settings.theme === 'light' ? 'system' : 'dark');
                  setSettings({ ...settings, theme: next });
                }}
              />
              <CompactSetting icon={Languages} label={t('settings.option.language')} value={i18n.language === 'zh' ? '中文' : 'ENGLISH'} type="value" onClick={() => i18n.changeLanguage(i18n.language === 'zh' ? 'en' : 'zh')} />

              {/* Master Log Settings */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-400 group-hover:text-indigo-500 transition-colors">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight">{t('settings.option.master_log')}</span>
                </div>
                <div className="flex items-center gap-2">
                  {(settings.masterLogEnabled ?? true) && window.electronAPI && (
                    <button onClick={() => logger.openLogFile()} className="text-[9px] font-bold text-slate-400 hover:text-indigo-500 transition-colors px-2">{t('settings.option.open_log')}</button>
                  )}
                  <button
                    onClick={() => {
                      const newValue = !(settings.masterLogEnabled ?? true);
                      setSettings({ ...settings, masterLogEnabled: newValue });
                      logger.setEnabled(newValue);
                    }}
                    className={`w-8 h-4 rounded-full relative transition-all ${settings.masterLogEnabled ?? true ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${(settings.masterLogEnabled ?? true) ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsPasswordModalOpen(true)}
              className="w-full py-3 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[11px] font-black rounded-2xl hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
            >
              <Shield className="w-4 h-4" />
              {t('settings.change_password')}
            </button>

            {/* Data Management Section */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-[24px] space-y-4">
              <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 pl-1">{t('settings.data_management', 'Data Management')}</h3>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="flex flex-col items-center justify-center gap-2 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all group"
                >
                  <div className="p-2 bg-white dark:bg-slate-700 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                    <Database className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider">{t('settings.import', 'Import')}</span>
                </button>

                <button
                  onClick={() => setIsExportModalOpen(true)}
                  className="flex flex-col items-center justify-center gap-2 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all group"
                >
                  <div className="p-2 bg-white dark:bg-slate-700 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                    <FileText className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider">{t('settings.export', 'Export')}</span>
                </button>
              </div>

              <button
                onClick={() => setIsCacheConfirmOpen(true)}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-rose-100 dark:border-rose-900/30 hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-rose-50 dark:bg-rose-900/20 rounded-lg text-rose-400 group-hover:text-rose-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 group-hover:text-rose-600 dark:group-hover:text-rose-400">{t('settings.clear_cache', 'Clear App Cache')}</span>
                </div>
                <span className="text-[9px] font-black text-rose-300 group-hover:text-rose-500 uppercase tracking-widest">{t('common.clear', 'Clean')}</span>
              </button>
              {cacheMessage && (
                <p className="text-[10px] font-bold text-center text-emerald-500 uppercase tracking-widest animate-in fade-in slide-in-from-bottom-1">
                  {cacheMessage}
                </p>
              )}
            </div>
          </div>
        </div>

        {
          isPasswordModalOpen && (
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-8 animate-in zoom-in-95 duration-200">

                {/* Loading Overlay */}
                {isChangingPassword && (
                  <div className="absolute inset-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center z-50 animate-in fade-in duration-200 p-6 text-center">
                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t('settings.processing', 'Processing...')}</h3>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{passwordChangeStatus}</p>
                  </div>
                )}

                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">{t('settings.password_modal.title')}</h2>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{t('settings.password_modal.current')}</label>
                    <input
                      type="password"
                      required
                      value={passwordForm.old}
                      onChange={e => setPasswordForm({ ...passwordForm, old: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-4 outline-none focus:border-indigo-500 transition-all text-sm"
                    />
                  </div>
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{t('settings.password_modal.new')}</label>
                    <input
                      type="password"
                      required
                      value={passwordForm.new}
                      onChange={e => setPasswordForm({ ...passwordForm, new: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-4 outline-none focus:border-indigo-500 transition-all text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{t('settings.password_modal.confirm')}</label>
                    <input
                      type="password"
                      required
                      value={passwordForm.confirm}
                      onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-4 outline-none focus:border-indigo-500 transition-all text-sm"
                    />
                  </div>

                  {error && <p className="text-rose-500 text-[10px] font-bold uppercase text-center pt-2">{error}</p>}
                  {success && <p className="text-emerald-500 text-[10px] font-bold uppercase text-center pt-2">{t('settings.success.password')}</p>}

                  <div className="flex gap-3 pt-6">
                    <button
                      type="button"
                      onClick={() => { setIsPasswordModalOpen(false); setError(null); }}
                      className="flex-1 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all"
                    >
                      {t('settings.password_modal.cancel')}
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black rounded-xl hover:opacity-90 transition-all"
                    >
                      {t('settings.password_modal.save')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )
        }

        <div className="flex items-center justify-end pt-2 border-t border-slate-100 dark:border-slate-900">
          <span className="text-[8px] font-black text-slate-300 dark:text-slate-800 uppercase tracking-[0.5em] hidden md:block">{t('settings.encryption')}</span>
        </div>

        <div className="md:hidden mt-8 text-center">
          <span className="text-[9px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.3em] px-3 py-1.5 rounded-full">
            VER {appVersion}
          </span>
        </div>

        {
          isBioModalOpen && (
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-8 animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Fingerprint className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{t('settings.biometric_modal.title')}</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('settings.biometric_modal.description')}</p>
                  </div>
                </div>

                <form onSubmit={handleBioConfirm} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{t('login.master_password')}</label>
                    <div className="relative">
                      <input
                        type="password"
                        required
                        value={bioPassword}
                        onChange={e => setBioPassword(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 outline-none focus:border-indigo-500 transition-all text-sm font-bold"
                        placeholder={t('login.unlock_placeholder')}
                        autoFocus
                      />
                      <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    </div>
                  </div>

                  {bioError && <p className="text-rose-500 text-[10px] font-bold uppercase text-center pt-2">{bioError}</p>}

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => { setIsBioModalOpen(false); setBioError(null); }}
                      className="flex-1 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black rounded-xl hover:shadow-lg transition-all active:scale-95"
                    >
                      {t('settings.biometric_modal.enable')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )
        }

        {
          isExportModalOpen && (
            <ExportModalWrapper
              onClose={() => setIsExportModalOpen(false)}
            />
          )
        }

        {
          isImportModalOpen && (
            <ImportModal
              onClose={() => setIsImportModalOpen(false)}
              onImport={async (entries) => {
                // Let the ImportModal handle the try-catch so it can show the error state
                for (const entry of entries) {
                  const { id, createdAt, updatedAt, ...rest } = entry;
                  await VaultService.addEntry(rest);
                }
                setIsImportModalOpen(false);
                setSettings({ ...settings, lastSync: 'Imported just now' });
                onDataChange();
              }}
            />
          )
        }

        {
          isSyncWarningModalOpen && pendingProvider && (
            <SyncWarningModal
              providerName={pendingProvider === 'google' ? 'Google Drive' : pendingProvider}
              onClose={() => {
                setIsSyncWarningModalOpen(false);
                setPendingProvider(null);
              }}
              onConfirm={handleSyncConfirm}
            />
          )
        }

        {/* Salt Conflict Resolution Modal */}
        <SyncConflictModal
          isOpen={isConflictModalOpen}
          localEntryCount={localEntryCount}
          onResolve={handleConflictResolve}
        />

        {
          isActivityModalOpen && (
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setIsActivityModalOpen(false)}>
              <div className="bg-white dark:bg-slate-900 w-full h-[100dvh] md:h-[600px] md:max-w-2xl flex flex-col rounded-none md:rounded-3xl border-t md:border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 dark:bg-slate-800 rounded-xl text-indigo-500">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('settings.activity_modal.title')}</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">~/Library/Logs/EtherVault/main.log</p>
                    </div>
                  </div>
                  <div>
                    <button
                      onClick={() => setIsActivityModalOpen(false)}
                      className="p-2 text-slate-400 hover:text-rose-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-auto scrollbar-hide p-6 bg-slate-50 dark:bg-slate-950 font-mono text-[10px] sm:text-xs text-slate-600 dark:text-slate-300 space-y-1">
                  {activityLogs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                      <Activity className="w-12 h-12 mb-4 opacity-20" />
                      <p>{t('settings.activity_modal.empty')}</p>
                    </div>
                  ) : (
                    activityLogs.map((log, index) => {
                      let colorClass = "text-slate-600 dark:text-slate-400";
                      if (log.includes('[error]') || log.includes('error:')) colorClass = "text-rose-500";
                      if (log.includes('[warn]') || log.includes('warn:')) colorClass = "text-amber-500";
                      if (log.includes('[info]') || log.includes('info:')) colorClass = "text-emerald-600 dark:text-emerald-400";

                      // Highlight our custom tags
                      const highlightedLog = log.replace(/(\[AUTH\]|\[VAULT\]|\[DATA\])/g, '<span class="font-bold text-indigo-500">$1</span>');

                      return (
                        <div key={index} className={`flex items-start gap-3 border-b border-slate-200/50 dark:border-slate-800/50 pb-1 ${colorClass}`}>
                          <span className="opacity-50 select-none w-6 shrink-0 text-right">{index + 1}</span>
                          <span className="break-all" dangerouslySetInnerHTML={{ __html: highlightedLog }} />
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                  <button
                    onClick={fetchLogs}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:text-slate-400 dark:hover:text-indigo-400 dark:hover:bg-indigo-500/10 transition-all"
                  >
                    <RefreshCcw className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">{t('settings.activity_modal.refresh')}</span>
                  </button>
                  <button
                    onClick={() => setIsActivityModalOpen(false)}
                    className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl hover:opacity-90 transition-all uppercase tracking-wider"
                  >
                    {t('settings.activity_modal.close')}
                  </button>
                </div>
              </div>
            </div>
          )
        }
      </div>

      {isCacheConfirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsCacheConfirmOpen(false)} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 p-6 space-y-6">
            <div className="space-y-2 text-center">
              <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-500">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('settings.clear_cache')}?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('settings.clear_cache_desc', 'This will remove local logs and temporary data. Your vault data will NOT be deleted.')}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setIsCacheConfirmOpen(false)}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-mono text-sm"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={performClearCache}
                className="flex-1 px-4 py-3 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20 font-mono text-sm"
              >
                {t('common.confirm_delete', 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
