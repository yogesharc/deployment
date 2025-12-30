mod commands;
mod railway;
mod state;
mod tray;
mod vercel;

use commands::*;
use state::AppState;
use tauri::Manager;

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
