import React, { useState, useEffect } from 'react';
import { PasswordEntry } from '@premium-password-manager/core';
import { useTranslation } from 'react-i18next';
import { Download, FileJson, FileText, Check, AlertTriangle, X } from 'lucide-react';

interface ExportModalProps {
    entries: PasswordEntry[];
    onClose: () => void;
    onExport: (format: 'json' | 'csv') => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ entries, onClose, onExport }) => {
    const { t } = useTranslation();
    const [format, setFormat] = useState<'csv' | 'json'>('csv');
    const [preview, setPreview] = useState('');

    useEffect(() => {
        if (format === 'json') {
            const previewData = entries.slice(0, 2).map(({ id, ...rest }) => rest);
            setPreview(JSON.stringify(previewData, null, 2));
        } else {
            const headers = ['Title', 'Username', 'Password', 'Website', 'Category'];
            const rows = entries.slice(0, 3).map(e =>
                `"${e.title}","${e.username}","***","${e.website}","${e.category}"`
            );
            setPreview([headers.join(','), ...rows].join('\n'));
        }
    }, [format, entries]);

    return (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full md:max-w-lg h-[100dvh] md:h-auto md:max-h-[90vh] rounded-none md:rounded-[2rem] border-t md:border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-300 flex flex-col">
                <div className="px-6 md:px-8 py-4 md:py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex p-2 bg-emerald-500/10 rounded-xl">
                            <Download className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        {/* Mobile Drag Handle */}
                        <div className="md:hidden w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto absolute left-0 right-0 top-3" />

                        <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white pt-2 md:pt-0">{t('export.title')}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors bg-white/50 dark:bg-slate-800/50 rounded-full md:bg-transparent">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 md:p-8 space-y-6 overflow-y-auto pb-safe-area-bottom scrollbar-hide">
                    <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 flex gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <div>
                            <h4 className="text-sm font-bold text-amber-700 dark:text-amber-400 mb-1">{t('export.warning_title')}</h4>
                            <p className="text-xs text-amber-600/90 dark:text-amber-400/90 leading-relaxed">
                                {t('export.warning_desc')}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t('export.format')}</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setFormat('csv')}
                                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${format === 'csv'
                                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 dark:border-indigo-500'
                                    : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                    }`}
                            >
                                <FileText className={`w-5 h-5 ${format === 'csv' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                                <div className="text-left">
                                    <span className={`block text-sm font-bold ${format === 'csv' ? 'text-indigo-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>CSV</span>
                                    <span className="text-[10px] text-slate-400 font-medium">For Excel/Sheets</span>
                                </div>
                                {format === 'csv' && <Check className="w-4 h-4 text-indigo-600 ml-auto" />}
                            </button>

                            <button
                                onClick={() => setFormat('json')}
                                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${format === 'json'
                                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 dark:border-indigo-500'
                                    : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                    }`}
                            >
                                <FileJson className={`w-5 h-5 ${format === 'json' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                                <div className="text-left">
                                    <span className={`block text-sm font-bold ${format === 'json' ? 'text-indigo-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>JSON</span>
                                    <span className="text-[10px] text-slate-400 font-medium">Full Data Backup</span>
                                </div>
                                {format === 'json' && <Check className="w-4 h-4 text-indigo-600 ml-auto" />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t('export.preview')}</label>
                        <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 max-h-48 overflow-y-auto scrollbar-hide">
                            <pre className="text-[10px] font-mono text-slate-600 dark:text-slate-400 whitespace-pre-wrap break-all">
                                {preview}
                            </pre>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="px-6 py-4 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                        >
                            {t('common.cancel', 'Cancel')}
                        </button>
                        <button
                            onClick={() => onExport(format)}
                            className="flex-1 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold shadow-lg hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            {t('export.download')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
