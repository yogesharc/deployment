use anyhow::{anyhow, Result};
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION};
use super::types::*;

const API_BASE: &str = "https://api.vercel.com";

pub struct VercelClient {
    client: reqwest::Client,
    token: String,
}

impl VercelClient {
    pub fn new(token: String) -> Result<Self> {
        let mut headers = HeaderMap::new();
        headers.insert(
            AUTHORIZATION,
            HeaderValue::from_str(&format!("Bearer {}", token))?,
        );

        let client = reqwest::Client::builder()
            .default_headers(headers)
            .build()?;

        Ok(Self { client, token })
    }

    pub fn token(&self) -> &str {
        &self.token
    }

    pub async fn get_user(&self) -> Result<User> {
        let resp = self
            .client
            .get(format!("{}/v2/user", API_BASE))
            .send()
            .await?;

        if !resp.status().is_success() {
            return Err(anyhow!("Failed to get user: {}", resp.status()));
        }

        let user_resp: UserResponse = resp.json().await?;
        Ok(user_resp.user)
    }

    pub async fn list_projects(&self) -> Result<Vec<Project>> {
        let resp = self
            .client
            .get(format!("{}/v9/projects", API_BASE))
            .query(&[("limit", "50")])
            .send()
            .await?;

        if !resp.status().is_success() {
            return Err(anyhow!("Failed to list projects: {}", resp.status()));
        }

        let projects_resp: ProjectsResponse = resp.json().await?;
        Ok(projects_resp.projects)
    }

    pub async fn list_deployments(&self, project_id: Option<&str>, limit: u32) -> Result<Vec<Deployment>> {
        let mut req = self
            .client
            .get(format!("{}/v6/deployments", API_BASE))
            .query(&[("limit", limit.to_string())]);

        if let Some(pid) = project_id {
            req = req.query(&[("projectId", pid)]);
        }

        let resp = req.send().await?;

        if !resp.status().is_success() {
            return Err(anyhow!("Failed to list deployments: {}", resp.status()));
        }

        let deployments_resp: DeploymentsResponse = resp.json().await?;
        Ok(deployments_resp.deployments)
    }

    pub async fn get_deployment(&self, deployment_id: &str) -> Result<Deployment> {
        let resp = self
            .client
            .get(format!("{}/v13/deployments/{}", API_BASE, deployment_id))
            .send()
            .await?;

        if !resp.status().is_success() {
            return Err(anyhow!("Failed to get deployment: {}", resp.status()));
        }

        let deployment: Deployment = resp.json().await?;
        Ok(deployment)
    }

    pub async fn get_token_info(&self) -> Result<TokenInfo> {
        let resp = self
            .client
            .get(format!("{}/v5/user/tokens/current", API_BASE))
            .send()
            .await?;

        if !resp.status().is_success() {
            return Err(anyhow!("Failed to get token info: {}", resp.status()));
        }

        let token_resp: TokenInfoResponse = resp.json().await?;
        Ok(token_resp.token)
    }

    pub async fn list_teams(&self) -> Result<Vec<Team>> {
        let resp = self
            .client
            .get(format!("{}/v2/teams", API_BASE))
            .query(&[("limit", "50")])
            .send()
            .await?;

        if !resp.status().is_success() {
            return Err(anyhow!("Failed to list teams: {}", resp.status()));
        }

        let teams_resp: TeamsResponse = resp.json().await?;
        Ok(teams_resp.teams)
    }

    pub async fn get_team(&self, team_id: &str) -> Result<Team> {
        let resp = self
            .client
            .get(format!("{}/v2/teams/{}", API_BASE, team_id))
            .send()
            .await?;

        if !resp.status().is_success() {
            return Err(anyhow!("Failed to get team: {}", resp.status()));
        }

        let team: Team = resp.json().await?;
        Ok(team)
    }
}

pub fn create_client(token: &str) -> Result<VercelClient> {
    VercelClient::new(token.to_string())
}
