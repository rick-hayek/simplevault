import React, { useState } from 'react';
import { AlertTriangle, CloudDownload, CloudUpload, Merge, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Portal } from './Portal';

export type ConflictResolution = 'merge' | 'use_cloud' | 'use_local' | 'cancel';

interface SyncConflictModalProps {
    isOpen: boolean;
    localEntryCount: number;
    onResolve: (resolution: ConflictResolution, cloudPassword?: string) => Promise<void>;
}

export const SyncConflictModal: React.FC<SyncConflictModalProps> = ({
    isOpen,
    localEntryCount,
    onResolve
}) => {
    const { t } = useTranslation();
    const [selectedOption, setSelectedOption] = useState<ConflictResolution | null>(null);
    const [cloudPassword, setCloudPassword] = useState('');
    const [showPasswordInput, setShowPasswordInput] = useState(false);
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleOptionClick = (option: ConflictResolution) => {
        if (option === 'merge') {
            setSelectedOption(option);
            setShowPasswordInput(true);
        } else if (option === 'cancel') {
            onResolve('cancel');
        } else {
            setSelectedOption(option);
            setShowPasswordInput(false);
        }
    };

    const handleConfirm = async () => {
        if (!selectedOption) return;

        setLoading(true);
        try {
            if (selectedOption === 'merge') {
                await onResolve('merge', cloudPassword);
            } else {
                await onResolve(selectedOption);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        setShowPasswordInput(false);
        setSelectedOption(null);
        setCloudPassword('');
    };

    return (
        <Portal>
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-amber-200 dark:border-amber-900/30 shadow-2xl p-6 animate-in zoom-in-95 duration-200">

                    {/* Header */}
                    <div className="flex flex-col items-center text-center space-y-3 mb-6">
                        <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center text-amber-500">
                            <AlertTriangle className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                {t('sync.conflict.title', 'Sync Conflict Detected')}
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
                                {t('sync.conflict.description', 'Your local vault uses a different encryption key than the cloud vault.')}
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                {t('sync.conflict.local_count', { count: localEntryCount, defaultValue: `Local: ${localEntryCount} entries` })}
                            </p>
                        </div>
                    </div>

                    {/* Options or Password Input */}
                    {!showPasswordInput ? (
                        <div className="space-y-3">
                            {/* Merge Option */}
                            <button
                                onClick={() => handleOptionClick('merge')}
                                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${selectedOption === 'merge'
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                        <Merge className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                            {t('sync.conflict.merge', 'Merge Vaults')}
                                            <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-bold">
                                                {t('common.recommended', 'RECOMMENDED')}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                            {t('sync.conflict.merge_desc', 'Combine both vaults. Requires your CLOUD password.')}
                                        </p>
                                    </div>
                                </div>
                            </button>

                            {/* Use Cloud Option */}
                            <button
                                onClick={() => handleOptionClick('use_cloud')}
                                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${selectedOption === 'use_cloud'
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                        <CloudDownload className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-semibold text-slate-900 dark:text-white">
                                            {t('sync.conflict.use_cloud', 'Use Cloud Only')}
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                            {t('sync.conflict.use_cloud_desc', 'Clear local data. Use CLOUD password permanently.')}
                                        </p>
                                    </div>
                                </div>
                            </button>

                            {/* Use Local Option */}
                            <button
                                onClick={() => handleOptionClick('use_local')}
                                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${selectedOption === 'use_local'
                                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-violet-300'
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400">
                                        <CloudUpload className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-semibold text-slate-900 dark:text-white">
                                            {t('sync.conflict.use_local', 'Use Local')}
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                            {t('sync.conflict.use_local_desc', 'Overwrite cloud. Keep LOCAL password.')}
                                        </p>
                                    </div>
                                </div>
                            </button>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-3">
                                <button
                                    onClick={() => onResolve('cancel')}
                                    className="flex-1 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all"
                                >
                                    {t('common.cancel', 'Cancel')}
                                </button>
                                {selectedOption && selectedOption !== 'merge' && (
                                    <button
                                        onClick={handleConfirm}
                                        disabled={loading}
                                        className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black rounded-xl hover:shadow-lg hover:shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {loading ? t('common.processing', 'Processing...') : t('common.confirm', 'Confirm')}
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Password Input for Merge */
                        <div className="space-y-4">
                            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                                <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                                    {t('sync.conflict.enter_cloud_password', 'Enter your CLOUD password to decrypt and merge entries:')}
                                </p>
                            </div>

                            <input
                                type="password"
                                value={cloudPassword}
                                onChange={(e) => setCloudPassword(e.target.value)}
                                placeholder={t('sync.conflict.cloud_password_placeholder', 'Cloud Master Password')}
                                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                autoFocus
                            />

                            <div className="flex gap-3">
                                <button
                                    onClick={handleBack}
                                    className="flex-1 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all"
                                >
                                    {t('common.back', 'Back')}
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    disabled={loading || !cloudPassword}
                                    className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black rounded-xl hover:shadow-lg hover:shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {loading ? t('sync.conflict.merging', 'Merging...') : t('sync.conflict.merge_now', 'Merge Now')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div >
        </Portal>
    );
};
