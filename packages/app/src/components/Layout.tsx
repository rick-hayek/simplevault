
import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  KeyRound,
  Settings,
  X,
  Moon,
  Sun,
  LogOut,
  Search,
  Plus,
  MoreVertical,
  ArrowLeft
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface LayoutProps {
  children: React.ReactNode;
  currentView: string;
  setView: (view: any) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  onLock?: () => void;
  onSearch?: (query: string) => void;
  searchQuery?: string;
  onAddClick?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  currentView,
  setView,
  isDarkMode,
  toggleDarkMode,
  onLock,
  onSearch,
  searchQuery = '',
  onAddClick
}) => {
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);

  // Clear search and mode if view changes
  useEffect(() => {
    setIsSearchMode(false);
  }, [currentView]);

  const navItems = [
    {
      id: 'vault',
      label: t('layout.nav.vault'),
      icon: Lock,
      activeClass: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400',
      ringClass: 'ring-indigo-500/20'
    },
    {
      id: 'security',
      label: t('layout.nav.security'),
      icon: ShieldCheck,
      activeClass: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
      ringClass: 'ring-emerald-500/20'
    },
    {
      id: 'generator',
      label: t('layout.nav.generator'),
      icon: KeyRound,
      activeClass: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
      ringClass: 'ring-violet-500/20'
    },
    {
      id: 'settings',
      label: t('layout.nav.settings'),
      icon: Settings,
      activeClass: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
      ringClass: 'ring-amber-500/20'
    },
  ];

  return (
    <div className="h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 transition-colors duration-300 overflow-hidden">
      {/* Sidebar - Desktop/Tablet (Fixed position, non-scrolling) */}
      <aside className="hidden md:flex flex-col md:w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-full shrink-0 z-20">
        <div className="p-4 md:p-8 flex items-center justify-start gap-3 titlebar">
          <div className="p-2 bg-slate-900 dark:bg-white rounded-xl shadow-lg shrink-0">
            <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-white dark:text-slate-900" />
          </div>
          <span className="md:block text-xl font-bold text-slate-900 dark:text-white truncate">
            EtherVault
          </span>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto scrollbar-hide">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center justify-start gap-3 px-3 py-3 rounded-xl transition-all duration-300 group ${currentView === item.id
                ? `${item.activeClass} font-semibold shadow-sm ring-1 ${item.ringClass}`
                : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
            >
              <item.icon className={`w-5 h-5 shrink-0 transition-transform duration-300 ${currentView === item.id ? 'scale-110' : 'group-hover:scale-110'}`} />
              <span className="md:block truncate text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-1">
          <button
            onClick={toggleDarkMode}
            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
          >
            <div className="flex items-center gap-3">
              {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
              <span className="md:block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{t('layout.appearance')}</span>
            </div>
          </button>

          <button
            onClick={onLock}
            className="w-full flex items-center justify-start gap-3 px-3 py-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className="md:block text-[10px] font-bold uppercase tracking-wider">{t('layout.lock_vault')}</span>
          </button>
        </div>
      </aside>

      <header className="md:hidden flex items-center h-14 bg-slate-50 dark:bg-slate-950 shrink-0 z-30 px-4 titlebar transition-all duration-300">
        {currentView === 'vault' ? (
          /* Root View Header (Vault) */
          isSearchMode ? (
            <div className="flex items-center w-full gap-2 animate-in slide-in-from-right-2 duration-200">
              <button onClick={() => { setIsSearchMode(false); onSearch?.(''); }} className="p-2 text-slate-900 dark:text-white no-drag active:scale-95 transition-transform"><ArrowLeft className="w-5 h-5" /></button>
              <div className="flex-1 relative">
                <input
                  type="text" autoFocus value={searchQuery} onChange={(e) => onSearch?.(e.target.value)}
                  placeholder={t('layout.search_placeholder')}
                  className="w-full bg-slate-100 dark:bg-slate-900 rounded-xl py-2 pl-4 pr-3 outline-none text-sm text-slate-900 dark:text-white border border-transparent focus:border-indigo-500/50 focus:bg-white dark:focus:bg-slate-900 transition-all no-drag"
                />
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 flex-1 overflow-hidden">
                <div className="p-1.5 bg-slate-900 dark:bg-white rounded-xl shrink-0 shadow-sm"><ShieldCheck className="w-4 h-4 text-white dark:text-slate-900" /></div>
                <span className="font-bold text-lg text-slate-900 dark:text-white truncate tracking-tight">{t('layout.nav.vault')}</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setIsSearchMode(true)} className="p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl no-drag active:scale-95 transition-all"><Search className="w-5 h-5" /></button>
                <button onClick={onAddClick} className="p-2.5 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-xl no-drag active:scale-95 transition-all mx-1"><Plus className="w-5 h-5" /></button>
                <button onClick={() => setIsMobileMenuOpen(true)} className="p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl no-drag active:scale-95 transition-all"><MoreVertical className="w-5 h-5" /></button>
              </div>
            </>
          )
        ) : (
          /* Child View Header (Settings, etc.) */
          <div className="flex items-center w-full gap-3 animate-in fade-in duration-300">
            <button
              onClick={() => setView('vault')}
              className="p-2 -ml-2 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full no-drag active:scale-95 transition-all"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <span className="font-bold text-lg text-slate-900 dark:text-white flex-1 truncate">
              {navItems.find(i => i.id === currentView)?.label}
            </span>
          </div>
        )}
      </header>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-40" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Mobile Menu Drawer */}
      <div className={`md:hidden fixed inset-y-0 right-0 w-64 bg-white dark:bg-slate-950 z-50 transform transition-transform duration-300 ease-out border-l border-slate-200 dark:border-slate-800 ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-slate-900 dark:bg-white rounded-lg"><ShieldCheck className="w-5 h-5 text-white dark:text-slate-900" /></div>
              <span className="font-bold text-lg text-slate-900 dark:text-white">EtherVault</span>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 p-2"><X className="w-5 h-5" /></button>
          </div>
          <nav className="flex-1 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setView(item.id); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${currentView === item.id ? item.activeClass : 'text-slate-500 dark:text-slate-400'
                  }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-bold text-sm">{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <button onClick={toggleDarkMode} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900">
              <div className="flex items-center gap-3">
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
                <span className="text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-widest">{t('layout.appearance')}</span>
              </div>
            </button>
            <button onClick={() => { onLock?.(); setIsMobileMenuOpen(false); }} className="w-full flex items-center gap-3 p-3 text-rose-500 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10">
              <LogOut className="w-4 h-4" />
              <span className="font-bold text-xs uppercase tracking-widest">{t('layout.lock_vault')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area (Independent scroll) */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-8 relative scroll-smooth scrollbar-hide">
        {/* Gradient removed for seamless header */}

        <div className="max-w-6xl mx-auto h-full">
          {children}
        </div>
      </main>
    </div>
  );
};
