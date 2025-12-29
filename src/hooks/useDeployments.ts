import { useCallback, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useStore } from '../store';
import type { Project, Deployment } from '../types';

export function useDeployments() {
  const {
    projects,
    selectedProjectId,
    deployments,
    setProjects,
    setSelectedProject,
    setDeployments,
    updateDeployment,
    isAuthenticated,
  } = useStore();

  const pollIntervalRef = useRef<number | null>(null);

  const fetchProjects = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const projectList = await invoke<Project[]>('list_projects');
      setProjects(projectList);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  }, [isAuthenticated, setProjects]);

  const fetchDeployments = useCallback(async (projectId?: string) => {
    if (!isAuthenticated) return;
    try {
      const deploymentList = await invoke<Deployment[]>('list_deployments', {
        projectId: projectId || null,
        limit: 20,
      });
      setDeployments(deploymentList);
    } catch (error) {
      console.error('Failed to fetch deployments:', error);
    }
  }, [isAuthenticated, setDeployments]);

  const refreshDeployment = useCallback(async (deploymentId: string) => {
    try {
      const deployment = await invoke<Deployment>('get_deployment', { deploymentId });
      updateDeployment(deployment);
      return deployment;
    } catch (error) {
      console.error('Failed to refresh deployment:', error);
      return null;
    }
  }, [updateDeployment]);

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
    if (isAuthenticated) {
      fetchProjects();
    }
  }, [isAuthenticated, fetchProjects]);

  // Fetch deployments when project changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchDeployments(selectedProjectId || undefined);
    }
  }, [isAuthenticated, selectedProjectId, fetchDeployments]);

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
    fetchProjects,
    fetchDeployments,
    refreshDeployment,
    selectProject,
    startPolling,
    stopPolling,
  };
}
