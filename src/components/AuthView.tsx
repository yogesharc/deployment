import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { KeyRound, ExternalLink, Loader2, Train, ChevronDown } from 'lucide-react';
import type { Provider, Account } from '../types';

type RailwayTokenType = 'workspace' | 'project';

interface AuthViewProps {
  onSuccess: (account: Account) => void;
}

export function AuthView({ onSuccess }: AuthViewProps) {
  const [token, setToken] = useState('');
  const [provider, setProvider] = useState<Provider>('vercel');
  const [railwayTokenType, setRailwayTokenType] = useState<RailwayTokenType>('workspace');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('Please enter a token');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      console.log(`Adding ${provider} account...`);
      let account: Account;
      if (provider === 'railway') {
        account = await invoke<Account>('add_railway_account', {
          token: token.trim(),
          tokenType: railwayTokenType
        });
      } else {
        account = await invoke<Account>('add_account', { token: token.trim() });
      }

      // Set as active account
      await invoke('set_active_account', { accountId: account.id });
      console.log('Account added:', account);
      onSuccess(account);
    } catch (err) {
      console.error('Save token error:', err);
      setError(String(err));
      setIsSubmitting(false);
    }
  };

  const openTokensPage = async () => {
    try {
      if (provider === 'railway') {
        await invoke('open_railway_tokens');
      } else {
        await invoke('open_vercel_tokens');
      }
    } catch (err) {
      console.error('Failed to open tokens page:', err);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: 24,
      backgroundColor: 'rgba(0, 0, 0, 0.75)'
    }}>
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 64,
            height: 64,
            borderRadius: '50%',
            backgroundColor: '#222',
            marginBottom: 16
          }}>
            {provider === 'railway' ? (
              <Train style={{ width: 32, height: 32, color: '#fff' }} />
            ) : (
              <KeyRound style={{ width: 32, height: 32, color: '#fff' }} />
            )}
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#fff', marginBottom: 8 }}>
            Connect to {provider === 'railway' ? 'Railway' : 'Vercel'}
          </h1>
          <p style={{ fontSize: 14, color: '#888' }}>
            Enter your Personal Access Token to get started
          </p>
        </div>

        {/* Provider Toggle */}
        <div style={{
          display: 'flex',
          gap: 8,
          marginBottom: 16,
          padding: 4,
          backgroundColor: '#1a1a1a',
          borderRadius: 8,
        }}>
          <button
            type="button"
            onClick={() => setProvider('vercel')}
            style={{
              flex: 1,
              padding: '8px 12px',
              backgroundColor: provider === 'vercel' ? '#333' : 'transparent',
              color: provider === 'vercel' ? '#fff' : '#888',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 76 65" fill="currentColor">
              <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
            </svg>
            Vercel
          </button>
          <button
            type="button"
            onClick={() => setProvider('railway')}
            style={{
              flex: 1,
              padding: '8px 12px',
              backgroundColor: provider === 'railway' ? '#333' : 'transparent',
              color: provider === 'railway' ? '#fff' : '#888',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <Train style={{ width: 14, height: 14 }} />
            Railway
          </button>
        </div>

        {/* Railway Token Type Selector */}
        {provider === 'railway' && (
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              fontSize: 12,
              color: '#888',
              marginBottom: 8,
            }}>
              Token Type
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={railwayTokenType}
                onChange={(e) => setRailwayTokenType(e.target.value as RailwayTokenType)}
                style={{
                  width: '100%',
                  padding: '10px 36px 10px 12px',
                  backgroundColor: '#222',
                  border: '1px solid #333',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 14,
                  appearance: 'none',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="workspace">Workspace Token</option>
                <option value="project">Project Token</option>
              </select>
              <ChevronDown style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 16,
                height: 16,
                color: '#888',
                pointerEvents: 'none',
              }} />
            </div>
            <p style={{
              fontSize: 11,
              color: '#666',
              marginTop: 6,
            }}>
              {railwayTokenType === 'workspace'
                ? 'Workspace tokens access all workspace resources'
                : 'Project tokens are scoped to a specific environment'}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter your token"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: '#222',
                border: '1px solid #333',
                borderRadius: 8,
                color: '#fff',
                fontSize: 14,
                outline: 'none',
              }}
            />
            {error && (
              <p style={{ marginTop: 8, fontSize: 14, color: '#f00' }}>{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !token.trim()}
            style={{
              width: '100%',
              padding: 12,
              backgroundColor: isSubmitting || !token.trim() ? '#666' : '#fff',
              color: '#000',
              fontWeight: 500,
              borderRadius: 8,
              border: 'none',
              cursor: isSubmitting || !token.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                Connecting...
              </>
            ) : (
              'Connect'
            )}
          </button>
        </form>
      </div>

      <div style={{ paddingTop: 16, borderTop: '1px solid #222' }}>
        <button
          onClick={openTokensPage}
          style={{
            width: '100%',
            padding: 8,
            backgroundColor: 'transparent',
            color: '#888',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            fontSize: 14,
          }}
        >
          <ExternalLink style={{ width: 16, height: 16 }} />
          Create a token on {provider === 'railway' ? 'Railway' : 'Vercel'}
        </button>
      </div>
    </div>
  );
}
