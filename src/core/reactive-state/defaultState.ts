import type {
  AudioReactiveState,
  DisplayState,
  ForegroundWindowState,
  MediaState,
  PerformanceTelemetry,
  PointerState,
  ReactiveDesktopState,
  SceneState,
  TimeReactiveState,
} from "./types";

export const CURRENT_REACTIVE_SCHEMA_VERSION = 2;

export function createTimeState(now = new Date()): TimeReactiveState {
  const hour = now.getHours();
  const minute = now.getMinutes();
  const dayProgress = (hour * 60 + minute) / (24 * 60);
  const phase = hour < 6 ? "night" : hour < 9 ? "dawn" : hour < 17 ? "day" : hour < 20 ? "dusk" : "night";
  return { iso: now.toISOString(), hour, minute, phase, dayProgress };
}

export const EMPTY_REACTIVE_AUDIO: AudioReactiveState = {
  volume: 0,
  smoothedVolume: 0,
  bass: 0,
  mid: 0,
  treble: 0,
  spectralFlux: 0,
  onset: 0,
  beatCandidate: false,
  energy: 0,
  energyDelta: 0,
  frequencyBins: [],
  silence: true,
  audioActive: false,
  source: "none",
  captureLatencyMs: null,
  dspLatencyMs: null,
  renderLatencyMs: null,
  totalVisualResponseLatencyMs: null,
  trackName: null,
  updatedAt: new Date(0).toISOString(),
};

export const EMPTY_MEDIA_STATE: MediaState = {
  provider: "none",
  availability: "unavailable",
  title: null,
  artist: null,
  album: null,
  albumArtUrl: null,
  playbackStatus: "unknown",
  updatedAt: new Date(0).toISOString(),
};

export const EMPTY_FOREGROUND_WINDOW: ForegroundWindowState = {
  hwnd: null,
  bounds: null,
  processId: null,
  processName: null,
  title: null,
  monitorId: null,
  isMaximized: false,
  isMinimized: false,
  isLikelyFullscreen: false,
  tracking: "unavailable",
  updatedAt: new Date(0).toISOString(),
};

export const EMPTY_POINTER_STATE: PointerState = {
  x: 0,
  y: 0,
  screenId: null,
  active: false,
  updatedAt: new Date(0).toISOString(),
};

export const DEFAULT_SCENE_STATE: SceneState = {
  activeSceneId: "deep-sky",
  previewSceneId: null,
  intensity: "normal",
  auraIntensity: "normal",
  motion: "balanced",
  audioMode: "system",
  audioReactiveEnabled: true,
  wallpaperEnabled: false,
  auraEnabled: true,
  albumCoverMode: "procedural",
  paused: false,
};

export const DEFAULT_PERFORMANCE_STATE: PerformanceTelemetry = {
  fps: 0,
  frameTimeMs: 0,
  memoryMb: null,
  cpuApproxPercent: null,
  renderWorkload: 0.28,
  audioProcessingWorkload: 0,
  profile: "balanced",
  documentVisible: true,
  sampleCount: 0,
  updatedAt: new Date(0).toISOString(),
};

export const DEFAULT_DISPLAY_STATE: DisplayState = {
  monitorCount: 1,
  dpiScale: 1,
  virtualBounds: null,
  wallpaperHostStatus: "not-requested",
  wallpaperHost: null,
  lastHostCheckAt: null,
};

export function createDefaultReactiveDesktopState(now = new Date()): ReactiveDesktopState {
  return {
    schemaVersion: CURRENT_REACTIVE_SCHEMA_VERSION,
    timeState: createTimeState(now),
    audioState: { ...EMPTY_REACTIVE_AUDIO, updatedAt: now.toISOString() },
    mediaState: { ...EMPTY_MEDIA_STATE, updatedAt: now.toISOString() },
    foregroundWindowState: { ...EMPTY_FOREGROUND_WINDOW, updatedAt: now.toISOString() },
    pointerState: { ...EMPTY_POINTER_STATE, updatedAt: now.toISOString() },
    performanceState: { ...DEFAULT_PERFORMANCE_STATE, updatedAt: now.toISOString() },
    sceneState: { ...DEFAULT_SCENE_STATE },
    displayState: { ...DEFAULT_DISPLAY_STATE },
    firstRunCompleted: false,
    startupEnabled: false,
    lastPersistedAt: null,
  };
}
