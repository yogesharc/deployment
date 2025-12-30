use serde::{Deserialize, Serialize};

// GraphQL response wrapper types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphQLResponse<T> {
    pub data: Option<T>,
    pub errors: Option<Vec<GraphQLError>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphQLError {
    pub message: String,
}

// User types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MeData {
    pub me: RailwayUser,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RailwayUser {
    pub id: String,
    pub email: String,
    pub name: Option<String>,
}

// Project types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectsData {
    pub projects: ProjectConnection,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectConnection {
    pub edges: Vec<ProjectEdge>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectEdge {
    pub node: RailwayProject,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RailwayProject {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub updated_at: Option<String>,
    #[serde(default)]
    pub services: ServiceConnection,
    #[serde(default)]
    pub environments: EnvironmentConnection,
}

// Service types
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ServiceConnection {
    pub edges: Vec<ServiceEdge>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceEdge {
    pub node: RailwayService,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RailwayService {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub icon: Option<String>,
}

// Environment types
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct EnvironmentConnection {
    pub edges: Vec<EnvironmentEdge>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvironmentEdge {
    pub node: RailwayEnvironment,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RailwayEnvironment {
    pub id: String,
    pub name: String,
}

// Deployment types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeploymentsData {
    pub deployments: DeploymentConnection,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeploymentConnection {
    pub edges: Vec<DeploymentEdge>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeploymentEdge {
    pub node: RailwayDeployment,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum RailwayDeploymentStatus {
    Initializing,
    Building,
    Deploying,
    Success,
    Failed,
    Crashed,
    Removed,
    Removing,
    Sleeping,
    Waiting,
    Queued,
    Skipped,
    #[serde(other)]
    Unknown,
}

impl RailwayDeploymentStatus {
    /// Convert Railway status to unified status string for frontend
    pub fn to_unified(&self) -> &'static str {
        match self {
            RailwayDeploymentStatus::Initializing => "INITIALIZING",
            RailwayDeploymentStatus::Building => "BUILDING",
            RailwayDeploymentStatus::Deploying => "BUILDING",
            RailwayDeploymentStatus::Success => "READY",
            RailwayDeploymentStatus::Failed => "ERROR",
            RailwayDeploymentStatus::Crashed => "ERROR",
            RailwayDeploymentStatus::Removed => "CANCELED",
            RailwayDeploymentStatus::Removing => "CANCELED",
            RailwayDeploymentStatus::Sleeping => "READY",
            RailwayDeploymentStatus::Waiting => "QUEUED",
            RailwayDeploymentStatus::Queued => "QUEUED",
            RailwayDeploymentStatus::Skipped => "CANCELED",
            RailwayDeploymentStatus::Unknown => "UNKNOWN",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RailwayDeployment {
    pub id: String,
    #[serde(default)]
    pub static_url: Option<String>,
    pub status: RailwayDeploymentStatus,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(default)]
    pub updated_at: Option<String>,
    #[serde(default)]
    pub meta: Option<RailwayDeploymentMeta>,
    // Additional context for frontend
    #[serde(skip_deserializing)]
    pub project_id: Option<String>,
    #[serde(skip_deserializing)]
    pub service_id: Option<String>,
    #[serde(skip_deserializing)]
    pub service_name: Option<String>,
    #[serde(skip_deserializing)]
    pub environment_id: Option<String>,
}

/// Railway returns meta as a JSON scalar, so we deserialize it as a JSON value
/// and extract the fields we need
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RailwayDeploymentMeta {
    #[serde(default)]
    pub commit_message: Option<String>,
    #[serde(default)]
    pub branch: Option<String>,
    #[serde(default)]
    pub commit_hash: Option<String>,
}

// For single deployment query
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeploymentData {
    pub deployment: RailwayDeployment,
}

// Workspace/Team types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspacesData {
    pub teams: TeamConnection,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TeamConnection {
    pub edges: Vec<TeamEdge>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TeamEdge {
    pub node: RailwayWorkspace,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RailwayWorkspace {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub avatar: Option<String>,
}
