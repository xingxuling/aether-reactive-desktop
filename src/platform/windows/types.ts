import type { ForegroundWindowState, WindowBounds } from "../../core/reactive-state/types";

export interface DesktopHostReport {
  status: "candidate" | "blocked" | "attached" | "recovery-needed";
  progman: number | null;
  shellDefView: number | null;
  workerW: number | null;
  hostFound: boolean;
  display: { monitorCount: number; dpiScale: number; virtualBounds: WindowBounds | null };
  strategy: string;
  evidence: string;
  checkedAt: string;
}

export interface SystemAudioReport {
  status: "candidate" | "blocked" | "running" | "stopped" | "error";
  available: boolean;
  endpoint: string | null;
  sampleRate: number | null;
  channels: number | null;
  capturedFrames: number;
  nonZeroFrames: number;
  message: string;
  checkedAt: string;
}

export interface NativeForegroundWindow extends Omit<ForegroundWindowState, "tracking"> {
  available: boolean;
  error: string | null;
}

export interface MediaSessionReport {
  status: "candidate" | "blocked" | "partial";
  provider: string;
  message: string;
  checkedAt: string;
}
