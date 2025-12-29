import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { RefreshCw, Settings, GitBranch, Loader2 } from 'lucide-react';
import './DeploymentsList.css';

interface DeploymentCreator {
  uid: string;
  username?: string | null;
  email?: string | null;
}

interface Deployment {
  uid: string;
  name: string;
  url: string;
  state: string | null;
  readyState: string | null;
  createdAt: number | null;
  meta: {
    commitMessage?: string | null;
    branch?: string | null;
    githubCommitMessage?: string | null;
    githubCommitRef?: string | null;
  } | null;
  creator?: DeploymentCreator | null;
}

interface Props {
  urlSlug: string;
  selectedProject: string;
  onOpenSettings: () => void;
}

function getState(d: Deployment): string {
  return d.state || d.readyState || 'UNKNOWN';
}

function getCommitMessage(d: Deployment): string | null {
  return d.meta?.commitMessage || d.meta?.githubCommitMessage || null;
}

function getBranch(d: Deployment): string | null {
  return d.meta?.branch || d.meta?.githubCommitRef || null;
}

function getStatusColor(state: string): string {
  switch (state) {
    case 'READY': return '#22c55e';
    case 'BUILDING':
    case 'INITIALIZING':
    case 'QUEUED': return '#eab308';
    case 'ERROR': return '#ef4444';
    case 'CANCELED': return '#525252';
    default: return '#525252';
  }
}

function formatTime(ts: number | null): string {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
}

export function DeploymentsList({ urlSlug, selectedProject, onOpenSettings }: Props) {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDeployments = async () => {
    setIsLoading(true);
    try {
      const data = await invoke<Deployment[]>('list_deployments', {
        projectId: selectedProject || null,
        limit: 20
      });
      console.log('Deployments:', JSON.stringify(data, null, 2));
      setDeployments(data);
    } catch (err) {
      console.error('Failed to fetch deployments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeployments();
  }, [selectedProject]);

  return (
    <div className="deployments-container">
      {/* Header */}
      <div className="deployments-header">
        <span className="deployments-title">deployments</span>

        <button className="icon-button" onClick={fetchDeployments}>
          <RefreshCw style={{ width: 14, height: 14 }} />
        </button>

        <button className="icon-button" onClick={onOpenSettings}>
          <Settings style={{ width: 14, height: 14 }} />
        </button>
      </div>

      {/* Deployments List */}
      <div className="deployments-list">
        {isLoading ? (
          <div className="loading-container">
            <Loader2 style={{ width: 20, height: 20, color: '#525252', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : deployments.length === 0 ? (
          <div className="empty-state">No deployments found</div>
        ) : (
          deployments.map(d => {
            const state = getState(d);
            const commitMsg = getCommitMessage(d);
            const branch = getBranch(d);
            const creatorUid = d.creator?.uid;
            return (
              <div
                key={d.uid}
                className="deployment-item"
                onClick={async () => {
                  const url = `https://vercel.com/${urlSlug}/${d.name}/${d.uid.replace('dpl_', '')}`;
                  try {
                    const opener = await import('@tauri-apps/plugin-opener');
                    await opener.openUrl(url);
                  } catch {
                    window.open(url, '_blank');
                  }
                }}
              >
                {/* Row 1: Status indicator + Commit title + Time */}
                <div className="deployment-row-1">
                  <span
                    className="status-dot"
                    style={{
                      backgroundColor: getStatusColor(state),
                      boxShadow: (state === 'BUILDING' || state === 'INITIALIZING' || state === 'QUEUED')
                        ? `0 0 8px ${getStatusColor(state)}` : 'none',
                    }}
                  />
                  <span className="commit-message">{commitMsg || d.name}</span>
                  <span className="deploy-time">{formatTime(d.createdAt)}</span>
                </div>

                {/* Row 2: Branch + Deployment name + Avatar */}
                <div className="deployment-row-2">
                  {branch && (
                    <>
                      <GitBranch style={{ width: 10, height: 10 }} />
                      <span>{branch}</span>
                      <span className="separator">•</span>
                    </>
                  )}
                  <span className="project-name">{d.name}</span>
                  {creatorUid && (
                    <img
                      src={`https://vercel.com/api/www/avatar/${creatorUid}?s=40`}
                      alt="deployer"
                      className="avatar"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
