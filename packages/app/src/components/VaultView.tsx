import React, { useState } from 'react';
import { Search, Plus, MoreVertical, ExternalLink, Copy, Check, Tag as TagIcon, X, Globe, User as UserIcon, Lock, Eye, EyeOff, Trash2, Edit2, User, Key, ChevronRight } from 'lucide-react';
import { PasswordEntry, Category, SecurityService } from '@premium-password-manager/core';
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
  onGoToSettings
}) => {
  const { t } = useTranslation();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // One-time sync prompt state
  const [showSyncPrompt, setShowSyncPrompt] = useState(() => {
    return localStorage.getItem('ethervault_sync_prompt_seen') !== 'true';
  });

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
    <div className="space-y-4 md:space-y-6">
      {/* Header section - Hidden on mobile */}
      <div className="hidden md:flex flex-col md:flex-row md:items-center justify-between gap-6">
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

      {/* Synchronize Prompt (One-time) */}
      {showSyncPrompt && (
        <CloudSyncPrompt
          onGoToSettings={handleGoToSettings}
          onDismiss={handleDismissPrompt}
        />
      )}

      {/* Filters - Hidden on mobile */}
      <div className="hidden md:block space-y-4 bg-white dark:bg-slate-900 p-1.5 rounded-[20px] border border-slate-200 dark:border-slate-800 shadow-sm">
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

            {/* Compact Mobile List Item with Swipe Actions */}
            <div className="md:hidden relative rounded-[24px] overflow-hidden my-1 shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide">
                {/* Main Content */}
                <div
                  onClick={() => onEdit(entry)}
                  className="min-w-full snap-center flex items-center gap-4 p-4 active:bg-slate-50 dark:active:bg-slate-800/50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-slate-100 font-bold shrink-0 border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
                    {entry.icon ? (
                      <img src={entry.icon} alt={entry.title} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg">{entry.title.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 dark:text-white text-base truncate leading-tight">{entry.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1 font-medium">{entry.username}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-300 font-bold rotate-90 tracking-widest">SWIPE</span>
                    <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                  </div>
                </div>

                {/* Swipe Actions */}
                <div className="flex snap-start">
                  <button
                    onClick={() => handleCopy(`${entry.id}_pwd`, entry.password)}
                    className="w-20 pl-2 bg-indigo-600 flex flex-col items-center justify-center text-white active:bg-indigo-700"
                  >
                    {copiedId === `${entry.id}_pwd` ? <Check className="w-6 h-6 mb-1" /> : <Lock className="w-6 h-6 mb-1" />}
                    <span className="text-[9px] font-bold uppercase">Pass</span>
                  </button>
                  <button
                    onClick={() => handleCopy(entry.id, entry.username)}
                    className="w-20 bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center text-slate-600 dark:text-slate-300 active:bg-slate-200 dark:active:bg-slate-700"
                  >
                    {copiedId === entry.id ? <Check className="w-6 h-6 mb-1" /> : <User className="w-6 h-6 mb-1" />}
                    <span className="text-[9px] font-bold uppercase">User</span>
                  </button>
                </div>
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

interface EntryModalProps {
  entry: PasswordEntry | null;
  onClose: () => void;
  onSave: (entry: PasswordEntry) => void;
  onDelete: (id: string) => void;
}

// Added EntryModal component to fix import error in App.tsx
export const EntryModal: React.FC<EntryModalProps> = ({ entry, onClose, onSave, onDelete }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Partial<PasswordEntry>>(
    entry || {
      title: '',
      username: '',
      password: '',
      website: '',
      category: 'All',
      tags: [],
      strength: 'Medium',
      lastUpdated: t('vault.just_now', 'Just now')
    }
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result: PasswordEntry = {
      ...formData as PasswordEntry,
      id: entry?.id || crypto.randomUUID(),
      lastUpdated: t('vault.just_now', 'Just now'),
      strength: formData.password ? SecurityService.calculateStrength(formData.password) : 'Weak'
    };
    onSave(result);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 dark:bg-white rounded-xl">
              <Lock className="w-5 h-5 text-white dark:text-slate-900" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{entry ? t('vault.edit_credential') : t('vault.new_credential')}</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t('vault.entry.title')}</label>
              <input
                required
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 outline-none focus:border-indigo-500 transition-all text-sm text-slate-900 dark:text-white font-medium"
                placeholder={t('vault.entry.title_placeholder')}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t('vault.entry.category')}</label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value as Category })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 outline-none focus:border-indigo-500 transition-all text-sm text-slate-900 dark:text-white font-medium"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{t(`category.${c.toLowerCase()}`)}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t('vault.entry.website')}</label>
            <div className="relative">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={formData.website}
                onChange={e => setFormData({ ...formData, website: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-indigo-500 transition-all text-sm text-slate-900 dark:text-white font-medium"
                placeholder={t('vault.entry.website_placeholder')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t('vault.entry.username_email')}</label>
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                required
                value={formData.username}
                onChange={e => setFormData({ ...formData, username: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-indigo-500 transition-all text-sm text-slate-900 dark:text-white font-medium"
                placeholder={t('vault.entry.username_placeholder')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t('vault.entry.password')}</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-indigo-500 transition-all text-sm text-slate-900 dark:text-white font-mono"
                placeholder={t('vault.entry.password_placeholder')}
              />
            </div>
          </div>

          <div className="pt-6 flex gap-3">
            {entry && !showDeleteConfirm && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center justify-center p-3 rounded-xl border border-rose-100 dark:border-rose-900/30 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            {entry && showDeleteConfirm && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-sm font-medium"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(entry.id)}
                  className="px-3 py-2 rounded-xl bg-rose-500 text-white hover:bg-rose-600 transition-all text-sm font-bold"
                >
                  {t('common.confirm_delete', 'Delete')}
                </button>
              </div>
            )}
            <button
              type="submit"
              className="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-xl font-bold shadow-lg hover:opacity-90 active:scale-[0.98] transition-all"
            >
              {entry ? t('vault.update') : t('vault.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};