use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, Runtime, PhysicalPosition, PhysicalSize, AppHandle,
};

#[cfg(target_os = "macos")]
use tauri_nspanel::ManagerExt;

pub fn setup_tray<R: Runtime>(app: &tauri::App<R>) -> Result<(), Box<dyn std::error::Error>> {
    // Include the tray icon at compile time
    let icon_bytes = include_bytes!("../icons/tray.png");
    let icon = tauri::image::Image::from_bytes(icon_bytes)
        .unwrap_or_else(|_| app.default_window_icon().unwrap().clone());

    // Create menu with Quit option
    let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&quit_item])?;

    let _tray = TrayIconBuilder::with_id("main")
        .icon(icon)
        .icon_as_template(true)
        .tooltip("Deployment")
        .menu(&menu)
        .menu_on_left_click(false)
        .on_menu_event(|app, event| {
            if event.id.as_ref() == "quit" {
                app.exit(0);
            }
        })
        .on_tray_icon_event(|tray, event| {
            // Only handle left click release
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();

                #[cfg(target_os = "macos")]
                {
                    // Use NSPanel API on macOS for fullscreen support
                    if let Ok(panel) = app.get_webview_panel("main") {
                        if panel.is_visible() {
                            panel.order_out(None);
                        } else {
                            // Position panel near tray icon
                            if let Ok(Some(rect)) = tray.rect() {
                                let window_width: f64 = 380.0;

                                // Extract position from Rect
                                let (pos_x, pos_y) = match rect.position {
                                    tauri::Position::Physical(PhysicalPosition { x, y }) => (x as f64, y as f64),
                                    tauri::Position::Logical(pos) => (pos.x, pos.y),
                                };

                                // Extract size from Rect
                                let (size_w, size_h) = match rect.size {
                                    tauri::Size::Physical(PhysicalSize { width, height }) => (width as f64, height as f64),
                                    tauri::Size::Logical(size) => (size.width, size.height),
                                };

                                // Get screen size to ensure window stays on screen
                                let mut x = pos_x - (window_width / 2.0) + (size_w / 2.0);
                                let y = pos_y + size_h + 4.0;

                                // Keep window on screen (basic bounds check)
                                if x < 10.0 {
                                    x = 10.0;
                                }
                                // For right edge, we'd need screen width - approximate for now
                                if x + window_width > 1400.0 {
                                    x = pos_x - window_width + size_w;
                                }

                                // Set position using window handle
                                if let Some(window) = app.get_webview_window("main") {
                                    let _ = window.set_position(tauri::Position::Physical(
                                        PhysicalPosition::new(x as i32, y as i32),
                                    ));
                                }
                            }

                            // Show panel and make it key window
                            panel.show();
                        }
                    }
                }

                #[cfg(not(target_os = "macos"))]
                {
                    // Non-macOS fallback using regular window API
                    if let Some(window) = app.get_webview_window("main") {
                        if window.is_visible().unwrap_or(false) {
                            let _ = window.hide();
                        } else {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                }
            }
        })
        .build(app)?;

    Ok(())
}

/// Set tray icon to "deploying" state
pub fn set_tray_building<R: Runtime>(app: &AppHandle<R>, _project_name: Option<&str>) {
    if let Some(tray) = app.tray_by_id("main") {
        let _ = tray.set_title(Some("Deploying..."));
    }
}

/// Set tray icon to normal state
pub fn set_tray_normal<R: Runtime>(app: &AppHandle<R>) {
    if let Some(tray) = app.tray_by_id("main") {
        // Use empty string to clear title - None might not work on macOS
        let _ = tray.set_title(Some(""));
        let _ = tray.set_tooltip(Some("Deployments"));
    }
}
