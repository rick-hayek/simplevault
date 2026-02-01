
import React, { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { logger } from './utils/logger';
import { IconService } from './utils/IconService';
import { Layout } from './components/Layout';
import { VaultView } from './components/VaultView';
import { SecurityDashboard } from './components/SecurityDashboard';
import { GeneratorView } from './components/GeneratorView';
import { SettingsView } from './components/SettingsView';
import { WelcomeView } from './components/WelcomeView';
import { LoginView } from './components/LoginView';
import { EntryModal } from './components/VaultView'; // Exported for use here
import { VaultService, AuthService, StorageService, CloudService, AppSettings, PasswordEntry, Category, CloudProvider, CryptoService } from '@ethervault/core';
import { BackHandlerProvider, useBackHandler } from './hooks/useBackHandler';
import { AlertProvider } from './hooks/useAlert';
import { App as CapacitorApp } from '@capacitor/app';


// ... existing imports ...

// Initialize Cloud Logging with App Logger (Universal)
CloudService.setLogger(logger);

// Animation Configuration
const VIEW_ORDER = ['vault', 'security', 'generator', 'settings'];

const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 1
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? '100%' : '-100%',
    opacity: 1
  })
};

const AppContent: React.FC = () => {
  // const [isDarkMode, setIsDarkMode] = useState<boolean>(true); // Removed redundant state
  const [currentView, setCurrentView] = useState<'vault' | 'security' | 'generator' | 'settings'>('vault');
  const [direction, setDirection] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PasswordEntry | null>(null);

  // Auth and Setup State
  const [hasSetup, setHasSetup] = useState<boolean>(() => {
    return localStorage.getItem('ethervault_setup') === 'true';
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const [settings, setSettings] = useState<AppSettings>(() => {
    const savedProvider = localStorage.getItem('ethervault_cloud_provider') as CloudProvider | null;
    return {
      biometricsEnabled: localStorage.getItem('ethervault_bio') === 'true',
      autoLockTimeout: 15,
      twoFactorEnabled: true,
      theme: 'system',
      cloudProvider: savedProvider || 'none',
      lastSync: ''
    };
  });

  // Persist cloud provider to localStorage and initialize CloudService when it changes
  useEffect(() => {
    if (settings.cloudProvider !== 'none') {
      localStorage.setItem('ethervault_cloud_provider', settings.cloudProvider);
      // Initialize CloudService with the saved provider
      CloudService.useProvider(settings.cloudProvider);
    } else {
      localStorage.removeItem('ethervault_cloud_provider');
      // Ensure we explicitly disconnect so the service stops syncing
      CloudService.disconnect().catch(e => {
        logger.warn('[App] Failed to disconnect cloud provider', e);
      });
    }
  }, [settings.cloudProvider]);

  useEffect(() => {
    const initializeApp = async () => {
      try {


        await CryptoService.init();

        // Check if account is already setup in persistence
        const isSetup = await AuthService.isAccountSetup();
        setHasSetup(isSetup);

        // If already authenticated (e.g. from previous session/service state), load entries
        if (AuthService.checkAuth()) {
          const entries = await VaultService.getEntries();
          setPasswords(entries);
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initializeApp();
  }, []);

  // Listen for native Electron events
  useEffect(() => {
    if ((window as any).electronAPI?.onVaultLock) {
      (window as any).electronAPI.onVaultLock(() => {
        handleLock();
      });
    }
  }, []);

  // Listen for Deep Links (OAuth Redirects)
  useEffect(() => {
    // 1. Mobile (Capacitor)
    const capListener = CapacitorApp.addListener('appUrlOpen', (data) => {
      console.log('[App] Mobile Deep Link Received:', data.url);
      CloudService.handleRedirect(data.url);
    });

    // 2. Desktop (Electron)
    if ((window as any).electronAPI?.onDeepLink) {
      (window as any).electronAPI.onDeepLink((url: string) => {
        logger.info('[App] Electron Deep Link Received:', url);
        CloudService.handleRedirect(url);
      });
    }

    return () => {
      capListener.then(handle => handle.remove());
    };
  }, []);

  // Auto-lock timer
  useEffect(() => {
    if (!isAuthenticated) return;

    let timer: any;
    const resetTimer = () => {
      if (timer) clearTimeout(timer);
      // settings.autoLockTimeout is in minutes, convert to ms
      timer = setTimeout(() => {
        logger.info('[VAULT] Auto-locking vault due to inactivity.');
        handleLock();
      }, settings.autoLockTimeout * 60 * 1000);
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer));

    resetTimer(); // Initial start

    return () => {
      if (timer) clearTimeout(timer);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [isAuthenticated, settings.autoLockTimeout]);

  // Unified Theme Effect
  useEffect(() => {
    const applyTheme = () => {
      let isDark = false;
      if (settings.theme === 'system') {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      } else {
        isDark = settings.theme === 'dark';
      }

      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    applyTheme();

    if (settings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        if (e.matches) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      };

      // Modern browsers support addEventListener, older might need addListener (deprecated)
      // Capacitor WebView is modern.
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [settings.theme]);

  // Handle Android Back Button
  useBackHandler('app-root', async () => {
    // 1. Close Swiped Rows (Priority)
    const swipedElements = document.querySelectorAll('.overflow-x-auto');
    let swipeClosed = false;
    swipedElements.forEach((el) => {
      if (el.scrollLeft > 0) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
        swipeClosed = true;
      }
    });
    if (swipeClosed) return true;

    // 2. Close Modal
    if (isModalOpen) {
      setIsModalOpen(false);
      return true;
    }

    // 3. Clear Search
    if (searchQuery) {
      setSearchQuery('');
      return true;
    }

    // 4. Navigate to Home
    if (currentView !== 'vault') {
      setCurrentView('vault');
      return true;
    }

    // 5. Default: Minimize App (Android)
    CapacitorApp.minimizeApp();
    return true;
  });

  const handleSetView = (newView: typeof currentView) => {
    const currentIndex = VIEW_ORDER.indexOf(currentView);
    const newIndex = VIEW_ORDER.indexOf(newView);
    const dir = newIndex > currentIndex ? 1 : -1;
    setDirection(dir);
    setCurrentView(newView);
  };



  const allTags = useMemo(() => {
    const tags = new Set<string>();
    passwords.forEach(p => p.tags?.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [passwords]);

  const filteredPasswords = useMemo(() => {
    return passwords.filter(p => {
      const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
      const matchesTag = !activeTag || (p.tags && p.tags.includes(activeTag));
      const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.tags && p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
      return matchesCategory && matchesSearch && matchesTag;
    });
  }, [passwords, activeCategory, activeTag, searchQuery]);

  // Auto-sync to cloud after local changes (if cloud is enabled)
  const syncToCloud = async () => {
    if (settings.cloudProvider === 'none') return;

    console.log("isSyncEnabled", CloudService.isSyncEnabled());
    // Fix: Don't log "completed" if we aren't even connected
    if (!CloudService.isSyncEnabled()) {
      return;
    }

    try {
      const entries = await VaultService.getEncryptedEntries();
      await CloudService.sync(entries);
      setSettings(prev => ({ ...prev, lastSync: new Date().toLocaleTimeString() }));
      logger.info('[SYNC] Auto-sync completed after local change');
    } catch (err) {
      logger.warn('[SYNC] Auto-sync failed', err);
      // Silent failure - don't interrupt user flow
    }
  };

  const handleAddPassword = async (entry: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newEntry = await VaultService.addEntry(entry);
    setPasswords(prev => [newEntry, ...prev]);
    logger.info('[DATA] Added new password entry');

    // Background Icon Fetch
    if (entry.url || entry.website) {
      const targetUrl = entry.url || entry.website;
      IconService.fetchIcon(targetUrl!).then(async (base64Icon) => {
        if (base64Icon) {
          const updated = { ...newEntry, icon: base64Icon };
          await VaultService.updateEntry(newEntry.id, updated);
          setPasswords(prev => prev.map(p => p.id === newEntry.id ? updated : p));
        }
      });
    }

    // Auto-sync to cloud
    syncToCloud();
  };

  const handleUpdatePassword = async (updatedEntry: PasswordEntry) => {
    // Check if we need to fetch icon (if URL changed or icon missing)
    const oldEntry = passwords.find(p => p.id === updatedEntry.id);
    const urlChanged = oldEntry && (oldEntry.url !== updatedEntry.url || oldEntry.website !== updatedEntry.website);
    const needsIcon = !updatedEntry.icon || urlChanged;

    const result = await VaultService.updateEntry(updatedEntry.id, updatedEntry);
    setPasswords(prev => prev.map(p => p.id === result.id ? result : p));
    logger.info('[DATA] Updated password entry', { id: updatedEntry.id });

    if (needsIcon && (updatedEntry.url || updatedEntry.website)) {
      const targetUrl = updatedEntry.url || updatedEntry.website;
      IconService.fetchIcon(targetUrl!).then(async (base64Icon) => {
        if (base64Icon) {
          const finalEntry = { ...result, icon: base64Icon };
          await VaultService.updateEntry(result.id, finalEntry);
          setPasswords(prev => prev.map(p => p.id === result.id ? finalEntry : p));
        }
      });
    }

    // Auto-sync to cloud
    syncToCloud();
  };

  const handleDeletePassword = async (id: string) => {
    await VaultService.deleteEntry(id);
    setPasswords(prev => prev.filter(p => p.id !== id));
    logger.info('[DATA] Deleted password entry', { id });

    // Auto-sync to cloud
    syncToCloud();
  };

  const handleSetupComplete = async (key: string, bioEnabled: boolean) => {
    await AuthService.setupAccount(key);
    localStorage.setItem('ethervault_bio', bioEnabled.toString());

    setIsAuthenticated(true);
    setHasSetup(true);
    setSettings(prev => ({ ...prev, biometricsEnabled: bioEnabled }));

    // Initial data load after setup
    const entries = await VaultService.getEntries();
    setPasswords(entries);
    logger.info('[AUTH] Initial account setup completed.');
  };

  const handleLogin = async (key: string) => {
    const success = await AuthService.authenticate(key);
    if (success) {
      setIsAuthenticated(true);
      const entries = await VaultService.getEntries();
      setPasswords(entries);
      logger.info('[AUTH] Login successful.');
      return true;
    }
    logger.warn('[AUTH] Login failed: Invalid credentials.');
    return false;
  };

  const handleLock = () => {
    AuthService.lock();
    setIsAuthenticated(false);
    logger.info('[VAULT] Vault locked.');
  };

  const handleOpenEdit = (entry: PasswordEntry) => {
    setEditingEntry(entry);
    setIsModalOpen(true);
  };

  const handleOpenAdd = () => {
    setEditingEntry(null);
    setIsModalOpen(true);
  };

  if (!hasSetup) {
    return <WelcomeView onComplete={handleSetupComplete} />;
  }

  if (!isAuthenticated) {
    return <LoginView onLogin={handleLogin} bioEnabled={settings.biometricsEnabled} />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'vault':
        return (
          <VaultView
            passwords={filteredPasswords}
            activeCategory={activeCategory}
            onCategoryChange={(cat: any) => setActiveCategory(cat)}
            onSearch={setSearchQuery}
            allTags={allTags}
            activeTag={activeTag}
            onTagChange={setActiveTag}
            onEdit={handleOpenEdit}
            onAdd={handleOpenAdd}
            onGoToSettings={() => setCurrentView('settings')}
          />
        );
      case 'security':
        return <SecurityDashboard
          passwords={passwords}
          onResolve={(entryId) => {
            const entry = passwords.find(p => p.id === entryId);
            if (entry) {
              setEditingEntry(entry);
              setIsModalOpen(true);
              // Stay on security view
            }
          }}
          onScan={async () => {
            const entries = await VaultService.getEntries();
            setPasswords(entries);
          }}
        />;
      case 'generator':
        return <GeneratorView />;
      case 'settings':
        return <SettingsView
          settings={settings}
          setSettings={(s: any) => setSettings(s)}
          onDataChange={async () => {
            const entries = await VaultService.getEntries();
            setPasswords(entries);
          }}
        />;
      default:
        return <VaultView
          passwords={filteredPasswords}
          activeCategory={activeCategory}
          onCategoryChange={(cat: any) => setActiveCategory(cat)}
          onSearch={setSearchQuery}
          allTags={allTags}
          activeTag={activeTag}
          onTagChange={setActiveTag}
          onEdit={handleOpenEdit}
          onAdd={handleOpenAdd}
          onGoToSettings={() => setCurrentView('settings')}
        />;
    }
  };



  return (
    <Layout
      currentView={currentView}
      setView={handleSetView}
      isDarkMode={settings.theme === 'dark'}
      toggleDarkMode={() => setSettings({ ...settings, theme: settings.theme === 'dark' ? 'light' : 'dark' })}
      onLock={handleLock}
      onSearch={setSearchQuery}
      searchQuery={searchQuery}
      onAddClick={handleOpenAdd}
    >
      {isMobile ? (
        <AnimatePresence mode="popLayout" custom={direction} initial={false}>
          <motion.div
            key={currentView}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ x: { type: "spring", stiffness: 300, damping: 30 } }}
            className="max-w-7xl mx-auto w-full"
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      ) : (
        <div className="max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
          {renderView()}
        </div>
      )}

      {isModalOpen && (
        <EntryModal
          entry={editingEntry}
          onClose={() => setIsModalOpen(false)}
          onSave={(data: any) => {
            if (editingEntry) handleUpdatePassword(data);
            else handleAddPassword(data);
            setIsModalOpen(false);
          }}
          onDelete={(id) => {
            handleDeletePassword(id);
            setIsModalOpen(false);
          }}
        />
      )}
    </Layout>
  );
};

const AppWithProviders: React.FC = () => (
  <AlertProvider>
    <BackHandlerProvider>
      <AppContent />
    </BackHandlerProvider>
  </AlertProvider>
);

export default AppWithProviders;
