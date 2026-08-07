import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ReactiveRuntimeContext, useReactiveRuntime } from "../core/reactive-state/ReactiveRuntimeContext";
import { createDefaultReactiveDesktopState, createTimeState } from "../core/reactive-state/defaultState";
import { migrateReactiveDesktopState, reduceReactiveDesktopState } from "../core/reactive-state/reducer";
import type { AudioReactiveState, MediaState, ReactiveDesktopState, ReactiveIntensity, ReactiveSceneId, ReactiveStateEvent } from "../core/reactive-state/types";
import { AETHER_SCENES, getScene } from "../scenes/registry/sceneRegistry";
import { ReactiveSceneCanvas } from "../visual/compositor/ReactiveSceneCanvas";
import { makeDemoAudioState } from "../scenes/runtime/sceneRuntime";
import { LocalAudioPlayer } from "../ui/music/LocalAudioPlayer";
import {
  broadcastReactiveState,
  disableWallpaper,
  discoverDesktopHost,
  enableWallpaper,
  getForegroundWindow,
  getMediaSessionReport,
  listenToReactiveAudio,
  listenToReactiveState,
  listenToNavigation,
  listenToPause,
  loadReactiveState,
  saveReactiveState,
  setLaunchOnLogin,
  startSystemAudio,
} from "../platform/windows/desktopAdapter";
import type { DesktopHostReport, MediaSessionReport, SystemAudioReport } from "../platform/windows/types";

type Screen = "home" | "scenes" | "music" | "wallpaper" | "aura" | "settings";

interface NativeStatus {
  wallpaper: DesktopHostReport | null;
  audio: SystemAudioReport | null;
  media: MediaSessionReport | null;
}

export function App() {
  const isWallpaperWindow = useMemo(() => new URLSearchParams(window.location.search).get("wallpaper") === "1", []);
  const [state, setState] = useState<ReactiveDesktopState>(() => createDefaultReactiveDesktopState());
  const stateRef = useRef(state);
  const [hydrated, setHydrated] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [demoMode, setDemoMode] = useState(false);
  const [firstRunMessage, setFirstRunMessage] = useState<string | null>(null);
  const [nativeStatus, setNativeStatus] = useState<NativeStatus>({ wallpaper: null, audio: null, media: null });
  const sensorsStartedRef = useRef(false);
  stateRef.current = state;

  const dispatch = useCallback((event: ReactiveStateEvent, broadcast = true) => {
    const next = reduceReactiveDesktopState(stateRef.current, event);
    stateRef.current = next;
    setState(next);
    if (broadcast) void broadcastReactiveState(next);
  }, []);

  const persistNow = useCallback(async () => saveReactiveState(stateRef.current), []);

  useEffect(() => {
    let mounted = true;
    void loadReactiveState().then((stored) => {
      if (!mounted || !stored) return;
      const restored = migrateReactiveDesktopState(stored);
      stateRef.current = restored;
      setState(restored);
    }).finally(() => {
      if (mounted) setHydrated(true);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!hydrated) return undefined;
    const timer = window.setTimeout(() => void persistNow(), 680);
    return () => window.clearTimeout(timer);
  }, [hydrated, persistNow, state]);

  useEffect(() => {
    if (!hydrated) return undefined;
    let disposeAudio: () => void = () => undefined;
    let disposeState: () => void = () => undefined;
    void listenToReactiveAudio((audio) => {
      setDemoMode(false);
      dispatch({ type: "audio:update", payload: audio }, false);
      dispatch({ type: "scene:update", payload: { audioMode: "system" } }, false);
    }).then((dispose) => { disposeAudio = dispose; });
    void listenToReactiveState((next) => {
      const restored = migrateReactiveDesktopState(next);
      stateRef.current = restored;
      setState(restored);
    }).then((dispose) => { disposeState = dispose; });
    return () => {
      disposeAudio();
      disposeState();
    };
  }, [dispatch, hydrated]);

  useEffect(() => {
    if (!hydrated || isWallpaperWindow || !demoMode) return undefined;
    const timer = window.setInterval(() => dispatch({ type: "audio:update", payload: makeDemoAudioState(Date.now()) }), 110);
    return () => window.clearInterval(timer);
  }, [demoMode, dispatch, hydrated, isWallpaperWindow]);

  useEffect(() => {
    if (!hydrated || isWallpaperWindow) return undefined;
    const clock = window.setInterval(() => dispatch({ type: "time:update", payload: createTimeState() }, false), 30_000);
    const pointer = (event: PointerEvent) => dispatch({ type: "pointer:update", payload: { x: event.clientX, y: event.clientY, screenId: null, active: true, updatedAt: new Date().toISOString() } }, false);
    window.addEventListener("pointermove", pointer, { passive: true });
    return () => {
      window.clearInterval(clock);
      window.removeEventListener("pointermove", pointer);
    };
  }, [dispatch, hydrated, isWallpaperWindow]);

  useEffect(() => {
    if (!hydrated) return undefined;
    let frameHandle = 0;
    let frameCount = 0;
    let totalFrameTime = 0;
    let lastFrameAt = performance.now();
    let sampleStartedAt = lastFrameAt;
    const frame = (now: number) => {
      const frameTime = Math.max(0, now - lastFrameAt);
      lastFrameAt = now;
      frameCount += 1;
      totalFrameTime += frameTime;
      frameHandle = window.requestAnimationFrame(frame);
    };
    const sample = () => {
      const now = performance.now();
      const elapsed = Math.max(1, now - sampleStartedAt);
      const fps = frameCount * 1000 / elapsed;
      const frameTimeMs = frameCount > 0 ? totalFrameTime / frameCount : 1000 / Math.max(1, fps);
      const performanceWithMemory = window.performance as Performance & { memory?: { usedJSHeapSize: number } };
      const memoryMb = performanceWithMemory.memory ? performanceWithMemory.memory.usedJSHeapSize / (1024 * 1024) : null;
      const audioBins = stateRef.current.audioState.frequencyBins.length;
      dispatch({
        type: "performance:update",
        payload: {
          fps: Number(fps.toFixed(1)),
          frameTimeMs: Number(frameTimeMs.toFixed(2)),
          memoryMb: memoryMb === null ? null : Number(memoryMb.toFixed(1)),
          renderWorkload: Math.min(1, Math.max(0, frameTimeMs / 16.67)),
          audioProcessingWorkload: stateRef.current.audioState.audioActive ? Math.min(1, 0.06 + audioBins / 480) : 0,
          documentVisible: document.visibilityState === "visible",
          sampleCount: stateRef.current.performanceState.sampleCount + 1,
        },
      });
      frameCount = 0;
      totalFrameTime = 0;
      sampleStartedAt = now;
    };
    frameHandle = window.requestAnimationFrame(frame);
    const sampleTimer = window.setInterval(sample, 2_000);
    return () => {
      window.cancelAnimationFrame(frameHandle);
      window.clearInterval(sampleTimer);
    };
  }, [dispatch, hydrated]);

  useEffect(() => {
    if (!hydrated || isWallpaperWindow) return undefined;
    let disposeNavigation: () => void = () => undefined;
    let disposePause: () => void = () => undefined;
    void listenToNavigation((route) => {
      if (route.startsWith("scene:")) {
        const id = route.slice("scene:".length) as ReactiveSceneId;
        if (AETHER_SCENES.some((scene) => scene.id === id)) dispatch({ type: "scene:update", payload: { activeSceneId: id, previewSceneId: null } });
        return;
      }
      if (["home", "scenes", "music", "wallpaper", "aura", "settings"].includes(route)) setScreen(route as Screen);
    }).then((dispose) => { disposeNavigation = dispose; });
    void listenToPause((paused) => dispatch({ type: "scene:update", payload: { paused } })).then((dispose) => { disposePause = dispose; });
    return () => {
      disposeNavigation();
      disposePause();
    };
  }, [dispatch, hydrated, isWallpaperWindow]);

  useEffect(() => {
    if (!hydrated || isWallpaperWindow) return undefined;
    let cancelled = false;
    const refreshWindow = async () => {
      const snapshot = await getForegroundWindow();
      if (cancelled) return;
      dispatch({ type: "foreground-window:update", payload: { ...snapshot, tracking: snapshot.available ? "live" : "unavailable" } }, false);
    };
    void refreshWindow();
    const timer = window.setInterval(() => void refreshWindow(), 1_500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [dispatch, hydrated, isWallpaperWindow]);

  const startAudio = useCallback(async () => {
    const report = await startSystemAudio();
    setNativeStatus((current) => ({ ...current, audio: report }));
    if (report.available && (report.status === "running" || report.status === "candidate")) {
      setDemoMode(false);
      dispatch({ type: "scene:update", payload: { audioMode: "system", audioReactiveEnabled: true } });
      return report;
    }
    // A failed or unavailable system-audio provider must stay quiet. Demo Pulse
    // is an explicit user action in Music Halo, not a silent success substitute.
    setDemoMode(false);
    dispatch({ type: "scene:update", payload: { audioMode: "system", audioReactiveEnabled: true } });
    return report;
  }, [dispatch]);

  const startDemo = useCallback(() => {
    setDemoMode(true);
    dispatch({ type: "audio:update", payload: makeDemoAudioState(Date.now()) });
  }, [dispatch]);

  const startAether = useCallback(async () => {
    setFirstRunMessage(null);
    sensorsStartedRef.current = true;
    dispatch({ type: "first-run:complete" });
    dispatch({ type: "scene:update", payload: { activeSceneId: "deep-sky", previewSceneId: null, wallpaperEnabled: true, audioReactiveEnabled: true, paused: false } });
    const [wallpaperReport, audioReport] = await Promise.all([enableWallpaper(), startAudio()]);
    setNativeStatus((current) => ({ ...current, wallpaper: wallpaperReport, audio: audioReport }));
    dispatch({ type: "display:update", payload: { wallpaperHostStatus: wallpaperReport.status, wallpaperHost: wallpaperReport.hostFound ? "WorkerW" : null, monitorCount: wallpaperReport.display.monitorCount, dpiScale: wallpaperReport.display.dpiScale, virtualBounds: wallpaperReport.display.virtualBounds, lastHostCheckAt: wallpaperReport.checkedAt } });
    const notices: string[] = [];
    if (!audioReport.available || audioReport.status === "blocked" || audioReport.status === "error") {
      notices.push("暂时没有检测到系统声音。当前保持 Quiet，不会自动播放 Demo；请在 Music Halo 中手动选择 Play Demo 或本地音频。");
    }
    if (!wallpaperReport.hostFound) {
      notices.push("桌面 Host 暂时没有挂载成功；已保留可见预览，状态会明确显示为 CANDIDATE / BLOCKED。");
    }
    setFirstRunMessage(notices.length > 0 ? notices.join(" ") : null);
    setScreen("home");
  }, [dispatch, startAudio]);

  useEffect(() => {
    if (!hydrated || isWallpaperWindow || sensorsStartedRef.current || !stateRef.current.firstRunCompleted) return;
    sensorsStartedRef.current = true;
    void getMediaSessionReport().then((media) => setNativeStatus((current) => ({ ...current, media })));
    void startAudio();
  }, [hydrated, isWallpaperWindow, startAudio]);

  useEffect(() => {
    const saveWhenHidden = () => {
      if (document.visibilityState === "hidden") void persistNow();
    };
    document.addEventListener("visibilitychange", saveWhenHidden);
    return () => document.removeEventListener("visibilitychange", saveWhenHidden);
  }, [persistNow]);

  const contextValue = useMemo(() => ({ state, dispatch, persistNow }), [dispatch, persistNow, state]);
  if (isWallpaperWindow) return <ReactiveRuntimeContext.Provider value={contextValue}><WallpaperSurface state={state} /></ReactiveRuntimeContext.Provider>;

  if (!hydrated) return <div className="boot-screen"><span className="brand-mark">✦</span><p>正在让桌面醒来…</p></div>;
  if (!state.firstRunCompleted) return <ReactiveRuntimeContext.Provider value={contextValue}><FirstRunView onStart={startAether} message={firstRunMessage} state={state} /></ReactiveRuntimeContext.Provider>;

  return (
    <ReactiveRuntimeContext.Provider value={contextValue}>
      <div className="app-shell">
        <Header state={state} onPause={() => dispatch({ type: "scene:update", payload: { paused: !state.sceneState.paused } })} />
        <div className="app-body">
          <Sidebar screen={screen} onNavigate={setScreen} state={state} />
          <main className="main-content">
            {screen === "home" ? <HomeView state={state} onNavigate={setScreen} onStartAudio={startAudio} message={firstRunMessage} /> : null}
            {screen === "scenes" ? <SceneBrowser state={state} onNavigate={setScreen} /> : null}
            {screen === "music" ? <MusicView state={state} onStartAudio={startAudio} onDemo={startDemo} onLocalAudio={(audio) => { setDemoMode(false); dispatch({ type: "audio:update", payload: audio }); dispatch({ type: "scene:update", payload: { audioMode: "local" } }); }} onMedia={(media) => dispatch({ type: "media:update", payload: media })} /> : null}
            {screen === "wallpaper" ? <WallpaperView state={state} report={nativeStatus.wallpaper} onReport={(report) => { setNativeStatus((current) => ({ ...current, wallpaper: report })); dispatch({ type: "display:update", payload: { wallpaperHostStatus: report.status, wallpaperHost: report.hostFound ? "WorkerW" : null, monitorCount: report.display.monitorCount, dpiScale: report.display.dpiScale, virtualBounds: report.display.virtualBounds, lastHostCheckAt: report.checkedAt } }); }} /> : null}
            {screen === "aura" ? <AuraView state={state} /> : null}
            {screen === "settings" ? <SettingsView state={state} onStartup={async (enabled) => { const applied = await setLaunchOnLogin(enabled); dispatch({ type: "startup:update", payload: applied && enabled }); }} /> : null}
          </main>
        </div>
      </div>
    </ReactiveRuntimeContext.Provider>
  );
}

function Header({ state, onPause }: { state: ReactiveDesktopState; onPause: () => void }) {
  const listening = state.audioState.audioActive && !state.sceneState.paused;
  return <header className="topbar"><div className="brand"><span className="brand-mark">✦</span><span><strong>Aether</strong><small>Reactive Desktop</small></span></div><div className="topbar-status"><span className={`status-dot ${listening ? "live" : ""}`}><i />{listening ? "Listening" : "Quiet"}</span><span>{formatClock(state.timeState.hour, state.timeState.minute)}</span><span className="divider" /><span className="local-badge">LOCAL ONLY</span></div><div className="topbar-actions"><button className="icon-button" onClick={onPause} title={state.sceneState.paused ? "恢复视觉" : "暂停视觉"}>{state.sceneState.paused ? "▶" : "Ⅱ"}</button></div></header>;
}

function Sidebar({ screen, onNavigate, state }: { screen: Screen; onNavigate: (screen: Screen) => void; state: ReactiveDesktopState }) {
  const entries: Array<{ id: Screen; label: string; chinese: string; glyph: string }> = [
    { id: "home", label: "Overview", chinese: "总览", glyph: "◌" },
    { id: "scenes", label: "Scenes", chinese: "场景", glyph: "✧" },
    { id: "music", label: "Music Halo", chinese: "音乐光环", glyph: "∿" },
    { id: "wallpaper", label: "Wallpaper", chinese: "动态桌面", glyph: "▧" },
    { id: "aura", label: "Window Aura", chinese: "窗口光环", glyph: "⌁" },
    { id: "settings", label: "Settings", chinese: "设置", glyph: "⚙" },
  ];
  return <aside className="sidebar"><div className="sidebar-label">AETHER REACTIVE DESKTOP</div><nav>{entries.map((entry) => <button key={entry.id} className={`nav-item ${screen === entry.id ? "active" : ""}`} onClick={() => onNavigate(entry.id)}><span className="nav-glyph">{entry.glyph}</span><span><strong>{entry.label}</strong><small>{entry.chinese}</small></span></button>)}</nav><div className="sidebar-footer"><span className="sidebar-label">RUNTIME</span><span className="runtime-line"><i className="pulse" /> Reactive Runtime v0.2</span><span className="runtime-line muted">{state.performanceState.profile} · {state.sceneState.audioMode === "system" ? "system audio" : state.sceneState.audioMode}</span><span className="runtime-line muted">{state.displayState.wallpaperHostStatus === "attached" ? "WorkerW attached" : "wallpaper candidate"}</span></div></aside>;
}

function HomeView({ state, onNavigate, onStartAudio, message }: { state: ReactiveDesktopState; onNavigate: (screen: Screen) => void; onStartAudio: () => Promise<SystemAudioReport>; message: string | null }) {
  const scene = getScene(state.sceneState.activeSceneId);
  return <div className="home-view"><section className="home-intro"><div><span className="eyebrow">AETHER REACTIVE DESKTOP / V0.2</span><h1>让整个 Windows 桌面对<br /><em>正在发生的事情</em>产生反应。</h1><p>声音、时间、媒体和当前窗口进入同一个 Reactive Runtime，最后变成一层会呼吸的桌面环境。</p></div><div className="intro-orbit"><span className="orbit-ring ring-one" /><span className="orbit-ring ring-two" /><span className="orbit-core">✦</span></div></section><section className="current-scene-panel"><div className="section-heading"><div><span className="eyebrow">CURRENT SCENE</span><h2>{scene.name} <small>{scene.chineseName}</small></h2></div><button className="outline-button" onClick={() => onNavigate("scenes")}>Change Scene <b>↗</b></button></div><div className="home-scene-stage"><ReactiveSceneCanvas state={state} showWindowAura /><div className="scene-stage-overlay"><div><span className="status-pill"><i className="pulse" /> {state.audioState.audioActive ? "RESPONDING" : "AMBIENT"}</span><strong>{scene.description}</strong></div><div className="stage-metrics"><span>{state.sceneState.audioMode === "system" ? "System Audio" : state.sceneState.audioMode === "local" ? "Local File" : "Silent"}</span><span>{state.sceneState.auraEnabled ? "Aura On" : "Aura Off"}</span><span>{state.performanceState.profile}</span></div></div></div></section><section className="home-grid"><div className="signal-card glass-panel"><div className="card-topline"><span className="eyebrow">MUSIC HALO PRO</span><span className={`source-badge ${state.audioState.audioActive ? "verified" : "candidate"}`}>{state.audioState.audioActive ? "ACTIVE" : "QUIET"}</span></div><h3>{state.audioState.audioActive ? "桌面正在听" : "准备听见你的声音"}</h3><p>{state.audioState.audioActive ? `${Math.round(state.audioState.energy * 100)}% energy · ${state.audioState.source}` : "System Audio / Local File / Demo Pulse"}</p><button className="text-button" onClick={() => onNavigate("music")}>{state.audioState.audioActive ? "打开 Music Halo" : "开始监听声音"} →</button></div><div className="signal-card glass-panel"><div className="card-topline"><span className="eyebrow">WINDOW AURA</span><span className="source-badge candidate">{state.foregroundWindowState.tracking === "live" ? "LIVE" : "CANDIDATE"}</span></div><h3>{state.foregroundWindowState.processName ?? "当前窗口"}</h3><p>{state.foregroundWindowState.title ?? "切换窗口，观察光环如何跟随。"}</p><button className="text-button" onClick={() => onNavigate("aura")}>调整 Window Aura →</button></div></section>{message ? <div className="notice candidate-note">{message}</div> : null}<div className="home-footnote"><span><i className="pulse" /> 本地运行 · 你的声音与窗口不上传</span><span>Computer Reality → Living Visual System</span></div></div>;
}

function SceneBrowser({ state, onNavigate }: { state: ReactiveDesktopState; onNavigate: (screen: Screen) => void }) {
  const { dispatch } = useReactiveRuntime();
  const previewId = state.sceneState.previewSceneId;
  const selected = getScene(previewId ?? state.sceneState.activeSceneId);
  return <div className="page-view"><PageHeading eyebrow="SCENE BROWSER" title="选择一种完整的桌面回应" description="Scene 会同时编排壁纸、音乐光场、专辑封面和窗口 Aura。先预览，再应用。" action={<button className="outline-button" onClick={() => onNavigate("home")}>回到总览</button>} /><div className="scene-grid">{AETHER_SCENES.map((scene) => { const previewState = { ...state, sceneState: { ...state.sceneState, activeSceneId: scene.id, previewSceneId: null } }; return <button className={`scene-card ${scene.id === selected.id ? "selected" : ""}`} key={scene.id} onClick={() => onNavigateScene(scene.id)}><div className="scene-card-preview"><ReactiveSceneCanvas state={previewState} compact /></div><div className="scene-card-copy"><span className="eyebrow">{scene.label}</span><strong>{scene.name}</strong><small>{scene.chineseName}</small><p>{scene.description}</p></div></button>; })}</div><div className="scene-apply-bar glass-panel"><div><span className="eyebrow">PREVIEW</span><strong>{selected.name} · {selected.chineseName}</strong><p>{selected.description}</p></div><button className="primary-button" onClick={() => applyScene(selected.id)}>Apply Scene</button></div></div>;

  function onNavigateScene(id: ReactiveSceneId) {
    dispatch({ type: "scene:update", payload: { previewSceneId: id } });
  }

  function applyScene(id: ReactiveSceneId) {
    dispatch({ type: "scene:update", payload: { activeSceneId: id, previewSceneId: null } });
  }
}

function MusicView({ state, onStartAudio, onDemo, onLocalAudio, onMedia }: { state: ReactiveDesktopState; onStartAudio: () => Promise<SystemAudioReport>; onDemo: () => void; onLocalAudio: (audio: AudioReactiveState) => void; onMedia: (media: MediaState) => void }) {
  const [busy, setBusy] = useState(false);
  const start = async () => { setBusy(true); await onStartAudio(); setBusy(false); };
  return <div className="page-view"><PageHeading eyebrow="MUSIC HALO PRO" title="让桌面听见正在播放的声音" description="System Audio 是主路径，Local File 保留为可控的回退；没有媒体元数据时，视觉继续用 Generic Cover 响应。" /><div className="music-hero glass-panel"><div className="music-copy"><span className="status-pill"><i className={`pulse ${state.audioState.audioActive ? "live-pulse" : ""}`} /> {state.audioState.audioActive ? "LISTENING" : "QUIET"}</span><h2>{state.audioState.audioActive ? "反应已经在发生" : "现在播放一首歌"}</h2><p>{state.audioState.audioActive ? `${Math.round(state.audioState.energy * 100)}% energy · bass ${Math.round(state.audioState.bass * 100)} · mid ${Math.round(state.audioState.mid * 100)} · treble ${Math.round(state.audioState.treble * 100)}` : "Aether 会尝试接入 Windows 系统混音；如果不可用，你仍可以播放 Demo 或导入本地文件。"}</p><div className="button-row"><button className="primary-button" onClick={() => void start()} disabled={busy}>{busy ? "正在连接…" : "System Audio"}</button><button className="outline-button" onClick={onDemo}>Play Demo</button></div></div><div className="music-orb"><ReactiveSceneCanvas state={state} compact /></div></div><div className="music-columns"><section className="glass-panel panel-pad"><div className="card-topline"><span className="eyebrow">LOCAL FILE MODE</span><span className="source-badge verified">AVAILABLE</span></div><LocalAudioPlayer onAudio={onLocalAudio} onMedia={onMedia} /></section><section className="glass-panel panel-pad"><div className="card-topline"><span className="eyebrow">LIVING ALBUM COVER</span><span className={`source-badge ${state.mediaState.availability === "available" ? "verified" : "candidate"}`}>{state.mediaState.availability.toUpperCase()}</span></div><h3>{state.mediaState.title ?? "Generic Cover"}</h3><p>{state.mediaState.artist ?? "等待媒体提供标题与艺术家"}</p><p className="boundary-note">Provider: {state.mediaState.provider} · {state.mediaState.albumArtUrl ? "真实封面" : "程序化封面"}<br />GSMTC: metadata provider status is reported honestly.</p><div className="latency-grid"><Metric label="Capture" value={state.audioState.captureLatencyMs} /><Metric label="DSP" value={state.audioState.dspLatencyMs} /><Metric label="Render" value={state.audioState.renderLatencyMs} /><Metric label="Total" value={state.audioState.totalVisualResponseLatencyMs} /></div></section></div></div>;
}

function WallpaperView({ state, report, onReport }: { state: ReactiveDesktopState; report: DesktopHostReport | null; onReport: (report: DesktopHostReport) => void }) {
  const [busy, setBusy] = useState(false);
  const check = async () => { setBusy(true); const next = await discoverDesktopHost(); onReport(next); setBusy(false); };
  const enable = async () => { setBusy(true); const next = await enableWallpaper(); onReport(next); setBusy(false); };
  const disable = async () => { setBusy(true); await disableWallpaper(); const next = await discoverDesktopHost(); onReport(next); setBusy(false); };
  const current = report ?? { status: state.displayState.wallpaperHostStatus === "attached" ? "attached" : "candidate", hostFound: state.displayState.wallpaperHostStatus === "attached", strategy: "Progman → WorkerW → SHELLDLL_DefView", evidence: "等待真实 Windows 检查。", checkedAt: state.displayState.lastHostCheckAt ?? "—", progman: null, shellDefView: null, workerW: null, display: { monitorCount: state.displayState.monitorCount, dpiScale: state.displayState.dpiScale, virtualBounds: state.displayState.virtualBounds } };
  return <div className="page-view"><PageHeading eyebrow="TRUE AETHER WALLPAPER" title="把视觉放到 Windows 桌面层" description="这里展示的是原生挂载边界。普通无边框窗口、置底窗口和假全屏不会被标记为 Verified。" action={<button className="outline-button" onClick={() => void check()} disabled={busy}>{busy ? "检查中…" : "Discover Desktop Host"}</button>} /><div className="wallpaper-layout"><div className="wallpaper-preview glass-panel"><ReactiveSceneCanvas state={state} /><div className="preview-corner"><span className={`source-badge ${current.status === "attached" ? "verified" : "candidate"}`}>TRUE WALLPAPER = {current.status.toUpperCase()}</span></div></div><section className="glass-panel panel-pad native-report"><div className="card-topline"><span className="eyebrow">WINDOWS NATIVE BOUNDARY</span><span className={`source-badge ${current.hostFound ? "verified" : "candidate"}`}>{current.hostFound ? "HOST FOUND" : "CANDIDATE"}</span></div><h3>{current.hostFound ? "WorkerW host 已发现" : "等待 WorkerW host"}</h3><p>{current.evidence}</p><dl className="report-list"><div><dt>Strategy</dt><dd>{current.strategy}</dd></div><div><dt>Progman</dt><dd>{formatHandle(current.progman)}</dd></div><div><dt>SHELLDLL_DefView</dt><dd>{formatHandle(current.shellDefView)}</dd></div><div><dt>WorkerW</dt><dd>{formatHandle(current.workerW)}</dd></div><div><dt>Display</dt><dd>{current.display.monitorCount} monitor · {current.display.dpiScale.toFixed(2)}x</dd></div></dl><div className="button-row"><button className="primary-button" onClick={() => void enable()} disabled={busy}>Enable Wallpaper</button><button className="outline-button" onClick={() => void disable()} disabled={busy}>Restore Desktop</button></div><p className="boundary-note">Hard acceptance A–J requires Windows Integration Evidence. This screen does not promote a candidate to TRUE_WALLPAPER_VERIFIED.</p></section></div></div>;
}

function AuraView({ state }: { state: ReactiveDesktopState }) {
  const { dispatch } = useReactiveRuntime();
  const { foregroundWindowState: foreground } = state;
  const intensity: ReactiveIntensity = state.sceneState.auraIntensity;
  return <div className="page-view"><PageHeading eyebrow="WINDOW AURA" title="让当前窗口成为光场的一部分" description="Aura 默认克制、可关闭并且必须 click-through。第一版对独占全屏/反作弊冲突保持暂停边界。" /><div className="aura-layout"><div className="aura-preview glass-panel"><ReactiveSceneCanvas state={state} showWindowAura /><div className="aura-window-mock"><span>{foreground.processName ?? "Foreground Window"}</span><strong>{foreground.title ?? "等待切换窗口"}</strong><small>{foreground.bounds ? `${foreground.bounds.width} × ${foreground.bounds.height}` : "Native tracking candidate"}</small></div></div><section className="glass-panel panel-pad aura-controls"><div className="card-topline"><span className="eyebrow">FOREGROUND TRACKING</span><span className={`source-badge ${foreground.tracking === "live" ? "verified" : "candidate"}`}>{foreground.tracking.toUpperCase()}</span></div><h3>{foreground.processName ?? "没有读取到活动窗口"}</h3><p>{foreground.title ?? "打开或切换一个窗口，Aether 会以最小隐私信息追踪其边界。"}</p><label className="toggle-row"><span><strong>Window Aura</strong><small>不拦截鼠标、拖放、滚轮或键盘</small></span><input type="checkbox" checked={state.sceneState.auraEnabled} onChange={(event) => dispatchGlobal({ auraEnabled: event.target.checked })} /></label><div className="setting-group"><span className="eyebrow">INTENSITY</span><div className="segmented">{(["off", "subtle", "normal", "strong"] as ReactiveIntensity[]).map((value) => <button key={value} className={intensity === value ? "selected" : ""} onClick={() => dispatchGlobal({ auraIntensity: value })}>{value}</button>)}</div></div><p className="boundary-note">Maximized / minimized / multi-display / DPI / fullscreen recovery remains a Windows integration gate. Current evidence is {foreground.tracking === "live" ? "live tracking" : "candidate"}.</p></section></div></div>;

  function dispatchGlobal(payload: Partial<ReactiveDesktopState["sceneState"]>) { dispatch({ type: "scene:update", payload }); }
}

function SettingsView({ state, onStartup }: { state: ReactiveDesktopState; onStartup: (enabled: boolean) => Promise<void> }) {
  const { dispatch } = useReactiveRuntime();
  return <div className="page-view"><PageHeading eyebrow="SETTINGS" title="把复杂性留给系统" description="普通用户只需要 Scene、强度、动作和性能档位；原生边界与证据状态在这里透明可见。" /><div className="settings-grid"><section className="glass-panel panel-pad"><span className="eyebrow">PERFORMANCE PROFILE</span><h3>{state.performanceState.profile === "balanced" ? "Balanced 默认" : state.performanceState.profile === "quality" ? "Quality 高质量" : "Eco 低占用"}</h3><div className="segmented wide">{(["quality", "balanced", "eco"] as const).map((profile) => <button key={profile} className={state.performanceState.profile === profile ? "selected" : ""} onClick={() => dispatch({ type: "performance:update", payload: { profile } })}>{profile}</button>)}</div><div className="telemetry-grid"><Metric label="FPS" value={state.performanceState.fps || null} suffix="" /><Metric label="Frame" value={state.performanceState.frameTimeMs || null} suffix="ms" /><Metric label="Memory" value={state.performanceState.memoryMb} suffix="MB" /><Metric label="Render" value={state.performanceState.renderWorkload * 100} suffix="%" /></div></section><section className="glass-panel panel-pad"><span className="eyebrow">LIFECYCLE</span><label className="toggle-row"><span><strong>Launch with Windows</strong><small>默认关闭；开启后不弹主窗口，恢复 Scene 与传感器</small></span><input type="checkbox" checked={state.startupEnabled} onChange={(event) => void onStartup(event.target.checked)} /></label><label className="toggle-row"><span><strong>Audio Reactive</strong><small>System Audio → DSP → Reactive State</small></span><input type="checkbox" checked={state.sceneState.audioReactiveEnabled} onChange={(event) => dispatchGlobal({ audioReactiveEnabled: event.target.checked })} /></label><label className="toggle-row"><span><strong>Window Aura</strong><small>Click-through candidate projection</small></span><input type="checkbox" checked={state.sceneState.auraEnabled} onChange={(event) => dispatchGlobal({ auraEnabled: event.target.checked })} /></label><p className="boundary-note">All telemetry stays local. No account, upload, project scan, or audio cloud relay is part of v0.2.</p></section></div></div>;

  function dispatchGlobal(payload: Partial<ReactiveDesktopState["sceneState"]>) { dispatch({ type: "scene:update", payload }); }
}

function FirstRunView({ onStart, message, state }: { onStart: () => Promise<void>; message: string | null; state: ReactiveDesktopState }) {
  const [busy, setBusy] = useState(false);
  const start = async () => { setBusy(true); await onStart(); setBusy(false); };
  return <div className="first-run"><div className="first-run-glow"><ReactiveSceneCanvas state={state} /></div><div className="first-run-copy"><span className="brand-mark">✦</span><span className="eyebrow">AETHER REACTIVE DESKTOP / FIRST RUN</span><h1>让你的桌面<br /><em>开始回应声音。</em></h1><p>启动后，Aether 会尝试连接系统声音，把正在发生的事情变成一层漂亮、持续、可安静下来的视觉环境。</p><button className="primary-button first-run-cta" onClick={() => void start()} disabled={busy}>{busy ? "正在启动 Aether…" : "Start Aether"} <b>→</b></button><small>不需要账户 · 不上传声音 · 不修改你的桌面图标</small>{message ? <div className="notice candidate-note">{message}</div> : null}</div></div>;
}

function WallpaperSurface({ state }: { state: ReactiveDesktopState }) {
  return <div className="wallpaper-surface"><ReactiveSceneCanvas state={state} /></div>;
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action ? <div className="page-action">{action}</div> : null}</div>;
}

function Metric({ label, value, suffix = "ms" }: { label: string; value: number | null; suffix?: string }) {
  return <div className="metric"><span>{label}</span><strong>{value === null ? "—" : `${Math.round(value)}${suffix}`}</strong></div>;
}

function formatClock(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function formatHandle(value: number | null): string {
  return value === null ? "—" : `0x${value.toString(16)}`;
}
