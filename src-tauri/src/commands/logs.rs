use futures::StreamExt;
use tauri::{AppHandle, Emitter, State};
use crate::commands::auth::get_stored_token;
use crate::state::AppState;
use crate::vercel::LogLine;

#[tauri::command]
pub async fn stream_deployment_logs(
    app: AppHandle,
    deployment_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let token = get_stored_token(state)
        .await?
        .ok_or("Not authenticated")?;

    let url = format!(
        "https://api.vercel.com/v3/deployments/{}/events?follow=1&build=1",
        deployment_id
    );

    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| format!("Failed to connect: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Failed to stream logs: {}", response.status()));
    }

    let mut stream = response.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk) = stream.next().await {
        match chunk {
            Ok(bytes) => {
                let text = String::from_utf8_lossy(&bytes);
                buffer.push_str(&text);

                // Process complete lines
                while let Some(pos) = buffer.find('\n') {
                    let line = buffer[..pos].to_string();
                    buffer = buffer[pos + 1..].to_string();

                    if line.trim().is_empty() {
                        continue;
                    }

                    // Parse SSE data lines
                    if line.starts_with("data: ") {
                        let data = &line[6..];
                        if let Ok(event) = serde_json::from_str::<serde_json::Value>(data) {
                            if let Some(payload) = event.get("payload") {
                                if let Some(text) = payload.get("text").and_then(|t| t.as_str()) {
                                    let is_error = text.to_lowercase().contains("error")
                                        || text.to_lowercase().contains("failed");

                                    let log_line = LogLine {
                                        timestamp: event
                                            .get("created")
                                            .and_then(|c| c.as_i64())
                                            .unwrap_or(0),
                                        text: text.to_string(),
                                        is_error,
                                    };

                                    let _ = app.emit("deployment-log", &log_line);
                                }
                            }
                        }
                    }
                }
            }
            Err(e) => {
                let _ = app.emit("deployment-log-error", format!("Stream error: {}", e));
                break;
            }
        }
    }

    let _ = app.emit("deployment-log-complete", &deployment_id);
    Ok(())
}

#[tauri::command]
pub async fn fetch_deployment_logs(deployment_id: String, state: State<'_, AppState>) -> Result<Vec<LogLine>, String> {
    let token = get_stored_token(state)
        .await?
        .ok_or("Not authenticated")?;

    let url = format!(
        "https://api.vercel.com/v3/deployments/{}/events?build=1",
        deployment_id
    );

    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| format!("Failed to fetch logs: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Failed to fetch logs: {}", response.status()));
    }

    let text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    let mut logs = Vec::new();

    for line in text.lines() {
        if line.starts_with("data: ") {
            let data = &line[6..];
            if let Ok(event) = serde_json::from_str::<serde_json::Value>(data) {
                if let Some(payload) = event.get("payload") {
                    if let Some(text) = payload.get("text").and_then(|t| t.as_str()) {
                        let is_error = text.to_lowercase().contains("error")
                            || text.to_lowercase().contains("failed");

                        logs.push(LogLine {
                            timestamp: event
                                .get("created")
                                .and_then(|c| c.as_i64())
                                .unwrap_or(0),
                            text: text.to_string(),
                            is_error,
                        });
                    }
                }
            }
        }
    }

    Ok(logs)
}
