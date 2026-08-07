export type ReactiveSceneId =
  | "blue-hour"
  | "deep-sky"
  | "white-silence"
  | "gold-pulse"
  | "album-immersion";

export type ReactiveAudioMode = "system" | "local" | "silent";
export type ReactiveIntensity = "off" | "subtle" | "normal" | "strong";
export type ReactiveMotion = "slow" | "balanced" | "dynamic";
export type PerformanceProfile = "quality" | "balanced" | "eco";
export type AudioReactiveSource = "system-loopback" | "local-file" | "demo" | "none";

export interface AudioReactiveState {
  volume: number;
  smoothedVolume: number;
  bass: number;
  mid: number;
  treble: number;
  spectralFlux: number;
  onset: number;
  beatCandidate: boolean;
  energy: number;
  energyDelta: number;
  frequencyBins: number[];
  silence: boolean;
  audioActive: boolean;
  source: AudioReactiveSource;
  captureLatencyMs: number | null;
  dspLatencyMs: number | null;
  renderLatencyMs: number | null;
  totalVisualResponseLatencyMs: number | null;
  trackName: string | null;
  updatedAt: string;
}

export interface MediaState {
  provider: "gsmTC" | "local-file" | "none";
  availability: "available" | "partial" | "unavailable";
  title: string | null;
  artist: string | null;
  album: string | null;
  albumArtUrl: string | null;
  playbackStatus: "playing" | "paused" | "stopped" | "unknown";
  updatedAt: string;
}

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ForegroundWindowState {
  hwnd: number | null;
  bounds: WindowBounds | null;
  processId: number | null;
  processName: string | null;
  title: string | null;
  monitorId: string | null;
  isMaximized: boolean;
  isMinimized: boolean;
  isLikelyFullscreen: boolean;
  tracking: "live" | "unavailable" | "blocked";
  updatedAt: string;
}

export interface PointerState {
  x: number;
  y: number;
  screenId: string | null;
  active: boolean;
  updatedAt: string;
}

export interface TimeReactiveState {
  iso: string;
  hour: number;
  minute: number;
  phase: "dawn" | "day" | "dusk" | "night";
  dayProgress: number;
}

export interface PerformanceTelemetry {
  fps: number;
  frameTimeMs: number;
  memoryMb: number | null;
  cpuApproxPercent: number | null;
  renderWorkload: number;
  audioProcessingWorkload: number;
  profile: PerformanceProfile;
  documentVisible: boolean;
  sampleCount: number;
  updatedAt: string;
}

export interface SceneState {
  activeSceneId: ReactiveSceneId;
  previewSceneId: ReactiveSceneId | null;
  intensity: ReactiveIntensity;
  auraIntensity: ReactiveIntensity;
  motion: ReactiveMotion;
  audioMode: ReactiveAudioMode;
  audioReactiveEnabled: boolean;
  wallpaperEnabled: boolean;
  auraEnabled: boolean;
  albumCoverMode: "procedural" | "metadata" | "generic";
  paused: boolean;
}

export interface DisplayState {
  monitorCount: number;
  dpiScale: number;
  virtualBounds: WindowBounds | null;
  wallpaperHostStatus: "not-requested" | "candidate" | "attached" | "blocked" | "recovery-needed";
  wallpaperHost: string | null;
  lastHostCheckAt: string | null;
}

export interface ReactiveDesktopState {
  schemaVersion: number;
  timeState: TimeReactiveState;
  audioState: AudioReactiveState;
  mediaState: MediaState;
  foregroundWindowState: ForegroundWindowState;
  pointerState: PointerState;
  performanceState: PerformanceTelemetry;
  sceneState: SceneState;
  displayState: DisplayState;
  firstRunCompleted: boolean;
  startupEnabled: boolean;
  lastPersistedAt: string | null;
}

export type ReactiveStateEvent =
  | { type: "time:update"; payload: TimeReactiveState }
  | { type: "audio:update"; payload: AudioReactiveState }
  | { type: "media:update"; payload: MediaState }
  | { type: "foreground-window:update"; payload: ForegroundWindowState }
  | { type: "pointer:update"; payload: PointerState }
  | { type: "performance:update"; payload: Partial<PerformanceTelemetry> }
  | { type: "scene:update"; payload: Partial<SceneState> }
  | { type: "display:update"; payload: Partial<DisplayState> }
  | { type: "first-run:complete" }
  | { type: "startup:update"; payload: boolean }
  | { type: "reset" };
