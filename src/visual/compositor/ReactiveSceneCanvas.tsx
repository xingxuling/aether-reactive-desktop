import { useCallback, useRef } from "react";
import { useCanvasLoop, seededNoise } from "../useCanvasLoop";
import { projectScene } from "../../scenes/runtime/sceneRuntime";
import type { ReactiveDesktopState } from "../../core/reactive-state/types";

interface ReactiveSceneCanvasProps {
  state: ReactiveDesktopState;
  compact?: boolean;
  className?: string;
  showWindowAura?: boolean;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  phase: number;
}

export function ReactiveSceneCanvas({ state, compact = false, className = "", showWindowAura = false }: ReactiveSceneCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[] | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const draw = useCallback((context: CanvasRenderingContext2D, width: number, height: number, time: number) => {
    const currentState = stateRef.current;
    const projection = projectScene(currentState, time);
    const palette = projection.palette;
    const count = compact ? 36 : currentState.performanceState.profile === "quality" ? 128 : currentState.performanceState.profile === "eco" ? 42 : 82;
    if (!particlesRef.current || particlesRef.current.length !== count) {
      const random = seededNoise(82041 + count);
      particlesRef.current = Array.from({ length: count }, () => ({ x: random(), y: random() * 0.82, size: 0.5 + random() * 2.2, speed: 0.015 + random() * 0.08, phase: random() * Math.PI * 2 }));
    }
    const particles = particlesRef.current;
    context.clearRect(0, 0, width, height);
    const background = context.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, palette.sky);
    background.addColorStop(0.58, palette.horizon);
    background.addColorStop(1, darken(palette.sky, 0.55));
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);

    const centerX = width * 0.54;
    const centerY = height * (compact ? 0.5 : 0.53);
    const minSide = Math.min(width, height);
    const beat = projection.bassPulse * 0.6 + projection.onsetAccent * 0.4;
    const breathe = (Math.sin(time * (0.5 + projection.motion)) + 1) / 2;
    const atmosphere = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, minSide * 0.84);
    atmosphere.addColorStop(0, withAlpha(palette.glow, 0.22 + projection.atmosphere * 0.28));
    atmosphere.addColorStop(0.48, withAlpha(palette.accent, 0.08 + projection.midField * 0.14));
    atmosphere.addColorStop(1, withAlpha(palette.sky, 0));
    context.fillStyle = atmosphere;
    context.fillRect(0, 0, width, height);

    if (projection.palette && !compact) {
      context.fillStyle = withAlpha(palette.secondary, 0.08 + projection.trebleParticles * 0.12);
      context.beginPath();
      context.moveTo(0, height * 0.72);
      context.bezierCurveTo(width * 0.28, height * (0.56 - projection.midField * 0.05), width * 0.68, height * (0.84 + projection.bassPulse * 0.06), width, height * 0.58);
      context.lineTo(width, height);
      context.lineTo(0, height);
      context.closePath();
      context.fill();
    }

    if (currentState.sceneState.activeSceneId !== "white-silence" || currentState.audioState.audioActive) {
      for (const particle of particles) {
        const driftedX = ((particle.x + time * particle.speed * projection.motion) % 1) * width;
        const driftedY = (particle.y + Math.sin(time * 0.22 + particle.phase) * 0.018) * height;
        const alpha = 0.18 + projection.trebleParticles * 0.68 + breathe * 0.08;
        context.fillStyle = withAlpha(particle.phase % 2 > 1 ? palette.secondary : palette.accent, Math.min(0.92, alpha));
        context.beginPath();
        context.arc(driftedX, driftedY, particle.size * (compact ? 0.7 : 0.8 + projection.trebleParticles * 0.8), 0, Math.PI * 2);
        context.fill();
      }
    }

    const haloRadius = minSide * (compact ? 0.25 : 0.27) * (1 + beat * 0.25);
    for (let ring = 0; ring < (compact ? 2 : 4); ring += 1) {
      const radius = haloRadius * (0.76 + ring * 0.17 + beat * 0.08);
      context.strokeStyle = withAlpha(ring % 2 ? palette.secondary : palette.accent, 0.14 + projection.midField * 0.22 - ring * 0.02);
      context.lineWidth = (compact ? 1 : 1.4) + beat * (ring === 0 ? 3 : 1.2);
      context.beginPath();
      context.arc(centerX, centerY, radius, time * (0.06 + ring * 0.022), time * (0.06 + ring * 0.022) + Math.PI * (1.18 + projection.midField * 0.7));
      context.stroke();
    }

    if (!compact) {
      const light = context.createLinearGradient(centerX - minSide * 0.4, centerY, centerX + minSide * 0.4, centerY);
      light.addColorStop(0, withAlpha(palette.accent, 0));
      light.addColorStop(0.5, withAlpha(palette.accent, 0.12 + projection.midField * 0.18));
      light.addColorStop(1, withAlpha(palette.accent, 0));
      context.fillStyle = light;
      context.save();
      context.translate(centerX, centerY);
      context.rotate(Math.sin(time * 0.13) * 0.35);
      context.fillRect(-minSide * 0.48, -2, minSide * 0.96, 4 + projection.trebleParticles * 9);
      context.restore();
    }

    if (!compact) drawAlbumIdentity(context, currentState, centerX, centerY, minSide, projection);
    if (showWindowAura) drawAuraFrame(context, width, height, projection.auraIntensity, palette.accent, projection.onsetAccent);
    if (projection.onsetAccent > 0.48 && !currentState.sceneState.paused) {
      context.strokeStyle = withAlpha(palette.secondary, projection.onsetAccent * 0.5);
      context.lineWidth = 1;
      context.strokeRect(10, 10, width - 20, height - 20);
    }
  }, [compact, showWindowAura]);

  useCanvasLoop(canvasRef, draw, { paused: state.sceneState.paused, ecoMode: state.performanceState.profile === "eco" });
  return <canvas className={`reactive-scene-canvas ${className}`} aria-label={`${state.sceneState.activeSceneId} reactive scene`} ref={canvasRef} />;
}

function drawAlbumIdentity(context: CanvasRenderingContext2D, state: ReactiveDesktopState, centerX: number, centerY: number, minSide: number, projection: ReturnType<typeof projectScene>) {
  const size = minSide * 0.17 * (1 + projection.bassPulse * 0.16);
  const left = centerX - size / 2;
  const top = centerY - size / 2;
  const cover = context.createLinearGradient(left, top, left + size, top + size);
  cover.addColorStop(0, withAlpha(projection.palette.accent, 0.76));
  cover.addColorStop(0.52, withAlpha(projection.palette.secondary, 0.62));
  cover.addColorStop(1, withAlpha(projection.palette.glow, 0.84));
  context.save();
  context.shadowBlur = 26 + projection.midField * 34;
  context.shadowColor = withAlpha(projection.palette.accent, 0.36 + projection.albumLuminance * 0.24);
  context.fillStyle = cover;
  roundRect(context, left, top, size, size, Math.max(8, size * 0.12));
  context.fill();
  context.shadowBlur = 0;
  context.globalAlpha = 0.38 + projection.trebleParticles * 0.34;
  context.strokeStyle = projection.palette.ink;
  context.lineWidth = 1;
  context.beginPath();
  context.arc(centerX, centerY, size * 0.3 + projection.bassPulse * size * 0.15, 0, Math.PI * 2);
  context.stroke();
  context.restore();
  if (state.mediaState.title) {
    context.fillStyle = withAlpha(projection.palette.ink, 0.82);
    context.font = "600 11px Segoe UI, sans-serif";
    context.textAlign = "center";
    context.fillText(truncate(state.mediaState.title, 22), centerX, top + size + 23);
    if (state.mediaState.artist) {
      context.fillStyle = withAlpha(projection.palette.ink, 0.48);
      context.font = "10px Segoe UI, sans-serif";
      context.fillText(truncate(state.mediaState.artist, 26), centerX, top + size + 39);
    }
  }
}

function drawAuraFrame(context: CanvasRenderingContext2D, width: number, height: number, intensity: number, accent: string, onset: number) {
  context.save();
  context.shadowBlur = 28 + intensity * 22 + onset * 22;
  context.shadowColor = withAlpha(accent, 0.22 + intensity * 0.28);
  context.strokeStyle = withAlpha(accent, 0.2 + intensity * 0.42);
  context.lineWidth = 1 + intensity * 2;
  roundRect(context, 16, 16, width - 32, height - 32, 18);
  context.stroke();
  context.restore();
}

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function truncate(value: string, length: number): string {
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}

function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const normalized = value.length === 3 ? value.split("").map((part) => part + part).join("") : value;
  const red = Number.parseInt(normalized.slice(0, 2), 16) || 0;
  const green = Number.parseInt(normalized.slice(2, 4), 16) || 0;
  const blue = Number.parseInt(normalized.slice(4, 6), 16) || 0;
  return `rgba(${red}, ${green}, ${blue}, ${Math.max(0, Math.min(1, alpha))})`;
}

function darken(hex: string, factor: number): string {
  const value = hex.replace("#", "");
  const red = Math.floor((Number.parseInt(value.slice(0, 2), 16) || 0) * factor);
  const green = Math.floor((Number.parseInt(value.slice(2, 4), 16) || 0) * factor);
  const blue = Math.floor((Number.parseInt(value.slice(4, 6), 16) || 0) * factor);
  return `rgb(${red}, ${green}, ${blue})`;
}
