import type { PerformanceProfile, ReactiveSceneId } from "../../core/reactive-state/types";

export interface ScenePalette {
  sky: string;
  horizon: string;
  accent: string;
  secondary: string;
  glow: string;
  ink: string;
}

export interface AetherScene {
  id: ReactiveSceneId;
  name: string;
  chineseName: string;
  description: string;
  label: string;
  palette: ScenePalette;
  wallpaper: { density: number; drift: number; depth: number };
  audioResponse: { bassScale: number; midScale: number; trebleScale: number; onsetAccent: number };
  albumCoverMode: "procedural" | "metadata" | "generic";
  aura: { intensity: number; edgeFlow: number };
  overlays: { stars: boolean; horizonGlow: boolean; grain: number };
  motionProfile: "slow" | "balanced" | "dynamic";
  performanceProfile: PerformanceProfile;
}
