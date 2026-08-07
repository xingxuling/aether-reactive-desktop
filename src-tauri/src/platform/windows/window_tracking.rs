use serde::Serialize;
use windows::Win32::Foundation::HWND;
use windows::Win32::UI::WindowsAndMessaging::{
    GetForegroundWindow, GetWindowRect, GetWindowTextW, GetWindowThreadProcessId, IsIconic,
    IsZoomed,
};

use super::wallpaper::display_geometry;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowBounds {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ForegroundWindowSnapshot {
    pub available: bool,
    pub error: Option<String>,
    pub hwnd: Option<isize>,
    pub bounds: Option<WindowBounds>,
    pub process_id: Option<u32>,
    pub process_name: Option<String>,
    pub title: Option<String>,
    pub monitor_id: Option<String>,
    pub is_maximized: bool,
    pub is_minimized: bool,
    pub is_likely_fullscreen: bool,
    pub updated_at: String,
}

pub fn foreground_window_state(updated_at: String) -> ForegroundWindowSnapshot {
    let hwnd = unsafe { GetForegroundWindow() };
    if hwnd.0.is_null() {
        return ForegroundWindowSnapshot {
            available: false,
            error: Some("Windows 没有报告当前前台窗口。".to_string()),
            hwnd: None,
            bounds: None,
            process_id: None,
            process_name: None,
            title: None,
            monitor_id: None,
            is_maximized: false,
            is_minimized: false,
            is_likely_fullscreen: false,
            updated_at,
        };
    }
    let mut rect = windows::Win32::Foundation::RECT::default();
    let bounds = unsafe { GetWindowRect(hwnd, &mut rect) }
        .ok()
        .map(|_| WindowBounds {
            x: rect.left,
            y: rect.top,
            width: rect.right - rect.left,
            height: rect.bottom - rect.top,
        });
    let mut process_id = 0u32;
    unsafe { GetWindowThreadProcessId(hwnd, Some(&mut process_id)) };
    let title = read_window_text(hwnd);
    let display = display_geometry();
    let fullscreen = match (&bounds, &display.virtual_bounds) {
        (Some(window), Some(desktop)) => {
            window.width >= desktop.width && window.height >= desktop.height
        }
        _ => false,
    };
    ForegroundWindowSnapshot {
        available: true,
        error: None,
        hwnd: Some(hwnd.0 as isize),
        bounds,
        process_id: Some(process_id),
        process_name: Some(format!("pid:{process_id}")),
        title,
        monitor_id: Some("virtual-desktop".to_string()),
        is_maximized: unsafe { IsZoomed(hwnd) }.as_bool(),
        is_minimized: unsafe { IsIconic(hwnd) }.as_bool(),
        is_likely_fullscreen: fullscreen,
        updated_at,
    }
}

fn read_window_text(hwnd: HWND) -> Option<String> {
    let mut buffer = [0u16; 256];
    let length = unsafe { GetWindowTextW(hwnd, &mut buffer) };
    if length <= 0 {
        return None;
    }
    let text = String::from_utf16_lossy(&buffer[..length as usize])
        .trim()
        .to_string();
    (!text.is_empty()).then_some(text.chars().take(96).collect())
}
