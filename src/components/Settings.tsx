import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ChevronLeft, Plus, Trash2, ExternalLink, Loader2, Users, Train, ChevronDown, Pencil, Check, X } from 'lucide-react';
import type { Provider } from '../types';

type RailwayTokenType = 'workspace' | 'project';

interface Account {
  id: string;
  username: string;
  email: string;
  name: string | null;
  scopeType: string;
  teamName: string | null;
  provider: Provider;
}

interface Props {
  onBack: () => void;
}

export function Settings({ onBack }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [addingProvider, setAddingProvider] = useState<Provider>('vercel');
  const [railwayTokenType, setRailwayTokenType] = useState<RailwayTokenType>('workspace');
  const [newToken, setNewToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const fetchAccounts = async () => {
    try {
      const data = await invoke<Account[]>('list_accounts');
      setAccounts(data);
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newToken.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      let account: Account;
      if (addingProvider === 'railway') {
        account = await invoke<Account>('add_railway_account', {
          token: newToken.trim(),
          tokenType: railwayTokenType
        });
      } else {
        account = await invoke<Account>('add_account', { token: newToken.trim() });
      }
      setAccounts(prev => [...prev.filter(a => a.id !== account.id), account]);
      setNewToken('');
      setIsAddingAccount(false);
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
    } catch (err) {
      console.error('Failed to remove account:', err);
    }
  };

  const startEditing = (account: Account) => {
    setEditingAccountId(account.id);
    setEditName(account.teamName || account.username);
  };

  const cancelEditing = () => {
    setEditingAccountId(null);
    setEditName('');
  };

  const handleRename = async (accountId: string) => {
    if (!editName.trim()) return;
    try {
      await invoke('rename_account', { accountId, newName: editName.trim() });
      setAccounts(prev => prev.map(a =>
        a.id === accountId
          ? { ...a, username: editName.trim(), teamName: editName.trim() }
          : a
      ));
      setEditingAccountId(null);
      setEditName('');
    } catch (err) {
      console.error('Failed to rename account:', err);
    }
  };

  const openTokensPage = async (provider: Provider) => {
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
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  borderRadius: 8,
                  marginBottom: 4,
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  backgroundColor: account.provider === 'railway'
                    ? 'rgba(139, 92, 246, 0.2)'
                    : account.scopeType === 'team'
                      ? 'rgba(59, 130, 246, 0.2)'
                      : 'rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 10,
                }}>
                  {account.provider === 'railway' ? (
                    <Train style={{ width: 14, height: 14, color: '#8b5cf6' }} />
                  ) : account.scopeType === 'team' ? (
                    <Users style={{ width: 14, height: 14, color: '#3b82f6' }} />
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 76 65" fill="#666">
                      <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
                    </svg>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingAccountId === account.id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(account.id);
                          if (e.key === 'Escape') cancelEditing();
                        }}
                        autoFocus
                        style={{
                          flex: 1,
                          padding: '4px 6px',
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: 4,
                          color: '#e5e5e5',
                          fontSize: 11,
                          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
                          outline: 'none',
                        }}
                      />
                      <button
                        onClick={() => handleRename(account.id)}
                        style={{
                          padding: 4,
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: '#22c55e',
                          cursor: 'pointer',
                          display: 'flex',
                        }}
                      >
                        <Check style={{ width: 14, height: 14 }} />
                      </button>
                      <button
                        onClick={cancelEditing}
                        style={{
                          padding: 4,
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          display: 'flex',
                        }}
                      >
                        <X style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  ) : (
                    <>
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
                          backgroundColor: account.provider === 'railway'
                            ? 'rgba(139, 92, 246, 0.2)'
                            : account.scopeType === 'team'
                              ? 'rgba(59, 130, 246, 0.2)'
                              : 'rgba(255,255,255,0.1)',
                          color: account.provider === 'railway'
                            ? '#a78bfa'
                            : account.scopeType === 'team'
                              ? '#60a5fa'
                              : '#666',
                          textTransform: 'uppercase',
                          letterSpacing: '0.03em',
                        }}>
                          {account.provider}
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
                        {account.email}
                      </div>
                    </>
                  )}
                </div>
                {editingAccountId !== account.id && (
                  <>
                    <button
                      onClick={() => startEditing(account)}
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
                      <Pencil style={{ width: 12, height: 12 }} />
                    </button>
                    <button
                      onClick={() => handleRemoveAccount(account.id)}
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
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Add Account */}
          {isAddingAccount ? (
            <form onSubmit={handleAddAccount}>
              {/* Provider Toggle */}
              <div style={{
                display: 'flex',
                gap: 4,
                marginBottom: 8,
                padding: 3,
                backgroundColor: 'rgba(0,0,0,0.3)',
                borderRadius: 6,
              }}>
                <button
                  type="button"
                  onClick={() => setAddingProvider('vercel')}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    backgroundColor: addingProvider === 'vercel' ? 'rgba(255,255,255,0.1)' : 'transparent',
                    color: addingProvider === 'vercel' ? '#e5e5e5' : '#666',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 10,
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 76 65" fill="currentColor">
                    <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
                  </svg>
                  Vercel
                </button>
                <button
                  type="button"
                  onClick={() => setAddingProvider('railway')}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    backgroundColor: addingProvider === 'railway' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                    color: addingProvider === 'railway' ? '#a78bfa' : '#666',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 10,
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
                  }}
                >
                  <Train style={{ width: 10, height: 10 }} />
                  Railway
                </button>
              </div>

              {/* Railway Token Type Selector */}
              {addingProvider === 'railway' && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={railwayTokenType}
                      onChange={(e) => setRailwayTokenType(e.target.value as RailwayTokenType)}
                      style={{
                        width: '100%',
                        padding: '8px 32px 8px 10px',
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 6,
                        color: '#e5e5e5',
                        fontSize: 11,
                        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
                        appearance: 'none',
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    >
                      <option value="workspace" style={{ backgroundColor: '#1a1a1a' }}>Workspace Token</option>
                      <option value="project" style={{ backgroundColor: '#1a1a1a' }}>Project Token</option>
                    </select>
                    <ChevronDown style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 12,
                      height: 12,
                      color: '#666',
                      pointerEvents: 'none',
                    }} />
                  </div>
                  <p style={{
                    fontSize: 9,
                    color: '#525252',
                    marginTop: 4,
                    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
                  }}>
                    {railwayTokenType === 'workspace'
                      ? 'Workspace tokens access all workspace resources'
                      : 'Project tokens are scoped to a specific environment'}
                  </p>
                </div>
              )}

              <input
                type="password"
                value={newToken}
                onChange={(e) => setNewToken(e.target.value)}
                placeholder={`Paste ${addingProvider === 'railway' ? 'Railway' : 'Vercel'} token here...`}
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

              {/* Create Token Link */}
              <button
                type="button"
                onClick={() => openTokensPage(addingProvider)}
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
                Create token on {addingProvider === 'railway' ? 'Railway' : 'Vercel'}
              </button>
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
                <span style={{ fontSize: 11 }}>X</span>
                Built by @yogesharc
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
