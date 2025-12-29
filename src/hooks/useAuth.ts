import { useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useStore } from '../store';
import type { User } from '../types';

export function useAuth() {
  const { user, isAuthenticated, isLoading, setUser, setLoading, setView, logout } = useStore();
  const hasChecked = useRef(false);

  const checkAuth = useCallback(async () => {
    if (hasChecked.current) return;
    hasChecked.current = true;

    setLoading(true);
    try {
      const validatedUser = await invoke<User | null>('validate_stored_token');
      if (validatedUser) {
        setUser(validatedUser);
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
  }, [setUser, setLoading, setView]);

  const saveToken = useCallback(async (token: string) => {
    setLoading(true);
    try {
      const validatedUser = await invoke<User>('save_token', { token });
      setUser(validatedUser);
      setView('deployments');
      return { success: true };
    } catch (error) {
      setLoading(false);
      return { success: false, error: String(error) };
    }
  }, [setUser, setLoading, setView]);

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

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    user,
    isAuthenticated,
    isLoading,
    saveToken,
    signOut,
    openVercelTokens,
    checkAuth,
  };
}
