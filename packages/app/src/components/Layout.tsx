import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  KeyRound,
  Settings,
  Moon,
  Sun,
  LogOut
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BottomTabNav } from './BottomTabNav';
import { FAB } from './FAB';

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

// ...

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
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [showFab, setShowFab] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const mainRef = React.useRef<HTMLElement>(null);

  // Clear search and mode if view changes
  React.useLayoutEffect(() => {
    setIsSearchMode(false);
    // Reset scroll position when view changes
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [currentView]);

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    // Hide FAB if scrolling down more than 10px and not at the top
    if (currentScrollY > lastScrollY && currentScrollY > 10) {
      setShowFab(false);
    } else {
      setShowFab(true);
    }
    setLastScrollY(currentScrollY);
  };

  const navItems = [
    {
      id: 'vault',
      label: t('layout.nav.vault'),
      icon: Lock,
      activeClass: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400',
      ringClass: 'ring-indigo-500/20'
    },
    // ... items
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
    <div className="h-[100dvh] flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 transition-colors duration-300 overflow-hidden">
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

      {/* Mobile Header (Clean & Minimal) - Only show on Vault view */}
      {!['generator', 'security', 'settings'].includes(currentView) && (
        <header className="md:hidden flex items-center pt-[env(safe-area-inset-top)] h-[calc(3.5rem+env(safe-area-inset-top))] bg-slate-50 dark:bg-slate-950 shrink-0 z-30 px-4 titlebar transition-all duration-300">
          <div className="flex items-center gap-3 flex-1 overflow-hidden">
            <div className="p-1.5 bg-slate-900 dark:bg-white rounded-xl shrink-0 shadow-sm"><ShieldCheck className="w-4 h-4 text-white dark:text-slate-900" /></div>
            <span className="font-bold text-lg text-slate-900 dark:text-white truncate tracking-tight">EtherVault</span>
          </div>
          <div className="flex items-center gap-1">
            {currentView === 'vault' && (
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearch?.(e.target.value)}
                  placeholder={t('layout.search_placeholder')}
                  className="w-32 bg-slate-100 dark:bg-slate-900 rounded-lg py-1.5 pl-3 pr-2 outline-none text-xs font-medium text-slate-900 dark:text-white border border-transparent focus:border-indigo-500/50 focus:w-48 transition-all"
                />
              </div>
            )}
            <button onClick={toggleDarkMode} className="p-2 ml-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </header>
      )}

      {/* Desktop Window Drag Handle (Right Side) */}
      <div className="hidden md:block fixed top-0 right-0 left-64 h-8 z-50 titlebar" />

      {/* Main Content Area (Independent scroll) */}
      <main
        ref={mainRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 lg:p-8 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-8 relative scrollbar-hide"
      >
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>

      {/* FAB (Only on Vault view) */}
      {currentView === 'vault' && onAddClick && (
        <FAB onClick={onAddClick} visible={showFab} />
      )}

      {/* Mobile Bottom Navigation */}
      <BottomTabNav currentView={currentView} setView={setView} />
    </div>
  );
};
