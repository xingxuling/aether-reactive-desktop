import type { NpcMood, NpcState, Weather, WorldState } from "../../core/types";

const NPC_SEEDS: Array<Pick<NpcState, "id" | "name" | "x" | "y">> = [
  { id: "luma", name: "露米", x: 0.22, y: 0.68 },
  { id: "kiko", name: "柯柯", x: 0.52, y: 0.72 },
  { id: "nox", name: "诺克", x: 0.78, y: 0.64 },
];

export function createWorld(seed: number): WorldState {
  return {
    seed: seed >>> 0,
    tick: 0,
    worldHour: 7.5,
    weather: "clear",
    plantGrowth: [0.32, 0.48, 0.24, 0.68, 0.4, 0.55, 0.2],
    buildingLights: [0.42, 0.28, 0.58],
    npcs: NPC_SEEDS.map((npc, index) => ({
      ...npc,
      mood: index === 1 ? "wandering" : "resting",
      hunger: 0.18 + index * 0.08,
      energy: 0.82 - index * 0.12,
      lastActionTick: 0,
    })),
    events: ["世界在一颗固定的种子上醒来。"],
    lastSavedAt: null,
  };
}

function randomAt(seed: number, tick: number, salt: number): number {
  let value = (seed ^ Math.imul(tick + 1, 374761393) ^ Math.imul(salt + 11, 668265263)) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 1274126177) >>> 0;
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

function nextWeather(state: WorldState): Weather {
  const roll = randomAt(state.seed, state.tick, 17);
  if (roll < 0.16) return "rain";
  if (roll < 0.34) return "mist";
  return "clear";
}

function updateNpc(npc: NpcState, state: WorldState, index: number): NpcState {
  const hour = state.worldHour;
  const isNight = hour < 6 || hour >= 20;
  const hunger = Math.min(1, npc.hunger + (isNight ? 0.002 : 0.006));
  const energy = Math.max(0, Math.min(1, npc.energy + (isNight ? 0.012 : -0.002)));
  let mood: NpcMood = npc.mood;
  if (hunger > 0.72) mood = "hungry";
  else if (isNight || energy < 0.2) mood = "resting";
  else if (state.tick % 37 === index * 7) mood = "celebrating";
  else mood = "wandering";

  const direction = randomAt(state.seed, state.tick, index + 31) > 0.5 ? 1 : -1;
  const stride = mood === "wandering" ? 0.0018 : 0.0004;
  return {
    ...npc,
    mood,
    x: Math.max(0.12, Math.min(0.88, npc.x + direction * stride)),
    y: Math.max(0.52, Math.min(0.78, npc.y + Math.sin(state.tick * 0.04 + index) * 0.0008)),
    hunger,
    energy,
    lastActionTick: state.tick,
  };
}

export function stepWorld(state: WorldState, ticks = 1): WorldState {
  let next = state;
  for (let step = 0; step < Math.max(0, Math.floor(ticks)); step += 1) {
    const tick = next.tick + 1;
    const worldHour = (next.worldHour + 0.025) % 24;
    const draft: WorldState = {
      ...next,
      tick,
      worldHour,
      weather: tick % 120 === 0 ? nextWeather({ ...next, tick }) : next.weather,
      plantGrowth: next.plantGrowth.map((growth, index) => Math.min(1, growth + (next.weather === "rain" ? 0.0022 : 0.0008) + randomAt(next.seed, tick, index) * 0.0006)),
      buildingLights: next.buildingLights.map((light, index) => (worldHour < 6 || worldHour >= 19 ? 0.72 + randomAt(next.seed, tick, index + 13) * 0.22 : Math.max(0.12, light * 0.96))),
      events: next.events,
    };
    const npcs = draft.npcs.map((npc, index) => updateNpc(npc, draft, index));
    const event = tick % 80 === 0 ? `第 ${tick} 拍：${draft.weather === "rain" ? "雨水让植物长高了一点。" : "小镇交换了一次微光。"}` : null;
    next = { ...draft, npcs, events: event ? [...draft.events, event].slice(-12) : draft.events };
  }
  return next;
}

export function worldSnapshot(state: WorldState): string {
  return JSON.stringify({ seed: state.seed, tick: state.tick, worldHour: state.worldHour, weather: state.weather, npcs: state.npcs.map(({ id, mood, x, y }) => ({ id, mood, x, y })) });
}
