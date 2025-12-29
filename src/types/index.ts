export interface User {
  id: string;
  email: string;
  name: string | null;
  username: string;
}

export interface Project {
  id: string;
  name: string;
  framework: string | null;
  updatedAt: number | null;
}

export type DeploymentState =
  | 'BUILDING'
  | 'ERROR'
  | 'INITIALIZING'
  | 'QUEUED'
  | 'READY'
  | 'CANCELED'
  | 'UNKNOWN';

export interface DeploymentMeta {
  commitMessage: string | null;
  branch: string | null;
}

export interface Deployment {
  uid: string;
  name: string;
  url: string;
  state: DeploymentState | null;
  readyState: DeploymentState | null;
  createdAt: number | null;
  buildingAt: number | null;
  ready: number | null;
  meta: DeploymentMeta | null;
}

export interface LogLine {
  timestamp: number;
  text: string;
  isError: boolean;
}

export type View = 'auth' | 'deployments' | 'logs' | 'settings';
