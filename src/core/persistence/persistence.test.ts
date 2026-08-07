import { createDefaultAetherState } from "../state/state";
import { decodeState, encodeState } from "./persistence";

describe("versioned persistence", () => {
  it("round trips a state with schema version", () => {
    const state = createDefaultAetherState();
    const restored = decodeState(encodeState(state));
    expect(restored?.schemaVersion).toBe(1);
    expect(restored?.world.seed).toBe(state.world.seed);
  });

  it("falls back on malformed JSON", () => {
    expect(decodeState("not-json")).toBeNull();
  });
});
