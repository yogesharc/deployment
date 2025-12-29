use tauri::State;
use crate::vercel::{self, Deployment, Project};
use crate::state::AppState;
use crate::commands::auth::get_stored_token;

#[tauri::command]
pub async fn list_projects(state: State<'_, AppState>) -> Result<Vec<Project>, String> {
    let token = get_stored_token(state)
        .await?
        .ok_or("Not authenticated")?;

    let client = vercel::create_client(&token)
        .map_err(|e| format!("Failed to create client: {}", e))?;

    client
        .list_projects()
        .await
        .map_err(|e| format!("Failed to list projects: {}", e))
}

#[tauri::command]
pub async fn list_deployments(project_id: Option<String>, limit: Option<u32>, state: State<'_, AppState>) -> Result<Vec<Deployment>, String> {
    let token = get_stored_token(state)
        .await?
        .ok_or("Not authenticated")?;

    let client = vercel::create_client(&token)
        .map_err(|e| format!("Failed to create client: {}", e))?;

    client
        .list_deployments(project_id.as_deref(), limit.unwrap_or(20))
        .await
        .map_err(|e| format!("Failed to list deployments: {}", e))
}

#[tauri::command]
pub async fn get_deployment(deployment_id: String, state: State<'_, AppState>) -> Result<Deployment, String> {
    let token = get_stored_token(state)
        .await?
        .ok_or("Not authenticated")?;

    let client = vercel::create_client(&token)
        .map_err(|e| format!("Failed to create client: {}", e))?;

    client
        .get_deployment(&deployment_id)
        .await
        .map_err(|e| format!("Failed to get deployment: {}", e))
}
