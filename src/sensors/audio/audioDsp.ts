import { EMPTY_REACTIVE_AUDIO } from "../../core/reactive-state/defaultState";
import type { AudioReactiveState } from "../../core/reactive-state/types";

export function normalizePcm(samples: Float32Array | number[]): number[] {
  return Array.from(samples, (sample) => Math.max(-1, Math.min(1, Number.isFinite(sample) ? sample : 0)));
}

export function smoothAttackRelease(previous: number, next: number, attack = 0.42, release = 0.12): number {
  const amount = next >= previous ? Math.max(0.01, Math.min(1, attack)) : Math.max(0.01, Math.min(1, release));
  return previous + (next - previous) * amount;
}

export function detectSilence(volume: number, threshold = 0.035): boolean {
  return volume < Math.max(0.001, threshold);
}

export function analyzePcmWindow(samples: Float32Array | number[], previousBins: number[] = [], source: AudioReactiveState["source"] = "local-file", trackName: string | null = null): AudioReactiveState {
  const pcm = normalizePcm(samples);
  if (pcm.length === 0) return { ...EMPTY_REACTIVE_AUDIO, source, trackName, updatedAt: new Date().toISOString() };
  const bins = Array.from({ length: Math.min(48, Math.max(12, Math.floor(pcm.length / 32))) }, (_, index) => {
    const frequency = (index + 1) / (binsLength(pcm.length) * 1.7);
    let real = 0;
    let imaginary = 0;
    for (let sampleIndex = 0; sampleIndex < pcm.length; sampleIndex += 1) {
      const angle = Math.PI * 2 * frequency * sampleIndex;
      real += pcm[sampleIndex] * Math.cos(angle);
      imaginary -= pcm[sampleIndex] * Math.sin(angle);
    }
    return Math.min(1, Math.sqrt(real * real + imaginary * imaginary) / Math.max(1, pcm.length * 0.42));
  });
  const volume = Math.sqrt(pcm.reduce((total, sample) => total + sample * sample, 0) / pcm.length);
  const low = averageRange(bins, 0, 0.2);
  const mid = averageRange(bins, 0.2, 0.62);
  const high = averageRange(bins, 0.62, 1);
  const energy = Math.max(0, Math.min(1, low * 0.5 + mid * 0.34 + high * 0.16));
  const spectralFlux = bins.reduce((total, value, index) => total + Math.max(0, value - (previousBins[index] ?? 0)), 0) / Math.max(1, bins.length);
  const onset = Math.max(0, Math.min(1, spectralFlux * 4.2));
  return {
    ...EMPTY_REACTIVE_AUDIO,
    volume,
    smoothedVolume: volume,
    bass: low,
    mid,
    treble: high,
    spectralFlux: Math.min(1, spectralFlux),
    onset,
    beatCandidate: onset > 0.54 && energy > 0.12,
    energy,
    energyDelta: energy - (previousBins.length ? averageRange(previousBins, 0, 1) : 0),
    frequencyBins: bins,
    silence: detectSilence(volume),
    audioActive: !detectSilence(volume),
    source,
    trackName,
    updatedAt: new Date().toISOString(),
  };
}

function binsLength(sampleLength: number): number {
  return Math.max(12, Math.min(48, Math.floor(sampleLength / 32)));
}

function averageRange(values: number[], start: number, end: number): number {
  const first = Math.max(0, Math.floor(values.length * start));
  const last = Math.max(first + 1, Math.min(values.length, Math.ceil(values.length * end)));
  return values.slice(first, last).reduce((total, value) => total + value, 0) / Math.max(1, last - first);
}
