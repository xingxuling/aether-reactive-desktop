import type { ForegroundWindowState } from "../../core/reactive-state/types";

export interface NativeForegroundWindowSnapshot extends Omit<ForegroundWindowState, "tracking"> {
  available: boolean;
  error?: string | null;
}

export function toForegroundWindowState(snapshot: NativeForegroundWindowSnapshot, now = new Date()): ForegroundWindowState {
  return {
    ...snapshot,
    tracking: snapshot.available ? "live" : "unavailable",
    updatedAt: now.toISOString(),
  };
}
