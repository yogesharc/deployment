use anyhow::{anyhow, Result};
use reqwest::header::{HeaderMap, HeaderValue, CONTENT_TYPE};
use super::types::*;

const API_BASE: &str = "https://backboard.railway.com/graphql/v2";

pub struct RailwayClient {
    client: reqwest::Client,
    #[allow(dead_code)]
    token: String,
    #[allow(dead_code)]
    is_project_token: bool,
}

impl RailwayClient {
    pub fn new(token: String, token_type: Option<&str>) -> Result<Self> {
        // Per Railway docs:
        // - Workspace/Team tokens use Authorization: Bearer
        // - Project tokens use Project-Access-Token header
        let is_project_token = token_type == Some("project");

        let mut headers = HeaderMap::new();

        if is_project_token {
            // Project tokens use Project-Access-Token header
            headers.insert(
                "Project-Access-Token",
                HeaderValue::from_str(&token)?,
            );
        } else {
            // Workspace tokens use Bearer auth
            headers.insert(
                "Authorization",
                HeaderValue::from_str(&format!("Bearer {}", token))?,
            );
        }

        headers.insert(
            CONTENT_TYPE,
            HeaderValue::from_static("application/json"),
        );

        let client = reqwest::Client::builder()
            .default_headers(headers)
            .build()?;

        Ok(Self { client, token, is_project_token })
    }

    async fn execute_query<T: serde::de::DeserializeOwned>(&self, query: &str, variables: Option<serde_json::Value>) -> Result<T> {
        let body = serde_json::json!({
            "query": query,
            "variables": variables.unwrap_or(serde_json::json!({}))
        });

        let resp = self
            .client
            .post(API_BASE)
            .json(&body)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(anyhow!("GraphQL request failed: {} - {}", status, text));
        }

        let response: GraphQLResponse<T> = resp.json().await?;

        if let Some(errors) = response.errors {
            if !errors.is_empty() {
                return Err(anyhow!("GraphQL errors: {}", errors.iter().map(|e| e.message.clone()).collect::<Vec<_>>().join(", ")));
            }
        }

        response.data.ok_or_else(|| anyhow!("No data in GraphQL response"))
    }

    pub async fn get_user(&self) -> Result<RailwayUser> {
        // Both team and personal tokens can use the `me` query
        let query = r#"
            query {
                me {
                    id
                    email
                    name
                }
            }
        "#;

        let data: MeData = self.execute_query(query, None).await?;
        Ok(data.me)
    }

    pub async fn get_workspaces(&self) -> Result<Vec<RailwayWorkspace>> {
        let query = r#"
            query {
                teams {
                    edges {
                        node {
                            id
                            name
                            avatar
                        }
                    }
                }
            }
        "#;

        let data: WorkspacesData = self.execute_query(query, None).await?;
        Ok(data.teams.edges.into_iter().map(|e| e.node).collect())
    }

    pub async fn list_projects(&self, limit: Option<u32>) -> Result<Vec<RailwayProject>> {
        let limit = limit.unwrap_or(50);
        let query = r#"
            query Projects($first: Int!) {
                projects(first: $first) {
                    edges {
                        node {
                            id
                            name
                            description
                            updatedAt
                            services {
                                edges {
                                    node {
                                        id
                                        name
                                        icon
                                    }
                                }
                            }
                            environments {
                                edges {
                                    node {
                                        id
                                        name
                                    }
                                }
                            }
                        }
                    }
                }
            }
        "#;

        let variables = serde_json::json!({
            "first": limit
        });

        let data: ProjectsData = self.execute_query(query, Some(variables)).await?;
        Ok(data.projects.edges.into_iter().map(|e| e.node).collect())
    }

    pub async fn list_deployments(
        &self,
        project_id: Option<&str>,
        service_id: Option<&str>,
        environment_id: Option<&str>,
        limit: u32,
    ) -> Result<Vec<RailwayDeployment>> {
        // If we have specific filters, use them
        if project_id.is_some() || service_id.is_some() || environment_id.is_some() {
            return self.list_deployments_filtered(project_id, service_id, environment_id, limit).await;
        }

        // Otherwise, get deployments across all projects
        self.list_all_deployments(limit).await
    }

    async fn list_deployments_filtered(
        &self,
        project_id: Option<&str>,
        service_id: Option<&str>,
        environment_id: Option<&str>,
        limit: u32,
    ) -> Result<Vec<RailwayDeployment>> {
        let query = r#"
            query Deployments($first: Int!, $input: DeploymentListInput!) {
                deployments(first: $first, input: $input) {
                    edges {
                        node {
                            id
                            staticUrl
                            status
                            createdAt
                            updatedAt
                            meta
                        }
                    }
                }
            }
        "#;

        let mut input = serde_json::Map::new();
        if let Some(pid) = project_id {
            input.insert("projectId".to_string(), serde_json::Value::String(pid.to_string()));
        }
        if let Some(sid) = service_id {
            input.insert("serviceId".to_string(), serde_json::Value::String(sid.to_string()));
        }
        if let Some(eid) = environment_id {
            input.insert("environmentId".to_string(), serde_json::Value::String(eid.to_string()));
        }

        let variables = serde_json::json!({
            "first": limit,
            "input": serde_json::Value::Object(input)
        });

        let data: DeploymentsData = self.execute_query(query, Some(variables)).await?;
        let mut deployments: Vec<RailwayDeployment> = data.deployments.edges.into_iter().map(|e| {
            let mut d = e.node;
            d.project_id = project_id.map(|s| s.to_string());
            d.service_id = service_id.map(|s| s.to_string());
            d.environment_id = environment_id.map(|s| s.to_string());
            d
        }).collect();

        // Sort by created_at descending (most recent first)
        deployments.sort_by(|a, b| {
            let a_time = a.created_at.as_deref().unwrap_or("");
            let b_time = b.created_at.as_deref().unwrap_or("");
            b_time.cmp(a_time)
        });

        Ok(deployments)
    }

    async fn list_all_deployments(&self, limit: u32) -> Result<Vec<RailwayDeployment>> {
        // First get all projects with their services and environments
        let projects = self.list_projects(Some(20)).await?;

        let mut all_deployments = Vec::new();

        // For each project, get deployments for each service in ALL environments
        for project in &projects {
            let services: Vec<RailwayService> = project.services.edges.iter().map(|e| e.node.clone()).collect();
            let environments: Vec<RailwayEnvironment> = project.environments.edges.iter().map(|e| e.node.clone()).collect();

            // Check all environments, not just production
            for env in &environments {
                for service in &services {
                    let deployments = self.list_deployments_filtered(
                        Some(&project.id),
                        Some(&service.id),
                        Some(&env.id),
                        5, // Limit per service per environment
                    ).await;

                    if let Ok(mut deps) = deployments {
                        // Add service name and project name to each deployment
                        for d in &mut deps {
                            d.service_name = Some(format!("{} / {}", project.name, service.name));
                        }
                        all_deployments.extend(deps);
                    }
                }
            }
        }

        // Sort all deployments by created_at descending
        all_deployments.sort_by(|a, b| {
            let a_time = a.created_at.as_deref().unwrap_or("");
            let b_time = b.created_at.as_deref().unwrap_or("");
            b_time.cmp(a_time)
        });

        // Take only the requested limit
        all_deployments.truncate(limit as usize);

        Ok(all_deployments)
    }

    pub async fn get_deployment(&self, deployment_id: &str) -> Result<RailwayDeployment> {
        let query = r#"
            query Deployment($id: String!) {
                deployment(id: $id) {
                    id
                    staticUrl
                    status
                    createdAt
                    updatedAt
                    meta
                }
            }
        "#;

        let variables = serde_json::json!({
            "id": deployment_id
        });

        let data: DeploymentData = self.execute_query(query, Some(variables)).await?;
        Ok(data.deployment)
    }
}

pub fn create_client(token: &str) -> Result<RailwayClient> {
    RailwayClient::new(token.to_string(), Some("workspace"))
}

pub fn create_client_with_type(token: &str, token_type: &str) -> Result<RailwayClient> {
    RailwayClient::new(token.to_string(), Some(token_type))
}
