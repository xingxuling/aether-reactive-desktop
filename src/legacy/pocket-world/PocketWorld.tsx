import { useCallback, useEffect, useRef } from "react";
import { useRuntime } from "../../core/runtime/RuntimeContext";
import { stepWorld } from "./worldSimulation";
import { getTheme } from "../../visual/themes";
import { drawStars, glowCircle } from "../../visual/canvasPrimitives";
import { useCanvasLoop } from "../../visual/useCanvasLoop";
import { ToyFrame } from "../../ui/shell/ToyFrame";
import type { WorldState } from "../../core/types";

export function PocketWorld() {
  const { state, publish, persistNow } = useRuntime();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef(state.world);
  const theme = getTheme(state.settings.theme);
  worldRef.current = state.world;

  useEffect(() => {
    const interval = window.setInterval(() => {
      const next = stepWorld(worldRef.current, 1);
      worldRef.current = next;
      publish({ type: "world:update", payload: next }, { broadcast: true });
    }, state.settings.ecoMode ? 1800 : 900);
    return () => window.clearInterval(interval);
  }, [publish, state.settings.ecoMode]);

  const draw = useCallback((context: CanvasRenderingContext2D, width: number, height: number, time: number) => {
    const world = worldRef.current;
    const night = world.worldHour < 6 || world.worldHour >= 19;
    const sky = context.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, night ? "#050b1a" : theme.skyTop);
    sky.addColorStop(1, night ? "#18264a" : theme.skyBottom);
    context.fillStyle = sky;
    context.fillRect(0, 0, width, height);
    if (night) drawStars(context, width, height, time, 0.00012);
    if (world.weather === "mist") {
      context.fillStyle = "rgba(180, 224, 230, .12)";
      context.fillRect(0, height * 0.38, width, height * 0.3);
    }
    if (world.weather === "rain") {
      context.strokeStyle = "rgba(164, 211, 235, .42)";
      context.lineWidth = 1;
      for (let index = 0; index < 34; index += 1) {
        const x = (index * 47 + time * 32) % width;
        const y = (index * 19 + time * 90) % (height * 0.78);
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x - 3, y + 11);
        context.stroke();
      }
    }
    const ground = height * 0.72;
    context.fillStyle = theme.ground;
    context.beginPath();
    context.moveTo(0, ground);
    context.quadraticCurveTo(width * 0.28, ground - 34, width * 0.55, ground + 4);
    context.quadraticCurveTo(width * 0.8, ground - 24, width, ground - 3);
    context.lineTo(width, height);
    context.lineTo(0, height);
    context.closePath();
    context.fill();

    world.buildingLights.forEach((light, index) => {
      const x = width * (0.19 + index * 0.29);
      const buildingHeight = 45 + index * 17;
      context.fillStyle = "rgba(11, 29, 53, .9)";
      context.fillRect(x, ground - buildingHeight, 54 + index * 6, buildingHeight);
      context.fillStyle = `rgba(232, 201, 129, ${0.2 + light * 0.65})`;
      context.fillRect(x + 13, ground - buildingHeight + 16, 7, 9);
      context.fillRect(x + 33, ground - buildingHeight + 31, 7, 9);
    });
    world.plantGrowth.forEach((growth, index) => {
      const x = width * (0.07 + (index / world.plantGrowth.length) * 0.88);
      const base = ground + 20 + Math.sin(index * 5) * 7;
      context.strokeStyle = index % 2 === 0 ? "#9ce6cf" : "#73c9ff";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(x, base);
      context.quadraticCurveTo(x - 3, base - 10 - growth * 18, x + Math.sin(time + index) * 4, base - 21 - growth * 32);
      context.stroke();
      context.fillStyle = "rgba(156, 230, 207, .78)";
      context.beginPath();
      context.arc(x + Math.sin(time + index) * 4, base - 21 - growth * 32, 4 + growth * 4, 0, Math.PI * 2);
      context.fill();
    });
    world.npcs.forEach((npc, index) => {
      const x = npc.x * width;
      const y = npc.y * height;
      context.fillStyle = index === 1 ? "#e8c981" : "#d7f3ff";
      context.beginPath();
      context.arc(x, y - 9, 7, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#10223a";
      context.beginPath();
      context.ellipse(x, y + 4, 8, 12, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "rgba(220, 243, 255, .55)";
      context.font = "10px Inter, sans-serif";
      context.textAlign = "center";
      context.fillText(npc.name, x, y + 24);
    });
    glowCircle(context, width * 0.82, night ? height * 0.22 : height * 0.18, night ? 25 : 32, night ? "rgba(115, 201, 255, ALPHA)" : "rgba(232, 201, 129, ALPHA)", 0.28);
  }, [theme.ground, theme.skyBottom, theme.skyTop]);
  useCanvasLoop(canvasRef, draw, { paused: state.settings.effectsPaused, ecoMode: state.settings.ecoMode });

  const advance = (ticks: number) => publish({ type: "world:update", payload: stepWorld(worldRef.current, ticks) });
  const saveWorld = async () => {
    const saved: WorldState = { ...worldRef.current, lastSavedAt: new Date().toISOString() };
    worldRef.current = saved;
    publish({ type: "world:update", payload: saved }, { broadcast: true });
    await persistNow();
  };

  const world = state.world;
  return (
    <ToyFrame
      eyebrow="TOY 05 · PERSISTENT MICRO WORLD"
      title="Pocket World"
      description="不是循环动画：它有自己的时间、天气、居民和可恢复的记忆。"
      actions={<><span className="status-pill">SEED {world.seed}</span><button className="primary-button" onClick={() => void saveWorld()}>保存世界</button></>}
    >
      <div className="world-layout">
        <div className="world-stage glass-panel"><canvas ref={canvasRef} className="ambient-canvas" aria-label="桌面微型持续世界" /><div className="world-overlay"><span>{world.weather === "clear" ? "晴" : world.weather === "mist" ? "雾" : "雨"} · {formatWorldHour(world.worldHour)}</span><span>tick {world.tick}</span></div></div>
        <div className="world-panel glass-panel">
          <div className="world-head"><span className="eyebrow">AETHER GARDEN</span><span className="source-badge verified">LOCAL SAVE</span></div>
          <h2>这个小地方会继续存在</h2>
          <div className="npc-list">{world.npcs.map((npc) => <div className="npc-row" key={npc.id}><span className="npc-orb" /><div><strong>{npc.name}</strong><span>{moodLabel(npc.mood)}</span></div><small>能量 {Math.round(npc.energy * 100)}%</small></div>)}</div>
          <div className="world-actions"><button className="outline-button" onClick={() => advance(10)}>前进 10 拍</button><button className="outline-button" onClick={() => advance(120)}>前进一段时间</button></div>
          <div className="event-log"><span className="eyebrow">WORLD EVENTS</span>{world.events.slice(-3).reverse().map((event) => <p key={event}>{event}</p>)}</div>
          <p className="boundary-note">同 seed + 同输入 + 同 tick → 同状态。最近保存：{world.lastSavedAt ? new Date(world.lastSavedAt).toLocaleTimeString() : "尚未保存"}</p>
        </div>
      </div>
    </ToyFrame>
  );
}

function formatWorldHour(hour: number): string {
  const hours = Math.floor(hour).toString().padStart(2, "0");
  const minutes = Math.floor((hour % 1) * 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function moodLabel(mood: WorldState["npcs"][number]["mood"]): string {
  return mood === "wandering" ? "正在漫游" : mood === "resting" ? "正在休息" : mood === "hungry" ? "想找点吃的" : "发现了小事";
}
