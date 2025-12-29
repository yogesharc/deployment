import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { KeyRound, ExternalLink, Loader2 } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string | null;
  username: string;
}

interface AuthViewProps {
  onSuccess: (user: User) => void;
}

export function AuthView({ onSuccess }: AuthViewProps) {
  const [token, setToken] = useState('');
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
      console.log('Saving token...');
      const user = await invoke<User>('save_token', { token: token.trim() });
      console.log('Token saved, user:', user);
      onSuccess(user);
    } catch (err) {
      console.error('Save token error:', err);
      setError(String(err));
      setIsSubmitting(false);
    }
  };

  const openVercelTokens = async () => {
    try {
      await invoke('open_vercel_tokens');
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
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
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
            <KeyRound style={{ width: 32, height: 32, color: '#fff' }} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#fff', marginBottom: 8 }}>
            Connect to Vercel
          </h1>
          <p style={{ fontSize: 14, color: '#888' }}>
            Enter your Personal Access Token to get started
          </p>
        </div>

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
          onClick={openVercelTokens}
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
          Create a token on Vercel
        </button>
      </div>
    </div>
  );
}
