import { useCallback, useRef, useState } from "react";
import { pickProjectDirectory, readProjectState } from "../../adapters/tauri";
import { mapProjectToTerrarium, projectStatusLabel } from "../../adapters/git/gitState";
import type { ProjectSnapshot } from "../../core/types";
import { useRuntime } from "../../core/runtime/RuntimeContext";
import { useCanvasLoop, seededNoise } from "../../visual/useCanvasLoop";
import { getTheme } from "../../visual/themes";
import { glowCircle } from "../../visual/canvasPrimitives";
import { ToyFrame } from "../../ui/shell/ToyFrame";

function demoProject(): ProjectSnapshot {
  return {
    path: "demo://aether-garden",
    branch: "main",
    isGit: true,
    isDirty: true,
    commitCount: 36,
    latestCommit: "demo-commit-7f2a",
    latestCommitAt: new Date().toISOString(),
    changedFiles: 4,
    fileCount: 128,
    codeDirectories: ["src", "tests", "docs", "scripts"],
    readAt: new Date().toISOString(),
    source: "demo",
  };
}

export function ProjectTerrarium() {
  const { state, publish } = useRuntime();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [path, setPath] = useState(state.project?.path ?? "");
  const [error, setError] = useState<string | null>(null);
  const project = state.project;
  const mapping = mapProjectToTerrarium(project);
  const theme = getTheme(state.settings.theme);

  const bindProject = async (candidatePath?: string) => {
    setError(null);
    try {
      const selected = candidatePath || await pickProjectDirectory();
      if (!selected) {
        setError("请在 Windows 桌面端选择一个目录。");
        return;
      }
      setPath(selected);
      const snapshot = await readProjectState(selected);
      publish({ type: "project:update", payload: snapshot });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "项目读取失败。");
    }
  };

  const draw = useCallback((context: CanvasRenderingContext2D, width: number, height: number, time: number) => {
    const noise = seededNoise((project?.commitCount ?? 1) + 11);
    context.fillStyle = "#071225";
    context.fillRect(0, 0, width, height);
    const sky = context.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, theme.skyTop);
    sky.addColorStop(1, theme.skyBottom);
    context.fillStyle = sky;
    context.fillRect(0, 0, width, height);
    const horizon = height * 0.66;
    context.fillStyle = theme.ground;
    context.beginPath();
    context.moveTo(0, horizon + 20);
    context.bezierCurveTo(width * 0.22, horizon - 34, width * 0.52, horizon + 20, width, horizon - 20);
    context.lineTo(width, height);
    context.lineTo(0, height);
    context.closePath();
    context.fill();

    const buildingCount = mapping.buildings;
    for (let index = 0; index < buildingCount; index += 1) {
      const x = 28 + (index / Math.max(1, buildingCount - 1)) * (width - 72);
      const buildingHeight = 30 + ((index * 21 + (project?.commitCount ?? 0)) % 55);
      const buildingWidth = 25 + (index % 3) * 12;
      context.fillStyle = `rgba(12, 29, 55, ${0.76 + index * 0.015})`;
      context.fillRect(x, horizon - buildingHeight, buildingWidth, buildingHeight);
      context.fillStyle = project?.isDirty ? "rgba(232, 201, 129, .78)" : "rgba(115, 201, 255, .52)";
      for (let row = 0; row < 3; row += 1) {
        if ((index + row) % 2 === 0) context.fillRect(x + 7, horizon - buildingHeight + 10 + row * 12, 4, 4);
      }
    }
    for (let index = 0; index < mapping.plants; index += 1) {
      const x = 18 + ((index * 71) % Math.max(1, width - 36));
      const base = horizon + 11 + Math.sin(index * 8.1) * 7;
      const heightOfPlant = 10 + ((index * 19) % 20) * (0.55 + mapping.vitality * 0.75);
      context.strokeStyle = index % 3 === 0 ? "#e8c981" : "#9ce6cf";
      context.lineWidth = 1.2;
      context.beginPath();
      context.moveTo(x, base);
      context.quadraticCurveTo(x - 2, base - heightOfPlant / 2, x + Math.sin(time + index) * 3, base - heightOfPlant);
      context.stroke();
      context.fillStyle = "rgba(156, 230, 207, .62)";
      context.beginPath();
      context.arc(x + Math.sin(time + index) * 3, base - heightOfPlant, 3 + noise() * 2, 0, Math.PI * 2);
      context.fill();
    }
    if (mapping.disturbance > 0) {
      glowCircle(context, width * 0.82, horizon + 8, 42 + mapping.disturbance * 30, "rgba(255, 155, 140, ALPHA)", 0.12 + mapping.disturbance * 0.1);
      context.fillStyle = "rgba(255, 155, 140, .84)";
      context.font = "12px Inter, sans-serif";
      context.fillText("workspace ripple", width * 0.68, horizon + 58);
    }
  }, [mapping.buildings, mapping.disturbance, mapping.plants, mapping.vitality, project?.commitCount, project?.isDirty, theme.ground, theme.skyBottom, theme.skyTop]);
  useCanvasLoop(canvasRef, draw, { paused: state.settings.effectsPaused, ecoMode: state.settings.ecoMode });

  return (
    <ToyFrame
      eyebrow="TOY 03 · READ-ONLY GIT"
      title="Project Terrarium"
      description="项目状态只作为视觉隐喻：它描述活动，不判断项目健康。"
      actions={<span className="status-pill">READ ONLY</span>}
    >
      <div className="terrarium-layout">
        <div className="terrarium-stage glass-panel">
          <canvas ref={canvasRef} className="ambient-canvas" aria-label="项目生态缸" />
          <div className="stage-caption"><span>{project?.branch ?? "等待一座项目世界"}</span><span>{project ? `${project.commitCount} commits` : "选择 Git 目录开始"}</span></div>
        </div>
        <div className="terrarium-panel glass-panel">
          <div className="binding-head"><span className="eyebrow">PROJECT BINDING</span><span className={`source-badge ${project?.source === "live" ? "verified" : "candidate"}`}>{project?.source === "live" ? "LIVE" : project?.source === "demo" ? "DEMO" : "IDLE"}</span></div>
          <div className="path-field"><input value={path} onChange={(event) => setPath(event.target.value)} placeholder="Windows 桌面端选择 Git 项目" /><button className="primary-button" onClick={() => void bindProject(path)}>读取</button></div>
          <button className="outline-button full" onClick={() => void bindProject()}>选择本地 Git 目录</button>
          <button className="text-button" onClick={() => publish({ type: "project:update", payload: demoProject() })}>载入视觉演示（DEMO）</button>
          {error ? <p className="error-note">{error}</p> : null}
          <div className="project-status"><strong>{projectStatusLabel(project)}</strong><span>{project?.path ?? "还没有绑定路径"}</span></div>
          <div className="stat-grid">
            <Stat label="Latest" value={project?.latestCommit ? project.latestCommit.slice(0, 8) : "—"} />
            <Stat label="Changed" value={project ? String(project.changedFiles) : "—"} />
            <Stat label="Files" value={project ? String(project.fileCount) : "—"} />
            <Stat label="Vitality" value={project ? `${Math.round(mapping.vitality * 100)}%` : "—"} />
          </div>
          <div className="directory-list"><span className="eyebrow">CODE GROVES</span>{project?.codeDirectories.length ? project.codeDirectories.map((directory) => <span key={directory}>⌁ {directory}</span>) : <span>等待目录结构</span>}</div>
          <p className="boundary-note">只运行 git 读取命令与文件计数，不会 commit、reset、checkout、push 或删除文件。</p>
        </div>
      </div>
    </ToyFrame>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="stat"><span>{label}</span><strong>{value}</strong></div>;
}
