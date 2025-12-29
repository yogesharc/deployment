import { create } from 'zustand';
import type { User, Project, Deployment, LogLine, View } from '../types';

interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Data
  projects: Project[];
  selectedProjectId: string | null;
  deployments: Deployment[];
  logs: LogLine[];

  // UI
  view: View;
  selectedDeploymentId: string | null;
  isStreaming: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setAuthenticated: (isAuth: boolean) => void;
  setLoading: (loading: boolean) => void;
  setProjects: (projects: Project[]) => void;
  setSelectedProject: (projectId: string | null) => void;
  setDeployments: (deployments: Deployment[]) => void;
  updateDeployment: (deployment: Deployment) => void;
  setLogs: (logs: LogLine[]) => void;
  addLog: (log: LogLine) => void;
  clearLogs: () => void;
  setView: (view: View) => void;
  setSelectedDeployment: (deploymentId: string | null) => void;
  setStreaming: (streaming: boolean) => void;
  logout: () => void;
}

export const useStore = create<AppState>((set) => ({
  // Initial state
  user: null,
  isAuthenticated: false,
  isLoading: true,
  projects: [],
  selectedProjectId: null,
  deployments: [],
  logs: [],
  view: 'auth',
  selectedDeploymentId: null,
  isStreaming: false,

  // Actions
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setLoading: (isLoading) => set({ isLoading }),
  setProjects: (projects) => set({ projects }),
  setSelectedProject: (selectedProjectId) => set({ selectedProjectId, deployments: [] }),
  setDeployments: (deployments) => set({ deployments }),
  updateDeployment: (deployment) =>
    set((state) => ({
      deployments: state.deployments.map((d) =>
        d.uid === deployment.uid ? deployment : d
      ),
    })),
  setLogs: (logs) => set({ logs }),
  addLog: (log) => set((state) => ({ logs: [...state.logs, log] })),
  clearLogs: () => set({ logs: [] }),
  setView: (view) => set({ view }),
  setSelectedDeployment: (selectedDeploymentId) =>
    set({ selectedDeploymentId, logs: [] }),
  setStreaming: (isStreaming) => set({ isStreaming }),
  logout: () =>
    set({
      user: null,
      isAuthenticated: false,
      projects: [],
      deployments: [],
      logs: [],
      view: 'auth',
      selectedProjectId: null,
      selectedDeploymentId: null,
    }),
}));
