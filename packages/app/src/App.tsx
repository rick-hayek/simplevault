
import React, { useState, useEffect, useMemo } from 'react';
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
  PasswordEntry,
  Category,
  AppSettings
} from '@premium-password-manager/core';

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
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

  const [settings, setSettings] = useState<AppSettings>({
    biometricsEnabled: localStorage.getItem('ethervault_bio') === 'true',
    autoLockTimeout: 5,
    twoFactorEnabled: true,
    theme: 'dark',
    cloudProvider: 'none',
    lastSync: 'Never synced'
  });

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

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

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

  const handleAddPassword = async (entry: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newEntry = await VaultService.addEntry(entry);
    setPasswords(prev => [newEntry, ...prev]);
  };

  const handleUpdatePassword = async (updatedEntry: PasswordEntry) => {
    const result = await VaultService.updateEntry(updatedEntry.id, updatedEntry);
    setPasswords(prev => prev.map(p => p.id === result.id ? result : p));
  };

  const handleDeletePassword = async (id: string) => {
    await VaultService.deleteEntry(id);
    setPasswords(prev => prev.filter(p => p.id !== id));
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
  };

  const handleLogin = async (key: string) => {
    const success = await AuthService.authenticate(key);
    if (success) {
      setIsAuthenticated(true);
      const entries = await VaultService.getEntries();
      setPasswords(entries);
      return true;
    }
    return false;
  };

  const handleLock = () => {
    AuthService.lock();
    setIsAuthenticated(false);
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
          />
        );
      case 'security':
        return <SecurityDashboard passwords={passwords} />;
      case 'generator':
        return <GeneratorView />;
      case 'settings':
        return <SettingsView settings={settings} setSettings={(s: any) => setSettings(s)} />;
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
        />;
    }
  };

  return (
    <Layout
      currentView={currentView}
      setView={setCurrentView}
      isDarkMode={isDarkMode}
      toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
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

export default App;
