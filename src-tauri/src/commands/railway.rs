use tauri::State;
use crate::railway::{self, RailwayDeployment, RailwayProject, RailwayUser};
use crate::state::AppState;
use crate::commands::auth::{get_stored_token, initialize_state};

#[tauri::command]
pub async fn railway_verify_token(token: String) -> Result<RailwayUser, String> {
    let client = railway::create_client(&token)
        .map_err(|e| format!("Failed to create client: {}", e))?;

    client
        .get_user()
        .await
        .map_err(|e| format!("Invalid token: {}", e))
}

#[tauri::command]
pub async fn railway_list_projects(state: State<'_, AppState>) -> Result<Vec<RailwayProject>, String> {
    initialize_state(&state).await?;

    let token = get_stored_token(state)
        .await?
        .ok_or("Not authenticated")?;

    let client = railway::create_client(&token)
        .map_err(|e| format!("Failed to create client: {}", e))?;

    client
        .list_projects(Some(50))
        .await
        .map_err(|e| format!("Failed to list projects: {}", e))
}

#[tauri::command]
pub async fn railway_list_deployments(
    project_id: Option<String>,
    service_id: Option<String>,
    environment_id: Option<String>,
    limit: Option<u32>,
    state: State<'_, AppState>,
) -> Result<Vec<RailwayDeployment>, String> {
    initialize_state(&state).await?;

    let token = get_stored_token(state)
        .await?
        .ok_or("Not authenticated")?;

    let client = railway::create_client(&token)
        .map_err(|e| format!("Failed to create client: {}", e))?;

    client
        .list_deployments(
            project_id.as_deref(),
            service_id.as_deref(),
            environment_id.as_deref(),
            limit.unwrap_or(20),
        )
        .await
        .map_err(|e| format!("Failed to list deployments: {}", e))
}

#[tauri::command]
pub async fn railway_get_deployment(
    deployment_id: String,
    state: State<'_, AppState>,
) -> Result<RailwayDeployment, String> {
    initialize_state(&state).await?;

    let token = get_stored_token(state)
        .await?
        .ok_or("Not authenticated")?;

    let client = railway::create_client(&token)
        .map_err(|e| format!("Failed to create client: {}", e))?;

    client
        .get_deployment(&deployment_id)
        .await
        .map_err(|e| format!("Failed to get deployment: {}", e))
}
