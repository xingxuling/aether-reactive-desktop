import { useCallback, useRef, useState } from "react";
import { useRuntime } from "../../core/runtime/RuntimeContext";
import { getTheme } from "../../visual/themes";
import { drawStars, glowCircle } from "../../visual/canvasPrimitives";
import { useCanvasLoop, seededNoise } from "../../visual/useCanvasLoop";
import { ToyFrame } from "../../ui/shell/ToyFrame";

export function DynamicCover() {
  const { state } = useRuntime();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [immersive, setImmersive] = useState(false);
  const theme = getTheme(state.settings.theme);
  const draw = useCallback((context: CanvasRenderingContext2D, width: number, height: number, time: number) => {
    const night = state.time.phase === "night";
    const energy = state.audio.energy;
    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, theme.skyTop);
    gradient.addColorStop(1, theme.skyBottom);
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    drawStars(context, width, height, time, night ? 0.0001 : 0.00003);
    const drift = time * (night ? 6 : 12) + energy * 42;
    const noise = seededNoise(Math.floor(time * 0.3) + 19);
    for (let layer = 0; layer < 4; layer += 1) {
      context.beginPath();
      for (let x = -40; x <= width + 40; x += 24) {
        const y = height * (0.27 + layer * 0.13) + Math.sin(x * 0.009 + drift * (0.09 + layer * 0.015)) * (18 + layer * 7) + Math.cos(x * 0.003 - drift * 0.03) * 12;
        if (x === -40) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.lineTo(width + 40, height);
      context.lineTo(-40, height);
      context.closePath();
      context.fillStyle = `rgba(${night ? "8, 21, 46" : "42, 86, 113"}, ${0.13 + layer * 0.04})`;
      context.fill();
    }

    const centerX = width * (0.5 + Math.sin(time * 0.08) * 0.04);
    const centerY = height * (0.46 + Math.cos(time * 0.06) * 0.035);
    glowCircle(context, centerX, centerY, Math.min(width, height) * (0.42 + energy * 0.12), "rgba(115, 201, 255, ALPHA)", 0.16);
    context.strokeStyle = theme.accent;
    context.globalAlpha = 0.2 + energy * 0.5;
    context.lineWidth = 1.2;
    for (let ring = 0; ring < 4; ring += 1) {
      context.beginPath();
      context.ellipse(centerX, centerY, 100 + ring * 47 + Math.sin(time + ring) * 7, 37 + ring * 19, time * 0.07 + ring * 0.4, 0, Math.PI * 2);
      context.stroke();
    }
    context.globalAlpha = 0.52;
    context.fillStyle = theme.accent;
    for (let particle = 0; particle < 36; particle += 1) {
      const angle = particle * 2.41 + time * (0.15 + energy * 0.6);
      const radius = 65 + ((particle * 43) % 130) + noise() * 16 + energy * 30;
      const x = centerX + Math.cos(angle) * radius * 1.75;
      const y = centerY + Math.sin(angle) * radius * 0.52;
      const size = 1 + ((particle % 4) * 0.55);
      context.beginPath();
      context.arc(x, y, size, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    const horizon = height * 0.84;
    const horizonGradient = context.createLinearGradient(0, horizon, 0, height);
    horizonGradient.addColorStop(0, "rgba(4, 9, 23, .04)");
    horizonGradient.addColorStop(1, theme.ground);
    context.fillStyle = horizonGradient;
    context.fillRect(0, horizon, width, height - horizon);
  }, [state.audio.energy, state.time.phase, theme]);

  useCanvasLoop(canvasRef, draw, { paused: state.settings.effectsPaused, ecoMode: state.settings.ecoMode });

  const enterFullscreen = async () => {
    setImmersive(true);
    try {
      await document.documentElement.requestFullscreen?.();
    } catch {
      // Fullscreen is optional in embedded preview environments.
    }
  };

  return (
    <ToyFrame
      eyebrow="TOY 01 · AMBIENT SURFACE"
      title="Dynamic Cover"
      description="一张会随时间、主题和桌面活动慢慢呼吸的封面。"
      className={immersive ? "immersive-frame" : ""}
      actions={
        <>
          <span className="status-dot"><i />{state.time.label}</span>
          <button className="primary-button" onClick={() => void enterFullscreen()}>进入全屏</button>
        </>
      }
    >
      <div className="cover-stage glass-panel">
        <canvas ref={canvasRef} className="ambient-canvas" aria-label="动态封面预览" />
        <div className="cover-overlay">
          <div>
            <span className="eyebrow">AETHER / {theme.label.toUpperCase()}</span>
            <strong>{state.time.phase === "night" ? "夜色正在收拢" : "今天的光线刚刚好"}</strong>
          </div>
          <span className="micro-label">WorkerW Adapter · CANDIDATE / NOT VERIFIED</span>
        </div>
      </div>
    </ToyFrame>
  );
}
