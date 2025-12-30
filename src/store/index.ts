import { create } from 'zustand';
import type { User, Project, Deployment, LogLine, View, Account, UnifiedDeployment } from '../types';

interface AppState {
  // Auth
  user: User | null;
  currentAccount: Account | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Data
  projects: Project[];
  selectedProjectId: string | null;
  deployments: Deployment[];
  unifiedDeployments: UnifiedDeployment[];
  logs: LogLine[];

  // UI
  view: View;
  selectedDeploymentId: string | null;
  isStreaming: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setCurrentAccount: (account: Account | null) => void;
  setAuthenticated: (isAuth: boolean) => void;
  setLoading: (loading: boolean) => void;
  setProjects: (projects: Project[]) => void;
  setSelectedProject: (projectId: string | null) => void;
  setDeployments: (deployments: Deployment[]) => void;
  setUnifiedDeployments: (deployments: UnifiedDeployment[]) => void;
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
  currentAccount: null,
  isAuthenticated: false,
  isLoading: true,
  projects: [],
  selectedProjectId: null,
  deployments: [],
  unifiedDeployments: [],
  logs: [],
  view: 'auth',
  selectedDeploymentId: null,
  isStreaming: false,

  // Actions
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setCurrentAccount: (currentAccount) => set({ currentAccount, isAuthenticated: !!currentAccount }),
  setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setLoading: (isLoading) => set({ isLoading }),
  setProjects: (projects) => set({ projects }),
  setSelectedProject: (selectedProjectId) => set({ selectedProjectId, deployments: [], unifiedDeployments: [] }),
  setDeployments: (deployments) => set({ deployments }),
  setUnifiedDeployments: (unifiedDeployments) => set({ unifiedDeployments }),
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
      currentAccount: null,
      isAuthenticated: false,
      projects: [],
      deployments: [],
      unifiedDeployments: [],
      logs: [],
      view: 'auth',
      selectedProjectId: null,
      selectedDeploymentId: null,
    }),
}));
