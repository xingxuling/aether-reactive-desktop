import type { AetherState } from "../types";
import { migrateAetherState } from "../state/state";

export const LOCAL_STATE_KEY = "aether-desktop-toys/state-v1";

export function encodeState(state: AetherState): string {
  return JSON.stringify({ ...state, schemaVersion: 1 });
}

export function decodeState(raw: string | null): AetherState | null {
  if (!raw) return null;
  try {
    return migrateAetherState(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveBrowserState(state: AetherState): boolean {
  try {
    localStorage.setItem(LOCAL_STATE_KEY, encodeState(state));
    return true;
  } catch {
    return false;
  }
}

export function loadBrowserState(): AetherState | null {
  try {
    return decodeState(localStorage.getItem(LOCAL_STATE_KEY));
  } catch {
    return null;
  }
}
