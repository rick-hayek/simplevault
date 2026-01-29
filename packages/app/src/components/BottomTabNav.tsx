import React from 'react';
import { Lock, ShieldCheck, KeyRound, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BottomTabNavProps {
    currentView: string;
    setView: (view: any) => void;
}

export const BottomTabNav: React.FC<BottomTabNavProps> = ({ currentView, setView }) => {
    const { t } = useTranslation();

    const navItems = [
        {
            id: 'vault',
            label: t('layout.nav.vault'),
            icon: Lock,
            activeClass: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/20',
        },
        {
            id: 'generator',
            label: t('layout.nav.generator'),
            icon: KeyRound,
            activeClass: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/20',
        },
        {
            id: 'security',
            label: t('layout.nav.security'),
            icon: ShieldCheck,
            activeClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/20',
        },
        {
            id: 'settings',
            label: t('layout.nav.settings'),
            icon: Settings,
            activeClass: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/20',
        },
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pt-2 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 safe-area-bottom">
            <nav className="flex items-center justify-between max-w-sm mx-auto">
                {navItems.map((item) => {
                    const isActive = currentView === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setView(item.id)}
                            className={`relative flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all duration-300 ${isActive ? item.activeClass : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                }`}
                        >
                            <div className={`p-1.5 rounded-xl transition-all duration-300 ${isActive ? 'scale-110' : ''}`}>
                                <item.icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <span className={`text-[9px] font-bold uppercase tracking-wider transition-all duration-300 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 absolute bottom-2'
                                }`}>
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
};
