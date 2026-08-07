import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { useRuntime } from "../../core/runtime/RuntimeContext";
import { getTheme } from "../../visual/themes";
import { glowCircle } from "../../visual/canvasPrimitives";
import { useCanvasLoop } from "../../visual/useCanvasLoop";
import { ToyFrame } from "../../ui/shell/ToyFrame";
import { useAudioAnalyzer } from "./useAudioAnalyzer";

export function MusicHalo() {
  const { state, publish } = useRuntime();
  const { audioRef, handleFile, metrics, fileName, status } = useAudioAnalyzer();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const metricsRef = useRef(metrics);
  const [dragging, setDragging] = useState(false);
  metricsRef.current = metrics;
  const theme = getTheme(state.settings.theme);

  useEffect(() => {
    const now = Date.now();
    const last = Number(sessionStorage.getItem("aether:last-audio-event") ?? "0");
    if (now - last < 220) return;
    sessionStorage.setItem("aether:last-audio-event", String(now));
    publish({ type: "audio:update", payload: metrics }, { broadcast: true });
  }, [metrics, publish]);

  const draw = useCallback((context: CanvasRenderingContext2D, width: number, height: number, time: number) => {
    const current = metricsRef.current;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) * 0.32;
    context.fillStyle = "rgba(4, 10, 26, .96)";
    context.fillRect(0, 0, width, height);
    const haloRadius = maxRadius * (0.72 + current.amplitude * 0.32 + Math.sin(time * 2.2) * 0.018);
    glowCircle(context, centerX, centerY, haloRadius * 2.1, "rgba(115, 201, 255, ALPHA)", 0.15 + current.energy * 0.13);
    context.strokeStyle = theme.accent;
    context.lineWidth = 2 + current.low * 4;
    context.globalAlpha = 0.64 + current.amplitude * 0.32;
    context.beginPath();
    context.arc(centerX, centerY, haloRadius, time * 0.18, time * 0.18 + Math.PI * 1.83);
    context.stroke();
    context.strokeStyle = "rgba(232, 201, 129, .7)";
    context.lineWidth = 1.2 + current.high * 2;
    context.beginPath();
    context.arc(centerX, centerY, haloRadius * 0.78, -time * 0.26, -time * 0.26 + Math.PI * 1.45);
    context.stroke();

    const bars = current.frequency.length || 32;
    for (let index = 0; index < bars; index += 1) {
      const value = current.frequency[index] ?? 0;
      const angle = (index / bars) * Math.PI * 2 + time * 0.1;
      const inner = haloRadius * 1.08;
      const outer = inner + 12 + value * (42 + current.energy * 28);
      const x1 = centerX + Math.cos(angle) * inner;
      const y1 = centerY + Math.sin(angle) * inner;
      const x2 = centerX + Math.cos(angle) * outer;
      const y2 = centerY + Math.sin(angle) * outer;
      context.globalAlpha = 0.22 + value * 0.78;
      context.strokeStyle = index % 5 === 0 ? "#e8c981" : theme.accent;
      context.lineWidth = 1 + value * 2;
      context.beginPath();
      context.moveTo(x1, y1);
      context.lineTo(x2, y2);
      context.stroke();
    }
    context.globalAlpha = 1;
    context.fillStyle = "rgba(220, 243, 255, .92)";
    context.textAlign = "center";
    context.font = "600 15px Inter, sans-serif";
    context.fillText(current.isPlaying ? "LISTENING" : "STANDBY", centerX, centerY + 5);
    context.font = "12px Inter, sans-serif";
    context.fillStyle = "rgba(220, 243, 255, .58)";
    context.fillText(`${Math.round(current.energy * 100)}% energy`, centerX, centerY + 27);
  }, [theme.accent]);
  useCanvasLoop(canvasRef, draw, { paused: state.settings.effectsPaused, ecoMode: state.settings.ecoMode });

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    handleFile(event.dataTransfer.files[0] ?? null);
  };

  return (
    <ToyFrame
      eyebrow="TOY 02 · LOCAL AUDIO"
      title="Music Halo"
      description="拖进一段本地声音，看低频、中频和高频如何改变光环。"
      actions={<span className={`status-dot ${metrics.isPlaying ? "live" : ""}`}><i />{metrics.isPlaying ? "分析中" : "待机"}</span>}
    >
      <div className="halo-layout">
        <div className="halo-stage glass-panel">
          <canvas ref={canvasRef} className="ambient-canvas" aria-label="音乐光环频谱" />
        </div>
        <div className="halo-controls glass-panel">
          <label className={`file-drop ${dragging ? "dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
            <input type="file" accept="audio/mpeg,audio/wav,audio/flac,audio/ogg,audio/mp4,.mp3,.wav,.flac,.ogg,.m4a" onChange={(event) => handleFile(event.target.files?.[0] ?? null)} />
            <span className="drop-icon">∿</span>
            <strong>{fileName ?? "拖入本地音频"}</strong>
            <small>{status}</small>
          </label>
          <audio ref={audioRef} controls preload="metadata" />
          <div className="metric-grid">
            <Metric label="Energy" value={metrics.energy} color="blue" />
            <Metric label="Low" value={metrics.low} color="gold" />
            <Metric label="Mid" value={metrics.mid} color="mint" />
            <Metric label="High" value={metrics.high} color="violet" />
          </div>
          <p className="boundary-note">LocalAudioSource · VERIFIED IN WEB AUDIO PATH<br />SystemAudioSource / WASAPI Loopback · CANDIDATE</p>
        </div>
      </div>
    </ToyFrame>
  );
}

function Metric({ label, value, color }: { label: string; value: number; color: string }) {
  return <div className="metric"><div><span>{label}</span><strong>{Math.round(value * 100)}</strong></div><div className={`meter ${color}`}><i style={{ width: `${Math.round(value * 100)}%` }} /></div></div>;
}
