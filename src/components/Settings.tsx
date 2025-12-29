import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ChevronLeft, Plus, Trash2, Check, User, ExternalLink, Loader2, Users } from 'lucide-react';

interface Account {
  id: string;
  username: string;
  email: string;
  name: string | null;
  scopeType: string;  // "user" or "team"
  teamName: string | null;
}

interface Project {
  id: string;
  name: string;
}

interface Props {
  onBack: () => void;
  selectedProject: string;
  onProjectChange: (projectId: string) => void;
  currentAccountId: string | null;
  onAccountChange: (accountId: string) => void;
}

export function Settings({ onBack, selectedProject, onProjectChange, currentAccountId, onAccountChange }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [newToken, setNewToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = async () => {
    try {
      const data = await invoke<Account[]>('list_accounts');
      setAccounts(data);
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    }
  };

  const fetchProjects = async () => {
    try {
      const data = await invoke<Project[]>('list_projects');
      setProjects(data);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    }
  };

  useEffect(() => {
    fetchAccounts();
    fetchProjects();
  }, []);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newToken.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const account = await invoke<Account>('add_account', { token: newToken.trim() });
      setAccounts(prev => [...prev.filter(a => a.id !== account.id), account]);
      setNewToken('');
      setIsAddingAccount(false);

      // If this is the first account, make it active
      if (accounts.length === 0) {
        await invoke('set_active_account', { accountId: account.id });
        onAccountChange(account.id);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveAccount = async (accountId: string) => {
    try {
      await invoke('remove_account', { accountId });
      setAccounts(prev => prev.filter(a => a.id !== accountId));

      // If we removed the active account, switch to another
      if (currentAccountId === accountId && accounts.length > 1) {
        const remaining = accounts.find(a => a.id !== accountId);
        if (remaining) {
          await invoke('set_active_account', { accountId: remaining.id });
          onAccountChange(remaining.id);
        }
      }
    } catch (err) {
      console.error('Failed to remove account:', err);
    }
  };

  const handleSwitchAccount = async (accountId: string) => {
    try {
      await invoke('set_active_account', { accountId });
      onAccountChange(accountId);
    } catch (err) {
      console.error('Failed to switch account:', err);
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
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <button
          onClick={onBack}
          style={{
            padding: 6,
            backgroundColor: 'transparent',
            border: 'none',
            color: '#a3a3a3',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronLeft style={{ width: 18, height: 18 }} />
        </button>
        <span style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#e5e5e5',
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
        }}>
          settings
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {/* Project Filter Section */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            color: '#525252',
            marginBottom: 8,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
          }}>
            Default Project Filter
          </div>
          <select
            value={selectedProject}
            onChange={(e) => onProjectChange(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              color: '#e5e5e5',
              fontSize: 12,
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
              outline: 'none',
              cursor: 'pointer',
              appearance: 'none',
              WebkitAppearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
              paddingRight: 36,
            }}
          >
            <option value="" style={{ backgroundColor: '#1a1a1a' }}>All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id} style={{ backgroundColor: '#1a1a1a' }}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Accounts Section */}
        <div>
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            color: '#525252',
            marginBottom: 8,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
          }}>
            Accounts
          </div>

          {/* Account List */}
          <div style={{ marginBottom: 12 }}>
            {accounts.map(account => (
              <div
                key={account.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 12px',
                  backgroundColor: currentAccountId === account.id ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.2)',
                  borderRadius: 8,
                  marginBottom: 4,
                  cursor: 'pointer',
                  border: currentAccountId === account.id ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.05)',
                }}
                onClick={() => handleSwitchAccount(account.id)}
              >
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  backgroundColor: account.scopeType === 'team' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 10,
                }}>
                  {account.scopeType === 'team' ? (
                    <Users style={{ width: 14, height: 14, color: '#3b82f6' }} />
                  ) : (
                    <User style={{ width: 14, height: 14, color: '#666' }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: '#e5e5e5',
                    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}>
                    {account.teamName || account.username}
                    <span style={{
                      fontSize: 9,
                      padding: '2px 5px',
                      borderRadius: 4,
                      backgroundColor: account.scopeType === 'team' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.1)',
                      color: account.scopeType === 'team' ? '#60a5fa' : '#666',
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                    }}>
                      {account.scopeType}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 10,
                    color: '#525252',
                    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {account.username}
                  </div>
                </div>
                {currentAccountId === account.id && (
                  <Check style={{ width: 14, height: 14, color: '#22c55e', marginRight: 8 }} />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveAccount(account.id);
                  }}
                  style={{
                    padding: 6,
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#525252',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Trash2 style={{ width: 14, height: 14 }} />
                </button>
              </div>
            ))}
          </div>

          {/* Add Account */}
          {isAddingAccount ? (
            <form onSubmit={handleAddAccount}>
              <input
                type="password"
                value={newToken}
                onChange={(e) => setNewToken(e.target.value)}
                placeholder="Paste token here..."
                autoFocus
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 6,
                  color: '#e5e5e5',
                  fontSize: 12,
                  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
                  outline: 'none',
                  marginBottom: 8,
                }}
              />
              {error && (
                <div style={{
                  fontSize: 11,
                  color: '#ef4444',
                  marginBottom: 8,
                  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
                }}>
                  {error}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingAccount(false);
                    setNewToken('');
                    setError(null);
                  }}
                  disabled={isSubmitting}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    backgroundColor: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 6,
                    color: '#a3a3a3',
                    fontSize: 11,
                    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newToken.trim()}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    backgroundColor: isSubmitting || !newToken.trim() ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 6,
                    color: isSubmitting || !newToken.trim() ? '#525252' : '#e5e5e5',
                    fontSize: 11,
                    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
                    cursor: isSubmitting || !newToken.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} />
                      Adding...
                    </>
                  ) : (
                    'Add Account'
                  )}
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsAddingAccount(true)}
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: 'rgba(255,255,255,0.03)',
                border: '1px dashed rgba(255,255,255,0.15)',
                borderRadius: 6,
                color: '#525252',
                fontSize: 11,
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Plus style={{ width: 14, height: 14 }} />
              Add Account
            </button>
          )}

          {/* Create Token Link */}
          <button
            onClick={openVercelTokens}
            style={{
              width: '100%',
              padding: '8px 12px',
              marginTop: 8,
              backgroundColor: 'transparent',
              border: 'none',
              color: '#525252',
              fontSize: 10,
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <ExternalLink style={{ width: 12, height: 12 }} />
            Create token on Vercel
          </button>
        </div>

        {/* About Section */}
        <div style={{ marginTop: 20 }}>
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            color: '#525252',
            marginBottom: 8,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
          }}>
            About
          </div>
          <div style={{
            padding: '12px',
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.05)',
          }}>
            <div style={{
              fontSize: 12,
              fontWeight: 500,
              color: '#e5e5e5',
              marginBottom: 4,
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
            }}>
              Deployment
            </div>
            <div style={{
              fontSize: 10,
              color: '#525252',
              marginBottom: 12,
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
            }}>
              A minimal deployment tracker for your cloud platforms.
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <a
                href="https://x.com/yogesharc"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 10,
                  color: '#666',
                  textDecoration: 'none',
                  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
                }}
              >
                <span style={{ fontSize: 11 }}>𝕏</span>
                Built by @yogesharc
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
