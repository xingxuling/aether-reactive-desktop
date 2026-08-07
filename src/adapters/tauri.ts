import { invoke } from "@tauri-apps/api/core";
import { listen, emit } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import type { AetherState, ProjectSnapshot } from "../core/types";
import { decodeState, encodeState, loadBrowserState, saveBrowserState } from "../core/persistence/persistence";

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function pickProjectDirectory(): Promise<string | null> {
  if (!isTauriRuntime()) return null;
  const selected = await open({ directory: true, multiple: false, title: "选择一个 Git 项目" });
  return typeof selected === "string" ? selected : null;
}

export async function readProjectState(path: string): Promise<ProjectSnapshot> {
  if (!isTauriRuntime()) throw new Error("项目读取需要通过 Tauri 桌面端运行。");
  return invoke<ProjectSnapshot>("read_project_state", { path });
}

export async function saveAetherState(state: AetherState): Promise<boolean> {
  const encoded = encodeState(state);
  if (!isTauriRuntime()) return saveBrowserState(state);
  try {
    await invoke("save_app_state", { stateJson: encoded });
    return true;
  } catch {
    return false;
  }
}

export async function loadAetherState(): Promise<AetherState | null> {
  if (!isTauriRuntime()) return loadBrowserState();
  try {
    const raw = await invoke<string | null>("load_app_state");
    return decodeState(raw);
  } catch {
    return null;
  }
}

export async function openTreeSpiritWindow(alwaysOnTop = true): Promise<void> {
  if (!isTauriRuntime()) return;
  await invoke("open_tree_spirit_window", { alwaysOnTop });
}

export async function setTreeSpiritAlwaysOnTop(alwaysOnTop: boolean): Promise<void> {
  if (!isTauriRuntime()) return;
  await invoke("set_tree_spirit_always_on_top", { alwaysOnTop });
}

export async function startCurrentWindowDragging(): Promise<void> {
  if (!isTauriRuntime()) return;
  await getCurrentWindow().startDragging();
}

export async function broadcastState(state: AetherState): Promise<void> {
  if (isTauriRuntime()) await emit("aether:state", state);
}

export async function listenToState(handler: (state: AetherState) => void): Promise<() => void> {
  if (!isTauriRuntime()) return () => undefined;
  const unlisten = await listen<AetherState>("aether:state", (event) => handler(event.payload));
  return unlisten;
}

export async function listenToNavigation(handler: (toy: string) => void): Promise<() => void> {
  if (!isTauriRuntime()) return () => undefined;
  const unlisten = await listen<string>("aether:navigate", (event) => handler(event.payload));
  return unlisten;
}

export async function listenToPause(handler: (paused: boolean) => void): Promise<() => void> {
  if (!isTauriRuntime()) return () => undefined;
  const unlisten = await listen<boolean>("aether:pause", (event) => handler(event.payload));
  return unlisten;
}
