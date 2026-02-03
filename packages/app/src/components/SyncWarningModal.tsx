import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, AlertTriangle } from 'lucide-react';
import { CloudProvider, AuthService } from '@ethervault/core';
import { Portal } from './Portal';

interface SyncWarningModalProps {
    onClose: () => void;
    onConfirm: () => void;
    providerName: string;
}

export const SyncWarningModal: React.FC<SyncWarningModalProps> = ({ onClose, onConfirm, providerName }) => {
    const { t } = useTranslation();
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            // Fix #2: Use verifyPassword (validates against current session) instead of authenticate
            const isValid = await AuthService.verifyPassword(password);
            if (isValid) {
                onConfirm();
            } else {
                setError(t('settings.error.incorrect') || 'Incorrect Master Password');
            }
        } catch (err) {
            setError('Validation failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Portal>
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-amber-200 dark:border-amber-900/30 shadow-2xl p-6 animate-in zoom-in-95 duration-200">

                    <div className="flex flex-col items-center text-center space-y-4 mb-6">
                        <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center text-amber-500">
                            <AlertTriangle className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                {t('sync.warning.title', 'Important Security Warning')}
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
                                {t('sync.warning.message', `You are about to enable sync with ${providerName}. To access your vault on other devices, you MUST remember your Master Password.`)}
                            </p>
                            <p className="text-xs font-bold text-amber-600 dark:text-amber-500 mt-2 uppercase tracking-wide">
                                {t('sync.warning.alert', 'We cannot recover your password if you forget it.')}
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                                {t('sync.warning.confirm_password', 'Confirm Master Password')}
                            </label>
                            <input
                                type="password"
                                autoFocus
                                required
                                value={password}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (/^[\x21-\x7E]*$/.test(val)) {
                                        setPassword(val);
                                    }
                                }}
                                placeholder="Enter Master Password to continue"
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 outline-none focus:border-amber-500 transition-all text-sm"
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 justify-center text-rose-500 text-xs font-bold uppercase animate-in fade-in slide-in-from-top-1">
                                <Shield className="w-3 h-3" />
                                {error}
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="flex-1 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all"
                            >
                                {t('common.cancel', 'Cancel')}
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !password}
                                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black rounded-xl hover:shadow-lg hover:shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
                            >
                                {loading ? t('sync.warning.verifying', 'Verifying...') : t('sync.warning.confirm', 'I Understand, Enable Sync')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Portal>
    );
};
