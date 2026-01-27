
import React, { useState } from 'react';
import { Search, Plus, MoreVertical, ExternalLink, Copy, Check, Tag as TagIcon, X, Globe, User as UserIcon, Lock, Eye, EyeOff, Trash2, Edit2, ChevronRight } from 'lucide-react';
import { PasswordEntry, Category, SecurityService } from '@premium-password-manager/core';
import { useTranslation } from 'react-i18next';
import { CATEGORIES } from '../constants';

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
  onAdd
}) => {
  const { t } = useTranslation();
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

      {/* Filters - Hidden on mobile */}
      <div className="hidden md:block space-y-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          <div className="relative w-full lg:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder={t('vault.search')}
              onChange={(e) => onSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl py-2 pl-10 pr-4 outline-none focus:border-indigo-500 transition-all text-sm"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 w-full lg:w-auto scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => onCategoryChange(cat)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${activeCategory === cat
                  ? `${getCategoryColor(cat)} border-transparent shadow-md`
                  : 'bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-800 hover:border-slate-200'
                  }`}
              >
                {t(`category.${cat.toLowerCase()}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Category Scroll */}
      <div className="md:hidden flex gap-2 overflow-x-auto py-1 scrollbar-hide -mx-4 px-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => onCategoryChange(cat)}
            className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${activeCategory === cat
              ? `${getCategoryColor(cat)} border-transparent shadow-md`
              : 'bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800'
              }`}
          >
            {t(`category.${cat.toLowerCase()}`)}
          </button>
        ))}
      </div>

      {/* Password List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
        {passwords.map((entry) => (
          <React.Fragment key={entry.id}>
            {/* Desktop View Card */}
            <div
              className="hidden md:block group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-slate-100 font-bold border border-slate-100 dark:border-slate-700 overflow-hidden">
                    {entry.icon ? (
                      <img src={entry.icon} alt={entry.title} className="w-full h-full object-cover" />
                    ) : (
                      entry.title.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">{entry.title}</h3>
                    <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-medium uppercase tracking-tighter">
                      <Globe className="w-2.5 h-2.5" />
                      <span className="truncate">{entry.website}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <button onClick={() => onEdit(entry)} className="p-1.5 text-slate-400 hover:text-indigo-500 transition-colors opacity-0 group-hover:opacity-100"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><MoreVertical className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-2.5 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl flex items-center justify-between group/row border border-slate-100/50 dark:border-slate-700/50">
                  <div className="truncate pr-2">
                    <span className="block text-[8px] uppercase font-bold text-slate-400 mb-0.5 tracking-widest">{t('vault.entry.username')}</span>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate block">{entry.username}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(entry.id, entry.username)}
                    className="p-1 bg-white dark:bg-slate-700 rounded-lg shadow-sm text-slate-400 hover:text-slate-900"
                  >
                    {copiedId === entry.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${getStrengthColor(entry.strength)}`}>
                    {entry.strength}
                  </div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{entry.lastUpdated}</span>
                </div>
              </div>
            </div>

            {/* Compact Mobile List Item */}
            <div
              onClick={() => onEdit(entry)}
              className="md:hidden flex items-center gap-3 p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl active:bg-slate-100 dark:active:bg-slate-900 transition-colors shadow-sm"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-900 dark:text-slate-100 font-bold shrink-0 border border-slate-200 dark:border-slate-800 overflow-hidden">
                {entry.icon ? (
                  <img src={entry.icon} alt={entry.title} className="w-full h-full object-cover" />
                ) : (
                  entry.title.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate leading-none">{entry.title}</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-1 font-medium">{entry.username}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${entry.strength === 'Secure' ? 'bg-emerald-500' :
                  entry.strength === 'Strong' ? 'bg-blue-500' :
                    entry.strength === 'Medium' ? 'bg-amber-500' : 'bg-rose-500'
                  }`} />
                <ChevronRight className="w-4 h-4 text-slate-300" />
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
      lastUpdated: 'Just now'
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result: PasswordEntry = {
      ...formData as PasswordEntry,
      id: entry?.id || crypto.randomUUID(),
      lastUpdated: 'Just now',
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
            {entry && (
              <button
                type="button"
                onClick={() => onDelete(entry.id)}
                className="flex items-center justify-center p-3 rounded-xl border border-rose-100 dark:border-rose-900/30 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
              >
                <Trash2 className="w-5 h-5" />
              </button>
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