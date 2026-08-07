use serde::Serialize;
use windows::core::PCWSTR;
use windows::Win32::Foundation::{HWND, LPARAM, RECT, WPARAM};
use windows::Win32::UI::WindowsAndMessaging::{
    FindWindowExW, FindWindowW, GetSystemMetrics, GetWindowLongPtrW, IsWindow, SendMessageTimeoutW,
    SetParent, SetWindowLongPtrW, SetWindowPos, ShowWindow, GWL_EXSTYLE, GWL_STYLE, HWND_BOTTOM,
    SMTO_NORMAL, SM_CMONITORS, SM_CXVIRTUALSCREEN, SM_CYVIRTUALSCREEN, SM_XVIRTUALSCREEN,
    SM_YVIRTUALSCREEN, SWP_FRAMECHANGED, SWP_NOACTIVATE, SWP_SHOWWINDOW, SW_SHOWNA, WS_CHILD,
    WS_EX_NOACTIVATE, WS_EX_TOOLWINDOW, WS_POPUP,
};

const DESKTOP_MESSAGE: u32 = 0x052C;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DisplayGeometry {
    pub monitor_count: i32,
    pub dpi_scale: f64,
    pub virtual_bounds: Option<DesktopRect>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopRect {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopHostReport {
    pub status: String,
    pub progman: Option<isize>,
    pub shell_def_view: Option<isize>,
    pub worker_w: Option<isize>,
    pub host_found: bool,
    pub display: DisplayGeometry,
    pub strategy: String,
    pub evidence: String,
    pub checked_at: String,
}

pub fn discover_desktop_host(checked_at: String) -> DesktopHostReport {
    let display = display_geometry();
    let class_progman = wide("Progman");
    let class_def_view = wide("SHELLDLL_DefView");
    let class_worker = wide("WorkerW");
    let progman = unsafe { FindWindowW(PCWSTR(class_progman.as_ptr()), PCWSTR::null()) }.ok();
    let mut shell_def_view = None;
    let mut worker_w = None;

    if let Some(progman_hwnd) = progman {
        let _ = unsafe {
            SendMessageTimeoutW(
                progman_hwnd,
                DESKTOP_MESSAGE,
                WPARAM(0),
                LPARAM(0),
                SMTO_NORMAL,
                1000,
                None,
            )
        };
        shell_def_view = unsafe {
            FindWindowExW(
                Some(progman_hwnd),
                None,
                PCWSTR(class_def_view.as_ptr()),
                PCWSTR::null(),
            )
        }
        .ok();

        let mut after = None;
        loop {
            let candidate = unsafe {
                FindWindowExW(None, after, PCWSTR(class_worker.as_ptr()), PCWSTR::null())
            }
            .ok();
            let Some(candidate) = candidate else { break };
            let has_icons = unsafe {
                FindWindowExW(
                    Some(candidate),
                    None,
                    PCWSTR(class_def_view.as_ptr()),
                    PCWSTR::null(),
                )
            }
            .is_ok();
            if !has_icons {
                worker_w = Some(candidate);
                break;
            }
            after = Some(candidate);
        }
    }

    let host_found = progman.is_some() && worker_w.is_some();
    DesktopHostReport {
        status: if host_found { "candidate" } else { "blocked" }.to_string(),
        progman: progman.map(hwnd_value),
        shell_def_view: shell_def_view.map(hwnd_value),
        worker_w: worker_w.map(hwnd_value),
        host_found,
        display,
        strategy: "Progman → WorkerW → SHELLDLL_DefView".to_string(),
        evidence: if host_found {
            "WorkerW candidate discovered. Hard A–J Windows integration evidence is still required before TRUE_WALLPAPER_VERIFIED.".to_string()
        } else {
            "Progman/WorkerW host was not discovered in this Windows session; no fake fullscreen fallback is used.".to_string()
        },
        checked_at,
    }
}

pub fn attach_window(hwnd: HWND, host: HWND, geometry: &DisplayGeometry) -> Result<(), String> {
    if !unsafe { IsWindow(Some(host)) }.as_bool() {
        return Err("WorkerW host is no longer a live window".to_string());
    }
    let bounds = geometry
        .virtual_bounds
        .as_ref()
        .ok_or_else(|| "virtual desktop geometry is unavailable".to_string())?;
    let style = unsafe { GetWindowLongPtrW(hwnd, GWL_STYLE) as u32 };
    let child_style = (style | WS_CHILD.0) & !WS_POPUP.0;
    unsafe { SetWindowLongPtrW(hwnd, GWL_STYLE, child_style as isize) };
    let extended_style = unsafe { GetWindowLongPtrW(hwnd, GWL_EXSTYLE) as u32 };
    let extended_style = extended_style | WS_EX_NOACTIVATE.0 | WS_EX_TOOLWINDOW.0;
    unsafe { SetWindowLongPtrW(hwnd, GWL_EXSTYLE, extended_style as isize) };
    unsafe { SetParent(hwnd, Some(host)) }
        .map_err(|error| format!("SetParent(WorkerW): {error}"))?;
    unsafe {
        SetWindowPos(
            hwnd,
            Some(HWND_BOTTOM),
            0,
            0,
            bounds.width,
            bounds.height,
            SWP_NOACTIVATE | SWP_SHOWWINDOW | SWP_FRAMECHANGED,
        )
    }
    .map_err(|error| format!("SetWindowPos(WorkerW): {error}"))?;
    unsafe {
        let _ = ShowWindow(hwnd, SW_SHOWNA);
    }
    Ok(())
}

pub fn detach_window(hwnd: HWND) -> Result<(), String> {
    unsafe { SetParent(hwnd, None) }.map_err(|error| format!("SetParent(Desktop): {error}"))?;
    unsafe {
        let _ = ShowWindow(hwnd, windows::Win32::UI::WindowsAndMessaging::SW_HIDE);
    }
    Ok(())
}

pub fn display_geometry() -> DisplayGeometry {
    let x = unsafe { GetSystemMetrics(SM_XVIRTUALSCREEN) };
    let y = unsafe { GetSystemMetrics(SM_YVIRTUALSCREEN) };
    let width = unsafe { GetSystemMetrics(SM_CXVIRTUALSCREEN) };
    let height = unsafe { GetSystemMetrics(SM_CYVIRTUALSCREEN) };
    DisplayGeometry {
        monitor_count: unsafe { GetSystemMetrics(SM_CMONITORS) },
        dpi_scale: 1.0,
        virtual_bounds: (width > 0 && height > 0).then_some(DesktopRect {
            x,
            y,
            width,
            height,
        }),
    }
}

fn hwnd_value(hwnd: HWND) -> isize {
    hwnd.0 as isize
}

fn wide(value: &str) -> Vec<u16> {
    value.encode_utf16().chain(std::iter::once(0)).collect()
}

#[allow(dead_code)]
fn rect_geometry(rect: RECT) -> DesktopRect {
    DesktopRect {
        x: rect.left,
        y: rect.top,
        width: rect.right - rect.left,
        height: rect.bottom - rect.top,
    }
}
