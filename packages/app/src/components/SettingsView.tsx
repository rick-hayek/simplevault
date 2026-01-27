
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
  X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AppSettings, CloudProvider, AuthService, VaultService } from '@premium-password-manager/core';
import { ImportModal } from './ImportModal';
import { ExportModal } from './ExportModal';

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
  const [passwordForm, setPasswordForm] = useState({ old: '', new: '', confirm: '' });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [activityLogs, setActivityLogs] = useState<string[]>([]);
  const [cacheMessage, setCacheMessage] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState<string>(__APP_VERSION__);

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

  const handleClearCache = async () => {
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
          } catch (err) {
            console.error('Export failed', err);
          }
        }}
      />
    );
  };

  const toggleBiometrics = () => {
    setSettings({ ...settings, biometricsEnabled: !settings.biometricsEnabled });
  };

  const handleSync = (provider: CloudProvider) => {
    if (settings.cloudProvider === provider) {
      setIsSyncing(true);
      setTimeout(() => { setIsSyncing(false); setSettings({ ...settings, lastSync: 'Just now' }); }, 1000);
    } else {
      setIsSyncing(true);
      setTimeout(() => { setIsSyncing(false); setSettings({ ...settings, cloudProvider: provider, lastSync: 'Just now' }); }, 800);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (passwordForm.new !== passwordForm.confirm) {
      setError(t('settings.error.match'));
      return;
    }

    try {
      const result = await AuthService.changeMasterPassword(passwordForm.old, passwordForm.new);
      if (result) {
        setSuccess(true);
        setTimeout(() => {
          setIsPasswordModalOpen(false);
          setPasswordForm({ old: '', new: '', confirm: '' });
          setSuccess(false);
        }, 2000);
      } else {
        setError(t('settings.error.incorrect'));
      }
    } catch (err: any) {
      setError(err.message || t('settings.error.failed'));
    }
  };

  const CompactSetting = ({ icon: Icon, label, value, onClick, type = 'toggle' }: any) => (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl flex items-center justify-between group">
      <div className="flex items-center gap-3">
        <div className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-400 group-hover:text-indigo-500 transition-colors">
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight">{label}</span>
      </div>
      {type === 'toggle' ? (
        <button onClick={onClick} className={`w-8 h-4 rounded-full relative transition-all ${value ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
          <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${value ? 'right-0.5' : 'left-0.5'}`} />
        </button>
      ) : (
        <button onClick={onClick} disabled={!onClick} className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase disabled:cursor-default">
          {value}
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{t('settings.title')}</h1>
          <p className="hidden md:block text-slate-500 dark:text-slate-400 text-xs mt-0.5">{t('settings.subtitle')}</p>
        </div>
        <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] border border-slate-200 dark:border-slate-800 px-2 py-1 rounded-lg">VER {appVersion}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Cloud Config - Tighter */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{t('settings.sync_provider')}</h2>
            {settings.lastSync && <span className="text-[8px] text-emerald-500 font-bold uppercase">{settings.lastSync}</span>}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'google', name: 'Drive', icon: Globe },
              // { id: 'icloud', name: 'iCloud', icon: Cloud }, // Postponed
              { id: 'onedrive', name: 'Sync', icon: Smartphone }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => handleSync(p.id as CloudProvider)}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${settings.cloudProvider === p.id
                  ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-500/5'
                  : 'border-slate-50 dark:border-slate-800 hover:border-slate-200'
                  }`}
              >
                <div className={`p-1.5 rounded-lg ${settings.cloudProvider === p.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                  <p.icon className="w-4 h-4" />
                </div>
                <span className="text-[8px] font-bold text-slate-500 uppercase">{p.name}</span>
              </button>
            ))}
          </div>

          <button
            disabled={isSyncing || settings.cloudProvider === 'none'}
            onClick={() => handleSync(settings.cloudProvider)}
            className="w-full py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-bold rounded-xl active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
          >
            <RefreshCcw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? t('settings.updating') : t('settings.force_sync')}
          </button>
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
            <CompactSetting icon={Moon} label={t('settings.option.dark_mode')} value={settings.theme === 'dark'} onClick={() => setSettings({ ...settings, theme: settings.theme === 'dark' ? 'light' : 'dark' })} />
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
        </div>
      </div>

      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-8 animate-in zoom-in-95 duration-200">
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
      )}

      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-900">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hover:text-rose-500 transition-colors"
          >
            {t('settings.export')}
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hover:text-indigo-500 transition-colors"
          >
            {t('import.title')}
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearCache}
              className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hover:text-rose-500 transition-colors"
            >
              {t('settings.clear_cache')}
            </button>
            {cacheMessage && <span className="text-[9px] font-bold text-emerald-500 animate-in fade-in slide-in-from-left-2 duration-300">{cacheMessage}</span>}
          </div>
        </div>
        <span className="text-[8px] font-black text-slate-300 dark:text-slate-800 uppercase tracking-[0.5em]">{t('settings.encryption')}</span>
      </div>

      {isExportModalOpen && (
        <ExportModalWrapper
          onClose={() => setIsExportModalOpen(false)}
        />
      )}

      {isImportModalOpen && (
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
      )}
      {isActivityModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setIsActivityModalOpen(false)}>
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl h-[600px] flex flex-col rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
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
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchLogs}
                  className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all"
                  title={t('settings.activity_modal.refresh')}
                >
                  <RefreshCcw className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsActivityModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6 bg-slate-50 dark:bg-slate-950 font-mono text-[10px] sm:text-xs text-slate-600 dark:text-slate-300 space-y-1">
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
                    <div key={index} className={`flex gap-3 border-b border-slate-200/50 dark:border-slate-800/50 pb-1 ${colorClass}`}>
                      <span className="opacity-50 select-none w-6 text-right">{index + 1}</span>
                      <span className="break-all" dangerouslySetInnerHTML={{ __html: highlightedLog }} />
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end">
              <button
                onClick={() => setIsActivityModalOpen(false)}
                className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl hover:opacity-90 transition-all uppercase tracking-wider"
              >
                {t('settings.activity_modal.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
