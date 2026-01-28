
import React, { useState, useEffect, useMemo } from 'react';
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
import {
  AuthService,
  VaultService,
  CryptoService,
  CloudService,
  PasswordEntry,
  Category,
  AppSettings,
  CloudProvider
} from '@premium-password-manager/core';
import { AlertProvider } from './hooks/useAlert';

// Initialize Cloud Logging with App Logger (Universal)
CloudService.setLogger(logger);

const App: React.FC = () => {
  // const [isDarkMode, setIsDarkMode] = useState<boolean>(true); // Removed redundant state
  const [currentView, setCurrentView] = useState<'vault' | 'security' | 'generator' | 'settings'>('vault');
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
      theme: 'dark',
      cloudProvider: savedProvider || 'none',
      lastSync: ''
    };
  });

  // Persist cloud provider to localStorage and initialize CloudService when it changes
  useEffect(() => {
    if (settings.cloudProvider !== 'none') {
      localStorage.setItem('ethervault_cloud_provider', settings.cloudProvider);
      // Initialize CloudService with the saved provider (no connection yet)
      CloudService.useProvider(settings.cloudProvider);
    } else {
      localStorage.removeItem('ethervault_cloud_provider');
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
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

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
              setCurrentView('vault');
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
      setView={setCurrentView}
      isDarkMode={settings.theme === 'dark'}
      toggleDarkMode={() => setSettings({ ...settings, theme: settings.theme === 'dark' ? 'light' : 'dark' })}
      onLock={handleLock}
      onSearch={setSearchQuery}
      searchQuery={searchQuery}
      onAddClick={handleOpenAdd}
    >
      <div className="max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
        {renderView()}
      </div>

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
    <App />
  </AlertProvider>
);

export default AppWithProviders;
