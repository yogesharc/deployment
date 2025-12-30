use tauri::{State, AppHandle};
use serde::{Deserialize, Serialize};
use crate::vercel::{self, Deployment, Project};
use crate::railway;
use crate::state::AppState;
use crate::commands::auth::{get_stored_token, initialize_state};
use crate::tray;

/// Unified deployment type that works across providers
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UnifiedDeployment {
    pub id: String,
    pub provider: String,  // "vercel" or "railway"
    pub name: String,
    pub url: Option<String>,
    pub status: String,
    pub created_at: Option<i64>,  // Unix timestamp in ms
    pub commit_message: Option<String>,
    pub branch: Option<String>,
    pub project_id: Option<String>,
    pub service_id: Option<String>,
    pub git_author_login: Option<String>,  // GitHub username for avatar
    pub team_slug: Option<String>,  // Team/user slug for Vercel dashboard URLs
}

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

/// List deployments from ALL accounts (both Vercel and Railway)
#[tauri::command]
pub async fn list_all_deployments(limit: Option<u32>, state: State<'_, AppState>) -> Result<Vec<UnifiedDeployment>, String> {
    initialize_state(&state).await?;

    let limit = limit.unwrap_or(8);
    let mut all_deployments: Vec<UnifiedDeployment> = Vec::new();

    // Get all accounts
    let accounts = state.get_all_accounts();

    for account in accounts {
        match account.provider.as_str() {
            "vercel" => {
                let client = match vercel::create_client(&account.token) {
                    Ok(c) => c,
                    Err(_) => continue,
                };

                // Get team slug for dashboard URLs (use team_slug if team, else username)
                let team_slug = account.team_slug.clone().unwrap_or_else(|| account.username.clone());

                // Fetch deployments at team level (not per project)
                if let Ok(deployments) = client.list_deployments(None, limit).await {
                    for d in deployments {
                        let status = match d.state.as_ref().or(d.ready_state.as_ref()) {
                            Some(s) => format!("{:?}", s).to_uppercase(),
                            None => "UNKNOWN".to_string(),
                        };

                        all_deployments.push(UnifiedDeployment {
                            id: d.uid.clone(),
                            provider: "vercel".to_string(),
                            name: d.name.clone(),
                            url: Some(format!("https://{}", d.url)),
                            status,
                            created_at: d.created_at,
                            commit_message: d.meta.as_ref().and_then(|m| m.commit_message.clone()),
                            branch: d.meta.as_ref().and_then(|m| m.branch.clone()),
                            project_id: Some(d.name.clone()),
                            service_id: None,
                            git_author_login: d.meta.as_ref().and_then(|m| m.git_author_login.clone()),
                            team_slug: Some(team_slug.clone()),
                        });
                    }
                }
            }
            "railway" => {
                // Use the correct client type based on the account scope
                let token_type = if account.scope_type == "project" { "project" } else { "workspace" };
                let client = match railway::create_client_with_type(&account.token, token_type) {
                    Ok(c) => c,
                    Err(_) => continue,
                };

                if let Ok(deployments) = client.list_deployments(None, None, None, limit).await {
                    for d in deployments {
                        // Parse ISO timestamp to unix ms
                        let created_at = d.created_at.as_ref().and_then(|s| {
                            chrono::DateTime::parse_from_rfc3339(s)
                                .ok()
                                .map(|dt| dt.timestamp_millis())
                        });

                        all_deployments.push(UnifiedDeployment {
                            id: d.id.clone(),
                            provider: "railway".to_string(),
                            name: d.service_name.clone().unwrap_or_else(|| "Deployment".to_string()),
                            url: d.static_url.clone(),
                            status: format!("{:?}", d.status).to_uppercase(),
                            created_at,
                            commit_message: d.meta.as_ref().and_then(|m| m.commit_message.clone()),
                            branch: d.meta.as_ref().and_then(|m| m.branch.clone()),
                            project_id: d.project_id.clone(),
                            service_id: d.service_id.clone(),
                            git_author_login: None,  // Railway doesn't expose git author
                            team_slug: None,  // Not used for Railway
                        });
                    }
                }
            }
            _ => {}
        }
    }

    // Sort by created_at descending (most recent first)
    all_deployments.sort_by(|a, b| {
        let a_time = a.created_at.unwrap_or(0);
        let b_time = b.created_at.unwrap_or(0);
        b_time.cmp(&a_time)
    });

    // Truncate to limit
    all_deployments.truncate(limit as usize);

    Ok(all_deployments)
}

/// Update tray icon based on build status
#[tauri::command]
pub fn update_tray_status(is_building: bool, building_project: Option<String>, app: AppHandle) {
    // Set global flag so background thread knows to start polling
    crate::set_building_flag(is_building);

    if is_building {
        tray::set_tray_building(&app, building_project.as_deref());
    } else {
        tray::set_tray_normal(&app);
    }
}

/// Send a deployment notification
#[tauri::command]
pub async fn send_deployment_notification(
    title: String,
    body: String,
    app: AppHandle,
) -> Result<(), String> {
    use tauri_plugin_notification::NotificationExt;

    app.notification()
        .builder()
        .title(&title)
        .body(&body)
        .show()
        .map_err(|e| format!("Failed to send notification: {}", e))?;

    Ok(())
}
