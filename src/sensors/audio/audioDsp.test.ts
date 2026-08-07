import { analyzePcmWindow, detectSilence, normalizePcm, smoothAttackRelease } from "./audioDsp";

describe("reactive audio DSP", () => {
  it("normalizes PCM without creating out-of-range samples", () => {
    const normalized = normalizePcm(new Float32Array([-2, -0.2, 0.3, 4]));
    expect(normalized[0]).toBe(-1);
    expect(normalized[1]).toBeCloseTo(-0.2);
    expect(normalized[2]).toBeCloseTo(0.3);
    expect(normalized[3]).toBe(1);
  });

  it("uses faster attack and slower release smoothing", () => {
    expect(smoothAttackRelease(0, 1)).toBeCloseTo(0.42);
    expect(smoothAttackRelease(1, 0)).toBeCloseTo(0.88);
  });

  it("turns a non-silent PCM window into normalized reactive bands", () => {
    const samples = new Float32Array(256);
    for (let index = 0; index < samples.length; index += 1) samples[index] = Math.sin(index * 0.4) * 0.6;
    const result = analyzePcmWindow(samples);
    expect(result.frequencyBins.length).toBeGreaterThan(0);
    expect(result.energy).toBeGreaterThan(0);
    expect(result.silence).toBe(false);
  });

  it("classifies quiet audio as silence", () => {
    expect(detectSilence(0.01)).toBe(true);
    expect(detectSilence(0.2)).toBe(false);
  });
});
