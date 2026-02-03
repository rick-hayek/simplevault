import React, { useState } from 'react';
import { Search, Plus, ExternalLink, Copy, Check, Globe, User as UserIcon, Lock, Edit2, User, Key, LogOut, X } from 'lucide-react';
import { VaultService, PasswordEntry, CryptoService, SecurityService, VaultStorageItem, Category, CloudService } from '@ethervault/core';
import { useTranslation } from 'react-i18next';
import { CATEGORIES } from '../constants';

// One-time prompt component
const CloudSyncPrompt: React.FC<{ onGoToSettings: () => void, onDismiss: () => void }> = ({ onGoToSettings, onDismiss }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-500/20 p-4 rounded-3xl animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
          <Globe className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {t('vault.sync_prompt.title', 'Sync your vault across devices')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('vault.sync_prompt.description', 'Connect to cloud storage to access your passwords anywhere.')}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 w-full md:w-auto justify-end">
        <button
          onClick={onDismiss}
          className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors uppercase tracking-wider"
        >
          {t('common.dismiss', 'Dismiss')}
        </button>
        <button
          onClick={onGoToSettings}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 active:scale-95 whitespace-nowrap"
        >
          {t('vault.sync_prompt.action', 'Setup Sync')}
        </button>
      </div>
    </div>
  );
};

interface VaultViewProps {
  passwords: PasswordEntry[];
  activeCategory: Category;
  onCategoryChange: (cat: Category) => void;
  onSearch: (query: string) => void;
  allTags: string[];
  activeTag: string | null;
  onTagChange: (tag: string | null) => void;
  onEdit: (entry: PasswordEntry) => void;
  onAdd: () => void;
  onGoToSettings: () => void;
  onLock: () => void;
  searchQuery: string;
  isSyncEnabled: boolean;
}

export const VaultView: React.FC<VaultViewProps> = ({
  passwords,
  activeCategory,
  onCategoryChange,
  onSearch,
  allTags,
  activeTag,
  onTagChange,
  onEdit,
  onAdd,
  onGoToSettings,
  onLock,
  searchQuery,
  isSyncEnabled
}) => {
  const { t } = useTranslation();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSearchMode, setIsSearchMode] = useState(false);

  // One-time sync prompt state
  const [showSyncPrompt, setShowSyncPrompt] = useState(() => {
    // If already seen, don't show
    if (localStorage.getItem('ethervault_sync_prompt_seen') === 'true') {
      return false;
    }

    // If sync is already active (configured), auto-dismiss and mark as seen
    if (CloudService.activeProvider) {
      localStorage.setItem('ethervault_sync_prompt_seen', 'true');
      return false;
    }

    return true;
  });

  // Auto-dismiss if sync becomes enabled
  React.useEffect(() => {
    if (isSyncEnabled && showSyncPrompt) {
      localStorage.setItem('ethervault_sync_prompt_seen', 'true');
      setShowSyncPrompt(false);
    }
  }, [isSyncEnabled, showSyncPrompt]);

  const handleDismissPrompt = () => {
    localStorage.setItem('ethervault_sync_prompt_seen', 'true');
    setShowSyncPrompt(false);
  };

  const handleGoToSettings = () => {
    localStorage.setItem('ethervault_sync_prompt_seen', 'true');
    onGoToSettings();
  };

  const handleCopy = (id: string, text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'Secure': return 'text-emerald-500 bg-emerald-500/10';
      case 'Strong': return 'text-blue-500 bg-blue-500/10';
      case 'Medium': return 'text-amber-500 bg-amber-500/10';
      case 'Weak': return 'text-rose-500 bg-rose-500/10';
      default: return 'text-slate-500 bg-slate-500/10';
    }
  }

  const getCategoryColor = (cat: Category) => {
    switch (cat) {
      case 'All': return 'bg-slate-900 text-white dark:bg-white dark:text-slate-900';
      case 'Personal': return 'bg-rose-600 text-white';
      case 'Work': return 'bg-indigo-600 text-white';
      case 'Others': return 'bg-amber-600 text-white';
      default: return 'bg-slate-600 text-white';
    }
  }

  return (
    <div className="min-h-full">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center pt-[calc(env(safe-area-inset-top)+4px)] pb-4 bg-slate-50 dark:bg-slate-950 shrink-0 z-30 px-4 titlebar transition-all duration-300 min-h-[60px]">
        {isSearchMode ? (
          <div className="flex-1 flex items-center gap-3 animate-in fade-in slide-in-from-right-5 duration-200">
            <Search className="w-5 h-5 text-slate-400 shrink-0" />
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              placeholder={t('vault.search')}
              className="flex-1 bg-transparent border-none outline-none text-base font-medium text-slate-900 dark:text-white placeholder:text-slate-400"
            />
            <button
              onClick={() => {
                setIsSearchMode(false);
                onSearch('');
              }}
              className="p-2 -mr-2 text-slate-500 dark:text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{t('vault.title')}</h1>
              <p className="hidden text-slate-500 dark:text-slate-400 mt-0.5 text-xs">{t('vault.subtitle')}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSearchMode(true)}
                className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                title={t('vault.search')}
              >
                <Search className="w-5 h-5" />
              </button>
              <button
                onClick={onLock}
                className="p-2 -mr-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors"
                title={t('layout.lock_vault', 'Lock Vault')}
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </>
        )}
      </header>

      {/* Desktop Sticky Header */}
      <div className="hidden md:flex flex-col gap-6 sticky top-0 z-20 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm px-8 pt-8 pb-4 transition-all">
        <div className="flex flex-row items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{t('vault.title')}</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-xs">{t('vault.subtitle')}</p>
          </div>
          <button
            onClick={onAdd}
            className="flex items-center justify-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:opacity-90 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            {t('vault.add')}
          </button>
        </div>

        {/* Desktop Filters */}
        <div className="space-y-4 bg-white dark:bg-slate-900 p-1.5 rounded-[20px] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-2 items-center">
            <div className="relative w-full lg:w-80 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="text"
                placeholder={t('vault.search')}
                onChange={(e) => onSearch(e.target.value)}
                className="w-full bg-transparent border-none rounded-xl py-3 pl-10 pr-4 outline-none placeholder:text-slate-400 text-sm font-medium"
              />
            </div>

            <div className="w-px h-8 bg-slate-100 dark:bg-slate-800 hidden lg:block" />

            <div className="flex gap-1 overflow-x-auto w-full lg:w-auto p-1 scrollbar-hide">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => onCategoryChange(cat)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all ${activeCategory === cat
                    ? `${getCategoryColor(cat)} shadow-md transform scale-105`
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                >
                  {t(`category.${cat.toLowerCase()}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 pb-4 md:px-8 md:pb-8 space-y-4 md:space-y-6 pt-0 md:pt-2">
        {/* Synchronize Prompt (One-time) */}
        {showSyncPrompt && (
          <CloudSyncPrompt
            onGoToSettings={handleGoToSettings}
            onDismiss={handleDismissPrompt}
          />
        )}

        {/* Mobile Category Scroll */}
        <div className="md:hidden -mx-4 px-4 overflow-x-auto pb-4 pt-1 scrollbar-hide">
          <div className="flex gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => onCategoryChange(cat)}
                className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border shadow-sm active:scale-95 ${activeCategory === cat
                  ? `${getCategoryColor(cat)} border-transparent shadow-md ring-2 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-950 ${cat === 'All' ? 'ring-slate-900 dark:ring-slate-100' : ''}`
                  : 'bg-white dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                  }`}
              >
                {t(`category.${cat.toLowerCase()}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Password List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 pb-20 md:pb-0">
          {passwords.map((entry) => (
            <React.Fragment key={entry.id}>
              {/* Desktop View Card */}
              <div
                className="hidden md:block group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-[24px] hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="flex-1 min-w-0 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-slate-100 font-bold border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm group-hover:shadow-md transition-all shrink-0">
                      {entry.icon ? (
                        <img src={entry.icon} alt={entry.title} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg">{entry.title.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-slate-900 dark:text-white text-base truncate pr-2">{entry.title}</h3>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                        <Globe className="w-3 h-3 shrink-0" />
                        <span className="truncate max-w-[120px]">{entry.website || 'No Website'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-2 group-hover:translate-x-0 shrink-0 ml-2">
                    <button onClick={() => onEdit(entry)} className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-all"><Edit2 className="w-4 h-4" /></button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/50 rounded-xl flex items-center justify-between group/row border border-slate-100 dark:border-slate-800/50 hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                    <div className="truncate pr-2 flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-300" />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate block font-mono tracking-tight">{entry.username}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(entry.id, entry.username)}
                      className="p-1.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm text-slate-400 hover:text-indigo-600 active:scale-90 transition-all"
                      title="Copy Username"
                    >
                      {copiedId === entry.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-950/50 rounded-xl flex items-center justify-between group/row border border-slate-100 dark:border-slate-800/50 hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                    <div className="truncate pr-2 flex items-center gap-2">
                      <Key className="w-3.5 h-3.5 text-slate-300" />
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-400">••••••••••••</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopy(`${entry.id}_pwd`, entry.password)}
                      className="p-1.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm text-slate-400 hover:text-indigo-600 active:scale-90 transition-all"
                      title="Copy Password"
                    >
                      {copiedId === `${entry.id}_pwd` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Lock className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 px-1">
                    {(() => {
                      const strength = entry.strength || (entry.password ? SecurityService.calculateStrength(entry.password) : 'Medium');
                      return (
                        <div className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest ${getStrengthColor(strength)}`}>
                          {t(`vault.strength.${strength}`, strength)}
                        </div>
                      );
                    })()}
                    <span className="text-[9px] text-slate-300 font-black uppercase tracking-widest">
                      {entry.lastUpdated === 'Just now' || entry.lastUpdated === '刚刚' ? t('vault.just_now') : entry.lastUpdated}
                    </span>
                  </div>
                </div>
              </div>

              {/* Clean Mobile List Item */}
              <div className="md:hidden relative rounded-[20px] shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden active:scale-[0.99] transition-all duration-200">
                <div
                  onClick={() => onEdit(entry)}
                  className="flex items-center gap-4 p-4 active:bg-slate-50 dark:active:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-slate-100 font-bold shrink-0 border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
                    {entry.icon ? (
                      <img src={entry.icon} alt={entry.title} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg">{entry.title.charAt(0).toUpperCase()}</span>
                    )}
                  </div>

                  {/* Text Content */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 dark:text-white text-base truncate leading-tight">{entry.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1 font-medium">{entry.username}</p>
                  </div>

                  {/* Quick Action: Copy Password */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(`${entry.id}_pwd`, entry.password);
                    }}
                    className={`w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-95 ${copiedId === `${entry.id}_pwd`
                      ? 'bg-emerald-500 text-white shadow-emerald-500/30 shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                  >
                    {copiedId === `${entry.id}_pwd` ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
