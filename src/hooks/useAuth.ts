import { useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useStore } from '../store';
import type { User, Account, Provider } from '../types';

export function useAuth() {
  const { user, isAuthenticated, isLoading, setUser, setLoading, setView, logout, currentAccount, setCurrentAccount } = useStore();
  const hasChecked = useRef(false);

  const checkAuth = useCallback(async () => {
    if (hasChecked.current) return;
    hasChecked.current = true;

    setLoading(true);
    try {
      // First check for current account (provider-aware)
      const account = await invoke<Account | null>('get_current_account');
      if (account) {
        setCurrentAccount(account);
        // Also set legacy user for compatibility
        const validatedUser = await invoke<User | null>('validate_stored_token');
        if (validatedUser) {
          setUser(validatedUser);
        }
        setView('deployments');
      } else {
        setView('auth');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setView('auth');
    } finally {
      setLoading(false);
    }
  }, [setUser, setLoading, setView, setCurrentAccount]);

  const saveToken = useCallback(async (token: string, provider: Provider = 'vercel') => {
    setLoading(true);
    try {
      let account: Account;
      if (provider === 'railway') {
        account = await invoke<Account>('add_railway_account', { token });
      } else {
        account = await invoke<Account>('add_account', { token });
      }

      // Set as active account
      await invoke('set_active_account', { accountId: account.id });
      setCurrentAccount(account);

      // Set legacy user for compatibility
      setUser({
        id: account.id,
        email: account.email,
        name: account.name,
        username: account.username,
      });

      setView('deployments');
      return { success: true };
    } catch (error) {
      setLoading(false);
      return { success: false, error: String(error) };
    }
  }, [setUser, setLoading, setView, setCurrentAccount]);

  const signOut = useCallback(async () => {
    try {
      await invoke('delete_token');
      logout();
      hasChecked.current = false;
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [logout]);

  const openVercelTokens = useCallback(async () => {
    try {
      await invoke('open_vercel_tokens');
    } catch (error) {
      console.error('Failed to open Vercel tokens page:', error);
    }
  }, []);

  const openRailwayTokens = useCallback(async () => {
    try {
      await invoke('open_railway_tokens');
    } catch (error) {
      console.error('Failed to open Railway tokens page:', error);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    user,
    currentAccount,
    isAuthenticated,
    isLoading,
    saveToken,
    signOut,
    openVercelTokens,
    openRailwayTokens,
    checkAuth,
  };
}
