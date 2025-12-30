import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Loader2 } from 'lucide-react';
import { AuthView } from './components/AuthView';
import { DeploymentsList } from './components/DeploymentsList';
import { Settings } from './components/Settings';
import './App.css';
import type { Account } from './types';

type View = 'deployments' | 'settings';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccounts, setHasAccounts] = useState(false);
  const [view, setView] = useState<View>('deployments');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if we have any accounts
        const accounts = await invoke<Account[]>('list_accounts');
        setHasAccounts(accounts.length > 0);
      } catch (err) {
        console.error('Auth error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleAuthSuccess = async () => {
    setHasAccounts(true);
  };

  if (isLoading) {
    return (
      <div style={{
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 10
      }}>
        <Loader2 style={{ width: 24, height: 24, color: '#525252', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!hasAccounts) {
    return <AuthView onSuccess={handleAuthSuccess} />;
  }

  if (view === 'settings') {
    return (
      <Settings
        onBack={() => setView('deployments')}
      />
    );
  }

  return (
    <DeploymentsList
      onOpenSettings={() => setView('settings')}
    />
  );
}

export default App;
