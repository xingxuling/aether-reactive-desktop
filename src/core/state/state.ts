import type {
  AetherEvent,
  AetherState,
  AudioMetrics,
  ProjectSnapshot,
  TimeState,
  UserSettings,
  WorldState,
} from "../types";
import { createWorld } from "../../legacy/pocket-world/worldSimulation";
import { getTimeState } from "../../adapters/time/time";

export const CURRENT_SCHEMA_VERSION = 1;

export const EMPTY_AUDIO: AudioMetrics = {
  energy: 0,
  low: 0,
  mid: 0,
  high: 0,
  amplitude: 0,
  frequency: [],
  isPlaying: false,
  fileName: null,
};

export const DEFAULT_SETTINGS: UserSettings = {
  theme: "deep-sky",
  ecoMode: false,
  effectsPaused: false,
  alwaysOnTopTreeSpirit: true,
};

export function createDefaultAetherState(now = new Date()): AetherState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    selectedToy: "home",
    settings: { ...DEFAULT_SETTINGS },
    time: getTimeState(now),
    audio: { ...EMPTY_AUDIO },
    project: null,
    world: createWorld(73421),
    fruits: [],
    lastPersistedAt: null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function safeTime(value: unknown): TimeState {
  if (!isRecord(value)) return getTimeState();
  const fallback = getTimeState();
  return {
    iso: typeof value.iso === "string" ? value.iso : fallback.iso,
    hour: typeof value.hour === "number" ? value.hour : fallback.hour,
    minute: typeof value.minute === "number" ? value.minute : fallback.minute,
    phase: value.phase === "dawn" || value.phase === "day" || value.phase === "dusk" || value.phase === "night" ? value.phase : fallback.phase,
    label: typeof value.label === "string" ? value.label : fallback.label,
    isDay: typeof value.isDay === "boolean" ? value.isDay : fallback.isDay,
    dayProgress: typeof value.dayProgress === "number" ? value.dayProgress : fallback.dayProgress,
  };
}

function safeAudio(value: unknown): AudioMetrics {
  if (!isRecord(value)) return { ...EMPTY_AUDIO };
  return {
    energy: clampNumber(value.energy),
    low: clampNumber(value.low),
    mid: clampNumber(value.mid),
    high: clampNumber(value.high),
    amplitude: clampNumber(value.amplitude),
    frequency: Array.isArray(value.frequency) ? value.frequency.filter((item): item is number => typeof item === "number").slice(0, 128) : [],
    isPlaying: value.isPlaying === true,
    fileName: typeof value.fileName === "string" ? value.fileName : null,
  };
}

function clampNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}

export function migrateAetherState(value: unknown): AetherState {
  const base = createDefaultAetherState();
  if (!isRecord(value)) return base;

  const settings = isRecord(value.settings) ? value.settings : {};
  const world = isRecord(value.world) ? value.world : base.world;
  const migratedWorld: WorldState = {
    ...base.world,
    ...world,
    seed: typeof world.seed === "number" ? world.seed : base.world.seed,
    tick: typeof world.tick === "number" ? world.tick : base.world.tick,
    worldHour: typeof world.worldHour === "number" ? world.worldHour : base.world.worldHour,
    weather: world.weather === "clear" || world.weather === "mist" || world.weather === "rain" ? world.weather : base.world.weather,
    plantGrowth: Array.isArray(world.plantGrowth) ? world.plantGrowth.filter((item): item is number => typeof item === "number") : base.world.plantGrowth,
    buildingLights: Array.isArray(world.buildingLights) ? world.buildingLights.filter((item): item is number => typeof item === "number") : base.world.buildingLights,
    npcs: Array.isArray(world.npcs) ? (world.npcs as WorldState["npcs"]) : base.world.npcs,
    events: Array.isArray(world.events) ? world.events.filter((item): item is string => typeof item === "string").slice(-12) : base.world.events,
    lastSavedAt: typeof world.lastSavedAt === "string" ? world.lastSavedAt : null,
  };

  const selectedToy = value.selectedToy;
  const allowedToy = selectedToy === "home" || selectedToy === "dynamic-cover" || selectedToy === "music-halo" || selectedToy === "project-terrarium" || selectedToy === "tree-spirit" || selectedToy === "pocket-world" ? selectedToy : "home";

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    selectedToy: allowedToy,
    settings: {
      theme: settings.theme === "deep-sky" || settings.theme === "dawn" || settings.theme === "aurora" ? settings.theme : base.settings.theme,
      ecoMode: settings.ecoMode === true,
      effectsPaused: settings.effectsPaused === true,
      alwaysOnTopTreeSpirit: settings.alwaysOnTopTreeSpirit !== false,
    },
    time: safeTime(value.time),
    audio: safeAudio(value.audio),
    project: isRecord(value.project) ? (value.project as unknown as ProjectSnapshot) : null,
    world: migratedWorld,
    fruits: Array.isArray(value.fruits) ? value.fruits.filter(isRecord).slice(-30) as unknown as AetherState["fruits"] : [],
    lastPersistedAt: typeof value.lastPersistedAt === "string" ? value.lastPersistedAt : null,
  };
}

export function reduceAetherState(state: AetherState, event: AetherEvent): AetherState {
  switch (event.type) {
    case "time:update":
      return { ...state, time: event.payload };
    case "audio:update":
      return { ...state, audio: event.payload };
    case "project:update":
      return { ...state, project: event.payload };
    case "world:update":
      return { ...state, world: event.payload };
    case "settings:update":
      return { ...state, settings: { ...state.settings, ...event.payload } };
    case "toy:select":
      return { ...state, selectedToy: event.payload };
    case "fruit:add":
      return { ...state, fruits: [...state.fruits, event.payload].slice(-30) };
    case "effects:toggle":
      return { ...state, settings: { ...state.settings, effectsPaused: event.payload } };
    default:
      return state;
  }
}
