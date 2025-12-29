import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Loader2 } from 'lucide-react';
import { AuthView } from './components/AuthView';
import { DeploymentsList } from './components/DeploymentsList';
import { Settings } from './components/Settings';
import './App.css';

interface User {
  id: string;
  email: string;
  name: string | null;
  username: string;
}

interface Account {
  id: string;
  username: string;
  email: string;
  name: string | null;
  scopeType: string;
  teamName: string | null;
  teamSlug: string | null;
}

type View = 'deployments' | 'settings';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [view, setView] = useState<View>('deployments');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const existingUser = await invoke<User | null>('validate_stored_token');
        if (existingUser) {
          setUser(existingUser);
          setCurrentAccountId(existingUser.id);
          // Get full account info including team slug
          const currentAccount = await invoke<Account | null>('get_current_account');
          setAccount(currentAccount);
        }
      } catch (err) {
        console.error('Auth error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleAuthSuccess = async (authenticatedUser: User) => {
    setUser(authenticatedUser);
    setCurrentAccountId(authenticatedUser.id);
    // Get full account info
    const currentAccount = await invoke<Account | null>('get_current_account');
    setAccount(currentAccount);
  };

  const handleAccountChange = async (accountId: string) => {
    setCurrentAccountId(accountId);
    // Fetch user data for new account
    try {
      const userData = await invoke<User | null>('validate_stored_token');
      if (userData) {
        setUser(userData);
      }
      const currentAccount = await invoke<Account | null>('get_current_account');
      setAccount(currentAccount);
    } catch (err) {
      console.error('Failed to switch account:', err);
    }
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

  if (!user) {
    return <AuthView onSuccess={handleAuthSuccess} />;
  }

  if (view === 'settings') {
    return (
      <Settings
        onBack={() => setView('deployments')}
        selectedProject={selectedProject}
        onProjectChange={setSelectedProject}
        currentAccountId={currentAccountId}
        onAccountChange={handleAccountChange}
      />
    );
  }

  // Use team slug if available, otherwise use username
  const urlSlug = account?.teamSlug || user.username;

  return (
    <DeploymentsList
      urlSlug={urlSlug}
      selectedProject={selectedProject}
      onOpenSettings={() => setView('settings')}
    />
  );
}

export default App;
