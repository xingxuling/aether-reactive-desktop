import { analyzeFrequencyBands } from "../../adapters/audio/audioAnalyzer";
import { mapProjectToTerrarium } from "../../adapters/git/gitState";
import { getTimeState } from "../../adapters/time/time";
import { createDefaultAetherState, reduceAetherState } from "../state/state";
import { decodeState, encodeState } from "../persistence/persistence";
import { deriveSpiritMode } from "../../legacy/tree-spirit/TreeSpirit";
import { createWorld, stepWorld } from "../../legacy/pocket-world/worldSimulation";

describe("Aether Runtime integration paths", () => {
  it("routes Time into Dynamic Cover state", () => {
    const state = createDefaultAetherState();
    const next = reduceAetherState(state, { type: "time:update", payload: getTimeState(new Date("2026-08-07T23:10:00")) });
    expect(next.time.phase).toBe("night");
  });

  it("routes Audio analysis into Music Halo state", () => {
    const state = createDefaultAetherState();
    const metrics = analyzeFrequencyBands(new Uint8Array([220, 210, 180, 120, 100, 80, 40, 20]), "loop.wav");
    const next = reduceAetherState(state, { type: "audio:update", payload: metrics });
    expect(next.audio.fileName).toBe("loop.wav");
    expect(next.audio.energy).toBeGreaterThan(0);
  });

  it("routes Git state into Terrarium mapping", () => {
    const state = createDefaultAetherState();
    const project = { path: "C:/repo", branch: "main", isGit: true, isDirty: true, commitCount: 12, latestCommit: "abc", latestCommitAt: new Date().toISOString(), changedFiles: 2, fileCount: 40, codeDirectories: ["src"], readAt: new Date().toISOString(), source: "live" as const };
    const next = reduceAetherState(state, { type: "project:update", payload: project });
    expect(mapProjectToTerrarium(next.project).disturbance).toBeGreaterThan(0);
  });

  it("routes project and audio events into TreeSpirit activity", () => {
    const state = createDefaultAetherState();
    const audioState = reduceAetherState(state, { type: "audio:update", payload: { ...state.audio, energy: 0.4, amplitude: 0.5, isPlaying: true } });
    expect(deriveSpiritMode(audioState.time, audioState.audio, audioState.project)).toBe("active");
  });

  it("saves, reloads, and continues Pocket World state", () => {
    const before = createWorld(77);
    const progressed = stepWorld(before, 60);
    const restored = decodeState(encodeState({ ...createDefaultAetherState(), world: progressed }));
    expect(restored?.world.tick).toBe(60);
    expect(stepWorld(restored!.world, 1).tick).toBe(61);
  });
});
