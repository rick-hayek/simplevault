import React, { useState, useRef } from 'react';
import { VaultService, PasswordEntry, SecurityService, Category } from '@ethervault/core';
import { useTranslation } from 'react-i18next';
import { Upload, FileText, Check, AlertCircle, X, Loader2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { MobileFileService } from '../utils/MobileFileService';

interface ImportModalProps {
    onClose: () => void;
    onImport: (entries: PasswordEntry[]) => Promise<void>;
}

export const ImportModal: React.FC<ImportModalProps> = ({ onClose, onImport }) => {
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [status, setStatus] = useState<'idle' | 'reading' | 'ready' | 'importing' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const [parsedEntries, setParsedEntries] = useState<PasswordEntry[]>([]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const processString = (content: string, filename: string) => {
        try {
            // 1. Check for binary content (null bytes)
            if (content.includes('\0')) {
                throw new Error(t('import.error_binary') || 'Binary file detected');
            }

            let entries: PasswordEntry[] = [];

            if (filename.endsWith('.json')) {
                const raw = JSON.parse(content);
                if (Array.isArray(raw)) {
                    entries = raw.map(mapRawToEntry);
                } else if (raw && typeof raw === 'object' && !('ciphertext' in raw)) {
                    entries = [mapRawToEntry(raw)];
                } else {
                    throw new Error(t('import.error_format') || 'Invalid JSON format');
                }
            } else if (filename.endsWith('.csv')) {
                entries = parseCSV(content);
            } else {
                throw new Error(t('import.error_type') || 'Unsupported file format');
            }

            if (entries.length === 0) {
                throw new Error(t('import.error_empty') || 'No valid entries found');
            }

            const taggedEntries = entries.map(e => ({
                ...e,
                category: 'Others' as Category,
                tags: [...(e.tags || []), `Imported ${new Date().toLocaleDateString()}`]
            }));

            setParsedEntries(taggedEntries);
            setStatus('ready');
        } catch (err: any) {
            console.error(err);
            setStatus('error');
            setErrorMsg(err.message || 'Failed to parse file');
        }
    };

    const processFile = (file: File) => {
        setStatus('reading');
        setErrorMsg('');
        const reader = new FileReader();

        reader.onload = (event) => {
            processString(event.target?.result as string, file.name);
        };

        reader.onerror = () => {
            setStatus('error');
            setErrorMsg('Error reading file');
        };

        reader.readAsText(file);
    };

    const handleMobilePick = async () => {
        try {
            const result = await MobileFileService.pickFile();
            if (result) {
                setStatus('reading');
                processString(result.content, result.name);
            }
        } catch (e: any) {
            // Error handling handled in service?
            if (e.message) {
                setStatus('error');
                setErrorMsg(e.message);
            }
        }
    };

    const handleImportClick = async () => {
        if (status !== 'ready') return;

        setStatus('importing');
        setErrorMsg('');

        try {
            await onImport(parsedEntries);
            onClose();
        } catch (err: any) {
            console.error('Import failed inside modal:', err);
            setStatus('error');
            setErrorMsg(err.message || 'Failed to import entries. Detailed error check required.');
        }
    };

    const mapRawToEntry = (raw: any): PasswordEntry => {
        return {
            id: crypto.randomUUID(), // Generate new IDs to avoid conflict
            title: raw.title || raw.username || 'Untitled',
            username: raw.username || '',
            password: raw.password || '',
            website: raw.website || '',
            category: 'Others',
            tags: raw.tags || [],
            strength: 'Medium',
            lastUpdated: 'Imported',
            notes: raw.notes || '',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            favorite: false
        };
    };

    const parseCSV = (content: string): PasswordEntry[] => {
        const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
        const entries: PasswordEntry[] = [];

        if (lines.length === 0) return [];

        // Validation 2: Check printable characters ratio on first few lines
        // If > 20% are non-printable (excluding standard whitespace), likely invalid
        const sample = lines.slice(0, 5).join('');
        // ASCII control chars 0-31 (except 9, 10, 13) and 127
        const nonPrintableCount = (sample.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g) || []).length;
        if (sample.length > 0 && (nonPrintableCount / sample.length) > 0.1) {
            throw new Error(t('import.error_binary') || 'Binary file detected');
        }

        // Simple CSV parser - assumes standard "Title,Username,Password,Website"
        // Skipping header if present
        const startIndex = lines[0].toLowerCase().includes('username') ? 1 : 0;

        let validStructureCount = 0;

        for (let i = startIndex; i < lines.length; i++) {
            // Very basic split, better to use a library in production but keeping it simple for now
            // TODO: Handle quoted values properly in future
            const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, ''));

            // Check if line looks like valid CSV (at least 2 columns because title, username, password... usually > 2)
            // But we can be a bit lenient, say at least 2 columns
            if (cols.length >= 2) {
                validStructureCount++;
                if (cols.length >= 3) {
                    entries.push({
                        id: crypto.randomUUID(),
                        title: cols[0] || 'Untitled',
                        username: cols[1] || '',
                        password: cols[2] || '',
                        website: cols[3] || '',
                        category: cols[4] as Category || 'Others',
                        tags: [],
                        strength: 'Medium',
                        lastUpdated: 'Imported',
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                        favorite: false
                    });
                }
            }
        }

        // Validation 3: If we processed many lines but found very few valid entries, reject.
        // E.g. a binary file might have 1000 lines but only 5 look like CSV rows by chance.
        const totalProcessed = lines.length - startIndex;
        if (totalProcessed > 5 && entries.length < totalProcessed * 0.5) {
            throw new Error(t('import.error_invalid_format') || 'Invalid file format');
        }

        return entries;
    };

    return (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full md:max-w-lg h-[100dvh] md:h-auto md:max-h-[90vh] rounded-none md:rounded-[2rem] border-t md:border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-300 flex flex-col">
                <div className="px-6 md:px-8 py-4 md:py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex p-2 bg-indigo-500/10 rounded-xl">
                            <Upload className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        {/* Mobile Drag Handle */}
                        <div className="md:hidden w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto absolute left-0 right-0 top-3" />

                        <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white pt-2 md:pt-0">{t('import.title')}</h2>
                    </div>
                    <button onClick={onClose} disabled={status === 'importing'} className="p-2 -mr-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors bg-white/50 dark:bg-slate-800/50 rounded-full md:bg-transparent disabled:opacity-50">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 md:p-8 space-y-6 overflow-y-auto pb-safe-area-bottom scrollbar-hide">
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => {
                            if (status === 'importing') return;
                            if (Capacitor.isNativePlatform()) {
                                handleMobilePick();
                            } else {
                                fileInputRef.current?.click();
                            }
                        }}
                        className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${isDragOver
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10'
                            : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            } ${status === 'importing' ? 'opacity-50 cursor-wait' : ''}`}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".csv,.json"
                            onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
                            disabled={status === 'importing'}
                        />

                        {status === 'reading' || status === 'importing' ? (
                            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-3" />
                        ) : status === 'ready' ? (
                            <Check className="w-10 h-10 text-emerald-500 mb-3" />
                        ) : status === 'error' ? (
                            <AlertCircle className="w-10 h-10 text-rose-500 mb-3" />
                        ) : (
                            <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
                        )}

                        <p className="font-bold text-slate-700 dark:text-slate-200 mb-1">
                            {status === 'ready' ? t('import.ready', { count: parsedEntries.length }) :
                                status === 'importing' ? t('import.importing') :
                                    status === 'error' ? t('import.error') :
                                        Capacitor.isNativePlatform() ? t('import.click_to_select') : t('import.drag_drop')}
                        </p>
                        <p className="text-xs text-slate-400">
                            {status === 'error' ? errorMsg : t('import.formats')}
                        </p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 text-xs text-slate-500 dark:text-slate-400 leading-relaxed border border-slate-100 dark:border-slate-800">
                        <strong>{t('import.note_title')}:</strong> {t('import.note_desc')}
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onClose}
                            disabled={status === 'importing'}
                            className="px-6 py-4 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50"
                        >
                            {t('common.cancel', 'Cancel')}
                        </button>
                        <button
                            disabled={status !== 'ready'}
                            onClick={handleImportClick}
                            className="flex-1 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold shadow-lg hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {status === 'importing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            {status === 'importing' ? t('import.importing') : t('import.action')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
