import { createDefaultReactiveDesktopState } from "./defaultState";
import { migrateReactiveDesktopState, reduceReactiveDesktopState } from "./reducer";

describe("ReactiveDesktopState", () => {
  it("keeps audio normalized while preserving the runtime shape", () => {
    const state = createDefaultReactiveDesktopState();
    const next = reduceReactiveDesktopState(state, {
      type: "audio:update",
      payload: { ...state.audioState, bass: 4, energy: 0.8, audioActive: true },
    });
    expect(next.audioState.bass).toBe(4);
    const restored = migrateReactiveDesktopState(next);
    expect(restored.audioState.energy).toBeCloseTo(0.8);
    expect(restored.audioState.audioActive).toBe(true);
  });

  it("migrates a partial persisted state without activating old toy routes", () => {
    const restored = migrateReactiveDesktopState({ sceneState: { activeSceneId: "gold-pulse" }, firstRunCompleted: true });
    expect(restored.sceneState.activeSceneId).toBe("gold-pulse");
    expect(restored.firstRunCompleted).toBe(true);
    expect(restored.schemaVersion).toBe(2);
  });
});
