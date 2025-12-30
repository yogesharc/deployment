export type Provider = 'vercel' | 'railway';

export interface User {
  id: string;
  email: string;
  name: string | null;
  username: string;
}

export interface Account {
  id: string;
  username: string;
  email: string;
  name: string | null;
  scopeType: string;
  teamName: string | null;
  teamSlug: string | null;
  provider: Provider;
}

export interface Project {
  id: string;
  name: string;
  framework: string | null;
  updatedAt: number | null;
}

// Railway-specific project with services
export interface RailwayProject {
  id: string;
  name: string;
  description: string | null;
  updatedAt: string | null;
  services: {
    edges: Array<{
      node: RailwayService;
    }>;
  };
  environments: {
    edges: Array<{
      node: RailwayEnvironment;
    }>;
  };
}

export interface RailwayService {
  id: string;
  name: string;
  icon: string | null;
}

export interface RailwayEnvironment {
  id: string;
  name: string;
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
  // Provider info for unified display
  provider?: Provider;
}

// Railway deployment type
export interface RailwayDeployment {
  id: string;
  staticUrl: string | null;
  status: RailwayDeploymentStatus;
  createdAt: string | null;
  updatedAt: string | null;
  meta: RailwayDeploymentMeta | null;
  projectId: string | null;
  serviceId: string | null;
  serviceName: string | null;
  environmentId: string | null;
}

export type RailwayDeploymentStatus =
  | 'INITIALIZING'
  | 'BUILDING'
  | 'DEPLOYING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CRASHED'
  | 'REMOVED'
  | 'REMOVING'
  | 'SLEEPING'
  | 'WAITING'
  | 'QUEUED'
  | 'SKIPPED'
  | 'UNKNOWN';

export interface RailwayDeploymentMeta {
  commitMessage: string | null;
  branch: string | null;
  commitHash: string | null;
}

// Unified deployment for display
export interface UnifiedDeployment {
  id: string;
  name: string;
  url: string | null;
  state: DeploymentState;
  createdAt: number | null;
  meta: DeploymentMeta | null;
  provider: Provider;
  // Railway-specific fields
  projectId?: string;
  serviceId?: string;
  environmentId?: string;
}

export interface LogLine {
  timestamp: number;
  text: string;
  isError: boolean;
}

export type View = 'auth' | 'deployments' | 'logs' | 'settings';
