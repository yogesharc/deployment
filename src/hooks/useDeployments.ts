import { useCallback, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useStore } from '../store';
import type { Project, Deployment, RailwayDeployment, UnifiedDeployment, DeploymentState } from '../types';

// Convert Railway status to unified DeploymentState
function mapRailwayStatus(status: string): DeploymentState {
  switch (status) {
    case 'INITIALIZING':
      return 'INITIALIZING';
    case 'BUILDING':
    case 'DEPLOYING':
      return 'BUILDING';
    case 'SUCCESS':
    case 'SLEEPING':
      return 'READY';
    case 'FAILED':
    case 'CRASHED':
      return 'ERROR';
    case 'REMOVED':
    case 'REMOVING':
    case 'SKIPPED':
      return 'CANCELED';
    case 'WAITING':
    case 'QUEUED':
      return 'QUEUED';
    default:
      return 'UNKNOWN';
  }
}

// Convert Vercel deployment to unified format
function vercelToUnified(d: Deployment): UnifiedDeployment {
  return {
    id: d.uid,
    name: d.name,
    url: d.url,
    state: d.state || d.readyState || 'UNKNOWN',
    createdAt: d.createdAt,
    meta: d.meta,
    provider: 'vercel',
  };
}

// Convert Railway deployment to unified format
function railwayToUnified(d: RailwayDeployment): UnifiedDeployment {
  return {
    id: d.id,
    name: d.serviceName || 'Deployment',
    url: d.staticUrl,
    state: mapRailwayStatus(d.status),
    createdAt: d.createdAt ? new Date(d.createdAt).getTime() : null,
    meta: d.meta ? {
      commitMessage: d.meta.commitMessage,
      branch: d.meta.branch,
    } : null,
    provider: 'railway',
    projectId: d.projectId || undefined,
    serviceId: d.serviceId || undefined,
    environmentId: d.environmentId || undefined,
  };
}

export function useDeployments() {
  const {
    projects,
    selectedProjectId,
    deployments,
    unifiedDeployments,
    currentAccount,
    setProjects,
    setSelectedProject,
    setDeployments,
    setUnifiedDeployments,
    updateDeployment,
    isAuthenticated,
  } = useStore();

  const pollIntervalRef = useRef<number | null>(null);

  const fetchProjects = useCallback(async () => {
    if (!isAuthenticated || !currentAccount) return;
    try {
      if (currentAccount.provider === 'railway') {
        // Railway projects - we don't need to fetch separately for now
        // as deployments come with project info
        setProjects([]);
      } else {
        const projectList = await invoke<Project[]>('list_projects');
        setProjects(projectList);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  }, [isAuthenticated, currentAccount, setProjects]);

  const fetchDeployments = useCallback(async (projectId?: string) => {
    if (!isAuthenticated || !currentAccount) return;
    try {
      if (currentAccount.provider === 'railway') {
        const railwayDeployments = await invoke<RailwayDeployment[]>('railway_list_deployments', {
          projectId: projectId || null,
          serviceId: null,
          environmentId: null,
          limit: 20,
        });
        const unified = railwayDeployments.map(railwayToUnified);
        setUnifiedDeployments(unified);
        // Also set legacy deployments for compatibility
        setDeployments([]);
      } else {
        const deploymentList = await invoke<Deployment[]>('list_deployments', {
          projectId: projectId || null,
          limit: 20,
        });
        setDeployments(deploymentList);
        const unified = deploymentList.map(vercelToUnified);
        setUnifiedDeployments(unified);
      }
    } catch (error) {
      console.error('Failed to fetch deployments:', error);
    }
  }, [isAuthenticated, currentAccount, setDeployments, setUnifiedDeployments]);

  const refreshDeployment = useCallback(async (deploymentId: string) => {
    if (!currentAccount) return null;
    try {
      if (currentAccount.provider === 'railway') {
        const deployment = await invoke<RailwayDeployment>('railway_get_deployment', { deploymentId });
        // Update unified deployments
        const unified = railwayToUnified(deployment);
        setUnifiedDeployments(
          unifiedDeployments.map(d => d.id === deploymentId ? unified : d)
        );
        return unified;
      } else {
        const deployment = await invoke<Deployment>('get_deployment', { deploymentId });
        updateDeployment(deployment);
        return vercelToUnified(deployment);
      }
    } catch (error) {
      console.error('Failed to refresh deployment:', error);
      return null;
    }
  }, [currentAccount, updateDeployment, unifiedDeployments, setUnifiedDeployments]);

  const selectProject = useCallback((projectId: string | null) => {
    setSelectedProject(projectId);
  }, [setSelectedProject]);

  // Start polling for deployments
  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = window.setInterval(() => {
      fetchDeployments(selectedProjectId || undefined);
    }, 30000); // Poll every 30 seconds
  }, [fetchDeployments, selectedProjectId]);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Fetch projects on mount when authenticated
  useEffect(() => {
    if (isAuthenticated && currentAccount) {
      fetchProjects();
    }
  }, [isAuthenticated, currentAccount, fetchProjects]);

  // Fetch deployments when project or account changes
  useEffect(() => {
    if (isAuthenticated && currentAccount) {
      fetchDeployments(selectedProjectId || undefined);
    }
  }, [isAuthenticated, currentAccount, selectedProjectId, fetchDeployments]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    projects,
    selectedProjectId,
    deployments,
    unifiedDeployments,
    fetchProjects,
    fetchDeployments,
    refreshDeployment,
    selectProject,
    startPolling,
    stopPolling,
  };
}
