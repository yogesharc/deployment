use futures::StreamExt;
use tauri::{AppHandle, Emitter, State, Manager};
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

#[tauri::command]
pub async fn fetch_error_logs_text(deployment_id: String, account_id: Option<String>, state: State<'_, AppState>) -> Result<String, String> {
    // Get token for specific account if provided, otherwise use active account
    let token = match account_id {
        Some(id) => {
            crate::commands::auth::get_account_token(id, state.clone())
                .await?
                .ok_or("Account not found")?
        }
        None => {
            get_stored_token(state)
                .await?
                .ok_or("Not authenticated")?
        }
    };

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

    let mut all_lines: Vec<String> = Vec::new();
    let mut error_lines: Vec<String> = Vec::new();

    // Try parsing as JSON array first (non-streaming response)
    if let Ok(events) = serde_json::from_str::<Vec<serde_json::Value>>(&text) {
        for event in events {
            if let Some(log_text) = event.get("text").and_then(|t| t.as_str()) {
                all_lines.push(log_text.to_string());
                let lower = log_text.to_lowercase();
                if lower.contains("error") || lower.contains("failed") || lower.contains("err!") {
                    error_lines.push(log_text.to_string());
                }
            }
        }
    } else {
        // Fallback to SSE format (streaming response)
        for line in text.lines() {
            if line.starts_with("data: ") {
                let data = &line[6..];
                if let Ok(event) = serde_json::from_str::<serde_json::Value>(data) {
                    let log_text = event.get("payload")
                        .and_then(|p| p.get("text").and_then(|t| t.as_str()))
                        .or_else(|| event.get("text").and_then(|t| t.as_str()));

                    if let Some(text) = log_text {
                        all_lines.push(text.to_string());
                        let lower = text.to_lowercase();
                        if lower.contains("error") || lower.contains("failed") || lower.contains("err!") {
                            error_lines.push(text.to_string());
                        }
                    }
                }
            }
        }
    }

    if error_lines.is_empty() {
        Ok(all_lines.join("\n"))
    } else {
        Ok(error_lines.join("\n"))
    }
}
