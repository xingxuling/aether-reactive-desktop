# Aether Reactive Desktop v0.2｜Implementation Report

## 已实现模块

| 模块 | 当前实现 | 证据状态 |
|---|---|---|
| Reactive Runtime | 统一状态、迁移、reducer、持久化和事件广播 | `SOURCE_READY` |
| Scene Runtime | 五个 Scene、完整 Scene 配置、Canvas compositor | `BUILD_CANDIDATE` |
| Music Halo Pro | WASAPI candidate、Local File DSP、Demo fallback、latency 字段 | `CANDIDATE` |
| True Wallpaper | Progman/WorkerW 探测、Tauri HWND、attach/detach | `CANDIDATE / BLOCKED` |
| Living Album Cover | MediaState、Generic Cover、Local File metadata、GSMTC boundary | `PARTIAL / BLOCKED` |
| Window Aura | 前台窗口传感器、Aura preview、强度与暂停边界 | `CANDIDATE / BLOCKED` |
| Performance | rAF/heap/visibility/profile telemetry | `BUILD_CANDIDATE` |
| Release | Tauri release EXE、MSI、NSIS、8 秒启动 smoke | `WINDOWS_BUILD_VERIFIED` 本机 |

## 旧模块

Dynamic Cover、Project Terrarium、TreeSpirit、Pocket World、旧 Music Halo 均在 `src/legacy/`，不进入 v0.2 首页和新托盘主路径。Pocket World 的确定性模拟和持久化测试继续保留。
