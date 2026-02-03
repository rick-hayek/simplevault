import React from 'react';
import { CheckCircle, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Portal } from './Portal';

export type AlertType = 'success' | 'warning' | 'info' | 'error';

interface AlertDialogProps {
    isOpen: boolean;
    type?: AlertType;
    title?: string;
    message: string;
    onClose: () => void;
}

const iconMap = {
    success: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/20' },
    warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/20' },
    info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/20' },
    error: { icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-100 dark:bg-rose-900/20' }
};

export const AlertDialog: React.FC<AlertDialogProps> = ({
    isOpen,
    type = 'info',
    title,
    message,
    onClose
}) => {
    const { t } = useTranslation();

    if (!isOpen) return null;

    const { icon: Icon, color, bg } = iconMap[type];

    return (
        <Portal>
            <div
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
                onClick={onClose}
            >
                <div
                    className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-6 pb-4">
                        <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-2xl ${bg}`}>
                                <Icon className={`w-6 h-6 ${color}`} />
                            </div>
                            <div className="flex-1 pt-1">
                                {title && (
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                                        {title}
                                    </h3>
                                )}
                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                    {message}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 pb-6">
                        <button
                            onClick={onClose}
                            className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl hover:opacity-90 transition-all uppercase tracking-wider"
                        >
                            {t('common.ok', 'OK')}
                        </button>
                    </div>
                </div>
            </div>
        </Portal>
    );
};
