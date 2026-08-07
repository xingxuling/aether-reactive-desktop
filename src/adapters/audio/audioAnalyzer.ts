import type { AudioMetrics } from "../../core/types";

function average(data: Uint8Array, start: number, end: number): number {
  const safeStart = Math.max(0, Math.min(data.length, Math.floor(start)));
  const safeEnd = Math.max(safeStart + 1, Math.min(data.length, Math.floor(end)));
  let total = 0;
  for (let index = safeStart; index < safeEnd; index += 1) total += data[index] / 255;
  return total / Math.max(1, safeEnd - safeStart);
}

export function analyzeFrequencyBands(data: Uint8Array, fileName: string | null = null, isPlaying = true): AudioMetrics {
  if (data.length === 0) {
    return { energy: 0, low: 0, mid: 0, high: 0, amplitude: 0, frequency: [], isPlaying, fileName };
  }
  const low = average(data, 0, data.length * 0.18);
  const mid = average(data, data.length * 0.18, data.length * 0.62);
  const high = average(data, data.length * 0.62, data.length);
  const energy = low * 0.48 + mid * 0.34 + high * 0.18;
  return {
    energy,
    low,
    mid,
    high,
    amplitude: Math.min(1, energy * 1.16),
    frequency: Array.from(data.slice(0, 96), (value) => value / 255),
    isPlaying,
    fileName,
  };
}

export function smoothAmplitude(previous: number, next: number, smoothing = 0.16): number {
  const amount = Math.max(0.01, Math.min(1, smoothing));
  return previous + (next - previous) * amount;
}
