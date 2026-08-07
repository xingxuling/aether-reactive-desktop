import { createWorld, stepWorld, worldSnapshot } from "./worldSimulation";

describe("Pocket World deterministic simulation", () => {
  it("produces the same state for the same seed and ticks", () => {
    const first = stepWorld(createWorld(42), 240);
    const second = stepWorld(createWorld(42), 240);
    expect(worldSnapshot(first)).toBe(worldSnapshot(second));
  });

  it("diverges for different seeds", () => {
    const first = stepWorld(createWorld(42), 240);
    const second = stepWorld(createWorld(43), 240);
    expect(worldSnapshot(first)).not.toBe(worldSnapshot(second));
  });

  it("advances world time and emits a bounded event history", () => {
    const next = stepWorld(createWorld(12), 1000);
    expect(next.tick).toBe(1000);
    expect(next.events.length).toBeLessThanOrEqual(12);
    expect(next.worldHour).toBeGreaterThanOrEqual(0);
    expect(next.worldHour).toBeLessThan(24);
  });
});
