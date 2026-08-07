import { analyzeFrequencyBands, smoothAmplitude } from "./audioAnalyzer";

describe("audio analysis", () => {
  it("separates low, mid and high frequency energy", () => {
    const sample = new Uint8Array(100);
    sample.fill(220, 0, 18);
    sample.fill(120, 18, 62);
    sample.fill(40, 62);
    const result = analyzeFrequencyBands(sample, "demo.wav", true);
    expect(result.low).toBeGreaterThan(result.mid);
    expect(result.mid).toBeGreaterThan(result.high);
    expect(result.fileName).toBe("demo.wav");
  });

  it("smooths amplitude without overshooting", () => {
    expect(smoothAmplitude(0, 1, 0.2)).toBeCloseTo(0.2);
    expect(smoothAmplitude(1, 0, 0.2)).toBeCloseTo(0.8);
  });
});
