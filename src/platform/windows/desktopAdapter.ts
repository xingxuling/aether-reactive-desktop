import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { AudioReactiveState, ReactiveDesktopState } from "../../core/reactive-state/types";
import type { DesktopHostReport, MediaSessionReport, NativeForegroundWindow, SystemAudioReport } from "./types";

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function discoverDesktopHost(): Promise<DesktopHostReport> {
  if (!isTauriRuntime()) return browserDesktopHostReport();
  return invoke<DesktopHostReport>("discover_desktop_host");
}

export async function enableWallpaper(): Promise<DesktopHostReport> {
  if (!isTauriRuntime()) return browserDesktopHostReport();
  return invoke<DesktopHostReport>("enable_wallpaper");
}

export async function disableWallpaper(): Promise<void> {
  if (!isTauriRuntime()) return;
  await invoke("disable_wallpaper");
}

export async function startSystemAudio(): Promise<SystemAudioReport> {
  if (!isTauriRuntime()) return { status: "candidate", available: false, endpoint: null, sampleRate: null, channels: null, capturedFrames: 0, nonZeroFrames: 0, message: "浏览器预览没有 WASAPI；使用 Demo Pulse。", checkedAt: new Date().toISOString() };
  return invoke<SystemAudioReport>("start_system_audio");
}

export async function stopSystemAudio(): Promise<SystemAudioReport | null> {
  if (!isTauriRuntime()) return null;
  return invoke<SystemAudioReport>("stop_system_audio");
}

export async function getForegroundWindow(): Promise<NativeForegroundWindow> {
  if (!isTauriRuntime()) {
    return { available: false, error: "浏览器预览没有 Windows Foreground Window Provider。", hwnd: null, bounds: null, processId: null, processName: null, title: null, monitorId: null, isMaximized: false, isMinimized: false, isLikelyFullscreen: false, updatedAt: new Date().toISOString() };
  }
  return invoke<NativeForegroundWindow>("get_foreground_window_state");
}

export async function getMediaSessionReport(): Promise<MediaSessionReport> {
  if (!isTauriRuntime()) return { status: "blocked", provider: "GSMTC", message: "浏览器预览没有全局媒体会话 Provider；继续使用 Generic Cover。", checkedAt: new Date().toISOString() };
  return invoke<MediaSessionReport>("get_media_session_report");
}

export async function setLaunchOnLogin(enabled: boolean): Promise<boolean> {
  if (!isTauriRuntime()) return false;
  return invoke<boolean>("set_launch_on_login", { enabled });
}

export async function broadcastReactiveState(state: ReactiveDesktopState): Promise<void> {
  if (!isTauriRuntime()) return;
  await invoke("broadcast_reactive_state", { state });
}

export async function loadReactiveState(): Promise<ReactiveDesktopState | null> {
  if (!isTauriRuntime()) {
    try {
      const raw = localStorage.getItem("aether-reactive-desktop/state-v2");
      return raw ? JSON.parse(raw) as ReactiveDesktopState : null;
    } catch {
      return null;
    }
  }
  try {
    const raw = await invoke<string | null>("load_app_state");
    return raw ? JSON.parse(raw) as ReactiveDesktopState : null;
  } catch {
    return null;
  }
}

export async function saveReactiveState(state: ReactiveDesktopState): Promise<boolean> {
  try {
    const encoded = JSON.stringify({ ...state, schemaVersion: 2, lastPersistedAt: new Date().toISOString() });
    if (!isTauriRuntime()) {
      localStorage.setItem("aether-reactive-desktop/state-v2", encoded);
      return true;
    }
    await invoke("save_app_state", { stateJson: encoded });
    return true;
  } catch {
    return false;
  }
}

export async function listenToReactiveAudio(handler: (state: AudioReactiveState) => void): Promise<() => void> {
  if (!isTauriRuntime()) return () => undefined;
  return listen<AudioReactiveState>("aether:audio-reactive", (event) => handler(event.payload));
}

export async function listenToReactiveState(handler: (state: ReactiveDesktopState) => void): Promise<() => void> {
  if (!isTauriRuntime()) return () => undefined;
  return listen<ReactiveDesktopState>("aether:reactive-state", (event) => handler(event.payload));
}

export async function listenToNavigation(handler: (route: string) => void): Promise<() => void> {
  if (!isTauriRuntime()) return () => undefined;
  return listen<string>("aether:navigate", (event) => handler(event.payload));
}

export async function listenToPause(handler: (paused: boolean) => void): Promise<() => void> {
  if (!isTauriRuntime()) return () => undefined;
  return listen<boolean>("aether:pause", (event) => handler(event.payload));
}

function browserDesktopHostReport(): DesktopHostReport {
  return {
    status: "blocked",
    progman: null,
    shellDefView: null,
    workerW: null,
    hostFound: false,
    display: { monitorCount: 1, dpiScale: typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, virtualBounds: null },
    strategy: "Progman → WorkerW → SHELLDLL_DefView",
    evidence: "浏览器预览不执行 Windows 桌面挂载。",
    checkedAt: new Date().toISOString(),
  };
}
