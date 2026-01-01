import { useEffect, useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { RefreshCw, Settings, GitBranch, Loader2, Train, Copy, ExternalLink } from 'lucide-react';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import './DeploymentsList.css';

// Unified deployment from backend
interface UnifiedDeployment {
  id: string;
  provider: 'vercel' | 'railway';
  name: string;
  url: string | null;
  status: string;
  createdAt: number | null;
  commitMessage: string | null;
  branch: string | null;
  projectId: string | null;
  serviceId: string | null;
  gitAuthorLogin: string | null;
  teamSlug: string | null;
  accountId: string | null;
}

interface Props {
  onOpenSettings: () => void;
}

function mapStatus(status: string): string {
  // Normalize status strings
  const s = status.toUpperCase();
  if (s === 'SUCCESS' || s === 'READY' || s === 'SLEEPING') return 'READY';
  if (s === 'BUILDING' || s === 'DEPLOYING' || s === 'INITIALIZING') return 'BUILDING';
  if (s === 'FAILED' || s === 'CRASHED' || s === 'ERROR') return 'ERROR';
  if (s === 'QUEUED' || s === 'WAITING') return 'QUEUED';
  if (s === 'CANCELED' || s === 'REMOVED' || s === 'REMOVING' || s === 'SKIPPED') return 'CANCELED';
  return 'UNKNOWN';
}

function getStatusColor(status: string): string {
  const s = mapStatus(status);
  switch (s) {
    case 'READY': return '#22c55e';
    case 'BUILDING':
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

function truncateBranch(branch: string, maxLength: number = 20): string {
  if (branch.length <= maxLength) return branch;
  return branch.substring(0, maxLength - 2) + '...';
}

const INITIAL_LIMIT = 8;
const LOAD_MORE_INCREMENT = 8;
const BUILDING_POLL_INTERVAL = 10000; // 10 seconds when building

interface ContextMenu {
  x: number;
  y: number;
  deployment: UnifiedDeployment;
}

export function DeploymentsList({ onOpenSettings }: Props) {
  const [deployments, setDeployments] = useState<UnifiedDeployment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [limit, setLimit] = useState(INITIAL_LIMIT);
  const [hasMore, setHasMore] = useState(true);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string>('');
  const previousStatusRef = useRef<Map<string, string>>(new Map());
  const isFirstFetchRef = useRef(true);
  const limitRef = useRef(INITIAL_LIMIT); // Keep limit in ref to avoid stale closure
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasBuildingRef = useRef(false);

  const fetchDeployments = async (requestedLimit?: number, showLoadingMore: boolean = false) => {
    const currentLimit = requestedLimit ?? limitRef.current;

    // Track fetching state for refresh icon spinner
    setIsFetching(true);

    // Only show full loading spinner on very first fetch
    if (isFirstFetchRef.current) {
      setIsLoading(true);
    }
    if (showLoadingMore) {
      setIsLoadingMore(true);
    }
    try {
      const data = await invoke<UnifiedDeployment[]>('list_all_deployments', { limit: currentLimit });
      console.log('All Deployments:', JSON.stringify(data, null, 2));

      // Check if there might be more deployments
      setHasMore(data.length >= currentLimit);

      // Check for status changes (only after first fetch)
      if (!isFirstFetchRef.current) {
        for (const d of data) {
          const prevStatus = previousStatusRef.current.get(d.id);
          const currentStatus = mapStatus(d.status);

          if (prevStatus && prevStatus !== currentStatus) {
            // Status changed - send notification with project name, branch, and commit
            const commitTitle = d.commitMessage || 'No commit message';
            const branchLine = d.branch ? `${d.branch}: ` : '';

            if (currentStatus === 'READY' && prevStatus === 'BUILDING') {
              await invoke('send_deployment_notification', {
                title: `${d.name} Deployment Successful`,
                body: `${branchLine}${commitTitle}`
              });
            } else if (currentStatus === 'ERROR') {
              await invoke('send_deployment_notification', {
                title: `${d.name} Deployment Failed`,
                body: `${branchLine}${commitTitle}`
              });
            }
          }

          previousStatusRef.current.set(d.id, currentStatus);
        }
      } else {
        // Initialize status map on first fetch
        for (const d of data) {
          previousStatusRef.current.set(d.id, mapStatus(d.status));
        }
        isFirstFetchRef.current = false;
      }

      setDeployments(data);

      // Update tray icon based on building status
      const buildingDeployment = data.find(d => {
        const s = mapStatus(d.status);
        return s === 'BUILDING' || s === 'QUEUED';
      });
      const hasBuilding = !!buildingDeployment;
      await invoke('update_tray_status', {
        isBuilding: hasBuilding,
        buildingProject: buildingDeployment?.name || null
      });

      // Only poll when building, otherwise stop polling
      if (hasBuilding !== hasBuildingRef.current) {
        hasBuildingRef.current = hasBuilding;
        if (hasBuilding) {
          setupPolling(BUILDING_POLL_INTERVAL);
        } else {
          // Stop polling when not building
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      }

    } catch (err) {
      console.error('Failed to fetch deployments:', err);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      setIsFetching(false);
    }
  };

  const setupPolling = (interval: number) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    pollIntervalRef.current = setInterval(() => fetchDeployments(), interval);
  };

  const loadMore = () => {
    const newLimit = limit + LOAD_MORE_INCREMENT;
    setLimit(newLimit);
    limitRef.current = newLimit;
    fetchDeployments(newLimit, true);
  };

  useEffect(() => {
    // Initial fetch
    fetchDeployments(INITIAL_LIMIT);

    // Fetch when window becomes visible (panel opens)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchDeployments();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const copyToClipboard = async (text: string): Promise<boolean> => {
    // Try Tauri clipboard first
    try {
      await writeText(text);
      return true;
    } catch (e) {
      console.log('Tauri clipboard failed, trying navigator:', e);
    }
    // Fallback to navigator clipboard
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      console.log('Navigator clipboard failed:', e);
    }
    return false;
  };

  const copyLogs = async (d: UnifiedDeployment, isError: boolean = false) => {
    setCopyingId(d.id);
    setCopyMessage('Copying...');
    try {
      console.log('Fetching logs for deployment:', d.id, 'account:', d.accountId);
      const logText = await invoke<string>('fetch_error_logs_text', {
        deploymentId: d.id,
        accountId: d.accountId
      });
      console.log('Logs fetched, length:', logText?.length);
      if (logText && logText.length > 0) {
        const success = await copyToClipboard(logText);
        if (success) {
          setCopyMessage(isError ? 'Copied errors' : 'Copied logs');
          console.log('Logs copied to clipboard');
        } else {
          setCopyMessage('Copy failed');
        }
      } else {
        setCopyMessage('No logs found');
        console.log('No logs found');
      }
    } catch (err) {
      console.error('Failed to copy logs:', err);
      setCopyMessage('Failed to copy');
    } finally {
      setTimeout(() => {
        setCopyingId(null);
        setCopyMessage('');
      }, 1500);
    }
  };

  const openDeploymentUrl = async (d: UnifiedDeployment) => {
    let url: string;
    if (d.provider === 'railway') {
      url = 'https://railway.com/dashboard';
      if (d.projectId) {
        url = `https://railway.com/project/${d.projectId}`;
      }
    } else {
      // Vercel - open deployed URL if available
      if (d.url) {
        url = d.url;
      } else {
        url = `https://vercel.com/${d.teamSlug}/${d.name}/${d.id}`;
      }
    }
    try {
      const opener = await import('@tauri-apps/plugin-opener');
      await opener.openUrl(url);
    } catch {
      window.open(url, '_blank');
    }
  };

  const openDeploymentPage = async (d: UnifiedDeployment) => {
    let url: string;
    if (d.provider === 'railway') {
      url = 'https://railway.com/dashboard';
      if (d.projectId) {
        url = `https://railway.com/project/${d.projectId}`;
      }
    } else {
      // Vercel deployment page
      url = `https://vercel.com/${d.teamSlug}/${d.name}/${d.id}`;
    }
    try {
      const opener = await import('@tauri-apps/plugin-opener');
      await opener.openUrl(url);
    } catch {
      window.open(url, '_blank');
    }
  };

  const handleClick = async (d: UnifiedDeployment) => {
    const status = mapStatus(d.status);
    if (status === 'ERROR') {
      // For errors, copy error logs
      await copyLogs(d, true);
    } else if (status === 'READY') {
      // For success, open the deployed URL
      await openDeploymentUrl(d);
    } else {
      // For other states, open the deployment page
      await openDeploymentPage(d);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, d: UnifiedDeployment) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, deployment: d });
  };

  const closeContextMenu = () => setContextMenu(null);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClick = () => closeContextMenu();
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  return (
    <div className="deployments-container">
      {/* Header */}
      <div className="deployments-header">
        <span className="deployments-title">deployments</span>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          <button className="icon-button" onClick={() => fetchDeployments()} disabled={isFetching}>
            <RefreshCw style={{
              width: 14,
              height: 14,
              animation: isFetching ? 'spin 1s linear infinite' : 'none'
            }} />
          </button>

          <button className="icon-button" onClick={onOpenSettings}>
            <Settings style={{ width: 14, height: 14 }} />
          </button>
        </div>
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
            const status = mapStatus(d.status);
            const isBuilding = status === 'BUILDING' || status === 'QUEUED';
            const isError = status === 'ERROR';
            const isCopying = copyingId === d.id;
            return (
              <div
                key={`${d.provider}-${d.id}`}
                className={`deployment-item ${isCopying ? 'copying' : ''}`}
                onClick={() => handleClick(d)}
                onContextMenu={(e) => handleContextMenu(e, d)}
                title={isError ? 'Click to copy error logs' : undefined}
              >
                {/* Row 1: Status indicator + Commit title + Time */}
                <div className="deployment-row-1">
                  <span
                    className="status-dot"
                    style={{
                      backgroundColor: getStatusColor(d.status),
                      boxShadow: isBuilding ? `0 0 8px ${getStatusColor(d.status)}` : 'none',
                    }}
                  />
                  <span className="commit-message">{d.commitMessage || d.name}</span>
                  {isCopying ? (
                    <span className="copied-indicator">{copyMessage || 'Copying...'}</span>
                  ) : (
                    <span className="deploy-time">{formatTime(d.createdAt)}</span>
                  )}
                </div>

                {/* Row 2: Branch + Provider icon + Project name + Avatar */}
                <div className="deployment-row-2">
                  {d.branch && (
                    <>
                      <GitBranch style={{ width: 10, height: 10 }} />
                      <span title={d.branch}>{truncateBranch(d.branch)}</span>
                    </>
                  )}

                  {/* Provider icon before project name */}
                  {d.provider === 'railway' ? (
                    <Train style={{ width: 10, height: 10, color: '#a78bfa' }} />
                  ) : (
                    <svg width="10" height="10" viewBox="0 0 76 65" fill="#888">
                      <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
                    </svg>
                  )}

                  <span className="project-name">{d.name}</span>

                  {/* Committer avatar (Vercel only, uses git author info) */}
                  {d.gitAuthorLogin && (
                    <img
                      src={`https://github.com/${d.gitAuthorLogin}.png?s=40`}
                      alt="committer"
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

        {/* Load More Button */}
        {!isLoading && deployments.length > 0 && hasMore && (
          <button
            className="load-more-button"
            onClick={loadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
            ) : (
              'Load more'
            )}
          </button>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          {mapStatus(contextMenu.deployment.status) === 'READY' && contextMenu.deployment.url && (
            <button
              className="context-menu-item"
              onClick={() => {
                openDeploymentUrl(contextMenu.deployment);
                closeContextMenu();
              }}
            >
              <ExternalLink style={{ width: 12, height: 12 }} />
              Open deployment URL
            </button>
          )}
          <button
            className="context-menu-item"
            onClick={() => {
              openDeploymentPage(contextMenu.deployment);
              closeContextMenu();
            }}
          >
            <ExternalLink style={{ width: 12, height: 12 }} />
            Open {contextMenu.deployment.provider === 'railway' ? 'Railway' : 'Vercel'} dashboard
          </button>
          {contextMenu.deployment.provider === 'vercel' && (
            <button
              className="context-menu-item"
              onClick={() => {
                const isError = mapStatus(contextMenu.deployment.status) === 'ERROR';
                copyLogs(contextMenu.deployment, isError);
                closeContextMenu();
              }}
            >
              <Copy style={{ width: 12, height: 12 }} />
              {mapStatus(contextMenu.deployment.status) === 'ERROR' ? 'Copy errors' : 'Copy logs'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
