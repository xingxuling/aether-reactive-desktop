export type ToyId =
  | "dynamic-cover"
  | "music-halo"
  | "project-terrarium"
  | "tree-spirit"
  | "pocket-world";

export type SelectedToy = ToyId | "home";
export type ThemeId = "deep-sky" | "dawn" | "aurora";
export type TimePhase = "dawn" | "day" | "dusk" | "night";
export type Weather = "clear" | "mist" | "rain";
export type NpcMood = "wandering" | "resting" | "hungry" | "celebrating";

export interface TimeState {
  iso: string;
  hour: number;
  minute: number;
  phase: TimePhase;
  label: string;
  isDay: boolean;
  dayProgress: number;
}

export interface AudioMetrics {
  energy: number;
  low: number;
  mid: number;
  high: number;
  amplitude: number;
  frequency: number[];
  isPlaying: boolean;
  fileName: string | null;
}

export interface ProjectSnapshot {
  path: string;
  branch: string;
  isGit: boolean;
  isDirty: boolean;
  commitCount: number;
  latestCommit: string | null;
  latestCommitAt: string | null;
  changedFiles: number;
  fileCount: number;
  codeDirectories: string[];
  readAt: string;
  source: "live" | "demo";
  error?: string;
}

export interface FruitEvent {
  id: string;
  label: string;
  createdAt: string;
  source: "user" | "confirmed";
}

export interface NpcState {
  id: string;
  name: string;
  mood: NpcMood;
  x: number;
  y: number;
  hunger: number;
  energy: number;
  lastActionTick: number;
}

export interface WorldState {
  seed: number;
  tick: number;
  worldHour: number;
  weather: Weather;
  plantGrowth: number[];
  buildingLights: number[];
  npcs: NpcState[];
  events: string[];
  lastSavedAt: string | null;
}

export interface UserSettings {
  theme: ThemeId;
  ecoMode: boolean;
  effectsPaused: boolean;
  alwaysOnTopTreeSpirit: boolean;
}

export interface AetherState {
  schemaVersion: number;
  selectedToy: SelectedToy;
  settings: UserSettings;
  time: TimeState;
  audio: AudioMetrics;
  project: ProjectSnapshot | null;
  world: WorldState;
  fruits: FruitEvent[];
  lastPersistedAt: string | null;
}

export type AetherEvent =
  | { type: "time:update"; payload: TimeState }
  | { type: "audio:update"; payload: AudioMetrics }
  | { type: "project:update"; payload: ProjectSnapshot | null }
  | { type: "world:update"; payload: WorldState }
  | { type: "settings:update"; payload: Partial<UserSettings> }
  | { type: "toy:select"; payload: SelectedToy }
  | { type: "fruit:add"; payload: FruitEvent }
  | { type: "effects:toggle"; payload: boolean };
