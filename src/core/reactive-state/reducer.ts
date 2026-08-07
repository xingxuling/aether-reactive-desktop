import { createDefaultReactiveDesktopState, CURRENT_REACTIVE_SCHEMA_VERSION, EMPTY_FOREGROUND_WINDOW, EMPTY_MEDIA_STATE, EMPTY_POINTER_STATE, EMPTY_REACTIVE_AUDIO } from "./defaultState";
import type { AudioReactiveState, PerformanceTelemetry, ReactiveDesktopState, ReactiveStateEvent, SceneState } from "./types";

function clamp(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
}

function safeAudio(value: unknown, fallback: AudioReactiveState): AudioReactiveState {
  if (!value || typeof value !== "object") return fallback;
  const candidate = value as Partial<AudioReactiveState>;
  return {
    ...fallback,
    ...candidate,
    volume: clamp(candidate.volume),
    smoothedVolume: clamp(candidate.smoothedVolume),
    bass: clamp(candidate.bass),
    mid: clamp(candidate.mid),
    treble: clamp(candidate.treble),
    spectralFlux: clamp(candidate.spectralFlux),
    onset: clamp(candidate.onset),
    energy: clamp(candidate.energy),
    energyDelta: Math.max(-1, Math.min(1, typeof candidate.energyDelta === "number" ? candidate.energyDelta : 0)),
    frequencyBins: Array.isArray(candidate.frequencyBins) ? candidate.frequencyBins.filter((item): item is number => typeof item === "number").slice(0, 96).map((item) => clamp(item)) : [],
    silence: candidate.silence === true,
    audioActive: candidate.audioActive === true,
    beatCandidate: candidate.beatCandidate === true,
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : fallback.updatedAt,
  };
}

export function migrateReactiveDesktopState(value: unknown): ReactiveDesktopState {
  const base = createDefaultReactiveDesktopState();
  if (!value || typeof value !== "object") return base;
  const candidate = value as Partial<ReactiveDesktopState>;
  const scene = (candidate.sceneState && typeof candidate.sceneState === "object" ? candidate.sceneState : {}) as Partial<SceneState>;
  const performance = (candidate.performanceState && typeof candidate.performanceState === "object" ? candidate.performanceState : {}) as Partial<PerformanceTelemetry>;
  const display = candidate.displayState && typeof candidate.displayState === "object" ? candidate.displayState : {};
  const media = candidate.mediaState && typeof candidate.mediaState === "object" ? candidate.mediaState : EMPTY_MEDIA_STATE;
  const windowState = candidate.foregroundWindowState && typeof candidate.foregroundWindowState === "object" ? candidate.foregroundWindowState : EMPTY_FOREGROUND_WINDOW;
  const pointer = candidate.pointerState && typeof candidate.pointerState === "object" ? candidate.pointerState : EMPTY_POINTER_STATE;
  return {
    ...base,
    schemaVersion: CURRENT_REACTIVE_SCHEMA_VERSION,
    timeState: candidate.timeState && typeof candidate.timeState === "object" ? { ...base.timeState, ...candidate.timeState } : base.timeState,
    audioState: safeAudio(candidate.audioState, base.audioState ?? EMPTY_REACTIVE_AUDIO),
    mediaState: { ...EMPTY_MEDIA_STATE, ...media },
    foregroundWindowState: { ...EMPTY_FOREGROUND_WINDOW, ...windowState },
    pointerState: { ...EMPTY_POINTER_STATE, ...pointer },
    performanceState: {
      ...base.performanceState,
      ...performance,
      profile: performance.profile === "quality" || performance.profile === "eco" ? performance.profile : "balanced",
    },
    sceneState: {
      ...base.sceneState,
      ...scene,
      intensity: scene.intensity === "off" || scene.intensity === "subtle" || scene.intensity === "strong" ? scene.intensity : "normal",
      auraIntensity: scene.auraIntensity === "off" || scene.auraIntensity === "subtle" || scene.auraIntensity === "strong" ? scene.auraIntensity : "normal",
      motion: scene.motion === "slow" || scene.motion === "dynamic" ? scene.motion : "balanced",
      audioMode: scene.audioMode === "local" || scene.audioMode === "silent" ? scene.audioMode : "system",
    },
    displayState: { ...base.displayState, ...display },
    firstRunCompleted: candidate.firstRunCompleted === true,
    startupEnabled: candidate.startupEnabled === true,
    lastPersistedAt: typeof candidate.lastPersistedAt === "string" ? candidate.lastPersistedAt : null,
  };
}

export function reduceReactiveDesktopState(state: ReactiveDesktopState, event: ReactiveStateEvent): ReactiveDesktopState {
  switch (event.type) {
    case "time:update": return { ...state, timeState: event.payload };
    case "audio:update": return { ...state, audioState: event.payload };
    case "media:update": return { ...state, mediaState: event.payload };
    case "foreground-window:update": return { ...state, foregroundWindowState: event.payload };
    case "pointer:update": return { ...state, pointerState: event.payload };
    case "performance:update": return { ...state, performanceState: { ...state.performanceState, ...event.payload, updatedAt: new Date().toISOString() } };
    case "scene:update": return { ...state, sceneState: { ...state.sceneState, ...event.payload } };
    case "display:update": return { ...state, displayState: { ...state.displayState, ...event.payload } };
    case "first-run:complete": return { ...state, firstRunCompleted: true };
    case "startup:update": return { ...state, startupEnabled: event.payload };
    case "reset": return createDefaultReactiveDesktopState();
    default: return state;
  }
}
