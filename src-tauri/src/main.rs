#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod platform;

use platform::windows::{audio_loopback, media_session, startup, wallpaper, window_tracking};
use serde::Serialize;
use serde_json::Value;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindowBuilder, WindowEvent};

#[derive(Default)]
struct WallpaperController {
    window_hwnd: Mutex<Option<isize>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProjectSnapshot {
    path: String,
    branch: String,
    is_git: bool,
    is_dirty: bool,
    commit_count: u64,
    latest_commit: Option<String>,
    latest_commit_at: Option<String>,
    changed_files: usize,
    file_count: usize,
    code_directories: Vec<String>,
    read_at: String,
    source: String,
    error: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SaveReceipt {
    path: String,
    backup_path: String,
    saved_at: String,
}

fn now_label() -> String {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs().to_string())
        .unwrap_or_else(|_| "0".to_string())
}

fn run_git(path: &Path, args: &[&str]) -> Result<String, String> {
    let output = Command::new("git")
        .arg("-C")
        .arg(path)
        .args(args)
        .output()
        .map_err(|error| format!("无法启动 git：{error}"))?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn count_files(path: &Path) -> usize {
    let mut total = 0;
    let entries = match fs::read_dir(path) {
        Ok(entries) => entries,
        Err(_) => return 0,
    };
    for entry in entries.flatten() {
        let entry_path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        if entry_path.is_dir() {
            if matches!(
                name.as_str(),
                ".git" | "node_modules" | "target" | "dist" | "build"
            ) {
                continue;
            }
            total += count_files(&entry_path);
        } else if entry_path.is_file() {
            total += 1;
        }
    }
    total
}

fn code_directories(path: &Path) -> Vec<String> {
    let mut directories = fs::read_dir(path)
        .ok()
        .into_iter()
        .flatten()
        .flatten()
        .filter_map(|entry| {
            let entry_path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();
            if !entry_path.is_dir()
                || name.starts_with('.')
                || matches!(name.as_str(), "node_modules" | "target" | "dist" | "build")
            {
                None
            } else {
                Some(name)
            }
        })
        .collect::<Vec<_>>();
    directories.sort();
    directories.truncate(12);
    directories
}

#[tauri::command]
fn read_project_state(path: String) -> Result<ProjectSnapshot, String> {
    let project_path = PathBuf::from(&path);
    if !project_path.is_dir() {
        return Err("选择的路径不是目录。".to_string());
    }
    if run_git(&project_path, &["rev-parse", "--is-inside-work-tree"]).is_err() {
        return Ok(ProjectSnapshot {
            path,
            branch: "—".to_string(),
            is_git: false,
            is_dirty: false,
            commit_count: 0,
            latest_commit: None,
            latest_commit_at: None,
            changed_files: 0,
            file_count: count_files(&project_path),
            code_directories: code_directories(&project_path),
            read_at: now_label(),
            source: "live".to_string(),
            error: Some("这里还没有 Git 工作树。".to_string()),
        });
    }

    let branch = run_git(&project_path, &["branch", "--show-current"])
        .unwrap_or_else(|_| "detached".to_string());
    let commit_count = run_git(&project_path, &["rev-list", "--count", "HEAD"])
        .ok()
        .and_then(|value| value.parse::<u64>().ok())
        .unwrap_or(0);
    let latest = run_git(&project_path, &["log", "-1", "--format=%H%x1f%aI"]).ok();
    let (latest_commit, latest_commit_at) = latest
        .as_deref()
        .and_then(|value| value.split_once('\u{1f}'))
        .map(|(commit, date)| (Some(commit.to_string()), Some(date.to_string())))
        .unwrap_or((None, None));
    let changed_files = run_git(
        &project_path,
        &["status", "--porcelain", "--untracked-files=normal"],
    )
    .map(|value| value.lines().filter(|line| !line.trim().is_empty()).count())
    .unwrap_or(0);

    Ok(ProjectSnapshot {
        path,
        branch,
        is_git: true,
        is_dirty: changed_files > 0,
        commit_count,
        latest_commit,
        latest_commit_at,
        changed_files,
        file_count: count_files(&project_path),
        code_directories: code_directories(&project_path),
        read_at: now_label(),
        source: "live".to_string(),
        error: None,
    })
}

fn state_paths(app: &AppHandle) -> Result<(PathBuf, PathBuf, PathBuf), String> {
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    Ok((
        directory.join("state.json"),
        directory.join("state.json.bak"),
        directory.join("state.json.next"),
    ))
}

fn replace_atomically(source: &Path, destination: &Path) -> Result<(), String> {
    #[cfg(windows)]
    {
        use std::os::windows::ffi::OsStrExt;
        use windows_sys::Win32::Storage::FileSystem::{
            MoveFileExW, MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH,
        };
        let source_wide = source
            .as_os_str()
            .encode_wide()
            .chain(std::iter::once(0))
            .collect::<Vec<_>>();
        let destination_wide = destination
            .as_os_str()
            .encode_wide()
            .chain(std::iter::once(0))
            .collect::<Vec<_>>();
        let result = unsafe {
            MoveFileExW(
                source_wide.as_ptr(),
                destination_wide.as_ptr(),
                MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
            )
        };
        if result == 0 {
            return Err(std::io::Error::last_os_error().to_string());
        }
        Ok(())
    }
    #[cfg(not(windows))]
    {
        fs::rename(source, destination).map_err(|error| error.to_string())
    }
}

#[tauri::command(rename_all = "camelCase")]
fn save_app_state(app: AppHandle, state_json: String) -> Result<SaveReceipt, String> {
    let value: Value =
        serde_json::from_str(&state_json).map_err(|error| format!("状态不是有效 JSON：{error}"))?;
    let schema_version = value
        .get("schemaVersion")
        .and_then(Value::as_u64)
        .unwrap_or(0);
    if schema_version == 0 {
        return Err("状态缺少 schemaVersion。".to_string());
    }
    let (destination, backup, next) = state_paths(&app)?;
    if destination.exists() {
        fs::copy(&destination, &backup).map_err(|error| format!("无法创建状态备份：{error}"))?;
    }
    let mut file = fs::File::create(&next).map_err(|error| error.to_string())?;
    file.write_all(state_json.as_bytes())
        .map_err(|error| error.to_string())?;
    file.sync_all().map_err(|error| error.to_string())?;
    replace_atomically(&next, &destination)?;
    Ok(SaveReceipt {
        path: destination.display().to_string(),
        backup_path: backup.display().to_string(),
        saved_at: now_label(),
    })
}

#[tauri::command]
fn load_app_state(app: AppHandle) -> Result<Option<String>, String> {
    let (destination, backup, _) = state_paths(&app)?;
    for path in [destination, backup] {
        if let Ok(contents) = fs::read_to_string(path) {
            if serde_json::from_str::<Value>(&contents).is_ok() {
                return Ok(Some(contents));
            }
        }
    }
    Ok(None)
}

#[tauri::command]
fn discover_desktop_host() -> wallpaper::DesktopHostReport {
    wallpaper::discover_desktop_host(now_label())
}

#[tauri::command]
async fn enable_wallpaper(
    app: AppHandle,
    controller: State<'_, WallpaperController>,
) -> Result<wallpaper::DesktopHostReport, String> {
    let mut report = wallpaper::discover_desktop_host(now_label());
    let Some(worker_value) = report.worker_w else {
        return Ok(report);
    };
    let window = if let Some(existing) = app.get_webview_window("wallpaper") {
        existing
    } else {
        WebviewWindowBuilder::new(
            &app,
            "wallpaper",
            WebviewUrl::App("index.html?wallpaper=1".into()),
        )
        .title("Aether Reactive Desktop Wallpaper")
        .inner_size(1920.0, 1080.0)
        .decorations(false)
        .resizable(false)
        .visible(false)
        .focused(false)
        .skip_taskbar(true)
        .build()
        .map_err(|error| error.to_string())?
    };
    let native_hwnd = window.hwnd().map_err(|error| error.to_string())?;
    let worker_hwnd = windows::Win32::Foundation::HWND(worker_value as *mut core::ffi::c_void);
    wallpaper::attach_window(native_hwnd, worker_hwnd, &report.display)?;
    window
        .set_focusable(false)
        .map_err(|error| error.to_string())?;
    window.show().map_err(|error| error.to_string())?;
    if let Ok(mut current) = controller.window_hwnd.lock() {
        *current = Some(native_hwnd.0 as isize);
    }
    report.evidence = "Aether webview was parented to the discovered WorkerW candidate. Hard acceptance A–J and Explorer-restart recovery are still required; this is not TRUE_WALLPAPER_VERIFIED.".to_string();
    Ok(report)
}

#[tauri::command]
fn disable_wallpaper(
    app: AppHandle,
    controller: State<'_, WallpaperController>,
) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("wallpaper") {
        let hwnd = window.hwnd().map_err(|error| error.to_string())?;
        wallpaper::detach_window(hwnd)?;
        window.hide().map_err(|error| error.to_string())?;
    }
    if let Ok(mut current) = controller.window_hwnd.lock() {
        *current = None;
    }
    Ok(())
}

#[tauri::command]
fn start_system_audio(
    app: AppHandle,
    controller: State<'_, audio_loopback::AudioController>,
) -> audio_loopback::SystemAudioReport {
    audio_loopback::start(app, controller)
}

#[tauri::command]
fn stop_system_audio(
    controller: State<'_, audio_loopback::AudioController>,
) -> audio_loopback::SystemAudioReport {
    audio_loopback::stop(controller.inner())
}

#[tauri::command]
fn get_foreground_window_state() -> window_tracking::ForegroundWindowSnapshot {
    window_tracking::foreground_window_state(now_label())
}

#[tauri::command]
fn get_media_session_report() -> media_session::MediaSessionReport {
    media_session::report(now_label())
}

#[tauri::command]
fn set_launch_on_login(enabled: bool) -> Result<bool, String> {
    startup::set_launch_on_login(enabled)
}

#[tauri::command]
fn broadcast_reactive_state(app: AppHandle, state: Value) -> Result<(), String> {
    app.emit("aether:reactive-state", state)
        .map_err(|error| error.to_string())
}

#[tauri::command(rename_all = "camelCase")]
fn open_tree_spirit_window(app: AppHandle, always_on_top: bool) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("tree-spirit") {
        window
            .set_always_on_top(always_on_top)
            .map_err(|error| error.to_string())?;
        window.show().map_err(|error| error.to_string())?;
        window.set_focus().map_err(|error| error.to_string())?;
        return Ok(());
    }
    WebviewWindowBuilder::new(
        &app,
        "tree-spirit",
        WebviewUrl::App("index.html?toy=tree-spirit".into()),
    )
    .title("TreeSpirit")
    .inner_size(300.0, 390.0)
    .min_inner_size(280.0, 360.0)
    .decorations(false)
    .transparent(true)
    .always_on_top(always_on_top)
    .resizable(false)
    .skip_taskbar(true)
    .center()
    .build()
    .map(|_| ())
    .map_err(|error| error.to_string())
}

#[tauri::command(rename_all = "camelCase")]
fn set_tree_spirit_always_on_top(app: AppHandle, always_on_top: bool) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("tree-spirit") {
        window
            .set_always_on_top(always_on_top)
            .map_err(|error| error.to_string())?;
    }
    Ok(())
}

fn show_main(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn create_tray(app: &tauri::App) -> tauri::Result<()> {
    let open = MenuItemBuilder::with_id("open", "Open Aether").build(app)?;
    let scenes = MenuItemBuilder::with_id("scenes", "Scenes").build(app)?;
    let music = MenuItemBuilder::with_id("music", "Music Halo · System Audio").build(app)?;
    let wallpaper = MenuItemBuilder::with_id("wallpaper", "Wallpaper").build(app)?;
    let aura = MenuItemBuilder::with_id("aura", "Window Aura").build(app)?;
    let pause = MenuItemBuilder::with_id("pause", "Pause Visuals").build(app)?;
    let audio = MenuItemBuilder::with_id("audio", "Audio Reactive ✓ On").build(app)?;
    let eco = MenuItemBuilder::with_id("eco", "Eco Mode").build(app)?;
    let settings = MenuItemBuilder::with_id("settings", "Settings").build(app)?;
    let quit = MenuItemBuilder::with_id("quit", "Quit Aether").build(app)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let menu = MenuBuilder::new(app)
        .items(&[
            &open, &scenes, &music, &wallpaper, &aura, &separator, &pause, &audio, &eco, &settings,
            &quit,
        ])
        .build()?;

    TrayIconBuilder::new()
        .menu(&menu)
        .tooltip("Aether Reactive Desktop")
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "quit" => app.exit(0),
            "open" => show_main(app),
            "pause" => {
                let _ = app.emit("aether:pause", true);
            }
            "scenes" | "music" | "wallpaper" | "aura" | "settings" => {
                show_main(app);
                let _ = app.emit("aether:navigate", event.id.as_ref().to_string());
            }
            "audio" => {
                show_main(app);
                let _ = app.emit("aether:navigate", "music");
            }
            "eco" => {
                show_main(app);
                let _ = app.emit("aether:navigate", "settings");
            }
            _ => {}
        })
        .build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(WallpaperController::default())
        .manage(audio_loopback::AudioController::default())
        .invoke_handler(tauri::generate_handler![
            read_project_state,
            save_app_state,
            load_app_state,
            discover_desktop_host,
            enable_wallpaper,
            disable_wallpaper,
            start_system_audio,
            stop_system_audio,
            get_foreground_window_state,
            get_media_session_report,
            set_launch_on_login,
            broadcast_reactive_state,
            open_tree_spirit_window,
            set_tree_spirit_always_on_top
        ])
        .setup(|app| {
            create_tray(app)?;
            if std::env::args().any(|argument| argument == "--background") {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Aether Reactive Desktop");
}

fn main() {
    run();
}
