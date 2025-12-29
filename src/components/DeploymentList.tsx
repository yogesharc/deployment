import { useEffect } from 'react';
import { RefreshCw, ExternalLink, GitBranch } from 'lucide-react';
import { useDeployments } from '../hooks/useDeployments';
import { useStore } from '../store';
import { StatusBadge } from './StatusBadge';
import type { Deployment, DeploymentState } from '../types';

function formatTime(timestamp: number | null): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

function getDeploymentState(deployment: Deployment): DeploymentState {
  return deployment.state || deployment.readyState || 'UNKNOWN';
}

interface DeploymentItemProps {
  deployment: Deployment;
  onSelect: (id: string) => void;
}

function DeploymentItem({ deployment, onSelect }: DeploymentItemProps) {
  const state = getDeploymentState(deployment);
  const commitMessage = deployment.meta?.commitMessage;
  const branch = deployment.meta?.branch;

  return (
    <button
      onClick={() => onSelect(deployment.uid)}
      className="w-full text-left p-3 hover:bg-vercel-gray-800 rounded-lg transition-colors group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-vercel-white truncate">
              {deployment.name}
            </span>
            <StatusBadge state={state} />
          </div>

          {commitMessage && (
            <p className="text-sm text-vercel-gray-400 truncate mb-1">
              {commitMessage}
            </p>
          )}

          <div className="flex items-center gap-3 text-xs text-vercel-gray-500">
            {branch && (
              <span className="flex items-center gap-1">
                <GitBranch className="w-3 h-3" />
                {branch}
              </span>
            )}
            <span>{formatTime(deployment.createdAt)}</span>
          </div>
        </div>

        <a
          href={`https://${deployment.url}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="p-1.5 text-vercel-gray-500 hover:text-vercel-white opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </button>
  );
}

export function DeploymentList() {
  const { deployments, fetchDeployments, selectedProjectId, startPolling, stopPolling } = useDeployments();
  const { setView, setSelectedDeployment } = useStore();

  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  const handleSelect = (deploymentId: string) => {
    setSelectedDeployment(deploymentId);
    setView('logs');
  };

  const handleRefresh = () => {
    fetchDeployments(selectedProjectId || undefined);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-vercel-gray-800">
        <span className="text-sm font-medium text-vercel-gray-300">
          Recent Deployments
        </span>
        <button
          onClick={handleRefresh}
          className="p-1.5 text-vercel-gray-500 hover:text-vercel-white rounded transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {deployments.length === 0 ? (
          <div className="flex items-center justify-center h-full text-vercel-gray-500 text-sm">
            No deployments found
          </div>
        ) : (
          <div className="space-y-1">
            {deployments.map((deployment) => (
              <DeploymentItem
                key={deployment.uid}
                deployment={deployment}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
