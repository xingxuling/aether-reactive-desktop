import { createDefaultAetherState, migrateAetherState, reduceAetherState } from "./state";

describe("Aether state", () => {
  it("migrates corrupted or partial data to a safe versioned state", () => {
    const state = migrateAetherState({ schemaVersion: 0, settings: { ecoMode: true } });
    expect(state.schemaVersion).toBe(1);
    expect(state.settings.ecoMode).toBe(true);
    expect(state.world.seed).toBeTypeOf("number");
  });

  it("reduces settings and fruit events without mutating the previous state", () => {
    const original = createDefaultAetherState();
    const next = reduceAetherState(original, { type: "settings:update", payload: { ecoMode: true } });
    const withFruit = reduceAetherState(next, { type: "fruit:add", payload: { id: "f1", label: "完成测试", createdAt: new Date().toISOString(), source: "user" } });
    expect(original.settings.ecoMode).toBe(false);
    expect(next.settings.ecoMode).toBe(true);
    expect(withFruit.fruits).toHaveLength(1);
  });
});
