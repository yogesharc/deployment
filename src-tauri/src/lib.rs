mod commands;
mod railway;
mod state;
mod tray;
mod vercel;

use commands::*;
use state::AppState;
use tauri::Manager;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::runtime::Runtime;

// Global flag to signal background thread that a build is in progress
static IS_BUILDING: AtomicBool = AtomicBool::new(false);

pub fn set_building_flag(building: bool) {
    IS_BUILDING.store(building, Ordering::Relaxed);
}

pub fn get_building_flag() -> bool {
    IS_BUILDING.load(Ordering::Relaxed)
}

#[cfg(target_os = "macos")]
use tauri_nspanel::{
    cocoa::appkit::{NSMainMenuWindowLevel, NSWindowCollectionBehavior},
    panel_delegate, ManagerExt, WebviewWindowExt,
};

#[cfg(target_os = "macos")]
#[allow(non_upper_case_globals)]
const NSWindowStyleMaskNonActivatingPanel: i32 = 1 << 7;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_nspanel::init())
        .manage(AppState::new())
        .setup(|app| {
            // Set up system tray
            tray::setup_tray(app)?;

            // Hide from dock on macOS
            #[cfg(target_os = "macos")]
            {
                app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            }

            // Background thread to poll for build status when a build is detected
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                let rt = Runtime::new().unwrap();
                rt.block_on(async {
                    loop {
                        // Only poll when building flag is set
                        if get_building_flag() {
                            eprintln!("[BG] Building flag is set, checking status...");
                            let state = app_handle.state::<AppState>();

                            if state.is_initialized() {
                                let accounts = state.get_all_accounts();
                                let mut has_building = false;

                                'outer: for account in accounts {
                                    match account.provider.as_str() {
                                        "vercel" => {
                                            if let Ok(client) = vercel::create_client(&account.token) {
                                                if let Ok(deployments) = client.list_deployments(None, 5).await {
                                                    for d in deployments {
                                                        if let Some(s) = d.state.as_ref().or(d.ready_state.as_ref()) {
                                                            let status = format!("{:?}", s).to_uppercase();
                                                            eprintln!("[BG] Vercel deployment status: {}", status);
                                                            if status == "BUILDING" || status == "QUEUED" || status == "INITIALIZING" {
                                                                has_building = true;
                                                                break 'outer;
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                        "railway" => {
                                            let token_type = if account.scope_type == "project" { "project" } else { "workspace" };
                                            if let Ok(client) = railway::create_client_with_type(&account.token, token_type) {
                                                if let Ok(deployments) = client.list_deployments(None, None, None, 5).await {
                                                    for d in deployments {
                                                        let status = format!("{:?}", d.status).to_uppercase();
                                                        eprintln!("[BG] Railway deployment status: {}", status);
                                                        if status == "BUILDING" || status == "DEPLOYING" || status == "INITIALIZING" {
                                                            has_building = true;
                                                            break 'outer;
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                        _ => {}
                                    }
                                }

                                eprintln!("[BG] has_building = {}", has_building);
                                // Build finished - clear tray
                                if !has_building {
                                    eprintln!("[BG] Clearing tray text!");
                                    set_building_flag(false);
                                    tray::set_tray_normal(&app_handle);
                                }
                            }

                            // Poll every 10s while building
                            tokio::time::sleep(tokio::time::Duration::from_secs(10)).await;
                        } else {
                            // Not building - just sleep and check flag periodically
                            tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
                        }
                    }
                });
            });

            // Set up window with vibrancy and convert to panel for fullscreen support
            if let Some(window) = app.get_webview_window("main") {
                // Apply macOS vibrancy effect
                #[cfg(target_os = "macos")]
                {
                    use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};
                    let _ = apply_vibrancy(&window, NSVisualEffectMaterial::HudWindow, None, Some(16.0));

                    // Convert window to NSPanel for fullscreen support
                    // This is required after macOS Big Sur to show above fullscreen apps
                    let handle = window.app_handle().clone();

                    // Create a panel delegate to handle window events
                    let panel_delegate = panel_delegate!(MenubarPanelDelegate {
                        window_did_resign_key
                    });

                    let handle_clone = handle.clone();
                    panel_delegate.set_listener(Box::new(move |delegate_name: String| {
                        if delegate_name.as_str() == "window_did_resign_key" {
                            // Hide panel when it loses focus
                            if let Ok(panel) = handle_clone.get_webview_panel("main") {
                                panel.order_out(None);
                            }
                        }
                    }));

                    // Convert window to panel
                    let panel = window.to_panel().unwrap();

                    // Set window level above menubar
                    panel.set_level(NSMainMenuWindowLevel + 1);

                    // Set collection behavior to work with all spaces and fullscreen
                    panel.set_collection_behaviour(
                        NSWindowCollectionBehavior::NSWindowCollectionBehaviorCanJoinAllSpaces
                        | NSWindowCollectionBehavior::NSWindowCollectionBehaviorStationary
                        | NSWindowCollectionBehavior::NSWindowCollectionBehaviorFullScreenAuxiliary,
                    );

                    // Set non-activating panel style so it doesn't steal focus from fullscreen apps
                    panel.set_style_mask(NSWindowStyleMaskNonActivatingPanel);

                    // Assign the delegate
                    panel.set_delegate(panel_delegate);
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Auth commands (legacy)
            save_token,
            get_stored_token,
            validate_stored_token,
            delete_token,
            open_vercel_tokens,
            // Multi-account commands
            add_account,
            add_railway_account,
            list_accounts,
            get_account_token,
            remove_account,
            rename_account,
            get_active_account,
            set_active_account,
            get_current_account,
            open_railway_tokens,
            // Vercel deployment commands
            list_projects,
            list_deployments,
            get_deployment,
            // Unified deployments (all providers)
            list_all_deployments,
            update_tray_status,
            send_deployment_notification,
            // Railway deployment commands
            railway_verify_token,
            railway_list_projects,
            railway_list_deployments,
            railway_get_deployment,
            // Log commands
            stream_deployment_logs,
            fetch_deployment_logs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
