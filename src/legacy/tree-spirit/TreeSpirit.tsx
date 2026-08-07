import { useCallback, useRef, useState } from "react";
import type { AetherState, ProjectSnapshot } from "../../core/types";
import { useRuntime } from "../../core/runtime/RuntimeContext";
import { startCurrentWindowDragging } from "../../adapters/tauri";
import { getTheme } from "../../visual/themes";
import { glowCircle } from "../../visual/canvasPrimitives";
import { useCanvasLoop } from "../../visual/useCanvasLoop";
import { ToyFrame } from "../../ui/shell/ToyFrame";

export type SpiritMode = "sleeping" | "idle" | "active";

export function deriveSpiritMode(time: AetherState["time"], audio: AetherState["audio"], project: ProjectSnapshot | null): SpiritMode {
  if (!time.isDay && audio.energy < 0.08 && !project?.isDirty) return "sleeping";
  if (audio.energy > 0.12 || project?.isDirty) return "active";
  return "idle";
}

export function TreeSpirit({ standalone = false }: { standalone?: boolean }) {
  const { state, publish, openTreeSpirit } = useRuntime();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [expanded, setExpanded] = useState(standalone);
  const mode = deriveSpiritMode(state.time, state.audio, state.project);
  const theme = getTheme(state.settings.theme);
  const latestFruit = state.fruits[state.fruits.length - 1];

  const draw = useCallback((context: CanvasRenderingContext2D, width: number, height: number, time: number) => {
    const active = mode === "active";
    const sleeping = mode === "sleeping";
    context.clearRect(0, 0, width, height);
    const centerX = width / 2;
    const centerY = height * 0.53 + Math.sin(time * (sleeping ? 0.4 : 1.2)) * (sleeping ? 2 : 5);
    const bodyColor = active ? "#b9efff" : sleeping ? "#8aa0bc" : theme.accent;
    glowCircle(context, centerX, centerY, 95 + (active ? state.audio.energy * 30 : 0), "rgba(115, 201, 255, ALPHA)", sleeping ? 0.08 : 0.18);
    context.fillStyle = bodyColor;
    context.beginPath();
    context.ellipse(centerX, centerY + 22, 42, 51, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = sleeping ? "#172841" : "#10223a";
    context.beginPath();
    context.ellipse(centerX, centerY - 12, 38, 34, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = active ? "#e8c981" : "#9ce6cf";
    context.beginPath();
    context.ellipse(centerX - 13, centerY - 15, 4, 7, -0.12, 0, Math.PI * 2);
    context.ellipse(centerX + 13, centerY - 15, 4, 7, 0.12, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = bodyColor;
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(centerX - 22, centerY + 2);
    context.quadraticCurveTo(centerX - 57, centerY + 9, centerX - 62, centerY - 23 - Math.sin(time) * 5);
    context.moveTo(centerX + 22, centerY + 2);
    context.quadraticCurveTo(centerX + 57, centerY + 9, centerX + 62, centerY - 23 + Math.sin(time) * 5);
    context.stroke();
    context.fillStyle = "rgba(220, 243, 255, .68)";
    context.font = "12px Inter, sans-serif";
    context.textAlign = "center";
    context.fillText(sleeping ? "zzz" : active ? "看见变化" : "在这里", centerX, centerY + 91);
  }, [mode, state.audio.energy, theme.accent]);
  useCanvasLoop(canvasRef, draw, { paused: state.settings.effectsPaused, ecoMode: state.settings.ecoMode });

  const addFruit = () => {
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `fruit-${Date.now()}`;
    publish({ type: "fruit:add", payload: { id, label: "完成一个明确的小成果", createdAt: new Date().toISOString(), source: "user" } });
  };

  if (standalone) {
    return (
      <div className="spirit-window">
        <button className="spirit-close" onClick={() => window.close()}>×</button>
        <canvas ref={canvasRef} className="spirit-canvas" aria-label="树精灵" />
        <div className="spirit-window-caption" data-tauri-drag-region onPointerDown={(event) => { if (event.button === 0) void startCurrentWindowDragging(); }}><strong>TreeSpirit</strong><span>{modeLabel(mode)}</span></div>
        <button className="outline-button full" onClick={addFruit}>记录果实</button>
      </div>
    );
  }

  return (
    <ToyFrame
      eyebrow="TOY 04 · DESKTOP COMPANION"
      title="TreeSpirit"
      description="一位只观察环境、展示变化、不替你定义自己的小精灵。"
      actions={<><span className={`status-dot ${mode === "active" ? "live" : ""}`}><i />{modeLabel(mode)}</span><button className="primary-button" onClick={() => void openTreeSpirit()}>独立小窗</button></>}
    >
      <div className="spirit-layout">
        <button className="spirit-stage glass-panel" onClick={() => setExpanded((value) => !value)} aria-label="展开树精灵面板">
          <canvas ref={canvasRef} className="spirit-canvas" />
          <span className="tap-hint">点击查看小面板</span>
        </button>
        <div className={`spirit-panel glass-panel ${expanded ? "expanded" : ""}`}>
          <div className="spirit-panel-head"><span className="eyebrow">LITTLE OBSERVER</span><span className="source-badge verified">LOCAL</span></div>
          <h2>{mode === "sleeping" ? "它在夜里休息" : mode === "active" ? "它注意到变化" : "它在安静地陪着你"}</h2>
          <p className="spirit-message">拥有环境管理和展示能力，不拥有主体定义权。</p>
          <div className="spirit-facts"><Fact label="当前世界" value={state.project?.branch ?? "Aether Garden"} /><Fact label="当前项目" value={state.project?.path ?? "未绑定"} /><Fact label="时间状态" value={`${state.time.label} · ${String(state.time.hour).padStart(2, "0")}:${String(state.time.minute).padStart(2, "0")}`} /><Fact label="最近变化" value={state.project?.isDirty ? "工作区有扰动" : state.audio.isPlaying ? "音乐正在流动" : "环境平静"} /></div>
          <div className="fruit-strip"><span className="eyebrow">TODAY'S FRUITS · {state.fruits.length}</span><span>{latestFruit?.label ?? "还没有记录，给今天留下一颗果实"}</span><button className="outline-button" onClick={addFruit}>记录完成</button></div>
        </div>
      </div>
    </ToyFrame>
  );
}

function modeLabel(mode: SpiritMode): string {
  return mode === "sleeping" ? "睡眠" : mode === "active" ? "活跃" : "idle";
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="fact"><span>{label}</span><strong title={value}>{value}</strong></div>;
}
