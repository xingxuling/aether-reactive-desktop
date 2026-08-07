# Aether Reactive Desktop v0.2

以太响应式桌面是一个本地优先的 Windows 桌面轻量产品：声音、时间、当前媒体、前台窗口和指针进入同一个 Reactive Runtime，再被投影成动态壁纸、音乐光环、Living Album Cover、Window Aura 与完整 Scene。

## 当前产品闭环

- 首页只保留一个当前 Scene、Listening/Quiet 状态和关键入口。
- Music Halo Pro 支持 Windows 系统声音候选链路、Local File 回退和 Demo Pulse。
- Scene Browser 提供 5 个完整场景：Deep Sky、Blue Hour、White Silence、Gold Pulse、Album Immersion。
- Wallpaper、Window Aura、GSMTC Media Session 都有独立原生边界和明确的 CANDIDATE / BLOCKED 状态。
- Dynamic Cover、Project Terrarium、TreeSpirit、Pocket World 与旧 Music Halo 已移入 `src/legacy/`；Pocket World 代码保留但暂停主路径。

## 本地运行

```powershell
npm install
npm run dev
```

浏览器预览用于体验 UI、Scene 和本地回退；Windows 原生能力使用：

```powershell
npm run tauri dev
```

常用验证：

```powershell
npm run lint
npm test
npm run build
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri build -- --ci
```

## 证据边界

本版本不把源码存在等同于原生能力已验证。`TRUE_WALLPAPER_VERIFIED`、`WASAPI_LOOPBACK_VERIFIED` 和 `FULL_REACTIVE_VERTICAL_SLICE_VERIFIED` 只有在对应 Windows 实机验收完成后才能成立；当前报告会明确使用 `SOURCE_READY`、`BUILD_CANDIDATE`、`WINDOWS_BUILD_VERIFIED`、`INSTALLER_VERIFIED`、`CANDIDATE` 或 `BLOCKED`。

## 目录

- `src/core/reactive-state/`：统一 ReactiveDesktopState 与 reducer。
- `src/scenes/`：Scene 注册表、运行时投影和 Demo 音频。
- `src/sensors/`：音频 DSP、媒体、前台窗口和时间传感器。
- `src/platform/windows/`：Tauri/Windows 边界适配器。
- `src-tauri/src/platform/windows/`：WorkerW、WASAPI、前台窗口和启动项原生候选实现。
- `src/visual/compositor/`：多层 Canvas 投影。
- `src/legacy/`：v0.1 保留但不进入 v0.2 首页和托盘主路径的模块。

## 证据文档

完整交付记录位于 `docs/evidence/`：

- `product-retrial-v0.2.md`：本轮重构目标、验收闸门与状态。
- `v0.1-user-feedback.md`、`removed-features.md`：用户反馈与旧模块处置。
- `true-wallpaper-report.md`、`wasapi-loopback-report.md`、`media-session-report.md`、`window-aura-report.md`：Windows 原生边界报告。
- `scene-runtime-report.md`、`performance-report.md`、`ux-retrial-report.md`：运行时、性能与 UI 冒烟证据。
- `windows-install-report.md`、`known-limitations.md`：构建产物、哈希、安装器和未验证项。
