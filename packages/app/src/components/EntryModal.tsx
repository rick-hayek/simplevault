import React, { useState } from 'react';
import { Lock, ChevronLeft, X, Globe, User as UserIcon, Copy, Trash2 } from 'lucide-react';
import { PasswordEntry, SecurityService, Category } from '@ethervault/core';
import { useTranslation } from 'react-i18next';
import { CATEGORIES } from '../constants';
import { Portal } from './Portal';

export interface EntryModalProps {
    entry: PasswordEntry | null;
    onClose: () => void;
    onSave: (entry: PasswordEntry) => void;
    onDelete: (id: string) => void;
}

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

        if (!formData.password?.trim()) {
            alert(t('vault.error.password_required', 'Password field must not be empty'));
            return;
        }

        const result: PasswordEntry = {
            ...formData as PasswordEntry,
            id: entry?.id || crypto.randomUUID(),
            lastUpdated: t('vault.just_now', 'Just now'),
            strength: formData.password ? SecurityService.calculateStrength(formData.password) : 'Weak'
        };
        onSave(result);
    };

    return (
        <Portal>
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
                <div className="bg-white dark:bg-slate-900 w-full md:max-w-lg h-[100dvh] md:h-auto md:max-h-[90vh] rounded-none md:rounded-[2rem] border-t md:border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-300 flex flex-col">
                    <div className="px-6 md:px-8 pt-[calc(env(safe-area-inset-top)+4px)] pb-4 md:py-6 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="hidden md:flex p-2 bg-slate-900 dark:bg-white rounded-xl">
                                <Lock className="w-5 h-5 text-white dark:text-slate-900" />
                            </div>

                            {/* Mobile Back Button */}
                            <button onClick={onClose} className="md:hidden p-2 -ml-2 text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-full transition-colors">
                                <ChevronLeft className="w-6 h-6" />
                            </button>

                            {/* Mobile Drag Handle */}
                            <div className="md:hidden w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto absolute left-0 right-0 top-3 pointer-events-none" />

                            <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white md:pt-0">{entry ? t('vault.edit_credential') : t('vault.new_credential')}</h2>
                        </div>
                        <button onClick={onClose} className="hidden md:block p-2 -mr-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors bg-white/50 dark:bg-slate-800/50 rounded-full md:bg-transparent">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-5 overflow-y-auto overscroll-contain pb-safe-area-bottom">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t('vault.entry.title')}</label>
                                <input
                                    required
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3.5 px-4 outline-none focus:border-indigo-500 transition-all text-base md:text-sm text-slate-900 dark:text-white font-medium shadow-sm"
                                    placeholder={t('vault.entry.title_placeholder')}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t('vault.entry.category')}</label>
                                <select
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value as Category })}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3.5 px-4 outline-none focus:border-indigo-500 transition-all text-base md:text-sm text-slate-900 dark:text-white font-medium shadow-sm"
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
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3.5 pl-12 pr-4 outline-none focus:border-indigo-500 transition-all text-base md:text-sm text-slate-900 dark:text-white font-medium shadow-sm"
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
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3.5 pl-12 pr-12 outline-none focus:border-indigo-500 transition-all text-base md:text-sm text-slate-900 dark:text-white font-medium shadow-sm"
                                    placeholder={t('vault.entry.username_placeholder')}
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(formData.username || '');
                                        // Optional: Show toast or feedback
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-indigo-500 transition-colors"
                                    title={t('common.copy')}
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t('vault.entry.password')}</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    required
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3.5 pl-12 pr-12 outline-none focus:border-indigo-500 transition-all text-base md:text-sm text-slate-900 dark:text-white font-mono shadow-sm"
                                    placeholder={t('vault.entry.password_placeholder')}
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(formData.password || '');
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-indigo-500 transition-colors"
                                    title={t('common.copy')}
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="pt-6 flex gap-3 pb-8 md:pb-0">
                            {entry && showDeleteConfirm ? (
                                <div className="flex-1 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                    <button
                                        type="button"
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="flex-1 px-4 py-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-sm font-bold"
                                    >
                                        {t('common.cancel', 'Cancel')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onDelete(entry.id)}
                                        className="flex-1 px-4 py-4 rounded-xl bg-rose-500 text-white hover:bg-rose-600 transition-all text-sm font-bold shadow-lg shadow-rose-500/20"
                                    >
                                        {t('common.confirm_delete', 'Delete')}
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {entry && (
                                        <button
                                            type="button"
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className="flex items-center justify-center px-5 py-4 rounded-xl border border-rose-100 dark:border-rose-900/30 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-6 py-4 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                                    >
                                        {t('common.cancel', 'Cancel')}
                                    </button>

                                    <button
                                        type="submit"
                                        className="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-xl font-bold shadow-xl hover:opacity-90 active:scale-[0.98] transition-all"
                                    >
                                        {entry ? t('vault.update') : t('vault.save')}
                                    </button>
                                </>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </Portal>
    );
};
