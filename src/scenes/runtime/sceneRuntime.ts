import type { AudioReactiveState, ReactiveDesktopState } from "../../core/reactive-state/types";
import { getScene } from "../registry/sceneRegistry";

export interface SceneVisualProjection {
  sceneId: string;
  palette: ReturnType<typeof getScene>["palette"];
  atmosphere: number;
  bassPulse: number;
  midField: number;
  trebleParticles: number;
  onsetAccent: number;
  motion: number;
  particleDensity: number;
  auraIntensity: number;
  albumLuminance: number;
  quiet: boolean;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function projectScene(state: ReactiveDesktopState, timeSeconds: number): SceneVisualProjection {
  const scene = getScene(state.sceneState.previewSceneId ?? state.sceneState.activeSceneId);
  const audio = state.audioState;
  const intensity = state.sceneState.intensity === "off" ? 0 : state.sceneState.intensity === "subtle" ? 0.55 : state.sceneState.intensity === "strong" ? 1.28 : 1;
  const motion = state.sceneState.motion === "slow" ? 0.52 : state.sceneState.motion === "dynamic" ? 1.35 : 1;
  const quiet = audio.silence || !state.sceneState.audioReactiveEnabled || state.sceneState.paused;
  const ambientBreath = (Math.sin(timeSeconds * (0.45 + scene.wallpaper.drift * 0.1)) + 1) / 2;
  return {
    sceneId: scene.id,
    palette: scene.palette,
    atmosphere: clamp(0.22 + audio.energy * 0.52 * intensity + ambientBreath * 0.08),
    bassPulse: clamp(audio.bass * scene.audioResponse.bassScale * intensity),
    midField: clamp(audio.mid * scene.audioResponse.midScale * intensity),
    trebleParticles: clamp(audio.treble * scene.audioResponse.trebleScale * intensity),
    onsetAccent: clamp(audio.onset * scene.audioResponse.onsetAccent * intensity),
    motion: scene.wallpaper.drift * motion,
    particleDensity: scene.wallpaper.density * (state.performanceState.profile === "eco" ? 0.45 : state.performanceState.profile === "quality" ? 1.16 : 0.82),
    auraIntensity: state.sceneState.auraEnabled ? scene.aura.intensity * (state.sceneState.auraIntensity === "off" ? 0 : state.sceneState.auraIntensity === "subtle" ? 0.55 : state.sceneState.auraIntensity === "strong" ? 1.28 : 1) * intensity : 0,
    albumLuminance: state.mediaState.availability === "available" ? 0.78 : state.mediaState.availability === "partial" ? 0.58 : 0.35,
    quiet,
  };
}

export function makeDemoAudioState(now = Date.now(), phase = 0): AudioReactiveState {
  const seconds = now / 1000;
  const pulse = (Math.sin(seconds * 2.4 + phase) + 1) / 2;
  const bass = clamp(0.22 + pulse * 0.55 + (Math.sin(seconds * 5.1) + 1) * 0.08);
  const mid = clamp(0.18 + (Math.sin(seconds * 3.2 + 1.4) + 1) * 0.22);
  const treble = clamp(0.12 + (Math.sin(seconds * 8.6 + 0.3) + 1) * 0.17);
  const energy = clamp(bass * 0.5 + mid * 0.34 + treble * 0.16);
  const onset = Math.max(0, Math.sin(seconds * 2.4 + phase) - 0.72) / 0.28;
  const frequencyBins = Array.from({ length: 40 }, (_, index) => clamp((Math.sin(seconds * (1.4 + index * 0.025) + index * 0.45) + 1) * 0.22 + energy * (1 - index / 55)));
  return {
    volume: energy,
    smoothedVolume: energy,
    bass,
    mid,
    treble,
    spectralFlux: clamp(onset * 0.7),
    onset,
    beatCandidate: onset > 0.55,
    energy,
    energyDelta: Math.sin(seconds * 2.4 + phase) * 0.08,
    frequencyBins,
    silence: false,
    audioActive: true,
    source: "demo",
    captureLatencyMs: null,
    dspLatencyMs: 2,
    renderLatencyMs: null,
    totalVisualResponseLatencyMs: null,
    trackName: "Aether Demo Pulse",
    updatedAt: new Date(now).toISOString(),
  };
}
