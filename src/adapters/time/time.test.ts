import { getTimeState } from "./time";

describe("time adapter", () => {
  it("maps day and night to stable phases", () => {
    expect(getTimeState(new Date("2026-08-07T07:00:00")).phase).toBe("dawn");
    expect(getTimeState(new Date("2026-08-07T12:00:00")).phase).toBe("day");
    expect(getTimeState(new Date("2026-08-07T23:00:00")).phase).toBe("night");
  });
});
